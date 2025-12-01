import os, sys, pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

try:
    from app import db as app_db
    from app import models, crud
    from app.exports import share_exported_file, prune_expired_shared_files
except Exception:
    pytest.skip('backend not available', allow_module_level=True)

from datetime import datetime, timedelta, timezone


@pytest.fixture(scope='module')
def session():
    engine = app_db.create_test_engine() if hasattr(app_db, 'create_test_engine') else None
    if engine is None:
        pytest.skip('no test engine helper')
    s = app_db.create_test_session(engine)
    try:
        yield s
    finally:
        s.close()


def _create_user(session):
    u = session.query(models.User).filter(models.User.username == 'cleanup_admin').first()
    if not u:
        role = session.query(models.Role).filter(models.Role.name == 'Admin').first()
        if not role:
            role = models.Role(name='Admin', description='Administrator')
            session.add(role)
            session.commit()
            session.refresh(role)
        from app import security
        u = models.User(username='cleanup_admin', hashed_password=security.get_password_hash('pass1234'), role_id=role.id, role='Admin', is_active=True)
        session.add(u)
        session.commit()
        session.refresh(u)
    return u


def test_prune_expired_shared_files(session, tmp_path):
    user = _create_user(session)
    # create two dummy export files
    expired_path = tmp_path / 'expired.txt'
    active_path = tmp_path / 'active.txt'
    expired_path.write_text('expired', encoding='utf-8')
    active_path.write_text('active', encoding='utf-8')
    # manually insert shared files with different expiry
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    crud.create_shared_file(session, token='expired-token', file_path=str(expired_path), filename='expired.txt', created_by=user.id, expires_at=past)
    crud.create_shared_file(session, token='active-token', file_path=str(active_path), filename='active.txt', created_by=user.id, expires_at=future)
    # prune
    removed = prune_expired_shared_files(session, remove_files=True)
    assert removed == 1
    # expired record gone
    assert crud.get_shared_file_by_token(session, 'expired-token') is None
    # active record still present
    assert crud.get_shared_file_by_token(session, 'active-token') is not None
    # file removed
    assert not expired_path.exists()
    assert active_path.exists()