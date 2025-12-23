import os
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from app import db, models  # noqa: E402
from app.main import app, get_current_user  # noqa: E402

engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def _seed_roles(session):
    roles = {
        'Developer': 'دسترسی کامل توسعه',
        'Developer NFT': 'NFT توسعه',
        'Viewer': 'مشاهده',
    }
    for name, desc in roles.items():
        if not session.query(models.Role).filter(models.Role.name == name).first():
            session.add(models.Role(name=name, description=desc))
    session.commit()


def _get_role_id(role_name: str) -> int:
    with TestingSessionLocal() as session:
        role = session.query(models.Role).filter(models.Role.name == role_name).first()
        assert role is not None, f"role {role_name} must exist for tests"
        return role.id


def _set_current_user(role_name: str, username: str | None = None):
    role_id = _get_role_id(role_name)
    uname = username or role_name.lower().replace(' ', '_')
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=role_id * 10 + 1,
        username=uname,
        role=role_name,
        role_id=role_id,
    )


def _clear_current_user_override():
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture(autouse=True)
def _prepare_user_creation_env():
    db.Base.metadata.drop_all(bind=engine)
    db.Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as session:
        _seed_roles(session)

    prev_db = app.dependency_overrides.get(db.get_db)
    app.dependency_overrides[db.get_db] = override_get_db
    try:
        yield
    finally:
        _clear_current_user_override()
        if prev_db is not None:
            app.dependency_overrides[db.get_db] = prev_db
        else:
            app.dependency_overrides.pop(db.get_db, None)


client = TestClient(app)


def test_create_user_denied_for_non_privileged_role():
    _set_current_user('Viewer')
    payload = {
        "username": "viewer_forbidden",
        "password": "secret",
        "role_id": _get_role_id('Viewer'),
    }
    resp = client.post('/api/users', json=payload)
    assert resp.status_code == 403
    _clear_current_user_override()


def test_developer_can_create_user():
    _set_current_user('Developer')
    payload = {
        "username": "dev_can_create",
        "password": "secret",
        "role_id": _get_role_id('Viewer'),
    }
    resp = client.post('/api/users', json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body['username'] == 'dev_can_create'
    assert body['role_id'] == _get_role_id('Viewer')
    _clear_current_user_override()


def test_developer_receives_all_modules():
    _set_current_user('Developer', username='developer')
    resp = client.get('/api/current-user/modules')
    assert resp.status_code == 200
    mods = resp.json()
    assert {'sales', 'finance', 'inventory', 'developer'} <= set(mods)
    _clear_current_user_override()