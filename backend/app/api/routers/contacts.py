from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app import db
from app.crm.models_contacts import Contact
from app.activity_logger import log_activity
from app.blockchain import hash_event as bc_hash_event

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


def _normalize_phone(p: Optional[str]) -> Optional[str]:
    if not p:
        return p
    s = ''.join(ch for ch in str(p) if ch.isdigit())
    if s.startswith('0098'):
        s = '0' + s[4:]
    if s.startswith('+98'):
        s = '0' + s[3:]
    return s


@router.get("/")
def list_contacts(q: Optional[str] = None, status: Optional[str] = None, page: int = 1, limit: int = 20, session: Session = Depends(db.get_db)):
    qs = session.query(Contact)
    if q:
        like = f"%{q}%"
        qs = qs.filter((Contact.name.ilike(like)) | (Contact.phone.ilike(like)) | (Contact.email.ilike(like)) | (Contact.company.ilike(like)))
    if status:
        qs = qs.filter(Contact.status == status)
    total = qs.count()
    items = qs.order_by(Contact.created_at.desc()).offset(max(0, (page-1)*limit)).limit(limit).all()
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/{cid}")
def get_contact(cid: int, session: Session = Depends(db.get_db)):
    c = session.get(Contact, cid)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    return c


@router.post("/")
def create_contact(payload: dict, session: Session = Depends(db.get_db)):
    payload = dict(payload or {})
    payload['phone'] = _normalize_phone(payload.get('phone'))
    c = Contact(**{k: payload.get(k) for k in payload.keys()})
    session.add(c)
    session.commit()
    session.refresh(c)
    log_activity(session, actor="system", action="contact_create", entity_id=c.id, meta={"name": c.name})
    bc_hash_event(session, entity="contact", entity_id=c.id, payload={"action": "create"})
    return c


@router.put("/{cid}")
def update_contact(cid: int, payload: dict, session: Session = Depends(db.get_db)):
    c = session.get(Contact, cid)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    for k, v in (payload or {}).items():
        if k == 'phone':
            v = _normalize_phone(v)
        setattr(c, k, v)
    session.add(c)
    session.commit()
    session.refresh(c)
    log_activity(session, actor="system", action="contact_update", entity_id=c.id, meta={"name": c.name})
    bc_hash_event(session, entity="contact", entity_id=c.id, payload={"action": "update"})
    return c


@router.delete("/{cid}")
def delete_contact(cid: int, session: Session = Depends(db.get_db)):
    c = session.get(Contact, cid)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    session.delete(c)
    session.commit()
    log_activity(session, actor="system", action="contact_delete", entity_id=cid, meta={})
    bc_hash_event(session, entity="contact", entity_id=cid, payload={"action": "delete"})
    return {"ok": True}


@router.post("/{cid}/merge")
def merge_contacts(cid: int, payload: dict, session: Session = Depends(db.get_db)):
    target = session.get(Contact, cid)
    source_id = (payload or {}).get('source_id')
    source = session.get(Contact, int(source_id)) if source_id else None
    if not target or not source:
        raise HTTPException(status_code=404, detail="Contact(s) not found")
    # naive merge: prefer target values, fill blanks from source
    for field in ['phone', 'email', 'company', 'tags', 'address', 'website', 'notes']:
        if not getattr(target, field):
            setattr(target, field, getattr(source, field))
    session.delete(source)
    session.add(target)
    session.commit()
    log_activity(session, actor="system", action="contact_merge", entity_id=target.id, meta={"merged": source_id})
    bc_hash_event(session, entity="contact", entity_id=target.id, payload={"action": "merge", "merged": source_id})
    return target


@router.get("/{cid}/timeline")
def contact_timeline(cid: int, session: Session = Depends(db.get_db)):
    # placeholder: gather invoices and payments if models exist
    invs = []
    pays = []
    return {"invoices": invs, "payments": pays, "activities": []}


@router.get("/{cid}/score")
def contact_score(cid: int, session: Session = Depends(db.get_db)):
    c = session.get(Contact, cid)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"score": int(c.rating_score or 0)}


@router.post("/{cid}/blocklist")
def blocklist_contact(cid: int, session: Session = Depends(db.get_db)):
    c = session.get(Contact, cid)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    c.status = 'blacklist'
    session.add(c)
    session.commit()
    return {"status": c.status}


@router.post("/{cid}/restore")
def restore_contact(cid: int, session: Session = Depends(db.get_db)):
    c = session.get(Contact, cid)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    c.status = 'active'
    session.add(c)
    session.commit()
    return {"status": c.status}


@router.post("/{cid}/ai/suggest")
def ai_suggest(cid: int, session: Session = Depends(db.get_db)):
    c = session.get(Contact, cid)
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    # simple static suggestions; integrate real AI later
    return {
        "missing_fields": [f for f in ["email", "phone", "company"] if not getattr(c, f)],
        "value_prediction": 0,
        "payment_behavior_score": 50,
        "recommended_invoice_terms": 7,
        "engagement": {"type": "call", "when_days": 2}
    }
