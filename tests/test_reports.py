import os, sys, pytest
from datetime import datetime, timezone, timedelta

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

try:
    from app import db as app_db
    from app import models
    from app.api.routes import reports
except Exception:
    pytest.skip('backend deps not installed (skipping reports tests)', allow_module_level=True)


@pytest.fixture(scope='module')
def session():
    engine = app_db.create_test_engine() if hasattr(app_db, 'create_test_engine') else None
    if engine is None:
        pytest.skip('no test engine helper available')
    s = app_db.create_test_session(engine)
    try:
        yield s
    finally:
        s.close()


def _make_sale_invoice(session, party_id: str, party_name: str, total: int, days_ago: int = 0):
    """Create a finalized sale invoice with one item for reporting tests."""
    server_time = datetime.now(timezone.utc) - timedelta(days=days_ago)
    inv = models.Invoice(
        invoice_type='sale',
        mode='manual',
        party_id=party_id,
        party_name=party_name,
        client_time=server_time,
        server_time=server_time,
        status='final',
        invoice_number=f'S-{server_time.strftime("%Y%m%d")}-{party_id}-{days_ago:02d}',
        total=total,
        subtotal=total,
    )
    session.add(inv)
    session.commit()
    # one item (not required by report logic but keeps schema consistent)
    it = models.InvoiceItem(
        invoice_id=inv.id,
        description='Test',
        quantity=1,
        unit='unit',
        unit_price=total,
        total=total,
    )
    session.add(it)
    session.commit()
    return inv


def test_sales_summary_basic(session):
    # Prepare data
    _make_sale_invoice(session, 'c1', 'Cust A', 10000, days_ago=0)
    _make_sale_invoice(session, 'c2', 'Cust B', 20000, days_ago=1)
    _make_sale_invoice(session, 'c3', 'Cust C', 5000, days_ago=2)
    # Call endpoint function directly
    out = reports.sales_summary(session=session, current_user=None)
    assert out['count'] >= 3
    assert out['total'] >= 35000
    assert out['max'] >= 20000
    assert out['min'] <= 10000
    assert out['average'] >= 10000


def test_top_customers(session):
    # Additional invoices to influence ranking
    _make_sale_invoice(session, 'c1', 'Cust A', 15000, days_ago=3)
    _make_sale_invoice(session, 'c2', 'Cust B', 1000, days_ago=4)
    rows = reports.top_customers(session=session, current_user=None, limit=2)
    assert len(rows) == 2
    # Ensure sorted by total descending
    totals = [r['total'] for r in rows]
    assert totals == sorted(totals, reverse=True)


def test_sales_trends(session):
    out = reports.sales_trends(session=session, current_user=None, days=5)
    assert out['days'] == 5
    assert 'series' in out
    assert len(out['series']) == 6  # inclusive day range
    # At least one bucket should have non-zero total
    assert any(pt['total'] > 0 for pt in out['series'])
