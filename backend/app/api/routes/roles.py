from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api.deps import require_roles
from app.db import get_db

router = APIRouter()


@router.get('', response_model=List[schemas.RoleOut])
async def list_roles(current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(get_db)):
    """لیست تمام نقش ها - فقط Admin"""
    return crud.get_all_roles(session)


@router.post('', response_model=schemas.RoleOut)
def create_role(payload: schemas.RoleCreate, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(get_db)):
    r = models.Role(name=payload.name, description=payload.description)
    session.add(r)
    session.commit()
    session.refresh(r)
    return r


@router.patch('/{rid}', response_model=schemas.RoleOut)
def update_role(rid: int, payload: schemas.RoleCreate, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(get_db)):
    r = session.query(models.Role).filter(models.Role.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail='role not found')
    if payload.name:
        r.name = payload.name
    r.description = payload.description
    session.add(r)
    session.commit()
    session.refresh(r)
    return r


@router.delete('/{rid}')
def delete_role(rid: int, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(get_db)):
    r = session.query(models.Role).filter(models.Role.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail='role not found')
    session.delete(r)
    session.commit()
    return {"ok": True}


@router.get('/{rid}/permissions', response_model=List[schemas.PermissionOut])
def get_role_permissions(rid: int, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(get_db)):
    r = session.query(models.Role).filter(models.Role.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail='role not found')
    return r.permissions


@router.post('/{rid}/permissions')
def set_role_permissions(rid: int, permission_ids: List[int], current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(get_db)):
    r = session.query(models.Role).filter(models.Role.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail='role not found')
    perms = session.query(models.Permission).filter(models.Permission.id.in_(permission_ids or [])).all()
    r.permissions = perms
    session.add(r)
    session.commit()
    return {"ok": True, "count": len(perms)}
