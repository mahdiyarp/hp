from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from ..db import get_db
from .. import crud, models
from ..auth import require_permissions, get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import func

router = APIRouter(prefix='/api/reports', tags=['reports'])

@router.get('/sales')
def sales_report(start: Optional[str] = None, end: Optional[str] = None, db=Depends(get_db), current=Depends(get_current_user)):
    require_permissions(['finance_report'])(current)
    from ..main import _parse_iso_dt
    s = _parse_iso_dt(start)
    e = _parse_iso_dt(end)
    pnl = crud.report_pnl(db, start=s, end=e)
    series = crud.dashboard_sales_trends(db, days=30)  # default series
    return {'summary': pnl, 'series': series}

@router.get('/pnl')
def pnl_report(start: Optional[str] = None, end: Optional[str] = None, db=Depends(get_db), current=Depends(get_current_user)):
    require_permissions(['finance_report'])(current)
    from ..main import _parse_iso_dt
    s = _parse_iso_dt(start)
    e = _parse_iso_dt(end)
    out = crud.report_pnl(db, start=s, end=e)
    return out

@router.get('/stock')
def stock_report(db=Depends(get_db), current=Depends(get_current_user)):
    require_permissions(['finance_report'])(current)
    out = crud.report_stock_valuation(db)
    return out

@router.get('/cash')
def cash_report(method: Optional[str] = None, db=Depends(get_db), current=Depends(get_current_user)):
    require_permissions(['finance_report'])(current)
    out = crud.report_cash_balance(db, method=method)
    return out

@router.get('/payments')
def payments_report(
    start: Optional[str] = None,
    end: Optional[str] = None,
    method: Optional[str] = None,
    direction: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user)
):
    require_permissions(['finance_report'])(current)
    from ..main import _parse_iso_dt
    s = _parse_iso_dt(start)
    e = _parse_iso_dt(end)
    q = db.query(models.Payment).filter(models.Payment.status != 'void')
    if s:
        q = q.filter(models.Payment.created_at >= s)
    if e:
        q = q.filter(models.Payment.created_at <= e)
    if method:
        q = q.filter(models.Payment.method == method)
    if direction:
        q = q.filter(models.Payment.direction == direction)

    total_amount = db.query(func.coalesce(func.sum(models.Payment.amount), 0))
    total_amount = total_amount.filter(models.Payment.status != 'void')
    if s:
        total_amount = total_amount.filter(models.Payment.created_at >= s)
    if e:
        total_amount = total_amount.filter(models.Payment.created_at <= e)
    if method:
        total_amount = total_amount.filter(models.Payment.method == method)
    if direction:
        total_amount = total_amount.filter(models.Payment.direction == direction)
    total_amount = total_amount.scalar() or 0

    by_method = (
        db.query(models.Payment.method.label('method'), func.coalesce(func.sum(models.Payment.amount), 0).label('amount'))
        .filter(models.Payment.status != 'void')
        .group_by(models.Payment.method)
    )
    if s:
        by_method = by_method.filter(models.Payment.created_at >= s)
    if e:
        by_method = by_method.filter(models.Payment.created_at <= e)
    if direction:
        by_method = by_method.filter(models.Payment.direction == direction)
    by_method_rows = by_method.all()

    by_direction = (
        db.query(models.Payment.direction.label('direction'), func.coalesce(func.sum(models.Payment.amount), 0).label('amount'))
        .filter(models.Payment.status != 'void')
        .group_by(models.Payment.direction)
    )
    if s:
        by_direction = by_direction.filter(models.Payment.created_at >= s)
    if e:
        by_direction = by_direction.filter(models.Payment.created_at <= e)
    if method:
        by_direction = by_direction.filter(models.Payment.method == method)
    by_direction_rows = by_direction.all()

    return {
        'total': int(total_amount or 0),
        'by_method': [{'method': m or 'unknown', 'amount': int(a or 0)} for m, a in by_method_rows],
        'by_direction': [{'direction': d or 'unknown', 'amount': int(a or 0)} for d, a in by_direction_rows],
        'filter': {'start': start, 'end': end, 'method': method, 'direction': direction},
    }
