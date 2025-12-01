from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.crm.models_tasks import Task

router = APIRouter(prefix="/api/tasks", tags=["tasks"]) 

@router.get("")
def list_tasks(db: Session = Depends(get_db), page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), status: str = "", assignee_id: int | None = None, entity_type: str | None = None, entity_id: str | None = None):
    q = db.query(Task)
    if status: q = q.filter(Task.status == status)
    if assignee_id: q = q.filter(Task.assignee_id == assignee_id)
    if entity_type: q = q.filter(Task.entity_type == entity_type)
    if entity_id: q = q.filter(Task.entity_id == str(entity_id))
    total = q.count()
    items = q.order_by(Task.due_date.is_(None), Task.due_date.asc(), Task.id.desc()).offset((page-1)*limit).limit(limit).all()
    return { 'items': [
        { 'id': t.id, 'title': t.title, 'description': t.description, 'status': t.status, 'priority': t.priority, 'due_date': t.due_date.isoformat() if t.due_date else None, 'assignee_id': t.assignee_id, 'entity_type': t.entity_type, 'entity_id': t.entity_id }
    for t in items ], 'total': total, 'page': page, 'limit': limit }

@router.get("/{tid}")
def get_task(tid: int, db: Session = Depends(get_db)):
    t = db.query(Task).get(tid)
    if not t: raise HTTPException(status_code=404, detail="Task not found")
    return { 'id': t.id, 'title': t.title, 'description': t.description, 'status': t.status, 'priority': t.priority, 'due_date': t.due_date.isoformat() if t.due_date else None, 'assignee_id': t.assignee_id, 'entity_type': t.entity_type, 'entity_id': t.entity_id }

@router.post("")
def create_task(data: dict, db: Session = Depends(get_db)):
    t = Task(
        title=data.get('title') or '',
        description=data.get('description'),
        status=data.get('status') or 'todo',
        priority=data.get('priority') or 'medium',
        assignee_id=data.get('assignee_id'),
        entity_type=data.get('entity_type'),
        entity_id=str(data.get('entity_id') or ''),
    )
    db.add(t); db.commit(); db.refresh(t)
    return get_task(t.id, db)

@router.put("/{tid}")
def update_task(tid: int, data: dict, db: Session = Depends(get_db)):
    t = db.query(Task).get(tid)
    if not t: raise HTTPException(status_code=404, detail="Task not found")
    for k in ['title','description','status','priority','assignee_id','entity_type','entity_id']:
        if k in data:
            setattr(t, k, data[k])
    db.commit(); db.refresh(t)
    return get_task(t.id, db)

@router.delete("/{tid}")
def delete_task(tid: int, db: Session = Depends(get_db)):
    t = db.query(Task).get(tid)
    if not t: raise HTTPException(status_code=404, detail="Task not found")
    db.delete(t); db.commit()
    return {'ok': True}
