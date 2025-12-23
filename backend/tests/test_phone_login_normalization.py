import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import db, models
from app.db import Base
from app.main import app

_engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
_SessionMaker = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def override_get_db():
    Base.metadata.create_all(bind=_engine)
    session = _SessionMaker()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(autouse=True)
def _override_dependencies():
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)

    prev_db = app.dependency_overrides.get(db.get_db)
    app.dependency_overrides[db.get_db] = override_get_db
    original_flag = os.environ.get('DEMO_ALLOW_OTP_NO_SMS')
    try:
        yield
    finally:
        if original_flag is None:
            os.environ.pop('DEMO_ALLOW_OTP_NO_SMS', None)
        else:
            os.environ['DEMO_ALLOW_OTP_NO_SMS'] = original_flag
        if prev_db is not None:
            app.dependency_overrides[db.get_db] = prev_db
        else:
            app.dependency_overrides.pop(db.get_db, None)


client = TestClient(app, raise_server_exceptions=False)


def _create_user(session: Session, username: str, mobile: str):
    u = models.User(
        username=username,
        full_name=username,
        email=None,
        mobile=mobile,
        hashed_password='x',
        role_id=None,
        is_active=True,
    )
    session.add(u)
    session.commit()
    return u


def test_login_phone_normalizes_plus98_to_09():
    os.environ['DEMO_ALLOW_OTP_NO_SMS'] = 'true'
    # seed user with +98 format
    session = _SessionMaker()
    Base.metadata.create_all(bind=_engine)
    try:
        _create_user(session, 'user1', '+989123506545')
    finally:
        session.close()

    # request login with 09 format
    r = client.post('/api/auth/login-phone', json={'phone': '09123506545'})
    assert r.status_code == 200, r.text
    sid = r.json().get('session_id')
    assert isinstance(sid, str) and len(sid) > 10

    # verify with demo bypass (otp ignored, session id used to resolve phone)
    v = client.post('/api/auth/verify-phone-otp', json={'session_id': sid, 'otp_code': '000000'})
    assert v.status_code == 200, v.text
    body = v.json()
    assert body.get('success') is True
    assert isinstance(body.get('access_token'), str) and body.get('access_token')


def test_login_phone_accepts_persian_digits_and_bare_9():
    os.environ['DEMO_ALLOW_OTP_NO_SMS'] = 'true'
    # seed user with 0912 format
    session = _SessionMaker()
    Base.metadata.create_all(bind=_engine)
    try:
        _create_user(session, 'user2', '09123456789')
    finally:
        session.close()

    # request login with Persian digits
    persian_phone = '۰۹۱۲۳۴۵۶۷۸۹'
    r = client.post('/api/auth/login-phone', json={'phone': persian_phone})
    assert r.status_code == 200, r.text
    sid = r.json().get('session_id')
    assert isinstance(sid, str) and len(sid) > 10

    # verify with bare 9 form via session (server stored normalized value)
    v = client.post('/api/auth/verify-phone-otp', json={'session_id': sid, 'otp_code': '111111'})
    assert v.status_code == 200, v.text
    body = v.json()
    assert body.get('success') is True
    assert isinstance(body.get('access_token'), str) and body.get('access_token')
