import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_product_match_requires_auth():
    resp = client.post('/api/external/ai/product-match', json={'name': 'test'})
    assert resp.status_code == 401


def test_invoice_analysis_requires_auth():
    resp = client.post('/api/external/ai/invoice-analysis', json={'content': 'invoice text'})
    assert resp.status_code == 401
