from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app import crud, schemas, models, db
from app.services.backup_service import create_structured_backup

router = APIRouter(prefix='/api/backups', tags=['backups'])


@router.get('/', response_model=List[schemas.BackupOut])
def list_backups(limit: int = 100, session: Session = Depends(db.get_db)):
    """List all backups, newest first."""
    backups = crud.list_backups(session, limit=limit)
    return backups


@router.post('/manual', response_model=schemas.BackupOut, status_code=201)
def create_manual_backup(note: Optional[str] = None, session: Session = Depends(db.get_db)):
    """Create a manual backup snapshot."""
    result = create_structured_backup(session, created_by=None, kind='manual', note=note or 'Manual backup')
    backup_id = result.get('backup_id')
    if not backup_id:
        raise HTTPException(status_code=500, detail='Backup creation failed')
    backup = crud.get_backup(session, backup_id)
    if not backup:
        raise HTTPException(status_code=500, detail='Backup not found after creation')
    return backup


@router.get('/{backup_id}', response_model=schemas.BackupOut)
def get_backup_detail(backup_id: int, session: Session = Depends(db.get_db)):
    """Retrieve a single backup by ID."""
    backup = crud.get_backup(session, backup_id)
    if not backup:
        raise HTTPException(status_code=404, detail='Backup not found')
    return backup


@router.get('/{backup_id}/download')
def download_backup(backup_id: int, session: Session = Depends(db.get_db)):
    """Download a backup file."""
    from fastapi.responses import FileResponse
    import os

    backup = crud.get_backup(session, backup_id)
    if not backup:
        raise HTTPException(status_code=404, detail='Backup not found')
    if not os.path.exists(backup.file_path):
        raise HTTPException(status_code=404, detail='Backup file not found on disk')
    return FileResponse(backup.file_path, filename=backup.filename, media_type='application/json')


@router.delete('/{backup_id}', status_code=204)
def delete_backup(backup_id: int, session: Session = Depends(db.get_db)):
    """Delete a backup record and file."""
    import os

    backup = crud.get_backup(session, backup_id)
    if not backup:
        raise HTTPException(status_code=404, detail='Backup not found')
    # Remove file if exists
    if os.path.exists(backup.file_path):
        try:
            os.remove(backup.file_path)
        except Exception:
            pass
    # Remove DB record
    session.delete(backup)
    session.commit()
    return None
