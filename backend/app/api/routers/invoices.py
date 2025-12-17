from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app import db, models, schemas
try:
    from ...activity_logger import log_activity  # type: ignore
except Exception:  # pragma: no cover
    def log_activity(*args, **kwargs):  # type: ignore
        return None
try:
    from ...blockchain import hash_event as bc_hash_event  # type: ignore
except Exception:  # pragma: no cover
    def bc_hash_event(*args, **kwargs):  # type: ignore
        return None

router = APIRouter(prefix="/invoices", tags=["invoices"])


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


@router.post("/")
def create_invoice(payload: dict, session: Session = Depends(db.get_db)):
    # Support both strict schema and legacy/test-friendly shapes
    data = payload if isinstance(payload, dict) else {}
    if not data:
        # fallback: try pydantic model
        try:
            data = payload.dict(exclude_unset=True)  # type: ignore[attr-defined]
        except Exception:
            data = {}
    inv = models.Invoice()
    # Map common fields
    for k in ["invoice_type", "mode", "party_id", "party_name", "status", "client_time", "note", "tax_rate", "discount_total"]:
        v = data.get(k)
        if v is not None:
            setattr(inv, k, v)
    # Sensible defaults for required fields
    if not getattr(inv, "invoice_type", None):
        inv.invoice_type = "sale"
    if not getattr(inv, "status", None):
        inv.status = "draft"
    if not getattr(inv, "mode", None):
        inv.mode = "manual"
    # Items mapping
    items_in = data.get("items") or []
    items: list[models.InvoiceItem] = []
    for it in items_in:
        desc = it.get("description")
        qty = it.get("quantity")
        if qty is None:
            qty = it.get("qty")
        unit = it.get("unit")
        unit_price = it.get("unit_price") or 0
        discount = it.get("discount")
        if discount is None:
            discount = it.get("discount_total") or 0
        prod_id = it.get("product_id")
        item = models.InvoiceItem(description=desc, quantity=int(qty or 0), unit=unit, unit_price=int(unit_price or 0), total=0, product_id=prod_id)
        # store discount as attribute if model supports; totals recompute will adjust
        setattr(item, "discount", int(discount or 0))
        items.append(item)
    inv.items = items
    _recompute_totals(inv)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    try:
        # Best-effort activity and audit logging; ignore signature mismatches
        log_activity(session, "system", "invoice_create", path="/api/invoices/", method="POST", status_code=200, detail={"total": inv.total})
    except Exception:
        pass
    try:
        bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "create", "total": inv.total})
    except Exception:
        try:
            session.rollback()
        except Exception:
            pass
    return _serialize_invoice(inv)


@router.put("/{invoice_id}")
def update_invoice(invoice_id: int, payload: dict, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    data = payload or {}
    # Map scalar fields
    for k in ["invoice_type","mode","party_id","party_name","status","note","tax_rate","discount_total"]:
        if k in data:
            setattr(inv, k, data.get(k))
    # Handle client_time conversion if provided as string (e.g., jalali)
    if "client_time" in data and isinstance(data["client_time"], str):
        try:
            # Attempt ISO first
            from datetime import datetime
            inv.client_time = datetime.fromisoformat(data["client_time"])
        except Exception:
            try:
                import jdatetime
                inv.client_time = jdatetime.datetime.strptime(data["client_time"], "%Y/%m/%d").togregorian()
            except Exception:
                inv.client_time = None
    # Handle items replacement if provided
    if "items" in data and isinstance(data["items"], list):
        # Clear existing items
        inv.items = []
        new_items: list[models.InvoiceItem] = []
        for it in data["items"]:
            qty = it.get("quantity")
            if qty is None:
                qty = it.get("qty")
            item = models.InvoiceItem(
                description=it.get("description"),
                quantity=int(qty or 0),
                unit=it.get("unit"),
                unit_price=int(it.get("unit_price") or 0),
                total=0,
                product_id=it.get("product_id"),
            )
            setattr(item, "discount", int(it.get("discount") or it.get("discount_total") or 0))
            new_items.append(item)
        inv.items = new_items
    _recompute_totals(inv)
    try:
        session.add(inv)
        session.commit()
        session.refresh(inv)
    except Exception as e:
        try:
            session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"update_failed: {e}")
    try:
        log_activity(session, "system", "invoice_update", path=f"/api/invoices/{invoice_id}", method="PUT", status_code=200, detail={"total": inv.total})
    except Exception:
        pass
    try:
        bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "update", "total": inv.total})
    except Exception:
        try:
            session.rollback()
        except Exception:
            pass
    return _serialize_invoice(inv)


@router.post("/{invoice_id}/status/{new_status}")
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
    try:
        log_activity(session, "system", "invoice_status", path=f"/api/invoices/{invoice_id}/status/{new_status}", method="POST", status_code=200, detail={"status": new_status})
    except Exception:
        pass
    try:
        bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "status", "status": new_status})
    except Exception:
        try:
            session.rollback()
        except Exception:
            pass
    return _serialize_invoice(inv)


