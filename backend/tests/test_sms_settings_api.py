import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app import db, models
from app.main import app, get_current_user
import app.sms_router as sms_router
from app.db import Base

TEST_ENGINE = db.create_test_engine()
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


class DummyUser(models.User):
    def __init__(self):
        super().__init__(username="admin", role="Admin", role_id=1)


def _override_user():
    return DummyUser()


def _override_get_db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module", autouse=True)
def setup_schema():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(scope="module", autouse=True)
def override_dependencies():
    prev_db = app.dependency_overrides.get(db.get_db)
    prev_user = app.dependency_overrides.get(get_current_user)
    prev_sms_user = app.dependency_overrides.get(sms_router._get_current_user)
    app.dependency_overrides[db.get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[sms_router._get_current_user] = _override_user
    yield
    if prev_db is not None:
        app.dependency_overrides[db.get_db] = prev_db
    else:
        app.dependency_overrides.pop(db.get_db, None)
    if prev_user is not None:
        app.dependency_overrides[get_current_user] = prev_user
    else:
        app.dependency_overrides.pop(get_current_user, None)
    if prev_sms_user is not None:
        app.dependency_overrides[sms_router._get_current_user] = prev_sms_user
    else:
        app.dependency_overrides.pop(sms_router._get_current_user, None)


@pytest.fixture(autouse=True)
def reset_db():
    with TEST_ENGINE.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    yield


client = TestClient(app)


def test_sms_settings_put_and_get():
    payload = {
        "base_url": "https://edge.ippanel.com/v1",
        "default_sender": "5000",
        "enabled": True,
        "low_credit_threshold": 10,
    }

    res = client.put("/api/settings/sms", json=payload)
    assert res.status_code == 200

    res = client.get("/api/settings/sms")
    assert res.status_code == 200
    data = res.json()

    assert data["default_sender"] == "5000"
    assert data["enabled"] is True


def test_sms_template_crud():
    tmpl = {
        "code": "user_signup",
        "pattern_id": None,
        "text": "الگوی ثبت کاربر جدید {name}",
        "is_active": True,
        "description": "ثبت نام کاربران جدید",
    }

    res = client.post("/api/settings/sms/templates", json=tmpl)
    assert res.status_code == 200
    tid = res.json()["id"]

    res = client.get("/api/settings/sms/templates")
    assert res.status_code == 200
    assert any(t["code"] == "user_signup" for t in res.json())

    res = client.put(f"/api/settings/sms/templates/{tid}", json={**tmpl, "text": "hi"})
    assert res.status_code == 200



