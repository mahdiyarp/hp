import shutil
import tempfile
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ... import db, models, schemas
from ...ocr_parser import parse_invoice_file
from ...services import finance as finance_service
from ..deps import get_current_user, require_permissions, require_roles

router = APIRouter(prefix="/invoices", tags=["Finance - Invoices"])


@router.post("", response_model=schemas.InvoiceOut)
def create_invoice(
    payload: schemas.InvoiceCreate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"]))
):
    """Backward-compat: ایجاد فاکتور از مسیر ریشه /api/invoices"""
    return finance_service.create_invoice_manual(session, payload)


@router.post("/manual", response_model=schemas.InvoiceOut)
def create_invoice_manual(
    payload: schemas.InvoiceCreate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"])),
):
    return finance_service.create_invoice_manual(session, payload)


@router.post("/smart")
def parse_invoice_upload(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    try:
        tmp_dir = tempfile.mkdtemp(prefix="ocr-")
        destination = f"{tmp_dir}/{file.filename}"
        with open(destination, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
        draft = parse_invoice_file(destination)
        return {"draft": draft}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        try:
            file.file.close()
        except Exception:
            pass


@router.post("/from-draft", response_model=schemas.InvoiceOut)
def create_invoice_from_draft(
    payload: schemas.InvoiceCreate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"])),
):
    return finance_service.create_invoice_from_draft(session, payload)


@router.get("", response_model=List[schemas.InvoiceOut])
def list_invoices(
    q: Optional[str] = None,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])),
):
    return finance_service.list_invoices(session, q)


@router.get("/open-for-payment", response_model=List[schemas.InvoiceOut])
def list_open_invoices(
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"])),
):
    return finance_service.list_open_invoices(session)


@router.get("/{invoice_id}", response_model=schemas.InvoiceOut)
def get_invoice(
    invoice_id: int,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])),
):
    invoice = finance_service.get_invoice(session, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.get("/{invoice_id}/payments", response_model=List[schemas.PaymentOut])
def get_invoice_payments(
    invoice_id: int,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])),
):
    invoice = finance_service.get_invoice(session, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return finance_service.get_invoice_payments(session, invoice_id)


@router.patch("/{invoice_id}", response_model=schemas.InvoiceOut)
def patch_invoice(
    invoice_id: int,
    payload: dict,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"])),
):
    invoice = finance_service.update_invoice(session, invoice_id, payload)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.put("/{invoice_id}", response_model=schemas.InvoiceOut)
def put_invoice(
    invoice_id: int,
    payload: dict,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"]))
):
    invoice = finance_service.update_invoice(session, invoice_id, payload)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/{invoice_id}/finalize", response_model=schemas.InvoiceOut)
def finalize_invoice(
    invoice_id: int,
    payload: Optional[dict] = None,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"])),
):
    client_time = None
    if payload and isinstance(payload, dict):
        client_time_str = payload.get("client_time")
        if client_time_str:
            try:
                client_time = datetime.fromisoformat(client_time_str)
            except Exception:
                client_time = None
    try:
        invoice = finance_service.finalize_invoice(session, invoice_id, client_time=client_time)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return finance_service.get_invoice(session, invoice_id)


@router.patch("/{invoice_id}/status", response_model=schemas.InvoiceOut)
def set_invoice_status(
    invoice_id: int,
    payload: dict,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"]))
):
    status = (payload or {}).get("status")
    if status == "final":
        try:
            inv = finance_service.finalize_invoice(session, invoice_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return finance_service.get_invoice(session, invoice_id)
    elif status == "draft":
        inv = finance_service.update_invoice(session, invoice_id, {"status": "draft"})
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return inv
    else:
        raise HTTPException(status_code=400, detail="Invalid status")


@router.post("/{invoice_id}/duplicate", response_model=schemas.InvoiceOut)
def duplicate_invoice(
    invoice_id: int,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"]))
):
    dup = finance_service.get_invoice(session, invoice_id)
    if not dup:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # Use CRUD helper to duplicate
    from ... import crud
    created = crud.duplicate_invoice(session, invoice_id)
    if not created:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return created


@router.get("/{invoice_id}/export")
def export_invoice(
    invoice_id: int,
    format: str = "json",
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"]))
):
    inv = finance_service.get_invoice(session, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    from fastapi.responses import JSONResponse
    if format == "json":
        # Return a lightweight JSON export
        data = {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "status": inv.status,
            "total": inv.total,
            "party_name": inv.party_name,
        }
        return JSONResponse(data)
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager"]))
):
    inv = finance_service.get_invoice(session, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # Remove items then invoice
    session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice_id).delete()
    session.query(models.Invoice).filter(models.Invoice.id == invoice_id).delete()
    session.commit()
    return {"ok": True}