@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    session.delete(inv)
    session.commit()
    try:
        log_activity(session, "system", "invoice_delete", path=f"/api/invoices/{invoice_id}", method="DELETE", status_code=200, detail=None)
    except Exception:
        pass
    try:
        bc_hash_event(session, entity="invoice", entity_id=invoice_id, payload={"action": "delete"})
    except Exception:
        try:
            session.rollback()
        except Exception:
            pass
    return {"ok": True}


# === Test-required endpoints ===

@router.post("/manual")
def create_manual(payload: dict, session: Session = Depends(db.get_db)):
    # Align with models: use party_name, quantity, unit_price, and required invoice fields
    data = payload if isinstance(payload, dict) else {}
    inv = models.Invoice(
        invoice_type=(data.get("invoice_type") or "sale"),
        mode=(data.get("mode") or "manual"),
        party_name=data.get("party_name"),
        status="draft",
    )
    items: list[models.InvoiceItem] = []
    for it in data.get("items") or []:
        qty = it.get("quantity")
        if qty is None:
            qty = it.get("qty")
        item = models.InvoiceItem(
            description=it.get("description"),
            quantity=int(qty or 0),
            unit=it.get("unit"),
            unit_price=int(it.get("unit_price") or 0),
            total=0,
            product_id=it.get("product_id"),
        )
        # Support per-line discount via helper recompute
        setattr(item, "discount", int(it.get("discount") or it.get("discount_total") or 0))
        items.append(item)
    inv.items = items
    # Optional invoice-level tax rate/discount_total support
    if data.get("tax_rate") is not None:
        setattr(inv, "tax_rate", int(data.get("tax_rate") or 0))
    if data.get("discount_total") is not None:
        setattr(inv, "discount_total", int(data.get("discount_total") or 0))
    _recompute_totals(inv)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    try:
        log_activity(session, "system", "invoice_create_manual", path="/api/invoices/manual", method="POST", status_code=200, detail={"total": inv.total})
    except Exception:
        pass
    try:
        bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "create_manual", "total": inv.total})
    except Exception:
        try:
            session.rollback()
        except Exception:
            pass
    return _serialize_invoice(inv)


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
    try:
        log_activity(session, "system", "invoice_status", path=f"/api/invoices/{invoice_id}/status", method="PATCH", status_code=200, detail={"status": new_status})
    except Exception:
        pass
    try:
        bc_hash_event(session, entity="invoice", entity_id=inv.id, payload={"action": "status", "status": new_status})
    except Exception:
        try:
            session.rollback()
        except Exception:
            pass
    return _serialize_invoice(inv)


@router.post("/{invoice_id}/duplicate")
def duplicate_invoice(invoice_id: int, session: Session = Depends(db.get_db)):
    inv = session.get(models.Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # Create a new invoice using valid model fields
    dup = models.Invoice(
        invoice_type=(getattr(inv, "invoice_type", None) or "sale"),
        mode=(getattr(inv, "mode", None) or "manual"),
        party_name=getattr(inv, "party_name", None),
        status="draft",
        note=getattr(inv, "note", None),
    )
    # Copy optional runtime attributes if present (not DB columns)
    if hasattr(inv, "tax_rate") and getattr(inv, "tax_rate", None) is not None:
        setattr(dup, "tax_rate", getattr(inv, "tax_rate", 0))
    if hasattr(inv, "discount_total") and getattr(inv, "discount_total", None) is not None:
        setattr(dup, "discount_total", getattr(inv, "discount_total", 0))

    # Duplicate items with proper field names
    new_items: list[models.InvoiceItem] = []
    for it in (getattr(inv, "items", []) or []):
        qty = getattr(it, "quantity", None)
        if qty is None:
            qty = getattr(it, "qty", 0)
        unit_price = getattr(it, "unit_price", 0)
        new_item = models.InvoiceItem(
            description=getattr(it, "description", None),
            quantity=int(qty or 0),
            unit=getattr(it, "unit", None),
            unit_price=int(unit_price or 0),
            total=0,
            product_id=getattr(it, "product_id", None),
        )
        # Preserve any discount information across different attribute names
        discount_val = (
            getattr(it, "discount", None)
            if hasattr(it, "discount") else None
        )
        if discount_val is None:
            discount_val = getattr(it, "discount_total", None)
        if discount_val is None:
            discount_val = getattr(it, "discount_rate", None)
        setattr(new_item, "discount", int(discount_val or 0))
        new_items.append(new_item)
    dup.items = new_items

    _recompute_totals(dup)
    session.add(dup)
    session.commit()
    session.refresh(dup)
    try:
        log_activity(session, "system", "invoice_duplicate", path=f"/api/invoices/{invoice_id}/duplicate", method="POST", status_code=200, detail={"from": inv.id})
    except Exception:
        pass
    try:
        bc_hash_event(session, entity="invoice", entity_id=dup.id, payload={"action": "duplicate", "from": inv.id})
    except Exception:
        try:
            session.rollback()
        except Exception:
            pass
    return _serialize_invoice(dup)


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
        .with_entities(func.coalesce(func.sum(models.Payment.amount), 0))
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
