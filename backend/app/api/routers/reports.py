from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from app import db, models

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/sales")
def sales_summary(session: Session = Depends(db.get_db)):
    """Sales summary: today and total"""
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_invoices = (
        session.query(models.Invoice)
        .filter(models.Invoice.server_time >= today_start)
        .filter(models.Invoice.status.in_(["paid", "issued"]))
        .all()
    )
    today_total = sum(int(inv.total or 0) for inv in today_invoices)
    all_total = session.query(func.sum(models.Invoice.total)).filter(models.Invoice.status.in_(["paid", "issued"])).scalar() or 0
    return {"today": int(today_total), "total": int(all_total), "count_today": len(today_invoices)}


@router.get("/cash")
def cash_summary(session: Session = Depends(db.get_db)):
    """Cash balance: sum of payments (in - out)"""
    payments_in = session.query(func.sum(models.Payment.amount)).filter(models.Payment.status == "posted").scalar() or 0
    # Assuming expenses/outflows would be separate; for now return positive balance
    balance = int(payments_in)
    return {"balance": balance, "total": balance}


@router.get("/stock")
def stock_summary(session: Session = Depends(db.get_db)):
    """Stock value: sum of product inventory value"""
    products = session.query(models.Product).all()
    value = sum(int(p.price or 0) * int(getattr(p, "stock", 0) or 0) for p in products)
    count = len(products)
    return {"value": int(value), "count": count, "total": int(value)}


@router.get("/pnl")
def pnl_summary(session: Session = Depends(db.get_db)):
    """Profit and loss: revenue - cost (simplified)"""
    revenue = session.query(func.sum(models.Invoice.total)).filter(models.Invoice.status == "paid").scalar() or 0
    # Cost/expenses not modeled yet; return revenue as net
    net = int(revenue)
    return {"net": net, "profit": net, "revenue": int(revenue), "cost": 0}


@router.get("/payments")
def payments_report(
    start: Optional[str] = None,
    end: Optional[str] = None,
    direction: Optional[str] = None,
    session: Session = Depends(db.get_db),
):
    """Payments report: sum within date range and direction"""
    q = session.query(models.Payment).filter(models.Payment.status == "posted")
    if start:
        try:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            q = q.filter(models.Payment.created_at >= start_dt)
        except:
            pass
    if end:
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
            q = q.filter(models.Payment.created_at <= end_dt)
        except:
            pass
    payments = q.all()
    total = sum(int(p.amount or 0) for p in payments)
    return {"total": int(total), "count": len(payments), "items": [{"id": p.id, "amount": p.amount, "created_at": p.created_at.isoformat() if p.created_at else None} for p in payments[:20]]}
