import os
import sys

import pytest
import types
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

if 'jinja2' not in sys.modules:
    class DummyLoader:
        def __init__(self, searchpath=None):
            self.searchpath = searchpath

    class DummyTemplate:
        def render(self, *args, **kwargs):
            return ""
        async def render_async(self, *args, **kwargs):
            return ""

    class DummyEnv:
        def __init__(self, **kwargs):
            self.loader = kwargs.get('loader')
            self.globals = {}
        def get_template(self, name):
            return DummyTemplate()

    def select_autoescape(*args, **kwargs):
        return False

    def pass_context(fn):
        return fn

    fake = types.SimpleNamespace(
        Environment=DummyEnv,
        FileSystemLoader=DummyLoader,
        select_autoescape=select_autoescape,
        pass_context=pass_context,
        contextfunction=pass_context,
        Markup=str,
    )
    sys.modules['jinja2'] = fake

from app import db, models
from app.db import Base
from app.main import app, get_current_user

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
        super().__init__(username="admin", role="Admin", role_id=1)


def override_user():
    return DummyUser()

@pytest.fixture(autouse=True)
def _override_dependencies():
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)

    prev_db = app.dependency_overrides.get(db.get_db)
    prev_user = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[db.get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_user
    try:
        yield
    finally:
        if prev_db is not None:
            app.dependency_overrides[db.get_db] = prev_db
        else:
            app.dependency_overrides.pop(db.get_db, None)
        if prev_user is not None:
            app.dependency_overrides[get_current_user] = prev_user
        else:
            app.dependency_overrides.pop(get_current_user, None)

client = TestClient(app, raise_server_exceptions=False)


def test_invoice_api_crud_flow():
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

    create_resp = client.post("/api/invoices/manual", json=payload)
    assert create_resp.status_code == 200
    created = create_resp.json()
    inv_id = created["id"]
    assert created["total"] > 0

    # Update invoice via PUT
    updated_payload = dict(payload)
    updated_payload["party_name"] = "Updated Customer"
    updated_payload["discount_total"] = 0
    put_resp = client.put(f"/api/invoices/{inv_id}", json=updated_payload)
    assert put_resp.status_code == 200
    put_data = put_resp.json()
    assert put_data["party_name"] == "Updated Customer"

    # Finalize invoice via status patch
    status_resp = client.patch(f"/api/invoices/{inv_id}/status", json={"status": "final"})
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "final"

    # Duplicate invoice
    dup_resp = client.post(f"/api/invoices/{inv_id}/duplicate")
    assert dup_resp.status_code == 200
    dup_data = dup_resp.json()
    assert dup_data["id"] != inv_id
    assert dup_data["status"] == "draft"

    # Export JSON
    export_resp = client.get(f"/api/invoices/{inv_id}/export?format=json")
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"].startswith("application/json")

    # Delete duplicate
    delete_resp = client.delete(f"/api/invoices/{dup_data['id']}")
    assert delete_resp.status_code == 200
