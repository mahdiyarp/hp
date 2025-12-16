import os, sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')

from app import db
from app.db import Base
from app.main import app, get_current_user
from app import models

_engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
_SessionMaker = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

def override_get_db():
    Base.metadata.create_all(bind=_engine)
    session = _SessionMaker()
    try:
        yield session
    finally:
        session.close()

class DummyUser(models.User):
    def __init__(self):
        super().__init__(username='admin', role='Admin', role_id=1)

def override_user():
    return DummyUser()

app.dependency_overrides[db.get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_user

client = TestClient(app, raise_server_exceptions=False)

payload = {
    "invoice_type": "sale",
    "mode": "manual",
    "party_name": "API Customer",
    "tax_rate": 9,
    "discount_total": 100,
    "payment_terms_days": 5,
    "client_time": "1403/01/10",
    "client_calendar": "jalali",
    "items": [{"description": "Widget", "quantity": 2, "unit_price": 1000, "discount": 50}],
}

cr = client.post('/api/invoices/manual', json=payload)
print('CREATE', cr.status_code, cr.text)
created = cr.json()
upd = dict(payload)
upd['party_name'] = 'Updated Customer'
upd['discount_total'] = 0
pr = client.put(f"/api/invoices/{created['id']}", json=upd)
print('PUT', pr.status_code, pr.text)
