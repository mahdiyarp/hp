from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api.deps import get_current_user, require_roles
from app.db import get_db

router = APIRouter()


@router.get('/widgets', response_model=List[schemas.DashboardWidgetOut])
async def get_dashboard_widgets(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت widgets داشبورد کاربر"""
    widgets = crud.get_user_dashboard_widgets(session, current.id)
    return widgets


@router.post('/widgets', response_model=schemas.DashboardWidgetOut)
async def create_widget(
    payload: schemas.DashboardWidgetCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """ایجاد widget جدید"""
    widget = crud.create_dashboard_widget(session, current.id, payload)
    return widget


@router.get('/widgets/{widget_id}', response_model=schemas.DashboardWidgetOut)
async def get_widget(
    widget_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت widget خاص"""
    widget = crud.get_dashboard_widget(session, widget_id)
    if not widget or widget.user_id != current.id:
        raise HTTPException(status_code=404, detail='Widget یافت نشد')
    return widget


@router.patch('/widgets/{widget_id}', response_model=schemas.DashboardWidgetOut)
async def update_widget(
    widget_id: int,
    payload: schemas.DashboardWidgetUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """به‌روزرسانی widget"""
    widget = crud.get_dashboard_widget(session, widget_id)
    if not widget or widget.user_id != current.id:
        raise HTTPException(status_code=404, detail='Widget یافت نشد')
    
    updated = crud.update_dashboard_widget(session, widget_id, payload)
    return updated


@router.delete('/widgets/{widget_id}')
async def delete_widget(
    widget_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """حذف widget"""
    widget = crud.get_dashboard_widget(session, widget_id)
    if not widget or widget.user_id != current.id:
        raise HTTPException(status_code=404, detail='Widget یافت نشد')
    
    success = crud.delete_dashboard_widget(session, widget_id)
    if not success:
        raise HTTPException(status_code=400, detail='حذف widget ناموفق بود')
    
    return {'message': 'Widget با موفقیت حذف شد'}


@router.post('/widgets/reorder')
async def reorder_widgets(
    payload: dict,  # {'widgets': [{'widget_id': 1, 'position_x': 0, 'position_y': 0, ...}, ...]}
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """تغییر موقعیت و اندازه widgets (برای drag-and-drop)"""
    widgets = payload.get('widgets', [])
    success = crud.reorder_dashboard_widgets(session, current.id, widgets)
    if not success:
        raise HTTPException(status_code=400, detail='تغییر ترتیب ناموفق بود')
    
    return {'message': 'ترتیب widgets با موفقیت ذخیره شد'}


@router.get('/summary')
def dashboard_summary(session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    out = crud.dashboard_summary(session)
    return out


@router.get('/sales-trends')
def dashboard_sales_trends(days: Optional[int] = 30, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    out = crud.dashboard_sales_trends(session, days=days)
    return out


@router.get('/old-stock')
def dashboard_old_stock(days: Optional[int] = 90, min_qty: Optional[int] = 1, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    out = crud.dashboard_old_stock(session, days=days, min_qty=min_qty)
    return out


@router.get('/checks-due')
def dashboard_checks_due(within_days: Optional[int] = 14, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    out = crud.dashboard_checks_due(session, within_days=within_days)
    return out


@router.get('/prices')
def dashboard_prices(session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Viewer'])(current)
    out = crud.dashboard_currency_prices()
    return out
