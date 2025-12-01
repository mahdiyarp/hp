import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.main import app, get_current_user
import app.api.routers.assistant as assistant_router
from app import models
from app.db import Base

engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    session = Session()
    try:
        yield session
    finally:
        session.close()


class DummyUser(models.User):
    def __init__(self):
        super().__init__(username="admin", role="Admin", role_id=1)


def override_user():
    return DummyUser()


app.dependency_overrides[db.get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_user
app.dependency_overrides[assistant_router._admin] = lambda *_: None  # type: ignore

client = TestClient(app)


def test_get_settings_defaults():
    res = client.get("/api/assistant/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "openai"
    assert data["language"] == "fa"


def test_put_settings_and_mask():
    payload = {"provider": "openai", "model_name": "gpt-4.1-mini", "api_key": "abcd1234", "enabled": True}
    res = client.put("/api/assistant/settings", json=payload)
    assert res.status_code == 200
    res = client.get("/api/assistant/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["model_name"] == "gpt-4.1-mini"
    assert data["api_key_masked"].endswith("1234")
