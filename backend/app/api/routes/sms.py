from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api.deps import require_roles
from app.db import get_db
from app.sms import send_sms, SUPPORTED_PROVIDERS
from app.activity_logger import log_activity

router = APIRouter()


@router.get('/providers', response_model=List[schemas.IntegrationConfigOut])
def list_sms_providers(session: Session = Depends(get_db), current: models.User = Depends(require_roles(role_names=['Admin']))):
    cfgs = session.query(models.IntegrationConfig).filter(models.IntegrationConfig.provider.in_(list(SUPPORTED_PROVIDERS))).all()
    out = []
    for c in cfgs:
        out.append({
            'id': c.id,
            'name': c.name,
            'provider': c.provider,
            'enabled': c.enabled,
            'api_key': None,
            'config': c.config,
            'last_updated': c.last_updated,
        })
    return out


@router.post('/send')
def api_sms_send(payload: dict, session: Session = Depends(get_db), current: models.User = Depends(require_roles(role_names=['Admin']))):
    to = (payload or {}).get('to')
    msg = (payload or {}).get('message')
    provider = (payload or {}).get('provider')
    if not to or not msg:
        raise HTTPException(status_code=400, detail='to and message required')
    ok, info = send_sms(session, to, msg, provider)
    if not ok:
        raise HTTPException(status_code=502, detail=info)
    try:
        log_activity(session, current.username if hasattr(current, 'username') else None, f"ارسال پیامک به {to}")
    except Exception:
        pass
    return {"ok": True, "detail": info}


@router.post('/register-user', response_model=schemas.UserOut)
def api_sms_register_user(payload: dict, session: Session = Depends(get_db), current: models.User = Depends(require_roles(role_names=['Admin']))):
    import secrets, string
    username = (payload or {}).get('username')
    mobile = (payload or {}).get('mobile')
    full_name = (payload or {}).get('full_name')
    role_id = (payload or {}).get('role_id')
    if not username or not mobile:
        raise HTTPException(status_code=400, detail='username and mobile required')
    alphabet = string.ascii_letters + string.digits
    temp_pass = ''.join(secrets.choice(alphabet) for _ in range(10))
    try:
        u = crud.create_user(session, schemas.UserCreate(username=username, password=temp_pass, full_name=full_name, role_id=role_id, email=None))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    msg = f"کاربر شما در حساب‌پاک ایجاد شد.\nنام کاربری: {username}\nرمز عبور: {temp_pass}"
    ok, info = send_sms(session, mobile, msg, None)
    if not ok:
        try:
            session.delete(u)
            session.commit()
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f'SMS failed: {info}')
    try:
        log_activity(session, current.username if hasattr(current, 'username') else None, f"ایجاد کاربر {username} و ارسال پیامک")
    except Exception:
        pass
    return u
