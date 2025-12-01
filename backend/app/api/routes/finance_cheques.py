from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import db, models, schemas
from ...services import cheques as cheques_service
from ..deps import get_current_user, require_permissions, require_roles

router = APIRouter(prefix="/cheques", tags=["Finance - Cheques"])


@router.get("", response_model=List[schemas.ChequeOut])
def list_cheques(
    status: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    near_due_days: Optional[int] = None,
    overdue: Optional[bool] = None,
    limit: int = 100,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(["Admin", "Manager", "Accountant", "Viewer"]))
):
    rows = cheques_service.list_cheques(session, status, start, end, near_due_days, overdue, limit)
    # enrich with jalali strings in response
    out: List[schemas.ChequeOut] = []
    try:
        import jdatetime  # type: ignore
    except Exception:
        jdatetime = None
    for ch in rows:
        item = schemas.ChequeOut.from_orm(ch)
        # attach minimal payment
        if ch.payment:
            item.payment = schemas.ChequePaymentMini.from_orm(ch.payment)
        if jdatetime:
            if ch.due_date:
                d = ch.due_date.astimezone().date() if hasattr(ch.due_date, 'astimezone') else ch.due_date
                try:
                    j = jdatetime.date.fromgregorian(date=d)
                    item.due_date_jalali = j.strftime('%Y-%m-%d')
                except Exception:
                    pass
            if ch.issue_date:
                d = ch.issue_date.astimezone().date() if hasattr(ch.issue_date, 'astimezone') else ch.issue_date
                try:
                    j = jdatetime.date.fromgregorian(date=d)
                    item.issue_date_jalali = j.strftime('%Y-%m-%d')
                except Exception:
                    pass
        out.append(item)
    return out


@router.get("/{cheque_id}", response_model=schemas.ChequeOut)
def get_cheque(
    cheque_id: int,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(["Admin", "Manager", "Accountant", "Viewer"]))
):
    ch = cheques_service.get_cheque(session, cheque_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Cheque not found")
    try:
        import jdatetime  # type: ignore
    except Exception:
        jdatetime = None
    item = schemas.ChequeOut.from_orm(ch)
    if ch.payment:
        item.payment = schemas.ChequePaymentMini.from_orm(ch.payment)
    if jdatetime:
        if ch.due_date:
            d = ch.due_date.astimezone().date() if hasattr(ch.due_date, 'astimezone') else ch.due_date
            try:
                j = jdatetime.date.fromgregorian(date=d)
                item.due_date_jalali = j.strftime('%Y-%m-%d')
            except Exception:
                pass
        if ch.issue_date:
            d = ch.issue_date.astimezone().date() if hasattr(ch.issue_date, 'astimezone') else ch.issue_date
            try:
                j = jdatetime.date.fromgregorian(date=d)
                item.issue_date_jalali = j.strftime('%Y-%m-%d')
            except Exception:
                pass
    return item


@router.post("", response_model=schemas.ChequeOut)
def create_cheque(
    payload: schemas.ChequeCreate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(["Admin", "Manager", "Accountant"]))
):
    try:
        ch = cheques_service.create_cheque(session, payload)
        return cheques_service.get_cheque(session, ch.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/{cheque_id}", response_model=schemas.ChequeOut)
def update_cheque(
    cheque_id: int,
    payload: schemas.ChequeUpdate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(["Admin", "Manager", "Accountant"]))
):
    ch = cheques_service.update_cheque(session, cheque_id, payload)
    if not ch:
        raise HTTPException(status_code=404, detail="Cheque not found")
    return cheques_service.get_cheque(session, cheque_id)


@router.delete("/{cheque_id}")
def delete_cheque(
    cheque_id: int,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(["Admin", "Manager", "Accountant"]))
):
    ok = cheques_service.delete_cheque(session, cheque_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Cheque not found")
    return {"ok": True}
