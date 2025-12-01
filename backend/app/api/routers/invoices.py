from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List

from app import db, models, schemas
from app.activity_logger import log_activity
from app.blockchain import hash_event as bc_hash_event

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


def _recompute_totals(inv: models.Invoice):
    subtotal = 0
    discount_total = 0
    for it in getattr(inv, "items", []) or []:
        qty = getattr(it, "quantity", None)
        if qty is None:
            qty = getattr(it, "qty", 0) or 0
        unit_price = getattr(it, "unit_price", 0) or 0
        line = int(qty) * int(unit_price)
        item_discount = getattr(it, "discount", None)
        if item_discount is None:
            # Support legacy field name
            item_discount = getattr(it, "discount_total", 0) or 0
        subtotal += line
        discount_total += int(item_discount or 0)
        # Set line total if the model has a suitable attribute
        if hasattr(it, "total"):
            it.total = line - int(item_discount or 0)
    tax_total = int(((subtotal - discount_total) * float(getattr(inv, "tax_rate", 0) or 0)) / 100.0)
    inv.subtotal = int(subtotal)
    setattr(inv, "discount_total", int(discount_total))
    inv.tax = int(tax_total)
    inv.total = int(subtotal - discount_total + tax_total)


def _serialize_invoice(inv: models.Invoice) -> dict:
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "status": inv.status,
        "subtotal": inv.subtotal,
        "tax": inv.tax,
        "tax_rate": getattr(inv, "tax_rate", None),
        "discount_total": getattr(inv, "discount_total", None),
        "total": inv.total,
        "server_time": inv.server_time.isoformat() if getattr(inv, "server_time", None) else None,
        "party_name": getattr(inv, "party_name", None),
        "items": [
            {
                "id": it.id,
                "description": it.description,
                "quantity": getattr(it, "quantity", getattr(it, "qty", 0)),
                "unit": getattr(it, "unit", None),
                "unit_price": getattr(it, "unit_price", 0),
                "discount": getattr(it, "discount", getattr(it, "discount_total", 0)),
                "total": getattr(it, "total", None),
            }
            for it in getattr(inv, "items", []) or []
        ],
    }


@router.get("/")
def list_invoices(session: Session = Depends(db.get_db)):
    rows = (
        session.query(models.Invoice)
        .order_by(models.Invoice.server_time.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "status": inv.status,
            "subtotal": inv.subtotal,
            "tax": inv.tax,
            "tax_rate": inv.tax_rate,
            "discount_total": getattr(inv, "discount_total", None),
            "total": inv.total,
            "server_time": inv.server_time.isoformat() if getattr(inv, "server_time", None) else None,
            "party_name": getattr(inv, "party_name", None),
        }
        for inv in rows
    ]


@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return _serialize_invoice(inv)


@router.post("/", response_model=schemas.InvoiceOut)
def create_invoice(payload: schemas.InvoiceCreate, session: Session = Depends(db.get_db)):
    inv = models.Invoice(**payload.dict(exclude_unset=True))
    _recompute_totals(inv)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    log_activity(session, actor="system", action="invoice_create", entity_id=inv.id, meta={"total": inv.total})
    bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "create", "total": inv.total})
    return inv


@router.put("/{invoice_id}", response_model=schemas.InvoiceOut)
def update_invoice(invoice_id: int, payload: dict, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for k, v in (payload or {}).items():
        setattr(inv, k, v)
    _recompute_totals(inv)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    log_activity(session, actor="system", action="invoice_update", entity_id=inv.id, meta={"total": inv.total})
    bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "update", "total": inv.total})
    return inv


@router.post("/{invoice_id}/status/{new_status}", response_model=schemas.InvoiceOut)
def change_status(invoice_id: int, new_status: str, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    allowed = {"draft", "issued", "viewed", "paid", "cancelled", "overdue"}
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    inv.status = new_status
    session.add(inv)
    session.commit()
    session.refresh(inv)
    log_activity(session, actor="system", action="invoice_status", entity_id=inv.id, meta={"status": new_status})
    bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "status", "status": new_status})
    return inv


@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    session.delete(inv)
    session.commit()
    log_activity(session, actor="system", action="invoice_delete", entity_id=invoice_id, meta={})
    bc_hash_event(session, entity="invoice", entity_id=invoice_id, payload={"action": "delete"})
    return {"ok": True}


