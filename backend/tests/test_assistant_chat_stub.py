import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import db
from app.main import app, get_current_user
import app.api.routers.assistant as assistant_router
from app import models
from app.db import Base
from app.services import assistant_service

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


def _allow_admin(*_):
    return None


@pytest.fixture(autouse=True, scope="module")
def override_dependencies():
    prev_db = app.dependency_overrides.get(db.get_db)
    prev_user = app.dependency_overrides.get(get_current_user)
    prev_admin = app.dependency_overrides.get(assistant_router._admin)
    app.dependency_overrides[db.get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[assistant_router._admin] = _allow_admin  # type: ignore
    yield
    if prev_db is not None:
        app.dependency_overrides[db.get_db] = prev_db
    else:
        app.dependency_overrides.pop(db.get_db, None)
    if prev_user is not None:
        app.dependency_overrides[get_current_user] = prev_user
    else:
        app.dependency_overrides.pop(get_current_user, None)
    if prev_admin is not None:
        app.dependency_overrides[assistant_router._admin] = prev_admin
    else:
        app.dependency_overrides.pop(assistant_router._admin, None)


client = TestClient(app)


def test_chat_disabled_returns_message(monkeypatch):
    res = client.post("/api/assistant/chat", json={"message": "hello", "mode": "general"})
    assert res.status_code == 200
    assert "ط·آ·ط¢آ·ط·آ·أ¢â‚¬ط›ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†" in res.json()["reply"]


def test_chat_with_fake_response(monkeypatch):
    # enable settings
    sess = Session()
    st = assistant_service.get_settings(sess)
    st.enabled = True
    st.enable_doc_understanding = True
    st.enable_journal_suggestions = True
    sess.add(st)
    sess.commit()
    monkeypatch.setenv("AI_API_KEY", "fake")

    def fake_call_chat(messages, model=None, temperature=None, max_tokens=None, base_url=None, api_key=None, tools=None):
        return {"choices": [{"message": {"content": "ط·آ·ط¢آ¸ط·آ¢ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ® ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢"}}]}

    monkeypatch.setattr(assistant_service.ai_client, "call_chat", fake_call_chat)

    res = client.post("/api/assistant/chat", json={"message": "ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦", "mode": "general"})
    assert res.status_code == 200
    assert "ط·آ·ط¢آ¸ط·آ¢ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ® ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢" in res.json()["reply"]



