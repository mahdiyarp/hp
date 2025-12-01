import logging
from datetime import datetime
from typing import Optional, Dict

from sqlalchemy.orm import Session

from app import crud, models

LOGGER = logging.getLogger(__name__)


def _gather_metadata(session: Session) -> Dict[str, int]:
    return {
        'products': session.query(models.Product).count(),
        'persons': session.query(models.Person).count(),
        'invoices': session.query(models.Invoice).count(),
        'payments': session.query(models.Payment).count(),
        'ledger_entries': session.query(models.LedgerEntry).count(),
        'timestamp': int(datetime.utcnow().timestamp()),
    }


def create_structured_backup(
    session: Session,
    created_by: Optional[int] = None,
    kind: str = 'manual',
    note: Optional[str] = None,
) -> Dict[str, Optional[str]]:
    metadata = _gather_metadata(session)
    try:
        backup = crud.create_backup(session, created_by=created_by, kind=kind, note=note or f'{kind} snapshot')
        return {
            'backup_id': backup.id,
            'filename': backup.filename,
            'kind': backup.kind,
            'note': note,
            'created_at': backup.created_at.isoformat(),
            'metadata': metadata,
        }
    except Exception as exc:
        LOGGER.warning('Failed to create structured backup: %s', exc)
        raise


def create_scheduled_backup(
    session: Session,
    created_by: Optional[int] = None,
    note: Optional[str] = 'Auto-scheduled snapshot',
) -> Dict[str, Optional[str]]:
    return create_structured_backup(session, created_by=created_by, kind='scheduled', note=note)
