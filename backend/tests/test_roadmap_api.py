import os
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

# Ensure local sqlite is used even if the default config points elsewhere
os.environ.setdefault('DATABASE_URL', 'sqlite://')

from app import db  # noqa: E402
from app.main import app, get_current_user  # noqa: E402


@pytest.fixture(autouse=True)
def override_dependencies():
    def _fake_db():
        yield None

    prev_db = app.dependency_overrides.get(db.get_db)
    app.dependency_overrides[db.get_db] = _fake_db

    fake_user = SimpleNamespace(id=1, username='dev', role='Developer', role_id=1)
    prev_user = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: fake_user

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


def test_roadmap_endpoint_returns_sections():
    client = TestClient(app)
    response = client.get('/api/roadmap')
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload.get('title'), str)
    assert isinstance(payload.get('sections'), list)
    assert payload['sections'], 'expected at least one roadmap section'
    first = payload['sections'][0]
    assert 'bodyText' in first
    assert 'checklists' in first
    assert isinstance(first['checklists'], list)