# === Test-required endpoints ===

@router.post("/manual", response_model=schemas.InvoiceOut)
def create_manual(payload: dict, session: Session = Depends(db.get_db)):
    # Map test payload to model fields
    inv = models.Invoice(
        customer_name=payload.get("party_name"),
        status="draft",
        discount=payload.get("discount_total") or 0,
        tax=0,
    )
    items = []
    for it in payload.get("items") or []:
        item = models.InvoiceItem(
            description=it.get("description"),
            qty=it.get("quantity") or it.get("qty") or 0,
            unit_price=it.get("unit_price") or 0,
            discount_rate=0,
            tax_rate=payload.get("tax_rate") or 0,
        )
        items.append(item)
    inv.items = items
    _recompute_totals(inv)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    log_activity(session, actor="system", action="invoice_create_manual", entity_id=inv.id, meta={"total": inv.total})
    bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "create_manual", "total": inv.total})
    return inv


@router.patch("/{invoice_id}/status")
def patch_status(invoice_id: int, payload: dict, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    new_status = (payload or {}).get("status")
    allowed = {"draft", "issued", "viewed", "paid", "cancelled", "final", "sent"}
    if not new_status or new_status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    inv.status = new_status
    session.add(inv)
    session.commit()
    session.refresh(inv)
    log_activity(session, actor="system", action="invoice_status", entity_id=inv.id, meta={"status": new_status})
    bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "status", "status": new_status})
    return inv


@router.post("/{invoice_id}/duplicate", response_model=schemas.InvoiceOut)
def duplicate_invoice(invoice_id: int, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    dup = models.Invoice(
        customer_name=inv.customer_name,
        status="draft",
        code=None,
        discount=inv.discount,
        tax=inv.tax,
        subtotal=inv.subtotal,
        total=inv.total,
    )
    dup.items = [
        models.InvoiceItem(
            description=it.description,
            qty=it.qty,
            unit_price=it.unit_price,
            discount_rate=it.discount_rate,
            tax_rate=it.tax_rate,
        ) for it in (inv.items or [])
    ]
    _recompute_totals(dup)
    session.add(dup)
    session.commit()
    session.refresh(dup)
    log_activity(session, actor="system", action="invoice_duplicate", entity_id=dup.id, meta={"from": inv.id})
    bc_hash_event(session, entity="invoice", entity_id=dup.id, payload={"action": "duplicate", "from": inv.id})
    return dup


@router.get("/{invoice_id}/export")
def export_invoice(invoice_id: int, format: str = "json", session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = _serialize_invoice(inv)
    if format == "json":
        from fastapi.responses import JSONResponse
        return JSONResponse(data)
    elif format == "csv":
        import csv, io
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["code", "customer", "total", "status"]) 
        writer.writerow([data.get("code"), data.get("customer_name"), data.get("total"), data.get("status")])
        return Response(content=buf.getvalue(), media_type="text/csv")
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")


@router.get("/{invoice_id}/payments/summary")
def payments_summary(invoice_id: int, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    total = int(inv.total or 0)
    paid = (
        session.query(models.Payment)
        .filter(models.Payment.invoice_id == invoice_id)
        .filter(models.Payment.status != 'void')
        .with_entities(db.func.coalesce(db.func.sum(models.Payment.amount), 0))
        .scalar()
    ) or 0
    count = (
        session.query(models.Payment)
        .filter(models.Payment.invoice_id == invoice_id)
        .filter(models.Payment.status != 'void')
        .count()
    )
    remaining = max(0, int(total) - int(paid))
    return {"invoice_id": invoice_id, "total": total, "paid": int(paid), "remaining": remaining, "count": int(count)}


@router.get("/{invoice_id}/pdf")
def export_pdf(invoice_id: int, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # Minimal valid PDF placeholder (header/footer with one empty page)
    pdf_bytes = b"%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<< /Type /Catalog /Pages 3 0 R >>endobj\n3 0 obj<< /Type /Pages /Kids [4 0 R] /Count 1 >>endobj\n4 0 obj<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595 842] >>endobj\ntrailer<< /Root 2 0 R >>\n%%EOF"
    return Response(content=pdf_bytes, media_type="application/pdf")
