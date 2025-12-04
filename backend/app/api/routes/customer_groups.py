from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api.deps import get_current_user
from app.db import get_db

router = APIRouter()


@router.get('', response_model=List[schemas.CustomerGroupOut])
async def list_customer_groups(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    دریافت لیست گروه‌های مشتری کاربر
    """
    groups = crud.get_user_customer_groups(session, current.id)
    return groups


@router.post('', response_model=schemas.CustomerGroupOut)
async def create_customer_group(
    payload: schemas.CustomerGroupCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    ایجاد گروه مشتری جدید
    """
    group = crud.create_customer_group(session, current.id, payload)
    return group


@router.get('/{group_id}', response_model=schemas.CustomerGroupOut)
async def get_customer_group(
    group_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    دریافت اطلاعات گروه مشتری
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id and not group.is_shared:
        raise HTTPException(status_code=403, detail='دسترسی رد شد')
    
    return group


@router.put('/{group_id}', response_model=schemas.CustomerGroupOut)
async def update_customer_group(
    group_id: int,
    payload: schemas.CustomerGroupUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    به‌روزرسانی گروه مشتری
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند آن را تغییر دهد')
    
    updated = crud.update_customer_group(session, group_id, payload)
    return updated


@router.patch('/{group_id}', response_model=schemas.CustomerGroupOut)
async def patch_customer_group(
    group_id: int,
    payload: schemas.CustomerGroupUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    به‌روزرسانی جزئی گروه مشتری
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند آن را تغییر دهد')
    
    updated = crud.update_customer_group(session, group_id, payload)
    return updated


@router.delete('/{group_id}')
async def delete_customer_group(
    group_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    حذف گروه مشتری
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند آن را حذف کند')
    
    crud.delete_customer_group(session, group_id)
    return {'message': 'گروه با موفقیت حذف شد'}


@router.post('/{group_id}/members/{person_id}')
async def add_member_to_group(
    group_id: int,
    person_id: str,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    افزودن مشتری به گروه
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند اعضای آن را تغییر دهد')
    
    # بررسی وجود مشتری
    person = session.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail='مشتری یافت نشد')
    
    member = crud.add_customer_to_group(session, group_id, person_id)
    return {'message': 'مشتری به گروه اضافه شد', 'member_id': member.id}


@router.delete('/{group_id}/members/{person_id}')
async def remove_member_from_group(
    group_id: int,
    person_id: str,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """
    حذف مشتری از گروه
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند اعضای آن را تغییر دهد')
    
    success = crud.remove_customer_from_group(session, group_id, person_id)
    if not success:
        raise HTTPException(status_code=404, detail='مشتری در این گروه یافت نشد')
    
    return {'message': 'مشتری از گروه حذف شد'}
