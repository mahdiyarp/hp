from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas, blockchain
from app.api.deps import get_current_user
from app.db import get_db

router = APIRouter()


@router.get('/entries')
async def get_blockchain_entries(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    دریافت blockchain entries
    می‌توان فیلتر کرد بر اساس entity_type و entity_id
    """
    from app import blockchain
    
    if entity_type and entity_id:
        # Get specific entity history
        entries = blockchain.get_entity_history(session, entity_type, entity_id)
        return {'entries': entries, 'count': len(entries)}
    else:
        # Get recent entries for current user
        entries = blockchain.get_all_entries_for_user(session, current.id, limit=50)
        return {'entries': entries, 'count': len(entries)}


@router.post('/verify', response_model=schemas.BlockchainVerifyResponse)
async def verify_blockchain(
    entity_type: str,
    entity_id: str,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    تأیید integrity blockchain برای یک entity
    """
    from app import blockchain
    
    is_valid, message = blockchain.verify_entry_chain(session, entity_type, entity_id)
    entries = blockchain.get_entity_history(session, entity_type, entity_id)
    
    return {
        'is_valid': is_valid,
        'message': message,
        'entries_checked': len(entries)
    }


@router.get('/proof')
async def get_blockchain_proof(
    entity_type: str,
    entity_id: str,
    entry_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    دریافت merkle proof برای یک blockchain entry
    برای تأیید و export خارج از سیستم
    """
    from app import blockchain
    
    proof = blockchain.export_merkle_proof(session, entity_type, entity_id, entry_id)
    
    if 'error' in proof:
        raise HTTPException(status_code=404, detail=proof['error'])
    
    return proof


@router.get('/audit-log')
async def get_audit_log(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db),
    limit: int = 100
):
    """
    دریافت blockchain audit log برای کاربر فعلی
    نمایش تمام تغییرات ثبت شده توسط user
    """
    from app import blockchain
    
    entries = blockchain.get_all_entries_for_user(session, current.id, limit=limit)
    
    # Group by entity type
    grouped = {}
    for entry in entries:
        if entry.entity_type not in grouped:
            grouped[entry.entity_type] = []
        grouped[entry.entity_type].append(entry)
    
    return {
        'user_id': current.id,
        'total_entries': len(entries),
        'by_entity_type': {k: len(v) for k, v in grouped.items()},
        'entries': entries
    }
