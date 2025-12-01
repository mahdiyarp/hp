from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ... import db, models, crud
from ..deps import require_roles


router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/sales/summary")
def sales_summary(
    start: Optional[str] = None,
    end: Optional[str] = None,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager", "Accountant", "Viewer"]))
):
    q = session.query(models.Invoice).filter(
        models.Invoice.status == 'final',
        models.Invoice.invoice_type == 'sale',
    )
    s_dt = None
    e_dt = None
    if start:
        try:
            s_dt = datetime.fromisoformat(start)
            q = q.filter(models.Invoice.server_time >= s_dt)
        except Exception:
            pass
    if end:
        try:
            e_dt = datetime.fromisoformat(end)
            q = q.filter(models.Invoice.server_time <= e_dt)
        except Exception:
            pass

    rows = q.all()
    count = len(rows)
    total = sum(int(r.total or 0) for r in rows)
    avg = int(total / count) if count else 0
    min_total = int(min((r.total or 0) for r in rows)) if rows else 0
    max_total = int(max((r.total or 0) for r in rows)) if rows else 0
    return {
        'start': s_dt.isoformat() if s_dt else None,
        'end': e_dt.isoformat() if e_dt else None,
        'count': count,
        'total': int(total),
        'average': int(avg),
        'min': int(min_total),
        'max': int(max_total),
    }


@router.get("/sales/trends")
def sales_trends(
    days: int = 30,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager", "Accountant", "Viewer"]))
):
    # Reuse existing dashboard helper for sales trends
    return crud.dashboard_sales_trends(session, days=days)


@router.get("/sales/top-customers")
def top_customers(
    limit: int = 5,
    start: Optional[str] = None,
    end: Optional[str] = None,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager", "Accountant", "Viewer"]))
):
    q = session.query(
        models.Invoice.party_id.label('party_id'),
        models.Invoice.party_name.label('party_name'),
        func.sum(models.Invoice.total).label('total'),
        func.count(models.Invoice.id).label('count'),
    ).filter(
        models.Invoice.status == 'final',
        models.Invoice.invoice_type == 'sale',
    )

    if start:
        try:
            s_dt = datetime.fromisoformat(start)
            q = q.filter(models.Invoice.server_time >= s_dt)
        except Exception:
            pass
    if end:
        try:
            e_dt = datetime.fromisoformat(end)
            q = q.filter(models.Invoice.server_time <= e_dt)
        except Exception:
            pass

    q = q.group_by(models.Invoice.party_id, models.Invoice.party_name).order_by(desc('total')).limit(limit)
    rows = q.all()
    return [
        {
            'party_id': r.party_id,
            'party_name': r.party_name,
            'total': int(r.total or 0),
            'count': int(r.count or 0),
        }
        for r in rows
    ]


@router.get("/dashboard/summary")
def dashboard_summary(
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager", "Accountant", "Viewer"]))
):
    return crud.dashboard_summary(session)
