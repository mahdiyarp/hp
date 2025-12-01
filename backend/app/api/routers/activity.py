from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app import models

router = APIRouter(prefix="/api/activity", tags=["activity"]) 

@router.get("/recent")
def recent_activity(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    entity_type: str | None = None,
    entity_id: str | None = None,
):
    q = db.query(models.AuditLog)
    # Only filter by fields that actually exist on the model
    if entity_type and hasattr(models.AuditLog, "entity_type"):
        q = q.filter(models.AuditLog.entity_type == entity_type)
    if entity_id and hasattr(models.AuditLog, "entity_id"):
        q = q.filter(models.AuditLog.entity_id == str(entity_id))
    q = q.order_by(models.AuditLog.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * limit).limit(limit).all()
    return {
        "items": [
            {
                "id": getattr(a, "id", None),
                "actor": getattr(a, "actor", None),
                "action": getattr(a, "action", None),
                "entity_type": getattr(a, "entity_type", None),
                "entity_id": getattr(a, "entity_id", None),
                "path": getattr(a, "path", None),
                "method": getattr(a, "method", None),
                "status_code": getattr(a, "status_code", None),
                "detail": getattr(a, "detail", None),
                "created_at": a.created_at.isoformat() if getattr(a, "created_at", None) else None,
                "hash": getattr(a, "block_hash", None),
            }
            for a in items
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }
