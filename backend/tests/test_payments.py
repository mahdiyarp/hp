import os
from fastapi.testclient import TestClient

# Ensure DATABASE_URL is set before importing app modules to avoid init errors
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from app import db  # noqa: E402
from app.main import app  # noqa: E402

# Override DB with in-memory sqlite

def get_test_session():
    engine = db.create_test_engine()
    # Import models to create metadata
    from app import models  # noqa: F401
    db.Base.metadata.create_all(bind=engine)
    Session = db.sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()


def override_get_db():
    s = get_test_session()
    try:
        yield s
    finally:
        s.close()


app.dependency_overrides[db.get_db] = override_get_db
client = TestClient(app)


def test_overpay_prevent_and_status_update():
    # Scope engine caching to this test only to avoid side effects on other tests.
    prev = os.environ.get('CACHE_TEST_ENGINE')
    os.environ['CACHE_TEST_ENGINE'] = '1'
    try:
        # Create invoice with items that totals 1000
        payload = {
            "customer_name": "Test",
            "status": "draft",
            "items": [
                {"description": "x", "qty": 1, "unit_price": 1000, "discount_rate": 0, "tax_rate": 0}
            ]
        }
        r = client.post("/api/invoices/", json=payload)
        assert r.status_code == 200
        inv = r.json()
        inv_id = inv["id"]
        assert inv["total"] == 1000

        # Create a partial payment 500
        p1 = {"invoice_id": inv_id, "direction": "in", "method": "cash", "amount": 500}
        r = client.post("/api/payments/", json=p1)
        assert r.status_code == 200

        # Overpay by adding 600 -> should be 400 allowed max
        p2 = {"invoice_id": inv_id, "direction": "in", "method": "cash", "amount": 600}
        r = client.post("/api/payments/", json=p2)
        assert r.status_code == 400

        # Pay remaining 500 -> invoice becomes paid
        p3 = {"invoice_id": inv_id, "direction": "in", "method": "cash", "amount": 500}
        r = client.post("/api/payments/", json=p3)
        assert r.status_code == 200

        # Check summary
        r = client.get(f"/api/invoices/{inv_id}/payments/summary")
        assert r.status_code == 200
        s = r.json()
        assert s["paid"] == 1000
        assert s["remaining"] == 0

        # Check invoice status now
        r = client.get(f"/api/invoices/{inv_id}")
        assert r.status_code == 200
        inv2 = r.json()
        assert inv2["status"] == "paid"
    finally:
        # Restore previous env state
        if prev is None:
            os.environ.pop('CACHE_TEST_ENGINE', None)
        else:
            os.environ['CACHE_TEST_ENGINE'] = prev
