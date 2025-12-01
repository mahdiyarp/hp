from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import db, models, schemas
from ...services import pricing as pricing_service
from ..deps import get_current_user, require_roles

router = APIRouter(prefix="/products", tags=["Finance - Pricing"])


@router.get("/{product_id}/prices", response_model=List[schemas.ProductPriceOut])
def list_prices(
    product_id: str,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(["Admin", "Manager", "Accountant", "Viewer"]))
):
    return [schemas.ProductPriceOut.from_orm(p) for p in pricing_service.list_product_prices(session, product_id)]


@router.get("/pricing/effective", response_model=schemas.EffectivePriceOut)
def effective_price(
    product_id: str,
    price_type: str = 'sale',
    at: Optional[str] = None,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(["Admin", "Manager", "Accountant", "Viewer"]))
):
    at_dt = datetime.fromisoformat(at) if at else None
    pp = pricing_service.get_effective_price(session, product_id, price_type, at_dt)
    return schemas.EffectivePriceOut(
        product_id=product_id,
        price_type=price_type,
        at=at_dt,
        amount=pp.amount if pp else None,
        currency=pp.currency if pp else None,
    )


@router.post("/{product_id}/prices", response_model=schemas.ProductPriceOut)
def create_price(
    product_id: str,
    payload: schemas.ProductPriceCreate,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(["Admin", "Manager"]))
):
    try:
        pp = pricing_service.create_product_price(session, product_id, payload)
        return schemas.ProductPriceOut.from_orm(pp)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/prices/{price_id}", response_model=schemas.ProductPriceOut)
def update_price(
    price_id: int,
    payload: schemas.ProductPriceUpdate,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(["Admin", "Manager"]))
):
    pp = pricing_service.update_product_price(session, price_id, payload)
    if not pp:
        raise HTTPException(status_code=404, detail="Price not found")
    return schemas.ProductPriceOut.from_orm(pp)


@router.delete("/prices/{price_id}")
def delete_price(
    price_id: int,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(["Admin"]))
):
    ok = pricing_service.delete_product_price(session, price_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Price not found")
    return {"ok": True}
