import os
from fastapi.testclient import TestClient

# Ensure DATABASE_URL is set before importing app modules to avoid init errors
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from app import db  # noqa: E402
from app.main import app  # noqa: E402
from app.auth import get_current_user  # noqa: E402


from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
TEST_ENGINE = create_engine(
    'sqlite://',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
)


def get_test_session():
    from app import models  # noqa: F401
    db.Base.metadata.create_all(bind=TEST_ENGINE)
    Session = db.sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)
    return Session()


def override_get_db():
    s = get_test_session()
    try:
        yield s
    finally:
        s.close()


app.dependency_overrides[db.get_db] = override_get_db
client = TestClient(app)


def test_payments_requires_auth_then_allows_with_override():
    # Without auth override, should be 401/403
    r = client.get("/api/payments/count")
    assert r.status_code in (401, 403)

    # Override auth to simulate an authenticated user
    app.dependency_overrides[get_current_user] = lambda: {"id": 1, "username": "test"}
    try:
        r2 = client.get("/api/payments/count")
        assert r2.status_code == 200
        assert "count" in r2.json()
    finally:
        # Clean up override to avoid leaking into other tests
        del app.dependency_overrides[get_current_user]


def test_payments_list_shape_manual_serialization():
    # Seed a couple of payments directly in the test DB
    from app import models
    from datetime import datetime, timezone
    s = get_test_session()
    try:
        p1 = models.Payment(direction="in", method="cash", amount=123, status="posted", server_time=datetime.now(timezone.utc))
        p2 = models.Payment(direction="in", method="cash", amount=456, status="posted", server_time=datetime.now(timezone.utc))
        s.add_all([p1, p2])
        s.commit()
    finally:
        s.close()

    # Auth override to access payments endpoints
    app.dependency_overrides[get_current_user] = lambda: {"id": 1, "username": "test"}
    try:
        r = client.get("/api/payments/?limit=2")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        for item in data[:2]:
            assert set(["id", "amount", "method", "status", "direction", "server_time"]).issubset(item.keys())
            assert isinstance(item["amount"], int)
    finally:
        del app.dependency_overrides[get_current_user]
