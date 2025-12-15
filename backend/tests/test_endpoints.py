import os
import time
import requests

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")


def wait_healthy(timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=3)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def login_dev():
    # DEV login is gated by env; compose sets DEV_FEATURES_ENABLED=false
    # but endpoint should still exist and reject when disabled
    r = requests.post(f"{BASE_URL}/api/auth/login-dev", json={
        "mobile": "09123506545"
    }, timeout=5)
    return r


def test_health_and_org_features():
    assert wait_healthy(), "backend /health is not ready"
    r = requests.get(f"{BASE_URL}/api/org/features", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # Expected keys derived from NFT features if present
    for key in ["invoices", "payments", "products", "persons", "reports", "settings"]:
        assert key in data


def test_sales_trend_requires_auth():
    r = requests.get(f"{BASE_URL}/api/reports/sales-trend?range=day", timeout=5)
    assert r.status_code in (401, 403)


def test_login_dev_gated_by_env():
    r = login_dev()
    # When DEV_FEATURES_ENABLED=false, expect 403 or 404
    assert r.status_code in (403, 404)


def test_me_nfts_requires_auth():
    r = requests.get(f"{BASE_URL}/api/users/me/nfts", timeout=5)
    assert r.status_code in (401, 403)
