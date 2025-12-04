from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from app.activity_logger import log_activity
from app import crud, models, schemas, security
from app.api.deps import get_current_user, require_roles, require_permissions
from app.db import get_db

router = APIRouter()


@router.post("", response_model=schemas.UserOut)
def create_user(
    user: schemas.UserCreate,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(get_db)
):
    """ایجاد کاربر جدید - فقط Admin"""
    
    # بررسی وجود کاربر
    existing = crud.get_user_by_username(session, user.username)
    if existing:
        raise HTTPException(status_code=400, detail='نام کاربری از قبل موجود است')
    
    # ایجاد کاربر جدید
    from app.security import get_password_hash
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=get_password_hash(user.password),
        role_id=user.role_id,
        role='User',  # Legacy field
        is_active=True
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    
    log_activity(session, current.id, f'/api/users', 'POST', 201, f'کاربر {user.username} ایجاد شد')
    return db_user


@router.get("", response_model=List[schemas.UserOut])
async def list_users(current: models.User = Depends(require_roles(role_names=['Admin'])), session: Session = Depends(get_db)):
    """لیست تمام کاربران - فقط Admin"""
    users = session.query(models.User).options(joinedload(models.User.role_obj)).all()
    return users


@router.patch('/{user_id}', response_model=schemas.UserOut)
async def update_user(
    user_id: int,
    update_data: schemas.UserUpdate,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(get_db)
):
    """ویرایش کاربر - فقط Admin"""
    
    user = session.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='کاربر یافت نشد')
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(user, key, value)
    
    session.commit()
    session.refresh(user)
    
    log_activity(session, current.id, f'/api/users/{user_id}', 'PATCH', 200, f'کاربر {user.username} ویرایش شد')
    return user


@router.delete('/{user_id}')
async def delete_user(
    user_id: int,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(get_db)
):
    """حذف کاربر - فقط Admin"""
    
    if user_id == current.id:
        raise HTTPException(status_code=400, detail='نمی‌توانید خودتان را حذف کنید')
    
    user = session.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='کاربر یافت نشد')
    
    username = user.username
    session.delete(user)
    session.commit()
    
    log_activity(session, current.id, f'/api/users/{user_id}', 'DELETE', 200, f'کاربر {username} حذف شد')
    return {'detail': 'کاربر حذف شد'}


