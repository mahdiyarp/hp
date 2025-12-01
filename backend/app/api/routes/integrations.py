from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import db, models, schemas
from ...integrations import refresh_integration, fetch_integration_status
from ...sms import send_sms
from ..deps import get_current_user, require_roles

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("", response_model=List[schemas.IntegrationConfigOut])
def list_integrations(
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(role_names=["Admin"]))
):
    return session.query(models.IntegrationConfig).order_by(models.IntegrationConfig.id.desc()).all()


@router.post("", response_model=schemas.IntegrationConfigOut)
def create_integration(
    payload: schemas.IntegrationConfigIn,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(role_names=["Admin"]))
):
    existing = session.query(models.IntegrationConfig).filter(models.IntegrationConfig.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Integration with this name already exists")
    row = models.IntegrationConfig(
        name=payload.name,
        provider=payload.provider,
        enabled=bool(payload.enabled),
        api_key=payload.api_key,
        config=payload.config,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.patch("/{iid}", response_model=schemas.IntegrationConfigOut)
def update_integration(
    iid: int,
    payload: schemas.IntegrationConfigIn,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(role_names=["Admin"]))
):
    row = session.query(models.IntegrationConfig).filter(models.IntegrationConfig.id == iid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")
    data = payload.dict(exclude_unset=True)
    for k, v in data.items():
        if hasattr(row, k):
            setattr(row, k, v)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.delete("/{iid}")
def delete_integration(
    iid: int,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(role_names=["Admin"]))
):
    row = session.query(models.IntegrationConfig).filter(models.IntegrationConfig.id == iid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")
    session.delete(row)
    session.commit()
    return {"ok": True}


@router.post("/{iid}/refresh", response_model=schemas.IntegrationRefreshResult)
def refresh_integration_status(
    iid: int,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(role_names=["Admin"]))
):
    row = session.query(models.IntegrationConfig).filter(models.IntegrationConfig.id == iid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")
    res = fetch_integration_status(session, row)
    return schemas.IntegrationRefreshResult(
        name=row.name,
        provider=row.provider,
        enabled=row.enabled,
        status=res.get('status', 'unknown'),
        sample=res.get('sample'),
        last_updated=row.last_updated,
    )


@router.post("/test/sms")
def test_sms_endpoint(
    to: str,
    message: str,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(role_names=["Admin"]))
):
    ok, info = send_sms(session, to, message)
    if not ok:
        raise HTTPException(status_code=502, detail=info)
    return {"ok": True, "detail": info}


@router.post("/test/webhook")
def test_webhook_endpoint(
    url: str,
    secret: Optional[str] = None,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(role_names=["Admin"]))
):
    import json, time, hmac, hashlib, requests
    headers = {'Content-Type': 'application/json'}
    body = {
        'event': 'test.ping',
        'payload': {'message': 'Webhook test OK'},
        'sent_at': int(time.time()),
        'source': 'hesabpak'
    }
    data = json.dumps(body, ensure_ascii=False).encode('utf-8')
    if secret:
        sig = hmac.new(secret.encode('utf-8'), data, hashlib.sha256).hexdigest()
        headers['X-HP-Signature'] = f'sha256={sig}'
    try:
        r = requests.post(url, data=data, headers=headers, timeout=5)
        return {"ok": r.status_code in (200, 201, 202), "status": r.status_code}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
