from fastapi.testclient import TestClient
import os
import sys

# Ensure backend app import works when running from repo root
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app  # type: ignore

client = TestClient(app)

def test_pnl_fifo_auth_required():
    # Without auth, should be 401
    r = client.get('/api/reports/pnl?method=FIFO')
    assert r.status_code in (401, 403)

def test_stock_reports_auth_required():
    r = client.get('/api/reports/stock')
    assert r.status_code in (401, 403)

def test_product_ledger_auth_required():
    r = client.get('/api/ledger/product/any')
    assert r.status_code in (401, 403)
