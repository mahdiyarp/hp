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
    # Create backup first
    bk = crud.create_backup(test_session, created_by=None, kind="manual", note="Detail test")
    assert bk.id is not None

    response = client.get(f"/api/backups/{bk.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == bk.id
    assert data["kind"] == "manual"


def test_backups_download(test_session: Session):
    """Test GET /api/backups/{id}/download returns file."""
    bk = crud.create_backup(test_session, created_by=None, kind="manual", note="Download test")
    response = client.get(f"/api/backups/{bk.id}/download")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/json"


def test_backups_delete(test_session: Session):
    """Test DELETE /api/backups/{id} removes backup."""
    bk = crud.create_backup(test_session, created_by=None, kind="manual", note="Delete test")
    response = client.delete(f"/api/backups/{bk.id}")
    assert response.status_code == 204
    # Verify removed from DB
    removed = crud.get_backup(test_session, bk.id)
    assert removed is None
