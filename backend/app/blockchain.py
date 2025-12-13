"""
Blockchain utilities for immutable audit trail
سیستم بلاکچین برای ثبت نامتغیر تغییرات
"""
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Tuple, List, Dict
from sqlalchemy.orm import Session
from . import models
import os

AUDIT_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs')
MERKLE_HISTORY = os.path.join(AUDIT_DIR, 'merkle_batches.jsonl')


def hash_data(data: dict) -> str:
    """
    Hash کردن داده‌ها با SHA256
    """
    # Convert to JSON string for consistent hashing
    json_str = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(json_str.encode()).hexdigest()


def create_blockchain_entry(
    session: Session,
    entity_type: str,
    entity_id: str,
    action: str,
    data: dict,
    user_id: Optional[int] = None
) -> models.BlockchainEntry:
    """
    ایجاد ورودی blockchain برای تغییر
    
    Args:
        session: Database session
        entity_type: user, invoice, payment, product, person
        entity_id: ID of the entity
        action: create, update, delete
        data: Entity data to hash
        user_id: User who made the change
    
    Returns:
        BlockchainEntry object
    """
    # Hash current data
    current_hash = hash_data(data)
    
    # Get previous hash if exists
    previous_entry = (
        session.query(models.BlockchainEntry)
        .filter(
            models.BlockchainEntry.entity_type == entity_type,
            models.BlockchainEntry.entity_id == entity_id
        )
        .order_by(models.BlockchainEntry.timestamp.desc())
        .first()
    )
    
    previous_hash = previous_entry.data_hash if previous_entry else None
    
    # Calculate merkle root (for now, just the current hash)
    # In production, this would compute actual merkle tree
    merkle_root = current_hash
    
    entry = models.BlockchainEntry(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        data_hash=current_hash,
        previous_hash=previous_hash,
        merkle_root=merkle_root,
        user_id=user_id
    )
    
    session.add(entry)
    session.commit()
    session.refresh(entry)
    
    return entry


def get_entity_history(
    session: Session,
    entity_type: str,
    entity_id: str
) -> list[models.BlockchainEntry]:
    """
    دریافت تاریخچه تغییرات یک entity
    """
    return (
        session.query(models.BlockchainEntry)
        .filter(
            models.BlockchainEntry.entity_type == entity_type,
            models.BlockchainEntry.entity_id == entity_id
        )
        .order_by(models.BlockchainEntry.timestamp.asc())
        .all()
    )


def verify_entry_chain(
    session: Session,
    entity_type: str,
    entity_id: str
) -> Tuple[bool, str]:
    """
    تأیید زنجیر blockchain برای یک entity
    بررسی می‌کند که previous_hash ها با hash های قبلی مطابقت دارند
    
    Returns:
        (is_valid, message)
    """
    entries = get_entity_history(session, entity_type, entity_id)
    
    if not entries:
        return True, 'No entries to verify'
    
    if len(entries) == 1:
        # First entry should have no previous hash
        if entries[0].previous_hash is not None:
            return False, 'First entry should not have previous_hash'
        return True, 'Single entry chain is valid'
    
    # Verify chain
    for i in range(1, len(entries)):
        current = entries[i]
        previous = entries[i - 1]
        
        # Current's previous_hash should match previous entry's data_hash
        if current.previous_hash != previous.data_hash:
            return False, f'Chain broken at entry {i}: previous_hash mismatch'
    
    return True, 'Chain integrity verified'


def _ensure_audit_dir():
    os.makedirs(AUDIT_DIR, exist_ok=True)
    if not os.path.exists(MERKLE_HISTORY):
        with open(MERKLE_HISTORY, 'a', encoding='utf-8'):
            pass

def _merkle_root(hashes: List[str]) -> str:
    if not hashes:
        return hash_data({'empty': True})
    layer = hashes[:]
    while len(layer) > 1:
        next_layer: List[str] = []
        for i in range(0, len(layer), 2):
            left = layer[i]
            right = layer[i+1] if i+1 < len(layer) else left
            next_layer.append(hash_data({'l': left, 'r': right}))
        layer = next_layer
    return layer[0]

def build_merkle_batch(session: Session, entity_type: str = 'otp', limit: int = 100) -> Dict:
    """
    Build a merkle batch over the latest blockchain entries for an entity_type.
    Persist batch metadata to a JSONL file for later verification/export.
    """
    _ensure_audit_dir()
    entries = (
        session.query(models.BlockchainEntry)
        .filter(models.BlockchainEntry.entity_type == entity_type)
        .order_by(models.BlockchainEntry.timestamp.desc())
        .limit(limit)
        .all()
    )
    ids = [e.id for e in entries]
    hashes = [e.data_hash for e in entries]
    root = _merkle_root(hashes)
    payload = {
        'ts': datetime.utcnow().isoformat() + 'Z',
        'entity_type': entity_type,
        'count': len(ids),
        'entry_ids': ids,
        'merkle_root': root,
    }
    with open(MERKLE_HISTORY, 'a', encoding='utf-8') as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    return payload

def get_latest_merkle_batch(entity_type: str = 'otp') -> Optional[Dict]:
    try:
        _ensure_audit_dir()
        if not os.path.exists(MERKLE_HISTORY):
            return None
        last = None
        with open(MERKLE_HISTORY, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    obj = json.loads(line)
                    if obj.get('entity_type') == entity_type:
                        last = obj
                except Exception:
                    continue
        return last
    except Exception:
        return None


def get_all_entries_for_user(
    session: Session,
    user_id: int,
    limit: int = 100
) -> list[models.BlockchainEntry]:
    """
    دریافت تمام blockchain entries برای کاربر
    """
    return (
        session.query(models.BlockchainEntry)
        .filter(models.BlockchainEntry.user_id == user_id)
        .order_by(models.BlockchainEntry.timestamp.desc())
        .limit(limit)
        .all()
    )


def export_merkle_proof(
    session: Session,
    entity_type: str,
    entity_id: str,
    entry_id: int
) -> dict:
    """
    Export merkle proof برای یک entry
    برای تأیید خارج از سیستم
    """
    entry = (
        session.query(models.BlockchainEntry)
        .filter(models.BlockchainEntry.id == entry_id)
        .first()
    )
    
    if not entry:
        return {'error': 'Entry not found'}
    
    history = get_entity_history(session, entity_type, entity_id)
    chain_valid, chain_msg = verify_entry_chain(session, entity_type, entity_id)
    
    return {
        'entity_type': entity_type,
        'entity_id': entity_id,
        'entry_id': entry_id,
        'data_hash': entry.data_hash,
        'previous_hash': entry.previous_hash,
        'merkle_root': entry.merkle_root,
        'timestamp': entry.timestamp.isoformat(),
        'action': entry.action,
        'chain_is_valid': chain_valid,
        'chain_message': chain_msg,
        'total_entries_in_chain': len(history),
        'entry_position': next((i for i, e in enumerate(history) if e.id == entry_id), -1) + 1
    }