@router.get('/current/permissions', response_model=List[schemas.PermissionOut])
async def get_current_user_permissions(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت permissions کاربر فعلی"""
    if current.role_id:
        role = crud.get_role(session, current.role_id)
        if role:
            return role.permissions
    return []


@router.get('/current/modules', response_model=List[str])
async def get_current_user_modules(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت ماژول های قابل دسترس برای کاربر فعلی"""
    if current.role_id:
        role = crud.get_role(session, current.role_id)
        if role:
            modules = set(p.module for p in role.permissions if p.module)
            # If user has any report-related permission, expose the dedicated 'reports' module
            try:
                if any('report' in (p.name or '').lower() for p in role.permissions):
                    modules.add('reports')
            except Exception:
                pass
            return list(modules)
    return []


@router.get('/preferences', response_model=schemas.UserPreferencesOut)
async def get_user_preferences(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """دریافت تنظیمات کاربر فعلی"""
    prefs = crud.get_user_preferences(session, current.id)
    if not prefs:
        # ایجاد تنظیمات پیش‌فرض اگر وجود نداشته باشد
        prefs = crud.create_user_preferences(session, current.id)
    return prefs


@router.put('/preferences', response_model=schemas.UserPreferencesOut)
async def update_user_preferences(
    payload: schemas.UserPreferencesUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """به‌روزرسانی تنظیمات کاربر فعلی"""
    # Validate language and currency
    valid_languages = ['fa', 'en', 'ar', 'ku']
    valid_currencies = ['irr', 'usd', 'aed']
    
    if payload.language and payload.language not in valid_languages:
        raise HTTPException(status_code=400, detail=f'زبان نامعتبر است. موارد قابل قبول: {valid_languages}')
    
    if payload.currency and payload.currency not in valid_currencies:
        raise HTTPException(status_code=400, detail=f'واحد پولی نامعتبر است. موارد قابل قبول: {valid_currencies}')
    
    prefs = crud.get_user_preferences(session, current.id)
    if not prefs:
        prefs = crud.create_user_preferences(session, current.id)
    
    prefs = crud.update_user_preferences(session, current.id, payload)
    return prefs


@router.get('/preferences/sidebar-order')
def get_sidebar_order(current: models.User = Depends(get_current_user), session: Session = Depends(get_db)):
    """Return saved sidebar order for the current user (list of module ids) or []"""
    key = f'user_sidebar_order:{current.id}'
    # Use existing CRUD helper to fetch system setting; stored as JSON in SystemSettings.value
    try:
        setting = crud.get_system_setting(session, key)
    except Exception:
        setting = None
    if not setting or not setting.value:
        return []
    import json
    try:
        return json.loads(setting.value)
    except Exception:
        # If stored value is plain string or malformed, return empty list
        return []


@router.post('/preferences/sidebar-order')
def set_sidebar_order(payload: dict, current: models.User = Depends(get_current_user), session: Session = Depends(get_db)):
    """Persist sidebar order for the current user. Expects JSON body: { order: ["dashboard","sales",...] }"""
    order = payload.get('order') if isinstance(payload, dict) else None
    if not isinstance(order, list):
        raise HTTPException(status_code=400, detail='order must be a list of module ids')
    key = f'user_sidebar_order:{current.id}'
    # store as json string in system_settings table
    import json
    existing = None
    try:
        existing = session.query(models.SystemSettings).filter(models.SystemSettings.key == key).first()
        if existing:
            existing.value = json.dumps(order, ensure_ascii=False)
            existing.setting_type = 'json'
            existing.updated_by = current.id
            session.add(existing)
        else:
            ss = models.SystemSettings(key=key, value=json.dumps(order, ensure_ascii=False), setting_type='json', display_name=f'Sidebar order for user {current.id}', category='user_pref', is_secret=False, updated_by=current.id)
            session.add(ss)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {'ok': True}


@router.get('/preferences/sidebar-side')
def get_sidebar_side(current: models.User = Depends(get_current_user), session: Session = Depends(get_db)):
    """Return saved sidebar side for the current user ('left'|'right') or empty string"""
    key = f'user_sidebar_side:{current.id}'
    try:
        setting = crud.get_system_setting(session, key)
    except Exception:
        setting = None
    if not setting or not setting.value:
        return ''
    try:
        return setting.value
    except Exception:
        return ''


@router.post('/preferences/sidebar-side')
def set_sidebar_side(payload: dict, current: models.User = Depends(get_current_user), session: Session = Depends(get_db)):
    """Persist sidebar side for the current user. Expects JSON body: { side: 'left'|'right' }"""
    side = payload.get('side') if isinstance(payload, dict) else None
    if side not in ('left', 'right'):
        raise HTTPException(status_code=400, detail="side must be 'left' or 'right'")
    key = f'user_sidebar_side:{current.id}'
    try:
        existing = session.query(models.SystemSettings).filter(models.SystemSettings.key == key).first()
        if existing:
            existing.value = side
            existing.setting_type = 'string'
            existing.updated_by = current.id
            session.add(existing)
        else:
            ss = models.SystemSettings(key=key, value=side, setting_type='string', display_name=f'Sidebar side for user {current.id}', category='user_pref', is_secret=False, updated_by=current.id)
            session.add(ss)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {'ok': True}


@router.get('/{user_id}/sms-config', response_model=schemas.UserSmsConfigOut)
def get_user_sms_config(user_id: int, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """
    دریافت تنظیمات SMS کاربر.
    """
    if current.id != user_id:  # type: ignore
        require_permissions(['settings_edit'])(current)
    config = crud.get_user_sms_config(session, user_id)
    if not config:
        raise HTTPException(status_code=404, detail='تنظیمات SMS یافت نشد')
    return config


@router.post('/{user_id}/sms-config', response_model=schemas.UserSmsConfigOut)
def create_user_sms_config(user_id: int, payload: schemas.UserSmsConfigCreate, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """
    ایجاد تنظیمات SMS برای کاربر.
    """
    if current.id != user_id:  # type: ignore
        require_permissions(['settings_edit'])(current)
    existing = crud.get_user_sms_config(session, user_id)
    if existing:
        raise HTTPException(status_code=409, detail='تنظیمات SMS قبلاً ایجاد شده است')
    config = crud.create_user_sms_config(session, user_id, payload)
    return config


@router.put('/{user_id}/sms-config', response_model=schemas.UserSmsConfigOut)
def update_user_sms_config(user_id: int, payload: schemas.UserSmsConfigUpdate, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """
    به‌روز رسانی تنظیمات SMS کاربر.
    """
    if current.id != user_id:  # type: ignore
        require_permissions(['settings_edit'])(current)
    config = crud.update_user_sms_config(session, user_id, payload)
    if not config:
        raise HTTPException(status_code=404, detail='تنظیمات SMS یافت نشد')
    return config


@router.delete('/{user_id}/sms-config')
def delete_user_sms_config(user_id: int, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):  # type: ignore
    """
    حذف تنظیمات SMS کاربر.
    """
    if current.id != user_id:  # type: ignore
        require_permissions(['settings_edit'])(current)
    if crud.delete_user_sms_config(session, user_id):
        return {'success': True, 'message': 'تنظیمات حذف شد'}  # type: ignore
    raise HTTPException(status_code=404, detail='تنظیمات SMS یافت نشد')


@router.post('/{user_id}/sms-test', response_model=schemas.SmsTestResponse)
def test_user_sms(user_id: int, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """
    ارسال پیام تست برای بررسی تنظیمات SMS.
    """
    if current.id != user_id:  # type: ignore
        require_permissions(['settings_edit'])(current)
    user = crud.get_user(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='کاربر یافت نشد')
    if not user.mobile:  # type: ignore
        raise HTTPException(status_code=400, detail='شماره تلفن کاربر موجود نیست')
    
    from app.sms import send_sms as send_sms_func
    message = 'این یک پیام تست از سیستم Hesabpak است.'
    success, msg = send_sms_func(session, user.mobile, message, user_id=user_id)  # type: ignore
    
    return schemas.SmsTestResponse(
        success=success,
        message=msg if success else f'خطا: {msg}'
    )

