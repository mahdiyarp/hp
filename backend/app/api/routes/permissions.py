from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api.deps import require_roles
from app.db import get_db

router = APIRouter()


@router.get('', response_model=List[schemas.PermissionOut])
async def list_permissions(module: Optional[str] = None, current: models.User = Depends(require_roles(role_names=['Admin'])), session: Session = Depends(get_db)):
    """لیست تمام permissions - فقط Admin"""
    if module:
        return crud.get_permissions_by_module(session, module)
    return crud.get_all_permissions(session)


@router.post('', response_model=schemas.PermissionOut)
def create_permission(payload: schemas.PermissionCreate, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(get_db)):
    existing = session.query(models.Permission).filter(models.Permission.name == payload.name).first()
    if existing:
        return existing
    p = models.Permission(name=payload.name, description=payload.description, module=payload.module)
    session.add(p)
    session.commit()
    session.refresh(p)
    return p
