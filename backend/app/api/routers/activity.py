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
    if entity_type:
        q = q.filter(models.AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(models.AuditLog.entity_id == str(entity_id))
    q = q.order_by(models.AuditLog.created_at.desc())
    total = q.count()
    items = q.offset((page-1)*limit).limit(limit).all()
    return {
        "items": [
            {
                "id": a.id,
                "actor": a.actor,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "detail": a.detail,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "hash": getattr(a, 'block_hash', None)
            } for a in items
        ],
        "total": total,
        "page": page,
        "limit": limit
    }
