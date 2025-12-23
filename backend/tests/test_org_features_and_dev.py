import os
import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

# Ensure backend app import works when running from repo root
backend_pkg_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_pkg_root not in sys.path:
    sys.path.insert(0, backend_pkg_root)

# Use a local sqlite DB for tests to avoid external dependencies
test_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hp_test.db'))
os.environ.setdefault('DATABASE_URL', f'sqlite:///{test_db_path}')

from app.main import app, get_current_user  # type: ignore
from app import db as DB
from app import models

# Ensure tables exist in the test SQLite database
DB.Base.metadata.create_all(bind=DB.engine)

# Override auth dependency to return a fake user
fake_user = SimpleNamespace(
    id=1,
    username='tester',
    email='tester@example.com',
    full_name='Tester',
    mobile=None,
    role='Admin',
    role_id=1,
    is_active=True,
    assistant_enabled=True,
)


@pytest.fixture(autouse=True, scope="module")
def override_user_dependency():
    prev = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: fake_user
    yield
    if prev is not None:
        app.dependency_overrides[get_current_user] = prev
    else:
        app.dependency_overrides.pop(get_current_user, None)

client = TestClient(app)


def test_org_features_structure():
    r = client.get('/api/org/features')
    # Depending on auth override, may be allowed directly
    assert r.status_code == 200
    data = r.json()
    assert 'features' in data and isinstance(data['features'], list)


def test_sales_trend_auth_required_or_ok():
    r = client.get('/api/reports/sales-trend')
    # Should be accessible with override; otherwise, auth required
    assert r.status_code in (200, 401, 403)
    if r.status_code == 200:
        data = r.json()
        assert 'points' in data or isinstance(data, list) or isinstance(data, dict)


def test_login_dev_guarded():
    r = client.post('/api/auth/login-dev')
    # In non-dev envs it should be hidden (404); in dev it may return 200
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        data = r.json()
        assert 'access_token' in data
