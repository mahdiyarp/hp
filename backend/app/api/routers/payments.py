from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app import db, models, schemas
from app.activity_logger import log_activity
from app.blockchain import hash_event as bc_hash_event
from app.auth import get_current_user

from fastapi import Depends as _Depends  # alias to avoid confusion
router = APIRouter(prefix="/api/payments", tags=["payments"], dependencies=[_Depends(get_current_user)])


def _update_invoice_status(session: Session, invoice_id: Optional[int]):
    if not invoice_id:
        return
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        return
    total_paid = (
        session.query(models.Payment)
        .filter(models.Payment.invoice_id == invoice_id)
        .filter(models.Payment.status != 'void')
        .with_entities(db.func.coalesce(db.func.sum(models.Payment.amount), 0))
        .scalar()
    ) or 0
    try:
        inv_status = 'paid' if (int(inv.total or 0) <= int(total_paid or 0)) else inv.status
        if inv.status != inv_status:
            inv.status = inv_status
            session.add(inv)
            session.commit()
    except Exception:
        pass


def _assert_no_overpay_on_create(session: Session, payload: schemas.PaymentCreate):
    # Validate basic enums
    if payload.direction and payload.direction not in {"in", "out"}:
        raise HTTPException(status_code=400, detail="Invalid direction")
    if payload.method and payload.method not in {"cash", "bank", "pos", "other"}:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    if payload.amount is None or int(payload.amount) < 0:
        raise HTTPException(status_code=400, detail="Amount must be non-negative")
    if not payload.invoice_id:
        return
    inv = session.get(models.Invoice, payload.invoice_id)
    if not inv:
        raise HTTPException(status_code=400, detail="Invoice not found for payment")
    total_paid = (
        session.query(models.Payment)
        .filter(models.Payment.invoice_id == payload.invoice_id)
        .filter(models.Payment.status != 'void')
        .with_entities(db.func.coalesce(db.func.sum(models.Payment.amount), 0))
        .scalar()
    ) or 0
    if int(total_paid) + int(payload.amount or 0) > int(inv.total or 0):
        raise HTTPException(status_code=400, detail="Payment exceeds invoice total")


def _assert_no_overpay_on_update(session: Session, obj: models.Payment, payload: schemas.PaymentCreate):
    # Validate basic enums
    if payload.direction and payload.direction not in {"in", "out"}:
        raise HTTPException(status_code=400, detail="Invalid direction")
    if payload.method and payload.method not in {"cash", "bank", "pos", "other"}:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    if payload.amount is None or int(payload.amount) < 0:
        raise HTTPException(status_code=400, detail="Amount must be non-negative")
    invoice_id = payload.invoice_id if payload.invoice_id is not None else obj.invoice_id
    if not invoice_id:
        return
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=400, detail="Invoice not found for payment")
    # sum other payments for this invoice (exclude current obj id)
    other_paid = (
        session.query(models.Payment)
        .filter(models.Payment.invoice_id == invoice_id)
        .filter(models.Payment.id != obj.id)
        .filter(models.Payment.status != 'void')
        .with_entities(db.func.coalesce(db.func.sum(models.Payment.amount), 0))
        .scalar()
    ) or 0
    new_amount = int(payload.amount or 0)
    if int(other_paid) + new_amount > int(inv.total or 0):
        raise HTTPException(status_code=400, detail="Payment exceeds invoice total")

@router.get("/", response_model=List[schemas.PaymentOut])
def list_payments(
    session: Session = Depends(db.get_db),
    current=Depends(get_current_user),
    invoice_id: Optional[int] = None,
    direction: Optional[str] = None,
    method: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 200,
):
    q = session.query(models.Payment)
    if invoice_id is not None:
        q = q.filter(models.Payment.invoice_id == invoice_id)
    if direction:
        q = q.filter(models.Payment.direction == direction)
    if method:
        q = q.filter(models.Payment.method == method)
    if status:
        q = q.filter(models.Payment.status == status)
    # Date filters on created_at (ISO format)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            q = q.filter(models.Payment.created_at >= dt_from)
        except Exception:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            q = q.filter(models.Payment.created_at <= dt_to)
        except Exception:
            pass
    page = max(1, int(page or 1))
    limit = min(max(int(limit or 1), 1), 500)
    return q.order_by(models.Payment.created_at.desc()).offset((page-1)*limit).limit(limit).all()


