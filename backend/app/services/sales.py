from typing import List, Optional

from sqlalchemy.orm import Session

from .. import crud, models, schemas


def create_sale_order(session: Session, payload: schemas.SaleOrderCreate) -> models.SaleOrder:
    return crud.create_sale_order(session, payload)


def list_sale_orders(session: Session, q: Optional[str] = None) -> List[models.SaleOrder]:
    return crud.get_sale_orders(session, q=q)


def get_sale_order(session: Session, so_id: int) -> Optional[models.SaleOrder]:
    return crud.get_sale_order(session, so_id)


def update_sale_order(session: Session, so_id: int, data: dict) -> Optional[models.SaleOrder]:
    return crud.update_sale_order(session, so_id, data)


def finalize_sale_order(session: Session, so_id: int, client_time=None):
    return crud.finalize_sale_order(session, so_id, client_time=client_time)
