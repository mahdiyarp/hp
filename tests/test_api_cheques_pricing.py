import os
import sys
import pytest
from datetime import datetime, timedelta, timezone

# Ensure backend package importable
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

try:
    from fastapi.testclient import TestClient
    from app import db as app_db
    from app import models
    from app.main import app
    from app.api import deps
except Exception:
    pytest.skip('backend deps not installed (skipping API tests)', allow_module_level=True)


@pytest.fixture(scope='module')
def test_session():
    engine = app_db.create_test_engine()
    session = app_db.create_test_session(engine)
    # Seed minimal admin user
    admin = models.User(id=1, username='admin', hashed_password='x', role_id=1, role='Admin', is_active=True)
    session.add(admin)
    session.commit()
    yield session
    session.close()


@pytest.fixture()
def client(test_session):
    # Override get_db to use our test session
    def _get_db():
        try:
            yield test_session
        finally:
            pass

    # Override auth to return admin
    def _fake_current_user():
        return test_session.query(models.User).filter(models.User.id == 1).first()

    app.dependency_overrides[deps.get_current_user] = _fake_current_user
    app.dependency_overrides[app_db.get_db] = _get_db
    return TestClient(app)


def test_pricing_effective_endpoint(client, test_session):
    # Create product and prices
    p = models.Product(id='p1', name='Prod1', name_norm='prod1', unit='pcs', group='g')
    test_session.add(p)
    test_session.commit()

    past = datetime.now(timezone.utc) - timedelta(days=10)
    now = datetime.now(timezone.utc)

    pp1 = models.ProductPrice(product_id='p1', price_type='sale', currency='IRR', amount=1000, effective_at=past)
    pp2 = models.ProductPrice(product_id='p1', price_type='sale', currency='IRR', amount=1200, effective_at=now)
    test_session.add_all([pp1, pp2])
    test_session.commit()

    r = client.get('/api/products/pricing/effective', params={'product_id': 'p1', 'price_type': 'sale', 'at': now.isoformat()})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data['amount'] == 1200
    assert data['currency'] == 'IRR'


def test_cheques_overdue_filter(client, test_session):
    # Create a payment and overdue cheque
    pay = models.Payment(
        direction='in', mode='manual', amount=5000, party_id='c1', party_name='Cust', method='cheque', status='draft',
        client_time=datetime.now(timezone.utc) - timedelta(days=5), server_time=datetime.now(timezone.utc) - timedelta(days=5)
    )
    test_session.add(pay)
    test_session.commit()
    test_session.refresh(pay)

    ch = models.Cheque(payment_id=pay.id, status='pending', due_date=datetime.now(timezone.utc) - timedelta(days=1))
    test_session.add(ch)
    test_session.commit()

    r = client.get('/api/cheques', params={'overdue': True})
    assert r.status_code == 200, r.text
    items = r.json()
    assert any(it['id'] == ch.id for it in items)
