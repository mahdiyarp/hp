import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app import crud


client = TestClient(app)


def test_backups_list(test_session: Session):
    """Test GET /api/backups/ returns a list."""
    response = client.get("/api/backups/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_backups_manual_create(test_session: Session):
    """Test POST /api/backups/manual creates a backup."""
    response = client.post("/api/backups/manual", params={"note": "Test backup"})
    assert response.status_code == 201
    data = response.json()
    assert data.get("id") is not None
    assert data.get("filename") is not None
    assert data.get("kind") == "manual"


def test_backups_get_detail(test_session: Session):
    """Test GET /api/backups/{id} retrieves a backup."""
    # Create backup via API to ensure it's committed and visible across sessions
    create_resp = client.post("/api/backups/manual", params={"note": "Detail test"})
    assert create_resp.status_code == 201
    bk_id = create_resp.json()["id"]

    response = client.get(f"/api/backups/{bk_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == bk_id
    assert data["kind"] == "manual"


def test_backups_download(test_session: Session):
    """Test GET /api/backups/{id}/download returns file."""
    create_resp = client.post("/api/backups/manual", params={"note": "Download test"})
    assert create_resp.status_code == 201
    bk_id = create_resp.json()["id"]
    response = client.get(f"/api/backups/{bk_id}/download")
    assert response.status_code == 200
    ct = (response.headers.get("content-type") or "").lower()
    assert ct.startswith("application/json")


def test_backups_delete(test_session: Session):
    """Test DELETE /api/backups/{id} removes backup."""
    create_resp = client.post("/api/backups/manual", params={"note": "Delete test"})
    assert create_resp.status_code == 201
    bk_id = create_resp.json()["id"]
    response = client.delete(f"/api/backups/{bk_id}")
    assert response.status_code == 204
    # Verify removed from DB
    removed = crud.get_backup(test_session, bk_id)
    assert removed is None