@router.get("/count")
def count_payments(
    session: Session = Depends(db.get_db),
    current=Depends(get_current_user),
    invoice_id: Optional[int] = None,
    direction: Optional[str] = None,
    method: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    q = session.query(models.Payment)
    if invoice_id is not None:
        q = q.filter(models.Payment.invoice_id == invoice_id)
    if direction:
        q = q.filter(models.Payment.direction == direction)
    if method:
        q = q.filter(models.Payment.method == method)
    if status:
        q = q.filter(models.Payment.status == status)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            q = q.filter(models.Payment.created_at >= dt_from)
        except Exception:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            q = q.filter(models.Payment.created_at <= dt_to)
        except Exception:
            pass
    return {"count": q.count()}


@router.get("/{payment_id}", response_model=schemas.PaymentOut)
def get_payment(payment_id: int, session: Session = Depends(db.get_db), current=Depends(get_current_user)):
    obj = session.get(models.Payment, payment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Payment not found")
    return obj


@router.post("/", response_model=schemas.PaymentOut)
def create_payment(payload: schemas.PaymentCreate, session: Session = Depends(db.get_db), current=Depends(get_current_user)):
    _assert_no_overpay_on_create(session, payload)
    data = payload.dict(exclude_unset=True)
    obj = models.Payment(**data)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    log_activity(session, actor="system", action="payment_create", entity_id=obj.id, meta={"amount": obj.amount})
    bc_hash_event(session, entity="payment", entity_id=obj.id, payload={"action": "create", "amount": obj.amount})
    _update_invoice_status(session, obj.invoice_id)
    return obj


@router.put("/{payment_id}", response_model=schemas.PaymentOut)
def update_payment(payment_id: int, payload: schemas.PaymentCreate, session: Session = Depends(db.get_db), current=Depends(get_current_user)):
    obj = session.get(models.Payment, payment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Payment not found")
    _assert_no_overpay_on_update(session, obj, payload)
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    log_activity(session, actor="system", action="payment_update", entity_id=obj.id, meta={"amount": obj.amount})
    bc_hash_event(session, entity="payment", entity_id=obj.id, payload={"action": "update", "amount": obj.amount})
    _update_invoice_status(session, obj.invoice_id)
    return obj


@router.post("/{payment_id}/status/{new_status}", response_model=schemas.PaymentOut)
def change_status(payment_id: int, new_status: str, session: Session = Depends(db.get_db), current=Depends(get_current_user)):
    obj = session.get(models.Payment, payment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Payment not found")
    allowed = {"draft", "posted", "reconciled", "void"}
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    obj.status = new_status
    session.add(obj)
    session.commit()
    session.refresh(obj)
    log_activity(session, actor="system", action="payment_status", entity_id=obj.id, meta={"status": new_status})
    bc_hash_event(session, entity="payment", entity_id=obj.id, payload={"action": "status", "status": new_status})
    _update_invoice_status(session, obj.invoice_id)
    return obj


@router.delete("/{payment_id}")
def delete_payment(payment_id: int, session: Session = Depends(db.get_db), current=Depends(get_current_user)):
    obj = session.get(models.Payment, payment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Payment not found")
    session.delete(obj)
    session.commit()
    log_activity(session, actor="system", action="payment_delete", entity_id=payment_id, meta={})
    bc_hash_event(session, entity="payment", entity_id=payment_id, payload={"action": "delete"})
    _update_invoice_status(session, getattr(obj, 'invoice_id', None))
    return {"ok": True}


@router.get("/export")
def export_payments(
    session: Session = Depends(db.get_db),
    current=Depends(get_current_user),
    format: str = "csv",
    limit: int = 1000,
    invoice_id: Optional[int] = None,
    direction: Optional[str] = None,
    method: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    q = session.query(models.Payment)
    if invoice_id is not None:
        q = q.filter(models.Payment.invoice_id == invoice_id)
    if direction:
        q = q.filter(models.Payment.direction == direction)
    if method:
        q = q.filter(models.Payment.method == method)
    if status:
        q = q.filter(models.Payment.status == status)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            q = q.filter(models.Payment.created_at >= dt_from)
        except Exception:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            q = q.filter(models.Payment.created_at <= dt_to)
        except Exception:
            pass
    rows = q.order_by(models.Payment.created_at.desc()).limit(min(limit, 5000)).all()
    if format == "csv":
        import csv, io
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["id", "invoice_id", "direction", "method", "amount", "status", "created_at"]) 
        for p in rows:
            writer.writerow([p.id, p.invoice_id, p.direction, p.method, p.amount, p.status, getattr(p, "created_at", None)])
        return Response(content=buf.getvalue(), media_type="text/csv")
    raise HTTPException(status_code=400, detail="Unsupported export format")
