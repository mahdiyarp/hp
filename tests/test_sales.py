import os
import sys
import pytest
from datetime import datetime, timezone

# Ensure backend package importable when running tests from repo root
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

try:
    from app import db as app_db
    from app import crud, models, schemas
except Exception:
    pytest.skip('backend deps not installed (skipping DB tests)', allow_module_level=True)


@pytest.fixture(scope='module')
def engine_and_session():
    engine = app_db.create_test_engine() if hasattr(app_db, 'create_test_engine') else None
    if engine is None:
        pytest.skip('no test engine helper available')
    session = app_db.create_test_session(engine)
    try:
        yield session
    finally:
        session.close()


def test_sale_order_create_and_finalize(engine_and_session):
    s = engine_and_session
    # Create a product and a person
    p = models.Product(id='prod-1', name='Test Product', name_norm='testproduct', code='TP-001', unit='pcs', group='test', description='x')
    per = models.Person(id='per-1', name='Test Person', name_norm='testperson', kind='customer')
    s.add_all([p, per])
    s.commit()

    # Ensure inventory sufficient
    p.inventory = 10
    s.add(p)
    s.commit()

    # Create sale order
    so = crud.create_sale_order(s, schemas.SaleOrderCreate(
        party_id=per.id,
        party_name=per.name,
        client_time=datetime.now(timezone.utc),
        items=[schemas.SaleOrderItemCreate(
            description='Test Product',
            quantity=2,
            unit='pcs',
            unit_price=5000,
            product_id=p.id
        )],
        note='Test SO'
    ))

    assert so.id is not None
    assert so.status == 'draft'
    assert len(so.items) == 1
    assert so.subtotal == 2 * 5000
    assert so.total == 2 * 5000

    # Finalize sale order (should create and finalize invoice)
    so2 = crud.finalize_sale_order(s, so.id, client_time=datetime.now(timezone.utc))
    assert so2 is not None
    assert so2.status == 'final'
    assert so2.invoice_id is not None

    # Invoice checks
    inv = crud.get_invoice(s, so2.invoice_id)
    assert inv is not None
    assert inv.status == 'final'
    assert inv.total == 2 * 5000

    # Inventory reduced by 2
    p2 = s.query(models.Product).filter(models.Product.id == p.id).first()
    assert int(p2.inventory or 0) == 8

    # Ledger entry created for invoice
    le = s.query(models.LedgerEntry).filter(
        models.LedgerEntry.ref_type == 'invoice',
        models.LedgerEntry.ref_id == str(inv.id)
    ).first()
    assert le is not None
    assert le.debit_account == 'AccountsReceivable'
    assert le.credit_account == 'Sales'
    assert le.amount == 2 * 5000
