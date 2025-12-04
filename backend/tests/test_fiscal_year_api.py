import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db import Base, get_db
from app.models import FinancialYear, User
from app.schemas import UserCreate
from app.crud import create_user

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def test_user():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.username == "testuser").first()
    if not user:
        user_in = UserCreate(username="testuser", password="password")
        user = create_user(db, user_in)
    yield user
    db.close()

@pytest.fixture
def auth_headers(client: TestClient, test_user: User):
    response = client.post(
        "/api/auth/login",
        data={"username": "testuser", "password": "password"},
    )
    assert response.status_code == 200
    tokens = response.json()
    access_token = tokens["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


def test_create_fiscal_year(client: TestClient, auth_headers: dict):
    response = client.post(
        "/api/fiscal-years/",
        headers=auth_headers,
        json={"name": "Test FY", "start_date": "2023-01-01T00:00:00", "end_date": "2023-12-31T23:59:59"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test FY"
    assert "id" in data


def test_read_fiscal_years(client: TestClient, auth_headers: dict):
    response = client.get("/api/fiscal-years/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_read_fiscal_year(client: TestClient, auth_headers: dict):
    response = client.post(
        "/api/fiscal-years/",
        headers=auth_headers,
        json={"name": "Test FY 2", "start_date": "2024-01-01T00:00:00", "end_date": "2024-12-31T23:59:59"},
    )
    assert response.status_code == 200
    fy_id = response.json()["id"]

    response = client.get(f"/api/fiscal-years/{fy_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == fy_id
    assert data["name"] == "Test FY 2"


def test_update_fiscal_year(client: TestClient, auth_headers: dict):
    response = client.post(
        "/api/fiscal-years/",
        headers=auth_headers,
        json={"name": "Test FY 3", "start_date": "2025-01-01T00:00:00", "end_date": "2025-12-31T23:59:59"},
    )
    assert response.status_code == 200
    fy_id = response.json()["id"]

    response = client.put(
        f"/api/fiscal-years/{fy_id}",
        headers=auth_headers,
        json={"name": "Updated Test FY 3"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Test FY 3"


def test_delete_fiscal_year(client: TestClient, auth_headers: dict):
    response = client.post(
        "/api/fiscal-years/",
        headers=auth_headers,
        json={"name": "Test FY 4", "start_date": "2026-01-01T00:00:00", "end_date": "2026-12-31T23:59:59"},
    )
    assert response.status_code == 200
    fy_id = response.json()["id"]

    response = client.delete(f"/api/fiscal-years/{fy_id}", headers=auth_headers)
    assert response.status_code == 200

    response = client.get(f"/api/fiscal-years/{fy_id}", headers=auth_headers)
    assert response.status_code == 404


def test_create_invoice_with_fiscal_year(client: TestClient, auth_headers: dict):
    response = client.post(
        "/api/fiscal-years/",
        headers=auth_headers,
        json={"name": "FY for Invoice", "start_date": "2027-01-01T00:00:00", "end_date": "2027-12-31T23:59:59"},
    )
    assert response.status_code == 200
    fy_id = response.json()["id"]

    invoice_data = {
        "invoice_type": "sale",
        "items": [{"description": "Test Item", "quantity": 1, "unit_price": 100}],
        "fiscal_year_id": fy_id,
    }
    response = client.post("/api/invoices/manual", headers=auth_headers, json=invoice_data)
    assert response.status_code == 200
    data = response.json()
    assert data["fiscal_year_id"] == fy_id


def test_create_invoice_without_fiscal_year(client: TestClient, auth_headers: dict):
    # First, create a fiscal year
    response = client.post(
        "/api/fiscal-years/",
        headers=auth_headers,
        json={"name": "Current FY", "start_date": "2028-01-01T00:00:00", "end_date": "2028-12-31T23:59:59"},
    )
    assert response.status_code == 200
    current_fy_id = response.json()["id"]

    # Set it as current
    response = client.put(
        f"/api/fiscal-years/{current_fy_id}",
        headers=auth_headers,
        json={"is_current": True},
    )
    assert response.status_code == 200


    # Now, create an invoice without specifying the fiscal year
    invoice_data = {
        "invoice_type": "sale",
        "items": [{"description": "Test Item 2", "quantity": 1, "unit_price": 200}],
    }
    response = client.post("/api/invoices/manual", headers=auth_headers, json=invoice_data)
    assert response.status_code == 200
    data = response.json()
    assert data["fiscal_year_id"] == current_fy_id
