from fastapi.testclient import TestClient
import os
import sys
from datetime import datetime, timedelta

# Use SQLite for tests
test_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hp_test.db'))
os.environ.setdefault('DATABASE_URL', f'sqlite:///{test_db_path}')

backend_pkg_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_pkg_root not in sys.path:
    sys.path.insert(0, backend_pkg_root)

from app.main import app, get_current_user  # type: ignore
from types import SimpleNamespace

# Override auth
fake_user = SimpleNamespace(id=1, username='tester', role='Admin', assistant_enabled=True)
app.dependency_overrides[get_current_user] = lambda: fake_user

client = TestClient(app)


def test_sales_trend_today_hour_bucket():
    now = datetime.utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    r = client.get(f"/api/reports/sales-trend?from_iso={start}&to_iso={now.isoformat()}&bucket=hour")
    assert r.status_code == 200
    data = r.json()
    assert 'points' in data
    assert isinstance(data['points'], list)


def test_sales_trend_3days_day_bucket():
    now = datetime.utcnow()
    start = (now - timedelta(days=2)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    r = client.get(f"/api/reports/sales-trend?from_iso={start}&to_iso={now.isoformat()}&bucket=day")
    assert r.status_code == 200
    data = r.json()
    assert 'points' in data
    assert isinstance(data['points'], list)
