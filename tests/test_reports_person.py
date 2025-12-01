import os
import sys
import pytest
from datetime import datetime, timezone

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
    # Seed admin user and a person
    admin = models.User(id=1, username='admin', hashed_password='x', role_id=1, role='Admin', is_active=True)
    session.add(admin)
    person = models.Person(id='c1', name='Customer1', name_norm='customer1')
    session.add(person)
    # Two invoices: one sale, one purchase
    sale = models.Invoice(invoice_number='S-1', invoice_type='sale', status='final', total=2000,
                          party_id='c1', party_name='Customer1', server_time=datetime.now(timezone.utc))
    purchase = models.Invoice(invoice_number='P-1', invoice_type='purchase', status='final', total=500,
                              party_id='c1', party_name='Customer1', server_time=datetime.now(timezone.utc))
    session.add_all([sale, purchase])
    session.commit()
    yield session
    session.close()


@pytest.fixture()
def client(test_session):
    def _get_db():
        try:
            yield test_session
        finally:
            pass

    def _fake_current_user():
        return test_session.query(models.User).filter(models.User.id == 1).first()

    app.dependency_overrides[deps.get_current_user] = _fake_current_user
    app.dependency_overrides[app_db.get_db] = _get_db
    return TestClient(app)


def test_reports_person_totals(client):
    r = client.get('/api/reports/person', params={'party_id': 'c1'})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data['party_id'] == 'c1'
    assert data['total_sale'] == 2000
    assert data['total_purchase'] == 500
    assert data['net'] == 1500
