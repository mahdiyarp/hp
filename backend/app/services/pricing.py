from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from .. import models, schemas


def list_product_prices(session: Session, product_id: str) -> List[models.ProductPrice]:
    return (
        session.query(models.ProductPrice)
        .filter(models.ProductPrice.product_id == product_id)
        .order_by(models.ProductPrice.effective_at.desc(), models.ProductPrice.id.desc())
        .all()
    )


def get_effective_price(session: Session, product_id: str, price_type: str = 'sale', at: Optional[datetime] = None) -> Optional[models.ProductPrice]:
    at_dt = at or datetime.now(timezone.utc)
    return (
        session.query(models.ProductPrice)
        .filter(
            models.ProductPrice.product_id == product_id,
            models.ProductPrice.price_type == price_type,
            models.ProductPrice.effective_at <= at_dt,
        )
        .order_by(models.ProductPrice.effective_at.desc(), models.ProductPrice.id.desc())
        .first()
    )


def create_product_price(session: Session, product_id: str, payload: schemas.ProductPriceCreate) -> models.ProductPrice:
    # ensure product exists
    prod = session.query(models.Product).filter(models.Product.id == product_id).first()
    if not prod:
        raise ValueError('product not found')
    pp = models.ProductPrice(
        product_id=product_id,
        price_type=payload.price_type or 'sale',
        currency=payload.currency or 'IRR',
        amount=int(payload.amount),
        effective_at=payload.effective_at or datetime.now(timezone.utc),
    )
    session.add(pp)
    session.commit()
    session.refresh(pp)
    return pp


def update_product_price(session: Session, price_id: int, payload: schemas.ProductPriceUpdate) -> Optional[models.ProductPrice]:
    pp = session.query(models.ProductPrice).filter(models.ProductPrice.id == price_id).first()
    if not pp:
        return None
    data = payload.dict(exclude_unset=True)
    for k, v in data.items():
        if hasattr(pp, k) and v is not None:
            setattr(pp, k, v)
    session.add(pp)
    session.commit()
    session.refresh(pp)
    return pp


def delete_product_price(session: Session, price_id: int) -> bool:
    pp = session.query(models.ProductPrice).filter(models.ProductPrice.id == price_id).first()
    if not pp:
        return False
    session.delete(pp)
    session.commit()
    return True
