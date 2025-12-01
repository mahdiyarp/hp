import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_reports_sales_summary():
    """Test GET /api/reports/sales returns aggregated sales data."""
    response = client.get("/api/reports/sales")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "today" in data
    assert "count" in data


def test_reports_cash_summary():
    """Test GET /api/reports/cash returns cash flow summary."""
    response = client.get("/api/reports/cash")
    assert response.status_code == 200
    data = response.json()
    assert "balance" in data
    assert "in" in data
    assert "out" in data


def test_reports_stock_summary():
    """Test GET /api/reports/stock returns stock value aggregation."""
    response = client.get("/api/reports/stock")
    assert response.status_code == 200
    data = response.json()
    assert "total_value" in data or "value" in data


def test_reports_pnl_summary():
    """Test GET /api/reports/pnl returns profit and loss."""
    response = client.get("/api/reports/pnl")
    assert response.status_code == 200
    data = response.json()
    assert "revenue" in data
    assert "expenses" in data
    assert "net" in data


def test_reports_payments_aggregation():
    """Test GET /api/reports/payments with date range and direction filters."""
    response = client.get("/api/reports/payments?from_date=2024-01-01&to_date=2024-12-31&direction=in")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data or "amount" in data
