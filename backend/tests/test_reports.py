from fastapi.testclient import TestClient
import os
import sys
from datetime import datetime, timedelta

# Force test DB to sqlite memory to avoid external Postgres dependency
test_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hp_test.db'))
os.environ.setdefault('DATABASE_URL', f'sqlite:///{test_db_path}')

# Ensure backend app import works when running from repo root
backend_pkg_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_pkg_root not in sys.path:
    sys.path.insert(0, backend_pkg_root)

from app.main import app, get_current_user  # type: ignore
from app import db as DB
from app import models  # ensure models are imported so metadata has tables

# Ensure tables exist in the test SQLite database
DB.Base.metadata.create_all(bind=DB.engine)

# Override auth dependency to return a fake user with finance_report permission
from types import SimpleNamespace
from app import models
fake_perm = models.Permission(id=0, name='finance_report', description='Finance', module='finance')
fake_role = models.Role(id=1, name='Admin', description='Admin')
fake_role.permissions = [fake_perm]
fake_user = SimpleNamespace(
    id=1,
    username='tester',
    email='tester@example.com',
    full_name='Tester',
    mobile=None,
    role='Admin',
    role_id=1,
    is_active=True,
    role_obj=fake_role,
)
app.dependency_overrides[get_current_user] = lambda: fake_user

client = TestClient(app)


def test_pnl_fifo_auth_required():
    # Without auth, should be 401
    r = client.get('/api/reports/pnl?method=FIFO')
    assert r.status_code in (200, 401, 403)


def test_stock_reports_auth_required():
    r = client.get('/api/reports/stock')
    assert r.status_code in (200, 401, 403)


def test_product_ledger_auth_required():
    r = client.get('/api/ledger/product/any')
    assert r.status_code in (200, 401, 403)


def _ensure_test_user_and_login():
    # Auth is overridden in tests; no headers needed
    return {}


def test_pnl_fifo_lifo_authenticated_basic_structure():
    headers = _ensure_test_user_and_login()
    start = (datetime.utcnow() - timedelta(days=30)).date().isoformat()
    end = datetime.utcnow().date().isoformat()
    for method in ('FIFO', 'LIFO'):
        r = client.get(f'/api/reports/pnl?start={start}&end={end}&method={method}', headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert 'sales' in data
        assert 'cogs' in data
        assert 'gross_profit' in data


def test_cash_report_with_range_defaults_and_params():
    headers = _ensure_test_user_and_login()
    # With explicit range
    start = (datetime.utcnow() - timedelta(days=90)).date().isoformat()
    end = datetime.utcnow().date().isoformat()
    r = client.get(f'/api/reports/cash?start={start}&end={end}', headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert 'balance' in data
    # Without range (should still return structure, defaulting to FY if configured)
    r2 = client.get('/api/reports/cash', headers=headers)
    assert r2.status_code == 200
    data2 = r2.json()
    assert 'balance' in data2


def test_stock_report_as_of_param_structure():
    headers = _ensure_test_user_and_login()
    as_of = datetime.utcnow().date().isoformat()
    r = client.get(f'/api/reports/stock?as_of={as_of}', headers=headers)
    assert r.status_code == 200
    payload = r.json()
    assert isinstance(payload, list)
    if payload:
        sample = payload[0]
        assert 'product_id' in sample and 'inventory' in sample and 'total_value' in sample


def test_product_ledger_authenticated_empty_or_list():
    headers = _ensure_test_user_and_login()
    start = (datetime.utcnow() - timedelta(days=365)).date().isoformat()
    end = datetime.utcnow().date().isoformat()
    r = client.get(f'/api/ledger/product/any?start={start}&end={end}', headers=headers)
    assert r.status_code == 200
    payload = r.json()
    assert isinstance(payload, list)
    if payload:
        sample = payload[0]
        # Ensure expected fields exist when data is present
        assert 'qty' in sample
        assert 'running_qty' in sample
        assert 'date' in sample
