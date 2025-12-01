from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Person

router = APIRouter(prefix="/api/persons", tags=["persons"])


def _normalize_national_id(s: str | None) -> str | None:
    if not s: return s
    return ''.join(ch for ch in s if ch.isdigit())

@router.get("")
def list_persons(db: Session = Depends(get_db), page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), q: str = "", status: str = ""):
    qy = db.query(Person)
    if q:
        like = f"%{q}%"
        qy = qy.filter((Person.name.ilike(like)) | (Person.phone.ilike(like)) | (Person.email.ilike(like)) | (Person.tags.ilike(like)))
    if status:
        qy = qy.filter(Person.status == status)
    total = qy.count()
    items = qy.order_by(Person.id.desc()).offset((page-1)*limit).limit(limit).all()
    def row(p: Person):
        return {
            "id": getattr(p, "id", None),
            "name": getattr(p, "name", None),
            "national_id": getattr(p, "national_id", None),
            "phone": getattr(p, "phone", None),
            "email": getattr(p, "email", None),
            "status": getattr(p, "status", None),
            "tags": getattr(p, "tags", None),
        }
    return {"items": [row(p) for p in items], "total": total, "page": page, "limit": limit}

@router.get("/{pid}")
def get_person(pid: int, db: Session = Depends(get_db)):
    p = db.query(Person).get(pid)
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    return {"id": p.id, "name": p.name, "national_id": p.national_id, "phone": p.phone, "email": p.email, "address": p.address, "status": p.status, "tags": p.tags}

@router.post("")
def create_person(data: dict, db: Session = Depends(get_db)):
    # Create with only attributes that exist on model
    payload = dict(data or {})
    if "national_id" in payload:
        payload["national_id"] = _normalize_national_id(payload.get("national_id"))
    kwargs = {}
    for k in ["name","national_id","phone","email","address","status","tags"]:
        if k in payload and hasattr(Person, k):
            kwargs[k] = payload[k]
    if "status" not in kwargs and hasattr(Person, "status"):
        kwargs["status"] = "active"
    p = Person(**kwargs)
    db.add(p)
    db.commit(); db.refresh(p)
    return get_person(p.id, db)

@router.put("/{pid}")
def update_person(pid: int, data: dict, db: Session = Depends(get_db)):
    p = db.query(Person).get(pid)
    if not p: raise HTTPException(status_code=404, detail="Person not found")
    for k in ["name","national_id","phone","email","address","status","tags"]:
        if k in data and hasattr(Person, k):
            val = data[k]
            if k == "national_id":
                val = _normalize_national_id(val)
            setattr(p, k, val)
    db.commit(); db.refresh(p)
    return get_person(p.id, db)

@router.delete("/{pid}")
def delete_person(pid: int, db: Session = Depends(get_db)):
    p = db.query(Person).get(pid)
    if not p: raise HTTPException(status_code=404, detail="Person not found")
    db.delete(p)
    db.commit()
    return {"ok": True}

@router.post("/{pid}/merge/{other_id}")
def merge_persons(pid: int, other_id: int, db: Session = Depends(get_db)):
    p = db.query(Person).get(pid)
    o = db.query(Person).get(other_id)
    if not p or not o: raise HTTPException(status_code=404, detail="Person not found")
    # naive merge: prefer non-empty values
    for k in ["national_id","phone","email","address","tags"]:
        if not getattr(p, k) and getattr(o, k):
            setattr(p, k, getattr(o, k))
    db.delete(o)
    db.commit(); db.refresh(p)
    return get_person(p.id, db)

@router.get("/{pid}/timeline")
def person_timeline(pid: int, db: Session = Depends(get_db)):
    p = db.query(Person).get(pid)
    if not p: raise HTTPException(status_code=404, detail="Person not found")
    # Retrieve related invoices, payments, tasks
    from app import models
    items = []
    # Invoices
    invs = db.query(models.Invoice).filter(models.Invoice.party_id == str(pid)).order_by(models.Invoice.server_time.desc()).limit(10).all()
    for inv in invs:
        items.append({"type": "invoice", "id": inv.id, "title": f"فاکتور {inv.invoice_number or inv.id}", "at": inv.server_time.isoformat() if inv.server_time else None})
    # Payments
    pays = db.query(models.Payment).filter(models.Payment.party_id == str(pid)).order_by(models.Payment.server_time.desc()).limit(10).all()
    for pay in pays:
        items.append({"type": "payment", "id": pay.id, "title": f"پرداخت {pay.payment_number or pay.id}", "at": pay.server_time.isoformat() if pay.server_time else None})
    # Creation event
    items.append({"type": "person", "id": p.id, "title": "ایجاد مخاطب", "at": str(p.created_at)})
    # Sort by date descending
    items.sort(key=lambda x: x.get("at") or "", reverse=True)
    return {"items": items[:20]}

@router.post("/{pid}/score")
def person_score(pid: int, db: Session = Depends(get_db)):
    p = db.query(Person).get(pid)
    if not p: raise HTTPException(status_code=404, detail="Person not found")
    score = 0
    score += 10 if p.email else 0
    score += 10 if p.phone else 0
    score += 5 if p.tags else 0
    score -= 20 if p.status == 'blacklist' else 0
    return {"id": p.id, "score": score}

@router.post("/{pid}/block")
def person_block(pid: int, db: Session = Depends(get_db)):
    p = db.query(Person).get(pid)
    if not p: raise HTTPException(status_code=404, detail="Person not found")
    p.status = 'blacklist'
    db.commit(); db.refresh(p)
    return get_person(p.id, db)

@router.post("/{pid}/restore")
def person_restore(pid: int, db: Session = Depends(get_db)):
    p = db.query(Person).get(pid)
    if not p: raise HTTPException(status_code=404, detail="Person not found")
    p.status = 'active'
    db.commit(); db.refresh(p)
    return get_person(p.id, db)
