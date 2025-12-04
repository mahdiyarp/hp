from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api.deps import get_current_user, require_roles
from app.db import get_db
from app.activity_logger import log_activity

router = APIRouter()


@router.get('/settings', response_model=List[schemas.SystemSettingOut])
async def get_all_settings(
    category: Optional[str] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت تمام تنظیمات سیستم (فقط ادمین)"""
    # Check admin access
    if not current.role or current.role.name != 'Admin':
        raise HTTPException(status_code=403, detail='دسترسی محدود')
    
    if category:
        settings = crud.get_system_settings_by_category(session, category)
    else:
        settings = crud.get_all_system_settings(session)
    
    # Hide secret values if not admin details request
    for setting in settings:
        if setting.is_secret:
            setting.value = '***'  # Mask secret values
    
    return settings


@router.get('/settings/{key}', response_model=schemas.SystemSettingOut)
async def get_setting(
    key: str,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت تنظیم خاص"""
    if not current.role or current.role.name != 'Admin':
        raise HTTPException(status_code=403, detail='دسترسی محدود')
    
    setting = crud.get_system_setting(session, key)
    if not setting:
        raise HTTPException(status_code=404, detail='تنظیم یافت نشد')
    
    if setting.is_secret:
        setting.value = '***'  # Mask secret value
    
    return setting


@router.get('/activity', response_model=list[schemas.ActivityLogOut])
def list_activity(q: Optional[str] = None, user_id: Optional[int] = None, start: Optional[str] = None, end: Optional[str] = None, limit: Optional[int] = 100, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    qs = session.query(models.AuditLog).order_by(models.AuditLog.created_at.desc())
    if q:
        qs = qs.filter(models.AuditLog.detail.ilike(f"%{q}%"))
    if user_id:
        qs = qs.filter(models.AuditLog.user_id == user_id)
    if start:
        try:
            from datetime import datetime
            s = datetime.fromisoformat(start)
            qs = qs.filter(models.AuditLog.created_at >= s)
        except Exception:
            pass
    if end:
        try:
            from datetime import datetime
            e = datetime.fromisoformat(end)
            qs = qs.filter(models.AuditLog.created_at <= e)
        except Exception:
            pass
    return qs.limit(int(limit or 100)).all()


@router.get('/activity/{aid}', response_model=schemas.ActivityLogOut)
def get_activity(aid: int, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    a = session.query(models.AuditLog).filter(models.AuditLog.id == aid).first()
    if not a:
        raise HTTPException(status_code=404, detail='Activity not found')
    return a


@router.patch('/activity/{aid}', response_model=schemas.ActivityLogOut)
def patch_activity(aid: int, payload: schemas.ActivityLogUpdate, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    a = session.query(models.AuditLog).filter(models.AuditLog.id == aid).first()
    if not a:
        raise HTTPException(status_code=404, detail='Activity not found')
    if payload.detail is not None:
        a.detail = payload.detail
    session.add(a)
    session.commit()
    session.refresh(a)
    # also write to file log to reflect edit
    try:
        log_activity(None, current.username if current else None, f"ویرایش لاگ {aid}", path=f"/api/admin/activity/{aid}", method='PATCH', status_code=200, detail={'edited_by': current.username})
    except Exception:
        pass
    return a


@router.post('/ai_reports/run', response_model=schemas.AIReportOut)
def run_ai_report(start: Optional[str] = None, end: Optional[str] = None, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    from app.ai_analyzer import run_and_persist
    from datetime import datetime
    s = None
    e = None
    if start:
        try:
            s = datetime.fromisoformat(start)
        except Exception:
            s = None
    if end:
        try:
            e = datetime.fromisoformat(end)
        except Exception:
            e = None
    rep = run_and_persist(session, start=s, end=e)
    return rep


@router.get('/ai_reports', response_model=list[schemas.AIReportOut])
def list_ai_reports(limit: Optional[int] = 50, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    reps = crud.get_ai_reports(session, limit=int(limit or 50))
    return reps


@router.get('/ai_reports/{rid}', response_model=schemas.AIReportOut)
def get_ai_report(rid: int, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    r = crud.get_ai_report(session, rid)
    if not r:
        raise HTTPException(status_code=404, detail='Report not found')
    return r


@router.patch('/ai_reports/{rid}', response_model=schemas.AIReportOut)
def review_ai_report(rid: int, payload: schemas.AIReportReview, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    status = payload.status
    if status not in ['approved', 'dismissed', 'reviewed']:
        raise HTTPException(status_code=400, detail='invalid status')
    rep = crud.review_ai_report(session, rid, status=status, reviewer_id=current.id if hasattr(current, 'id') else None)
    if not rep:
        raise HTTPException(status_code=404, detail='Report not found')
    # log the review action
    try:
        log_activity(session, current.username if hasattr(current, 'username') else None, f"بررسی گزارش هوش مصنوعی {rid} - وضعیت: {status}", path=f"/api/admin/ai_reports/{rid}", method='PATCH', status_code=200, detail={'note': payload.note})
    except Exception:
        pass
    return rep
