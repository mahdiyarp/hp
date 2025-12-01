import os
import pytest
from datetime import date, timedelta
from app import db, crud
from app import models, schemas
from app.accounting import fiscal_service

# Force isolated engine for this integration test
os.environ["TEST_ISOLATED_ENGINE"] = "1"


def test_invoice_finalize_updates_ledger_and_person_balance():
    # use in-memory engine/session for integration-level test
    engine = db.create_test_engine()
    Session = db.create_test_session(engine)
    session = Session

    # ensure there is an open/current fiscal year for postings
    fiscal_service.create_fiscal_year(
        session,
        title='FY-TEST',
        start_date=date.today() - timedelta(days=30),
        end_date=date.today() + timedelta(days=30),
        is_current=True,
    )

    # create a product
    p = crud.create_product(session, schemas.ProductCreate(name='TestProd', unit='pcs', group='test', code='TP-001'))
    p.inventory = 100
    session.add(p)
    session.commit()

    # create a person
    person = crud.create_person(session, schemas.PersonCreate(name='Test Person', kind='customer'))

    # create invoice with one item
    item = schemas.InvoiceItemCreate(description='TestProd', quantity=2, unit='pcs', unit_price=500, product_id=p.id)
    inv_payload = schemas.InvoiceCreate(invoice_type='sale', mode='manual', party_id=person.id, party_name=person.name, items=[item])
    inv = crud.create_invoice_manual(session, inv_payload)

    # finalize the invoice
    finalized = crud.finalize_invoice(session, inv.id)
    assert finalized.status == 'final'

    # ledger should have entry for this invoice
    entries = crud.get_ledger_entries(session, ref_type='invoice')
    assert any(e.ref_id == str(inv.id) for e in entries)

    # product inventory should decrease
    prod = session.query(models.Product).filter(models.Product.id == p.id).first()
    assert prod.inventory == 98

    # person ledger balances include this invoice amount
    ledgers = session.query(models.LedgerEntry).filter(models.LedgerEntry.party_id == person.id).all()
    assert any(l.ref_id == str(inv.id) for l in ledgers)
