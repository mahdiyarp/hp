from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api.deps import get_current_user
from app.db import get_db

router = APIRouter()


@router.get('/categories', response_model=List[schemas.IccCategoryOut])
async def list_icc_categories(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت تمام دسته‌بندی‌های ICC"""
    categories = crud.get_all_icc_categories(session)
    return categories


@router.post('/categories', response_model=schemas.IccCategoryOut)
async def create_icc_category(
    payload: schemas.IccCategoryCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """ایجاد دسته‌بندی ICC"""
    category = crud.create_icc_category(session, payload)
    return category


@router.get('/categories/{category_id}', response_model=schemas.IccCategoryOut)
async def get_icc_category(
    category_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت دسته‌بندی ICC"""
    category = crud.get_icc_category(session, category_id)
    if not category:
        raise HTTPException(status_code=404, detail='دسته‌بندی یافت نشد')
    return category


@router.patch('/categories/{category_id}', response_model=schemas.IccCategoryOut)
async def update_icc_category(
    category_id: int,
    payload: schemas.IccCategoryUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """به‌روزرسانی دسته‌بندی ICC"""
    category = crud.update_icc_category(session, category_id, payload)
    if not category:
        raise HTTPException(status_code=404, detail='دسته‌بندی یافت نشد')
    return category


@router.delete('/categories/{category_id}')
async def delete_icc_category(
    category_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """حذف دسته‌بندی ICC"""
    success = crud.delete_icc_category(session, category_id)
    if not success:
        raise HTTPException(status_code=404, detail='دسته‌بندی یافت نشد')
    return {'message': 'دسته‌بندی با موفقیت حذف شد'}


@router.get('/centers', response_model=List[schemas.IccCenterOut])
async def list_icc_centers(
    category_id: Optional[int] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت مراکز ICC"""
    if category_id:
        centers = crud.get_icc_centers_by_category(session, category_id)
    else:
        centers = session.query(models.IccCenter).order_by(models.IccCenter.name).all()
    return centers


@router.post('/centers', response_model=schemas.IccCenterOut)
async def create_icc_center(
    payload: schemas.IccCenterCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """ایجاد مرکز ICC"""
    center = crud.create_icc_center(session, payload)
    return center


@router.get('/centers/{center_id}', response_model=schemas.IccCenterOut)
async def get_icc_center(
    center_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت مرکز ICC"""
    center = crud.get_icc_center(session, center_id)
    if not center:
        raise HTTPException(status_code=404, detail='مرکز یافت نشد')
    return center


@router.patch('/centers/{center_id}', response_model=schemas.IccCenterOut)
async def update_icc_center(
    center_id: int,
    payload: schemas.IccCenterUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """به‌روزرسانی مرکز ICC"""
    center = crud.update_icc_center(session, center_id, payload)
    if not center:
        raise HTTPException(status_code=404, detail='مرکز یافت نشد')
    return center


@router.delete('/centers/{center_id}')
async def delete_icc_center(
    center_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """حذف مرکز ICC"""
    success = crud.delete_icc_center(session, center_id)
    if not success:
        raise HTTPException(status_code=404, detail='مرکز یافت نشد')
    return {'message': 'مرکز با موفقیت حذف شد'}


@router.get('/units', response_model=List[schemas.IccUnitOut])
async def list_icc_units(
    center_id: Optional[int] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت واحدهای ICC"""
    if center_id:
        units = crud.get_icc_units_by_center(session, center_id)
    else:
        units = session.query(models.IccUnit).order_by(models.IccUnit.name).all()
    return units


@router.post('/units', response_model=schemas.IccUnitOut)
async def create_icc_unit(
    payload: schemas.IccUnitCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """ایجاد واحد ICC"""
    unit = crud.create_icc_unit(session, payload)
    return unit


@router.get('/units/{unit_id}', response_model=schemas.IccUnitOut)
async def get_icc_unit(
    unit_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت واحد ICC"""
    unit = crud.get_icc_unit(session, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail='واحد یافت نشد')
    return unit


@router.patch('/units/{unit_id}', response_model=schemas.IccUnitOut)
async def update_icc_unit(
    unit_id: int,
    payload: schemas.IccUnitUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """به‌روزرسانی واحد ICC"""
    unit = crud.update_icc_unit(session, unit_id, payload)
    if not unit:
        raise HTTPException(status_code=404, detail='واحد یافت نشد')
    return unit


@router.delete('/units/{unit_id}')
async def delete_icc_unit(
    unit_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """حذف واحد ICC"""
    success = crud.delete_icc_unit(session, unit_id)
    if not success:
        raise HTTPException(status_code=404, detail='واحد یافت نشد')
    return {'message': 'واحد با موفقیت حذف شد'}


@router.get('/extensions', response_model=List[schemas.IccExtensionOut])
async def list_icc_extensions(
    unit_id: Optional[int] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت شاخه‌های ICC"""
    if unit_id:
        extensions = crud.get_icc_extensions_by_unit(session, unit_id)
    else:
        extensions = session.query(models.IccExtension).order_by(models.IccExtension.name).all()
    return extensions


@router.post('/extensions', response_model=schemas.IccExtensionOut)
async def create_icc_extension(
    payload: schemas.IccExtensionCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """ایجاد شاخه ICC"""
    extension = crud.create_icc_extension(session, payload)
    return extension


@router.get('/extensions/{extension_id}', response_model=schemas.IccExtensionOut)
async def get_icc_extension(
    extension_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت شاخه ICC"""
    extension = crud.get_icc_extension(session, extension_id)
    if not extension:
        raise HTTPException(status_code=404, detail='شاخه یافت نشد')
    return extension


@router.patch('/extensions/{extension_id}', response_model=schemas.IccExtensionOut)
async def update_icc_extension(
    extension_id: int,
    payload: schemas.IccExtensionUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """به‌روزرسانی شاخه ICC"""
    extension = crud.update_icc_extension(session, extension_id, payload)
    if not extension:
        raise HTTPException(status_code=404, detail='شاخه یافت نشد')
    return extension


@router.delete('/extensions/{extension_id}')
async def delete_icc_extension(
    extension_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """حذف شاخه ICC"""
    success = crud.delete_icc_extension(session, extension_id)
    if not success:
        raise HTTPException(status_code=404, detail='شاخه یافت نشد')
    return {'message': 'شاخه با موفقیت حذف شد'}
