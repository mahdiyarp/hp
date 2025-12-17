import shutil
import tempfile
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ... import db, models, schemas
from ...ocr_parser import parse_payment_file
from ...services import finance as finance_service
from ..deps import get_current_user, require_permissions, require_roles

router = APIRouter(prefix="/payments", tags=["Finance - Payments"])


@router.post("/manual", response_model=schemas.PaymentOut)
def create_payment_manual(
    payload: schemas.PaymentCreate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_permissions(["finance_create"])),
):
    try:
        return finance_service.create_payment_manual(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/smart")
def parse_payment_upload(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    try:
        tmp_dir = tempfile.mkdtemp(prefix="ocr-")
        destination = f"{tmp_dir}/{file.filename}"
        with open(destination, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
        draft = parse_payment_file(destination)
        return {"draft": draft}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        try:
            file.file.close()
        except Exception:
            pass


@router.post("/from-draft", response_model=schemas.PaymentOut)
def create_payment_from_draft(
    payload: schemas.PaymentCreate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_permissions(["finance_create"])),
):
    return finance_service.create_payment_manual(session, payload)


@router.get("", response_model=List[schemas.PaymentOut])
def list_payments(
    q: Optional[str] = None,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_permissions(["finance_view"])),
):
    return finance_service.list_payments(session, q)


@router.get("/count")
def payments_count(
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_permissions(["finance_view"]))
):
    try:
        return {"count": session.query(models.Payment).count()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{payment_id}", response_model=schemas.PaymentOut)
def get_payment(
    payment_id: int,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_permissions(["finance_view"])),
):
    payment = finance_service.get_payment(session, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.patch("/{payment_id}", response_model=schemas.PaymentOut)
def patch_payment(
    payment_id: int,
    payload: dict,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_permissions(["finance_edit"])),
):
    payment = session.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    for key, value in payload.items():
        if hasattr(payment, key):
            setattr(payment, key, value)
    session.add(payment)
    session.commit()
    session.refresh(payment)
    return payment


@router.post("/{payment_id}/finalize", response_model=schemas.PaymentOut)
def finalize_payment(
    payment_id: int,
    payload: Optional[dict] = None,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_permissions(["finance_edit"])),
):
    client_time = None
    if payload and isinstance(payload, dict):
        client_time_str = payload.get("client_time")
        if client_time_str:
            try:
                client_time = datetime.fromisoformat(client_time_str)
            except Exception:
                client_time = None
    payment = finance_service.finalize_payment(session, payment_id, client_time=client_time)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment
