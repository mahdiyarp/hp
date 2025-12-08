import os
import sys
from types import SimpleNamespace
from datetime import datetime, timedelta, timezone

# Use a local SQLite DB for tests
test_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hp_test.db'))
os.environ.setdefault('DATABASE_URL', f'sqlite:///{test_db_path}')

# Ensure backend package is importable
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from fastapi.testclient import TestClient  # type: ignore
from app.main import app, get_current_user  # type: ignore
from app import db as DB  # type: ignore
from app import models  # type: ignore

# Make sure tables exist in test DB
DB.Base.metadata.create_all(bind=DB.engine)


def make_financial_year(session) -> models.FinancialYear:
    start = datetime.now(timezone.utc) - timedelta(days=90)
    end = datetime.now(timezone.utc) + timedelta(days=90)
    fy = models.FinancialYear(name=f"FY-{int(start.year)}-{int(end.year)}", start_date=start, end_date=end, is_closed=False)
    session.add(fy)
    session.commit()
    session.refresh(fy)
    return fy


def make_finance_user_with_prefs(fy_id: int):
    # Minimal permission object
    perm = models.Permission(id=0, name='finance_report', description='finance', module='finance')
    role = models.Role(id=1, name='Admin', description='Admin')
    role.permissions = [perm]
    return SimpleNamespace(
        id=1,
        username='tester',
        email='tester@example.com',
        full_name='Tester',
        mobile=None,
        role='Admin',
        role_id=1,
        is_active=True,
        role_obj=role,
        preferences=SimpleNamespace(active_financial_year_id=fy_id),
    )


def test_pnl_defaults_to_active_fy_when_no_dates():
    # Create FY and override current user with that FY active
    session = DB.SessionLocal()
    try:
        fy = make_financial_year(session)
    finally:
        try:
            session.close()
        except Exception:
            pass

    user = make_finance_user_with_prefs(fy.id)
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    r = client.get('/api/reports/pnl?method=FIFO')
    assert r.status_code == 200
    data = r.json()
    assert 'sales' in data and 'cogs' in data and 'gross_profit' in data


def test_error_payload_shape_http_and_validation():
    client = TestClient(app)

    # HTTPException from /api/search (missing q)
    r = client.post('/api/search', json={})
    assert r.status_code == 400
    j = r.json()
    assert 'detail' in j and 'code' in j and 'path' in j
    assert j['code'] == 400

    # Validation error from /api/auth/login-phone (requires body with phone)
    r2 = client.post('/api/auth/login-phone', json={})
    assert r2.status_code == 422
    j2 = r2.json()
    assert 'detail' in j2 and 'code' in j2 and 'errors' in j2
    assert j2['code'] == 422
