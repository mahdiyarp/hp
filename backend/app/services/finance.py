from typing import List, Optional

from sqlalchemy.orm import Session

from .. import crud, models, schemas


# ==================== Invoice helpers ==================== #

def create_invoice_manual(session: Session, payload: schemas.InvoiceCreate) -> models.Invoice:
    return crud.create_invoice_manual(session, payload)


def create_invoice_from_draft(session: Session, payload: schemas.InvoiceCreate) -> models.Invoice:
    return crud.create_invoice_manual(session, payload)


def list_invoices(session: Session, query: Optional[str]) -> List[models.Invoice]:
    invoices = crud.get_invoices(session, q=query)
    for inv in invoices:
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
        inv.items = items
    return invoices


def list_open_invoices(session: Session) -> List[models.Invoice]:
    invoices = (
        session.query(models.Invoice)
        .filter(models.Invoice.status.in_(["draft", "final"]))
        .order_by(models.Invoice.server_time.desc())
        .limit(100)
        .all()
    )
    for inv in invoices:
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
        inv.items = items
    return invoices


def get_invoice(session: Session, invoice_id: int) -> models.Invoice:
    invoice = crud.get_invoice(session, invoice_id)
    if not invoice:
        return None
    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice.id).all()
    invoice.items = items
    return invoice


def get_invoice_payments(session: Session, invoice_id: int) -> List[models.Payment]:
    invoice = crud.get_invoice(session, invoice_id)
    if not invoice:
        return []
    payments = (
        session.query(models.Payment)
        .filter(models.Payment.reference.ilike(f"%{invoice.invoice_number}%"))
        .all()
    )
    return payments


def update_invoice(session: Session, invoice_id: int, data: dict) -> Optional[models.Invoice]:
    return crud.update_invoice(session, invoice_id, data)


def finalize_invoice(session: Session, invoice_id: int, client_time=None):
    return crud.finalize_invoice(session, invoice_id, client_time=client_time)


# ==================== Payment helpers ==================== #

def create_payment_manual(session: Session, payload: schemas.PaymentCreate) -> models.Payment:
    return crud.create_payment_manual(session, payload)


def list_payments(session: Session, query: Optional[str]) -> List[models.Payment]:
    return crud.get_payments(session, q=query)


def get_payment(session: Session, payment_id: int) -> Optional[models.Payment]:
    return crud.get_payment(session, payment_id)


def finalize_payment(session: Session, payment_id: int, client_time=None):
    return crud.finalize_payment(session, payment_id, client_time=client_time)
