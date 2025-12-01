from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import db, models, schemas
from ...services import sales as sales_service
from ..deps import require_roles


router = APIRouter(prefix="/sales", tags=["Sales - Orders"])


@router.post("/orders", response_model=schemas.SaleOrderOut)
def create_sale_order(
    payload: schemas.SaleOrderCreate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager", "Salesman", "Accountant"]))
):
    return sales_service.create_sale_order(session, payload)


@router.get("/orders", response_model=List[schemas.SaleOrderOut])
def list_sale_orders(
    q: Optional[str] = None,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager", "Salesman", "Accountant", "Viewer"]))
):
    return sales_service.list_sale_orders(session, q)


@router.get("/orders/{so_id}", response_model=schemas.SaleOrderOut)
def get_sale_order(
    so_id: int,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager", "Salesman", "Accountant", "Viewer"]))
):
    so = sales_service.get_sale_order(session, so_id)
    if not so:
        raise HTTPException(status_code=404, detail="Sale order not found")
    return so


@router.patch("/orders/{so_id}", response_model=schemas.SaleOrderOut)
def patch_sale_order(
    so_id: int,
    payload: dict,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager", "Salesman", "Accountant"]))
):
    so = sales_service.update_sale_order(session, so_id, payload)
    if not so:
        raise HTTPException(status_code=404, detail="Sale order not found")
    return so


@router.post("/orders/{so_id}/finalize", response_model=schemas.SaleOrderOut)
def finalize_sale_order(
    so_id: int,
    payload: Optional[dict] = None,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager", "Salesman", "Accountant"]))
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
        so = sales_service.finalize_sale_order(session, so_id, client_time=client_time)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not so:
        raise HTTPException(status_code=404, detail="Sale order not found")
    return sales_service.get_sale_order(session, so_id)
