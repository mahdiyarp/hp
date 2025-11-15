from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from . import db, crud, schemas, security
from .ocr_parser import parse_invoice_file
from .ocr_parser import parse_payment_file
import tempfile
import shutil
import json
import zipfile
import hashlib
import re
import requests
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import jdatetime
from typing import List, Optional
import os

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import OAuth2PasswordBearer
from . import models
from .schemas import InvoiceCreate, InvoiceOut
from .schemas import PaymentCreate, PaymentOut
from .search import search_multi, suggest_live
from .schemas import ProductCreate, ProductOut, PersonCreate, PersonOut
from . import external_search
from .schemas import ExternalSearchRequest, ExternalProduct, SaveExternalProductRequest
from .schemas import AssistantRequest, AssistantResponse, AssistantToggle, OTPVerifyRequest, OTPSetupResponse, OTPDisableRequest
from .exports import export_invoice_pdf, export_invoice_csv, export_invoice_excel, EXPORT_DIR
from .activity_logger import log_activity
from fastapi.responses import HTMLResponse, FileResponse
from .version import get_version_info
from .sms import send_sms, SUPPORTED_PROVIDERS

DB = db

app = FastAPI(title="hesabpak Backend")


# ==================== Update storage helpers ====================

DATA_DIR = Path(os.getenv('HESABPAK_DATA_DIR', Path(__file__).resolve().parent.parent / 'data'))
UPDATE_STORAGE_DIR = Path(os.getenv('HESABPAK_UPDATE_DIR', str(DATA_DIR / 'updates')))
UPDATE_HISTORY_PATH = UPDATE_STORAGE_DIR / 'history.json'
MAX_UPDATE_SIZE_BYTES = int(os.getenv('HESABPAK_MAX_UPDATE_SIZE', str(200 * 1024 * 1024)))


def _ensure_update_dirs() -> None:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        UPDATE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'امکان ایجاد پوشه‌ی به‌روزرسانی وجود ندارد: {exc}')


def _sanitize_filename(name: str) -> str:
    sanitized = re.sub(r'[^A-Za-z0-9._-]+', '_', name or '')
    return sanitized or 'package.bin'


def _load_update_history() -> List[dict]:
    _ensure_update_dirs()
    if UPDATE_HISTORY_PATH.exists():
        try:
            with UPDATE_HISTORY_PATH.open('r', encoding='utf-8') as fh:
                data = json.load(fh)
            if isinstance(data, list):
                return data
        except Exception:
            return []
    return []


def _save_update_history(items: List[dict]) -> None:
    _ensure_update_dirs()
    with UPDATE_HISTORY_PATH.open('w', encoding='utf-8') as fh:
        json.dump(items, fh, ensure_ascii=False, indent=2)


def _append_update_history(entry: dict) -> None:
    history = _load_update_history()
    history.insert(0, entry)
    # keep last 50 records to avoid unlimited growth
    _save_update_history(history[:50])


def _download_update_file(url: str, entry_id: str) -> tuple[Path, int]:
    _ensure_update_dirs()
    parsed = urlparse(url)
    original_name = Path(parsed.path).name or 'package.bin'
    filename = f"{entry_id}_{_sanitize_filename(original_name)}"
    destination = UPDATE_STORAGE_DIR / filename

    try:
        with requests.get(url, stream=True, timeout=30) as response:
            if response.status_code >= 400:
                raise HTTPException(status_code=response.status_code, detail='دریافت فایل به‌روزرسانی ناموفق بود.')
            size = 0
            with destination.open('wb') as fh:
                for chunk in response.iter_content(chunk_size=8192):
                    if not chunk:
                        continue
                    fh.write(chunk)
                    size += len(chunk)
                    if size > MAX_UPDATE_SIZE_BYTES:
                        fh.close()
                        destination.unlink(missing_ok=True)
                        raise HTTPException(status_code=400, detail='حجم بسته از حد مجاز بیشتر است.')
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f'خطا در دانلود به‌روزرسانی: {exc}')

    return destination, size


def _calculate_checksum(file_path: Path) -> str:
    digest = hashlib.sha256()
    with file_path.open('rb') as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_extract_zip(zip_path: Path, target_dir: Path) -> int:
    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            extracted_path = target_dir / member.filename
            if not str(extracted_path.resolve()).startswith(str(target_dir.resolve())):
                raise HTTPException(status_code=400, detail='آرشیو شامل مسیر ناامن است.')
        archive.extractall(target_dir)
        return len(archive.infolist())


def _extract_update_archive(file_path: Path) -> tuple[Optional[str], Optional[int]]:
    if not zipfile.is_zipfile(file_path):
        return None, None

    extract_dir = file_path.parent / f"{file_path.stem}_extracted"
    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    extract_dir.mkdir(parents=True, exist_ok=True)
    count = _safe_extract_zip(file_path, extract_dir)
    return extract_dir.name, count

# Simple audit middleware: logs each request/response to audit_logs table
class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        user_id = None
        auth = request.headers.get('authorization')
        if auth and auth.lower().startswith('bearer '):
            token = auth.split(None, 1)[1]
            try:
                payload = security.decode_token(token)
                sub = payload.get('sub')
                # lookup user id by username
                session = DB.SessionLocal()
                try:
                    user = crud.get_user_by_username(session, sub)
                    if user:
                        user_id = user.id
                finally:
                    session.close()
            except Exception:
                user_id = None
        response = await call_next(request)
        # write audit log (file + DB) using activity_logger
        try:
            from .activity_logger import log_request
            uname = None
            if user_id:
                # try to get username for nicer display
                s = DB.SessionLocal()
                try:
                    u = crud.get_user(s, user_id)
                    if u:
                        uname = u.username
                finally:
                    try:
                        s.close()
                    except Exception:
                        pass
            log_request(request, response, username=uname)
        except Exception:
            pass
        return response


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# app.add_middleware(AuditMiddleware)  # Temporarily disabled due to async issues


def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(db.get_db)):
    try:
        payload = security.decode_token(token)
        username = payload.get('sub')
        if username is None:
            raise HTTPException(status_code=401, detail='Invalid authentication')
    except Exception as e:
        raise HTTPException(status_code=401, detail='Invalid token')
    user = crud.get_user_by_username(session, username)
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


@app.get('/api/admin/activity', response_model=list[schemas.ActivityLogOut])
def list_activity(q: Optional[str] = None, user_id: Optional[int] = None, start: Optional[str] = None, end: Optional[str] = None, limit: Optional[int] = 100, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
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


@app.get('/api/admin/activity/{aid}', response_model=schemas.ActivityLogOut)
def get_activity(aid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    a = session.query(models.AuditLog).filter(models.AuditLog.id == aid).first()
    if not a:
        raise HTTPException(status_code=404, detail='Activity not found')
    return a


@app.patch('/api/admin/activity/{aid}', response_model=schemas.ActivityLogOut)
def patch_activity(aid: int, payload: schemas.ActivityLogUpdate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
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


def require_roles(role_ids: List[int] = None, role_names: List[str] = None):
    """بررسی دسترسی بر اساس role ID یا نام
    
    استفاده:
    - require_roles(role_ids=[1])  # فقط Admin (ID=1)
    - require_roles(role_names=['Admin'])  # فقط Admin (نام)
    """
    def _dependency(current_user: models.User = Depends(get_current_user)):
        if not current_user.role_id:
            raise HTTPException(status_code=403, detail='کاربر نقشی ندارد')
        
        if role_ids and current_user.role_id not in role_ids:
            raise HTTPException(status_code=403, detail='شما دسترسی ندارید')
        
        if role_names and current_user.role_obj:
            if current_user.role_obj.name not in role_names:
                raise HTTPException(status_code=403, detail='شما دسترسی ندارید')
        
        return current_user
    return _dependency


def require_permissions(permission_names: List[str]):
    """بررسی دسترسی بر اساس نام permission
    
    استفاده:
    - require_permissions(['finance_view'])  # مشاهده مالی
    - require_permissions(['sales_create', 'sales_edit'])  # ایجاد یا ویرایش فروش
    """
    def _dependency(current_user: models.User = Depends(get_current_user)):
        if not current_user.role_id or not current_user.role_obj:
            raise HTTPException(status_code=403, detail='کاربر نقشی ندارد')
        
        user_perm_names = set(p.name for p in (current_user.role_obj.permissions or []))
        required_perms = set(permission_names)
        
        # Check if user has at least one of the required permissions
        if not user_perm_names & required_perms:
            raise HTTPException(status_code=403, detail=f'شما دسترسی ندارید. نیاز به یکی از این دسترسی‌ها: {", ".join(permission_names)}')
        
        return current_user
    return _dependency


@app.on_event("startup")
def on_startup():
    # Ensure DB tables exist for simple dev setup. Alembic is primary migration tool.
    db.Base.metadata.create_all(bind=db.engine)


@app.get("/api/hello")
def hello():
    return {"message": "Hello from hesabpak backend (FastAPI)!"}


@app.get("/api/time/now")
def time_now():
    # return server time snapshots with Jalali representation
    local_now = datetime.now().astimezone()
    utc_now = local_now.astimezone(timezone.utc)
    offset_delta = local_now.utcoffset()
    offset_seconds = int(offset_delta.total_seconds()) if offset_delta is not None else 0
    sign = '+' if offset_seconds >= 0 else '-'
    total_minutes = abs(offset_seconds) // 60
    hours, minutes = divmod(total_minutes, 60)
    offset_str = f"{sign}{hours:02d}:{minutes:02d}"
    try:
        jalali_now = jdatetime.datetime.fromgregorian(datetime=local_now.replace(tzinfo=None))
        jalali_str = jalali_now.strftime("%Y/%m/%d %H:%M:%S")
    except Exception:
        jalali_str = None
    return {
        "utc": utc_now.isoformat(),
        "server_local": local_now.isoformat(),
        "server_offset_seconds": offset_seconds,
        "server_offset": offset_str,
        "jalali": jalali_str,
        "epoch_ms": int(utc_now.timestamp() * 1000),
    }


@app.get('/api/version')
def api_version():
    try:
        return get_version_info()
    except Exception:
        return {"version": "unknown"}


@app.post("/api/time/sync", response_model=schemas.TimeSync)
def time_sync(payload: schemas.TimeSyncCreate, session: Session = Depends(db.get_db)):
    # Create a timesync record where server_time is canonical (UTC)
    try:
        record = crud.create_time_sync(session, payload)
        return record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/users", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, session: Session = Depends(db.get_db)):
    try:
        return crud.create_user(session, user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post('/api/auth/register', response_model=schemas.UserOut)
def register(user_in: schemas.UserCreate, session: Session = Depends(db.get_db)):
    try:
        user = crud.create_user(session, user_in)
        return user
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post('/api/auth/login', response_model=schemas.Token)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(db.get_db)):
    user = crud.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail='Incorrect username or password')
    if not user.is_active:
        raise HTTPException(status_code=403, detail='User disabled')
    form = await request.form()
    otp_code = form.get('otp')
    if user.otp_enabled:
        otp_secret = security.decrypt_value(user.otp_secret) if user.otp_secret else None
        if not otp_code:
            raise HTTPException(status_code=428, detail='OTP required')
        if not otp_secret or not security.verify_otp(otp_secret, otp_code):
            raise HTTPException(status_code=400, detail='Invalid OTP')
    access_token = security.create_access_token(user.username, expires_delta=timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = security.create_refresh_token(user.username)
    crud.set_refresh_token(session, user, refresh_token)
    return schemas.Token(access_token=access_token, refresh_token=refresh_token, otp_required=False)


@app.post('/api/auth/refresh', response_model=schemas.Token)
def refresh_token(payload: dict, session: Session = Depends(db.get_db)):
    refresh = payload.get('refresh_token')
    if not refresh:
        raise HTTPException(status_code=400, detail='refresh_token required')
    try:
        data = security.decode_token(refresh)
        username = data.get('sub')
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid refresh token')
    user = crud.get_user_by_username(session, username)
    if not user or not crud.verify_refresh_token(session, user, refresh):
        raise HTTPException(status_code=401, detail='Invalid refresh token')
    # issue new tokens
    access_token = security.create_access_token(user.username)
    new_refresh = security.create_refresh_token(user.username)
    crud.set_refresh_token(session, user, new_refresh)
    return schemas.Token(access_token=access_token, refresh_token=new_refresh, otp_required=False)


@app.post('/api/auth/logout')
def logout(current_user = Depends(get_current_user), session: Session = Depends(db.get_db)):
    crud.revoke_refresh_token(session, current_user)
    return {'ok': True}


@app.post('/api/auth/otp/setup', response_model=OTPSetupResponse)
def otp_setup(current_user = Depends(get_current_user), session: Session = Depends(db.get_db)):
    secret = security.generate_otp_secret()
    crud.set_user_otp_secret(session, current_user, secret, enabled=False)
    uri = security.generate_otp_uri(current_user.username, secret)
    return OTPSetupResponse(secret=secret, uri=uri)


@app.post('/api/auth/otp/verify')
def otp_verify(payload: OTPVerifyRequest, current_user = Depends(get_current_user), session: Session = Depends(db.get_db)):
    otp_secret = security.decrypt_value(current_user.otp_secret) if current_user.otp_secret else None
    if not otp_secret:
        raise HTTPException(status_code=400, detail='OTP secret not generated')
    if not security.verify_otp(otp_secret, payload.code):
        raise HTTPException(status_code=400, detail='Invalid OTP code')
    crud.enable_user_otp(session, current_user)
    return {'otp_enabled': True}


@app.post('/api/auth/otp/disable')
def otp_disable(payload: OTPDisableRequest, current_user = Depends(get_current_user), session: Session = Depends(db.get_db)):
    if current_user.otp_enabled:
        if payload.code:
            otp_secret = security.decrypt_value(current_user.otp_secret) if current_user.otp_secret else None
            if not otp_secret or not security.verify_otp(otp_secret, payload.code):
                raise HTTPException(status_code=400, detail='Invalid OTP code')
        crud.disable_user_otp(session, current_user)
    return {'otp_enabled': False}


# Example protected route
@app.get('/api/admin-only')
def admin_only(user = Depends(require_roles(role_names=['Admin']))):
    return {'msg': f'Hello {user.username}, you are admin.'}


@app.get('/api/auth/me')
def me(current_user: models.User = Depends(get_current_user)):
    """Return current user info"""
    from fastapi.responses import JSONResponse
    return JSONResponse({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'full_name': current_user.full_name,
        'mobile': current_user.mobile,
        'role': current_user.role,
        'role_id': current_user.role_id,
        'is_active': current_user.is_active,
        'otp_enabled': getattr(current_user, 'otp_enabled', False)
    })


@app.post('/api/auth/login-phone', response_model=schemas.PhoneLoginResponse)
def login_phone(payload: schemas.PhoneLoginRequest, session: Session = Depends(db.get_db)):
    """
    درخواست ورود با شماره تلفن.
    OTP را از طریق SMS ارسال می‌کند.
    """
    from .sms import create_otp_session, send_sms as send_sms_func
    
    phone = payload.phone.strip()
    
    # بررسی شماره تلفن
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail='شماره تلفن نامعتبر است')
    
    # جستجو برای کاربر با این شماره تلفن
    user: Optional[models.User] = session.query(models.User).filter(
        models.User.mobile == phone
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail='کاربر با این شماره تلفن یافت نشد')
    
    if user and not user.is_active:
        raise HTTPException(status_code=403, detail='حساب کاربری غیر فعال است')
    
    # ایجاد جلسه OTP
    session_id, otp_code = create_otp_session(phone)
    
    # ارسال OTP
    message = f'کد ورود شما: {otp_code}\nاین کد 5 دقیقه معتبر است.'
    success, msg = send_sms_func(session, phone, message, user_id=user.id if user else None)
    
    if not success:
        raise HTTPException(status_code=500, detail=f'خطا در ارسال پیام: {msg}')
    
    return schemas.PhoneLoginResponse(
        success=True,
        message='کد تأیید از طریق پیام کوتاه ارسال شد',
        session_id=session_id
    )


@app.post('/api/auth/verify-phone-otp', response_model=schemas.PhoneOtpVerifyResponse)
def verify_phone_otp(payload: schemas.PhoneOtpVerifyRequest, session: Session = Depends(db.get_db)):
    """
    تأیید کد OTP و دریافت access token.
    """
    from .sms import verify_otp_session
    
    is_valid, phone = verify_otp_session(payload.session_id, payload.otp_code)
    
    if not is_valid or not phone:
        raise HTTPException(status_code=400, detail='کد OTP نامعتبر یا منقضی است')
    
    # جستجو برای کاربر
    user: Optional[models.User] = session.query(models.User).filter(
        models.User.mobile == phone
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail='کاربر یافت نشد')
    
    # ایجاد access token
    access_token = security.create_access_token(str(user.username), expires_delta=timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = security.create_refresh_token(str(user.username))
    crud.set_refresh_token(session, user, refresh_token)
    
    return schemas.PhoneOtpVerifyResponse(
        success=True,
        access_token=access_token,
        token_type='bearer',
        message='ورود موفق'
    )


# ==================== موبائل سے نیا صارف بنانا ====================

@app.post('/api/auth/register-mobile-otp', response_model=schemas.MobileOTPResponse)
def register_mobile_otp(payload: schemas.MobileOTPRequest, session: Session = Depends(db.get_db)):
    """
    موبائل نمبر سے نیا صارف بنانے کے لیے OTP طلب کریں۔
    """
    from .sms import create_otp_session, send_sms
    
    phone = payload.mobile.strip()
    
    # فون نمبر کی تصدیق
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail='فون نمبر غلط ہے')
    
    # چیک کریں کہ صارف پہلے سے موجود تو نہیں
    existing_user = session.query(models.User).filter(
        models.User.mobile == phone
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=409, detail='یہ فون نمبر پہلے سے رجسٹر ہے')
    
    # OTP جلسہ بنائیں
    session_id, otp_code = create_otp_session(phone)
    
    # OTP بھیجیں
    message = f'آپ کا رجسٹریشن کوڈ: {otp_code}\nیہ کوڈ 5 منٹ تک درست ہے۔'
    success, msg = send_sms(session, phone, message)
    
    if not success:
        raise HTTPException(status_code=500, detail=f'OTP بھیجنے میں خرابی: {msg}')
    
    return schemas.MobileOTPResponse(
        success=True,
        message='OTP آپ کے فون پر بھیجا گیا',
        session_id=session_id
    )


@app.post('/api/auth/register-mobile-verify', response_model=schemas.MobileRegisterResponse)
def register_mobile_verify(payload: schemas.MobileOTPVerifyRequest, session: Session = Depends(db.get_db)):
    """
    موبائل سے نیا صارف بنانا اور OTP تصدیق کریں۔
    """
    from .sms import verify_otp_session
    
    phone = payload.mobile.strip()
    username = payload.username.strip()
    password = payload.password.strip()
    full_name = payload.full_name.strip() if payload.full_name else None
    
    # ان پٹ کی جانچ کریں
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail='فون نمبر غلط ہے')
    
    if not username or len(username) < 3:
        raise HTTPException(status_code=400, detail='صارف نام کم از کم 3 حروف ہونا چاہیے')
    
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail='پاس ورڈ کم از کم 6 حروف ہونا چاہیے')
    
    # OTP تصدیق کریں
    is_valid, verified_phone = verify_otp_session(payload.otp_code, payload.otp_code)
    
    # براہ راست جانچ - سادہ تر طریقہ
    # یہاں session_id سے phone حاصل کریں
    from .sms import _otp_sessions
    session_data = _otp_sessions.get(payload.otp_code)  # یہاں OTP session_id ہونی چاہیے
    
    if not session_data or session_data['phone'] != phone or session_data['otp_code'] != payload.otp_code:
        raise HTTPException(status_code=400, detail='OTP غلط یا منقضی ہے')
    
    # چیک کریں کہ صارف یا فون پہلے سے موجود تو نہیں
    existing_user = session.query(models.User).filter(
        (models.User.username == username) | (models.User.mobile == phone)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=409, detail='صارف نام یا فون نمبر پہلے سے موجود ہے')
    
    # ڈیفالٹ نقش صارف شامل کریں (Viewer)
    viewer_role = session.query(models.Role).filter(models.Role.name == 'Viewer').first()
    role_id = viewer_role.id if viewer_role else 5
    
    # نیا صارف بنائیں
    hashed_password = security.get_password_hash(password)
    new_user = models.User(
        username=username,
        password_hash=hashed_password,
        email=None,
        mobile=phone,
        full_name=full_name or username,
        role_id=role_id,
        is_active=True
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # Access token بنائیں
    access_token = security.create_access_token(
        str(new_user.username),
        expires_delta=timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = security.create_refresh_token(str(new_user.username))
    crud.set_refresh_token(session, new_user, refresh_token)
    
    return schemas.MobileRegisterResponse(
        success=True,
        message='صارف کامیابی سے بنایا گیا',
        user=schemas.UserOut(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            full_name=new_user.full_name,
            mobile=new_user.mobile,
            role=new_user.role or 'Viewer',
            role_id=new_user.role_id,
            is_active=new_user.is_active,
            otp_enabled=getattr(new_user, 'otp_enabled', False),
            role_obj=None
        ),
        access_token=access_token,
        refresh_token=refresh_token
    )

    
    # ایجاد access token
    access_token = security.create_access_token(str(user.username), expires_delta=timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = security.create_refresh_token(str(user.username))
    crud.set_refresh_token(session, user, refresh_token)
    
    return schemas.PhoneOtpVerifyResponse(
        success=True,
        access_token=access_token,
        token_type='bearer',
        message='ورود موفق'
    )


# ==================== User SMS Configuration ====================

@app.get('/api/users/{user_id}/sms-config', response_model=schemas.UserSmsConfigOut)
def get_user_sms_config(user_id: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """
    دریافت تنظیمات SMS کاربر.
    """
    if current.id != user_id:  # type: ignore
        require_permissions(['settings_edit'])(current)
    config = crud.get_user_sms_config(session, user_id)
    if not config:
        raise HTTPException(status_code=404, detail='تنظیمات SMS یافت نشد')
    return config


@app.post('/api/users/{user_id}/sms-config', response_model=schemas.UserSmsConfigOut)
def create_user_sms_config(user_id: int, payload: schemas.UserSmsConfigCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
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


@app.put('/api/users/{user_id}/sms-config', response_model=schemas.UserSmsConfigOut)
def update_user_sms_config(user_id: int, payload: schemas.UserSmsConfigUpdate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """
    به‌روز رسانی تنظیمات SMS کاربر.
    """
    if current.id != user_id:  # type: ignore
        require_permissions(['settings_edit'])(current)
    config = crud.update_user_sms_config(session, user_id, payload)
    if not config:
        raise HTTPException(status_code=404, detail='تنظیمات SMS یافت نشد')
    return config


@app.delete('/api/users/{user_id}/sms-config')
def delete_user_sms_config(user_id: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):  # type: ignore
    """
    حذف تنظیمات SMS کاربر.
    """
    if current.id != user_id:  # type: ignore
        require_permissions(['settings_edit'])(current)
    if crud.delete_user_sms_config(session, user_id):
        return {'success': True, 'message': 'تنظیمات حذف شد'}  # type: ignore
    raise HTTPException(status_code=404, detail='تنظیمات SMS یافت نشد')


@app.post('/api/users/{user_id}/sms-test', response_model=schemas.SmsTestResponse)
def test_user_sms(user_id: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
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
    
    from .sms import send_sms as send_sms_func
    message = 'این یک پیام تست از سیستم Hesabpak است.'
    success, msg = send_sms_func(session, user.mobile, message, user_id=user_id)  # type: ignore
    
    return schemas.SmsTestResponse(
        success=success,
        message=msg if success else f'خطا: {msg}'
    )


@app.post('/api/invoices/manual', response_model=InvoiceOut)
def create_invoice_manual(payload: InvoiceCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # require at least Cashier
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    inv = crud.create_invoice_manual(session, payload)
    return inv


@app.post('/api/invoices/smart')
def parse_invoice_upload(file: UploadFile = File(...), current: models.User = Depends(get_current_user)):
    # accept image or PDF and return parsed draft; user will confirm in client
    try:
        tmp = tempfile.mkdtemp(prefix='ocr-')
        fp = f"{tmp}/{file.filename}"
        with open(fp, 'wb') as f:
            shutil.copyfileobj(file.file, f)
        draft = parse_invoice_file(fp)
        return {'draft': draft}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            file.file.close()
        except Exception:
            pass


@app.post('/api/invoices/from-draft', response_model=InvoiceOut)
def create_invoice_from_draft(payload: InvoiceCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    inv = crud.create_invoice_manual(session, payload)
    return inv


@app.get('/api/invoices', response_model=list[InvoiceOut])
def list_invoices(q: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    invs = crud.get_invoices(session, q=q)
    # load items for each
    out = []
    for inv in invs:
        # use the current request DB session to load related items
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
        inv.items = items
        out.append(inv)
    return out


@app.get('/api/invoices/open-for-payment', response_model=list[InvoiceOut])
def list_open_invoices(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    # Return invoices that are not fully paid (draft or final, and either no payments or payments < total)
    invs = session.query(models.Invoice).filter(
        models.Invoice.status.in_(['draft', 'final'])
    ).order_by(models.Invoice.server_time.desc()).limit(100).all()
    out = []
    for inv in invs:
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
        inv.items = items
        out.append(inv)
    return out


@app.get('/api/integrations', response_model=list[schemas.IntegrationConfigOut])
def list_integrations(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    return crud.get_integrations(session)


@app.post('/api/integrations', response_model=schemas.IntegrationConfigOut)
def upsert_integration(payload: schemas.IntegrationConfigIn, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    i = crud.upsert_integration(session, payload)
    return i


@app.patch('/api/integrations/{iid}/toggle', response_model=schemas.IntegrationConfigOut)
def toggle_integration(iid: int, enabled: bool, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    i = crud.set_integration_enabled(session, iid, enabled)
    if not i:
        raise HTTPException(status_code=404, detail='Integration not found')
    return i


@app.post('/api/integrations/{iid}/refresh', response_model=schemas.IntegrationRefreshResult)
def refresh_integration_endpoint(iid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    integ = crud.get_integration(session, iid)
    if not integ:
        raise HTTPException(status_code=404, detail='Integration not found')
    stat = external_search.aggregate_search if integ.provider in ('digikala', 'torob', 'emalls') else None
    # prefer specialized integrations client
    from .integrations import refresh_integration as _refresh
    stat = _refresh(db, iid)
    # map to schema
    return {
        'name': integ.name,
        'provider': integ.provider,
        'enabled': integ.enabled,
        'status': stat.get('status') if isinstance(stat, dict) else str(stat),
        'sample': stat.get('sample') if isinstance(stat, dict) else None,
        'last_updated': integ.last_updated,
    }


@app.get('/api/invoices/{invoice_id}', response_model=InvoiceOut)
def get_invoice(invoice_id: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    inv = crud.get_invoice(session, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    # ensure items loaded
    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    inv.items = items
    return inv


@app.get('/api/invoices/{invoice_id}/payments', response_model=list[PaymentOut])
def get_invoice_payments(invoice_id: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    inv = crud.get_invoice(session, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    # Find payments where reference matches invoice_number
    payments = session.query(models.Payment).filter(
        models.Payment.reference.ilike(f'%{inv.invoice_number}%')
    ).all()
    return payments

@app.get('/api/trace/{tracking_code}')
def trace_chain(tracking_code: str, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    invoice = session.query(models.Invoice).filter(models.Invoice.tracking_code == tracking_code).first()
    payments = session.query(models.Payment).filter(models.Payment.tracking_code == tracking_code).all()
    ledger = session.query(models.LedgerEntry).filter(models.LedgerEntry.tracking_code == tracking_code).all()
    items = []
    if invoice:
        items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice.id).all()
    return {
        'tracking_code': tracking_code,
        'invoice': invoice,
        'payments': payments,
        'ledger_entries': ledger,
        'items': items,
    }


@app.get('/api/ledger/account-balances')
def account_balances(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Viewer'])(current)
    # Calculate account balances: debit - credit per account
    all_entries = session.query(models.LedgerEntry).all()
    balances = {}
    for entry in all_entries:
        if entry.debit_account not in balances:
            balances[entry.debit_account] = 0
        if entry.credit_account not in balances:
            balances[entry.credit_account] = 0
        balances[entry.debit_account] += entry.amount
        balances[entry.credit_account] -= entry.amount
    return {'balances': balances}


@app.get('/api/persons/balances')
def persons_balances(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Get debit/credit balances for all persons"""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Salesman', 'Viewer'])(current)
    
    # Get all persons
    persons = session.query(models.Person).all()
    
    # Calculate balances for each person
    result = []
    for person in persons:
        entries = session.query(models.LedgerEntry).filter(models.LedgerEntry.party_id == str(person.id)).all()
        
        # Calculate debit (receivable - customer owes us)
        debit_total = sum(e.amount for e in entries if e.debit_account == 'AccountsReceivable')
        # Calculate credit (payable - we owe them)
        credit_total = sum(e.amount for e in entries if e.credit_account == 'AccountsReceivable')
        
        # Net balance: positive = they owe us (debtor), negative = we owe them (creditor)
        net_balance = debit_total - credit_total
        
        result.append({
            'person_id': str(person.id),
            'debit': debit_total,
            'credit': credit_total,
            'balance': net_balance
        })
    
    return {'balances': result}


@app.get('/api/ledger/party/{party_id}')
def party_ledger(party_id: str, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Salesman', 'Viewer'])(current)
    
    # Get person details
    person = session.query(models.Person).filter(models.Person.id == party_id).first()
    if not person:
        raise HTTPException(status_code=404, detail='Person not found')
    
    # Get all ledger entries for this party
    ledger_entries = session.query(models.LedgerEntry).filter(
        models.LedgerEntry.party_id == party_id
    ).order_by(models.LedgerEntry.entry_date.desc()).all()
    
    # Enrich entries with related invoice/payment details
    enriched_entries = []
    for entry in ledger_entries:
        entry_data = {
            'id': entry.id,
            'description': entry.description,
            'debit_account': entry.debit_account,
            'credit_account': entry.credit_account,
            'amount': entry.amount,
            'entry_date': entry.entry_date.isoformat() if entry.entry_date else None,
            'ref_type': entry.ref_type,
            'ref_id': entry.ref_id,
            'invoice': None,
            'payment': None,
        }
        
        # Try to find related invoice
        if entry.ref_type == 'invoice' and entry.ref_id:
            try:
                invoice_id = int(entry.ref_id)
                invoice = session.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
                if invoice:
                    entry_data['invoice'] = {
                        'id': invoice.id,
                        'invoice_number': invoice.invoice_number,
                        'issue_date': (invoice.client_time or invoice.server_time).isoformat() if (invoice.client_time or invoice.server_time) else None,
                        'total_amount': invoice.total or 0,
                        'status': invoice.status,
                    }
            except (ValueError, TypeError):
                pass
        
        # Try to find related payment
        if entry.ref_type == 'payment' and entry.ref_id:
            try:
                payment_id = int(entry.ref_id)
                payment = session.query(models.Payment).filter(models.Payment.id == payment_id).first()
                if payment:
                    entry_data['payment'] = {
                        'id': payment.id,
                        'amount': payment.amount,
                        'payment_date': (payment.client_time or payment.server_time).isoformat() if (payment.client_time or payment.server_time) else None,
                        'method': payment.method,
                        'reference': payment.reference,
                    }
            except (ValueError, TypeError):
                pass
        
        enriched_entries.append(entry_data)
    
    # Calculate running balance
    running_balance = 0
    for entry in reversed(enriched_entries):
        if entry['debit_account'] == 'AccountsReceivable':
            running_balance += entry['amount']
        elif entry['credit_account'] == 'AccountsReceivable':
            running_balance -= entry['amount']
        entry['running_balance'] = running_balance
    
    enriched_entries.reverse()
    
    # Calculate totals
    debit_total = sum(e['amount'] for e in enriched_entries if e['debit_account'] == 'AccountsReceivable')
    credit_total = sum(e['amount'] for e in enriched_entries if e['credit_account'] == 'AccountsReceivable')
    net_balance = debit_total - credit_total
    
    return {
        'party_id': party_id,
        'person': {
            'id': person.id,
            'name': person.name,
            'kind': person.kind,
            'mobile': person.mobile,
            'code': person.code,
        },
        'entries': enriched_entries,
        'debit_total': debit_total,
        'credit_total': credit_total,
        'net_balance': net_balance,
    }


@app.patch('/api/invoices/{invoice_id}', response_model=InvoiceOut)
def patch_invoice(invoice_id: int, payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    inv = crud.update_invoice(session, invoice_id, payload)
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    inv.items = items
    return inv


@app.post('/api/invoices/{invoice_id}/finalize', response_model=InvoiceOut)
def finalize_invoice(invoice_id: int, payload: dict = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    client_time = None
    if payload and isinstance(payload, dict):
        ct = payload.get('client_time')
        if ct:
            from datetime import datetime
            try:
                client_time = datetime.fromisoformat(ct)
            except Exception:
                client_time = None
    inv = crud.finalize_invoice(session, invoice_id, client_time=client_time)
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    items = session.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == inv.id).all()
    inv.items = items
    return inv


@app.post('/api/payments/manual', response_model=schemas.PaymentOut)
def create_payment_manual(payload: schemas.PaymentCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_create'])(current)
    pay = crud.create_payment_manual(session, payload)
    return pay


@app.post('/api/payments/smart')
def parse_payment_upload(file: UploadFile = File(...), current: models.User = Depends(get_current_user)):
    try:
        tmp = tempfile.mkdtemp(prefix='ocr-')
        fp = f"{tmp}/{file.filename}"
        with open(fp, 'wb') as f:
            shutil.copyfileobj(file.file, f)
        draft = parse_payment_file(fp)
        return {'draft': draft}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            file.file.close()
        except Exception:
            pass


@app.post('/api/payments/from-draft', response_model=schemas.PaymentOut)
def create_payment_from_draft(payload: schemas.PaymentCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_create'])(current)
    pay = crud.create_payment_manual(session, payload)
    return pay


@app.get('/api/payments', response_model=list[schemas.PaymentOut])
def list_payments(q: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_view'])(current)
    pays = crud.get_payments(session, q=q)
    return pays


@app.get('/api/payments/{payment_id}', response_model=schemas.PaymentOut)
def get_payment(payment_id: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_view'])(current)
    p = crud.get_payment(session, payment_id)
    if not p:
        raise HTTPException(status_code=404, detail='Payment not found')
    return p


@app.patch('/api/payments/{payment_id}', response_model=schemas.PaymentOut)
def patch_payment(payment_id: int, payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_edit'])(current)
    p = crud.update_invoice(session, payment_id, payload)  # reuse generic update helper
    if not p:
        raise HTTPException(status_code=404, detail='Payment not found')
    return p


@app.post('/api/payments/{payment_id}/finalize', response_model=schemas.PaymentOut)
def finalize_payment_endpoint(payment_id: int, payload: dict = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_edit'])(current)
    client_time = None
    if payload and isinstance(payload, dict):
        ct = payload.get('client_time')
        if ct:
            from datetime import datetime
            try:
                client_time = datetime.fromisoformat(ct)
            except Exception:
                client_time = None
    p = crud.finalize_payment(session, payment_id, client_time=client_time)
    if not p:
        raise HTTPException(status_code=404, detail='Payment not found')
    return p


def _parse_natural_query(q: str):
    """Very small parser: returns dict with possible filters: start,end,amount_min,party_name,invoice_type"""
    import re
    from datetime import datetime, timedelta
    res = {}
    ql = q or ''
    # amount like '5 میلیون' or '5000000' or '5,000,000'
    m = re.search(r"(\d+[\.,\d]*)\s*(میلیون|هزار|تومان|ریال)?", ql)
    if m:
        num = m.group(1).replace(',', '').replace('.', '')
        unit = m.group(2)
        try:
            val = int(num)
        except Exception:
            try:
                val = int(float(num))
            except Exception:
                val = None
        if unit:
            if 'میلیون' in unit:
                val = int(val * 1_000_000)
            elif 'هزار' in unit:
                val = int(val * 1_000)
        res['amount_min'] = val
    # date keywords
    if 'این هفته' in ql or 'هفته' in ql:
        today = datetime.utcnow()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        res['start'] = start
        res['end'] = end
    if 'ماه' in ql or 'ماه جاری' in ql:
        today = datetime.utcnow()
        start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # naive month end: next month first -1 second
        if today.month == 12:
            nm = today.replace(year=today.year+1, month=1, day=1)
        else:
            nm = today.replace(month=today.month+1, day=1)
        end = nm - timedelta(seconds=1)
        res['start'] = start
        res['end'] = end
    # party name
    m2 = re.search(r'برای\s+([\u0600-\u06FF\w\s]+)', ql)
    if m2:
        res['party_name'] = m2.group(1).strip()
    else:
        m3 = re.search(r'for\s+([\w\s]+)', ql, re.I)
        if m3:
            res['party_name'] = m3.group(1).strip()
    # invoice type
    if 'فروش' in ql or 'sell' in ql.lower():
        res['invoice_type'] = 'sale'
    if 'خرید' in ql or 'purchase' in ql.lower():
        res['invoice_type'] = 'purchase'
    return res


@app.post('/api/reports/query')
def reports_query(payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Accepts {'q': '...'} and returns invoices matching a small set of parsed filters."""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    q = payload.get('q') if isinstance(payload, dict) else None
    if not q:
        raise HTTPException(status_code=400, detail='q required')
    filters = _parse_natural_query(q)
    # fetch invoices in date range
    start = filters.get('start')
    end = filters.get('end')
    invs = crud.get_invoices(session, q=None, limit=500)
    res = []
    for inv in invs:
        ok = True
        if filters.get('invoice_type') and inv.invoice_type != filters.get('invoice_type'):
            ok = False
        if start and inv.server_time and inv.server_time < start:
            ok = False
        if end and inv.server_time and inv.server_time > end:
            ok = False
        if filters.get('party_name') and inv.party_name:
            if filters.get('party_name') not in (inv.party_name or ''):
                ok = False
        amt_min = filters.get('amount_min')
        if amt_min and (inv.total or 0) < amt_min:
            ok = False
        if ok:
            res.append({'id': inv.id, 'invoice_number': inv.invoice_number, 'party_name': inv.party_name, 'total': inv.total, 'server_time': inv.server_time})
    return {'query': q, 'matches': res}


@app.get('/api/reports/pnl')
def reports_pnl(start: Optional[str] = None, end: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_report'])(current)
    from datetime import datetime
    s = datetime.fromisoformat(start) if start else None
    e = datetime.fromisoformat(end) if end else None
    out = crud.report_pnl(session, start=s, end=e)
    return out


@app.get('/api/reports/person')
def reports_person(party_id: Optional[str] = None, party_name: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_report'])(current)
    from datetime import datetime
    s = datetime.fromisoformat(start) if start else None
    e = datetime.fromisoformat(end) if end else None
    out = crud.report_person_turnover(session, party_id=party_id, party_name=party_name, start=s, end=e)
    return out


@app.get('/api/reports/stock')
def reports_stock(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_report'])(current)
    out = crud.report_stock_valuation(session)
    return out


@app.get('/api/reports/cash')
def reports_cash(method: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_permissions(['finance_report'])(current)
    out = crud.report_cash_balance(session, method=method)
    return out


@app.get('/api/dashboard/summary')
def dashboard_summary(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    out = crud.dashboard_summary(session)
    return out


@app.get('/api/dashboard/sales-trends')
def dashboard_sales_trends(days: Optional[int] = 30, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    out = crud.dashboard_sales_trends(session, days=days)
    return out


@app.get('/api/dashboard/old-stock')
def dashboard_old_stock(days: Optional[int] = 90, min_qty: Optional[int] = 1, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    out = crud.dashboard_old_stock(session, days=days, min_qty=min_qty)
    return out


@app.get('/api/dashboard/checks-due')
def dashboard_checks_due(within_days: Optional[int] = 14, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    out = crud.dashboard_checks_due(session, within_days=within_days)
    return out


@app.get('/api/dashboard/prices')
def dashboard_prices(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Viewer'])(current)
    out = crud.dashboard_currency_prices()
    return out


@app.post('/api/search')
def api_search(payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    q = payload.get('q') if isinstance(payload, dict) else None
    if not q:
        raise HTTPException(status_code=400, detail='q required')
    indexes = payload.get('indexes') if isinstance(payload, dict) else None
    filters = payload.get('filters') if isinstance(payload, dict) else None
    limit = int(payload.get('limit') or 10)
    try:
        res = search_multi(q, indexes=indexes, filters=filters, limit=limit)
        # Fallback to DB search when full-text engine is unavailable or returns empty
        idxs = indexes or ['products', 'persons', 'invoices', 'payments']
        def _is_all_empty(result: dict) -> bool:
            try:
                return all((not result.get(ix) or len(result.get(ix, {}).get('hits', [])) == 0) for ix in idxs)
            except Exception:
                return True
        if _is_all_empty(res):
            out = {}
            qlike = f"%{q}%"
            # products
            if 'products' in idxs:
                prods = session.query(models.Product).filter(
                    (models.Product.name.ilike(qlike)) |
                    (models.Product.name_norm.ilike(qlike)) |
                    (models.Product.code.ilike(qlike)) |
                    (models.Product.group.ilike(qlike))
                ).limit(limit).all()
                out['products'] = {'hits': [
                    {
                        'id': p.id,
                        'name': p.name,
                        'unit': p.unit,
                        'group': p.group,
                        'inventory': int(p.inventory or 0),
                    } for p in prods
                ]}
            # persons
            if 'persons' in idxs:
                people = session.query(models.Person).filter(
                    (models.Person.name.ilike(qlike)) |
                    (models.Person.name_norm.ilike(qlike)) |
                    (models.Person.mobile.ilike(qlike))
                ).limit(limit).all()
                out['persons'] = {'hits': [
                    {
                        'id': pr.id,
                        'name': pr.name,
                        'mobile': pr.mobile,
                        'kind': pr.kind,
                    } for pr in people
                ]}
            # invoices
            if 'invoices' in idxs:
                invs = session.query(models.Invoice).filter(
                    (models.Invoice.invoice_number.ilike(qlike)) |
                    (models.Invoice.party_name.ilike(qlike))
                ).order_by(models.Invoice.id.desc()).limit(limit).all()
                out['invoices'] = {'hits': [
                    {
                        'id': i.id,
                        'invoice_number': i.invoice_number,
                        'invoice_type': i.invoice_type,
                        'party_name': i.party_name,
                        'total': int(i.total or 0),
                        'status': i.status,
                        'server_time': i.server_time.isoformat() if i.server_time else None,
                    } for i in invs
                ]}
            # payments
            if 'payments' in idxs:
                pays = session.query(models.Payment).filter(
                    (models.Payment.payment_number.ilike(qlike)) |
                    (models.Payment.party_name.ilike(qlike)) |
                    (models.Payment.reference.ilike(qlike))
                ).order_by(models.Payment.id.desc()).limit(limit).all()
                out['payments'] = {'hits': [
                    {
                        'id': p.id,
                        'payment_number': p.payment_number,
                        'direction': p.direction,
                        'party_name': p.party_name,
                        'amount': int(p.amount or 0),
                        'method': p.method,
                        'status': p.status,
                        'server_time': p.server_time.isoformat() if p.server_time else None,
                    } for p in pays
                ]}
            return out
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/admin/ai_reports/run', response_model=schemas.AIReportOut)
def run_ai_report(start: Optional[str] = None, end: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    from .ai_analyzer import analyze_period, run_and_persist
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


@app.get('/api/admin/ai_reports', response_model=list[schemas.AIReportOut])
def list_ai_reports(limit: Optional[int] = 50, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    reps = crud.get_ai_reports(session, limit=int(limit or 50))
    return reps


@app.post('/api/backups/manual', response_model=schemas.BackupOut)
def manual_backup(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    try:
        bk = crud.create_backup(session, created_by=current.id, kind='manual', note=f'Manual backup by {current.username}')
        return bk
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/backups', response_model=list[schemas.BackupOut])
def list_backups(limit: Optional[int] = 100, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    return crud.list_backups(session, limit=int(limit or 100))


@app.get('/api/backups/{bid}/download')
def download_backup(bid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    bk = crud.get_backup(session, bid)
    if not bk:
        raise HTTPException(status_code=404, detail='Backup not found')
    from fastapi.responses import FileResponse
    return FileResponse(bk.file_path, filename=bk.filename or 'backup.json')


@app.post('/api/financial-years', response_model=schemas.FinancialYearOut)
def create_financial_year(payload: schemas.FinancialYearIn, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    try:
        fy = crud.create_financial_year(session, name=payload.name, start_date=payload.start_date.isoformat(), end_date=payload.end_date.isoformat() if payload.end_date else None)
        return fy
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/financial-years', response_model=list[schemas.FinancialYearOut])
def list_financial_years(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    return crud.get_financial_years(session)


@app.post('/api/financial-years/{fid}/close', response_model=schemas.FinancialYearOut)
def close_financial_year_endpoint(fid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    fy = crud.close_financial_year(session, fid, create_rollover=True, closed_by=current.id)
    if not fy:
        raise HTTPException(status_code=404, detail='Financial year not found')
    return fy


@app.get('/api/admin/ai_reports/{rid}', response_model=schemas.AIReportOut)
def get_ai_report(rid: int, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant'])(current)
    r = crud.get_ai_report(session, rid)
    if not r:
        raise HTTPException(status_code=404, detail='Report not found')
    return r


@app.patch('/api/admin/ai_reports/{rid}', response_model=schemas.AIReportOut)
def review_ai_report(rid: int, payload: schemas.AIReportReview, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
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


@app.get('/api/search/live')
def api_search_live(q: Optional[str] = None, index: Optional[str] = 'products', limit: Optional[int] = 7, current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    if not q:
        return {'hits': []}
    hits = suggest_live(q, index=index, limit=limit)
    return {'hits': hits}


@app.post("/api/products", response_model=ProductOut)
def api_create_product(p: ProductCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # basic RBAC: only Accountant or Admin can create products
    require_roles(role_names=["Admin", "Accountant"])(current)
    prod = crud.create_product(session, p)
    return prod


@app.get("/api/products")
def api_get_products(q: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # viewers and above can list
    require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])(current)
    return crud.get_products(session, q=q)



@app.post('/api/products/external/search')
def api_products_external_search(payload: ExternalSearchRequest, current: models.User = Depends(get_current_user)):
    """Search external Iranian marketplaces (Digikala, Torob, Emalls) and return aggregated results.
    This is best-effort scraping and may be rate-limited or blocked by the remote sites.
    """
    require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])(current)
    q = payload.q
    sources = payload.sources
    limit = int(payload.limit or 6)
    try:
        res = external_search.aggregate_search(q, sources=sources, limit=limit)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/products/external/save', response_model=ProductOut)
def api_products_external_save(payload: SaveExternalProductRequest, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Save an external product result as a local product so it can be used in invoices.
    The external metadata is embedded into the product description as JSON. Optionally a price history entry is added.
    """
    require_roles(role_names=["Admin", "Accountant"])(current)
    try:
        external = {
            'source': payload.source,
            'title': payload.title,
            'price': payload.price,
            'currency': payload.currency,
            'image': payload.image,
            'description': payload.description,
            'link': payload.link,
        }
        prod = crud.create_product_from_external(session, external=external, unit=payload.unit, group=payload.group, create_price_history=payload.create_price_history)
        return prod
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/products/{product_id}/movement')
def product_movement(product_id: str, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Get movement history for a product with invoice and party details"""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    
    # Get product details
    product = session.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')
    
    # Get all invoice items for this product
    invoice_items = session.query(models.InvoiceItem).filter(
        models.InvoiceItem.product_id == product_id
    ).order_by(models.InvoiceItem.id.desc()).all()
    
    movements = []
    current_stock = product.inventory or 0
    
    for item in invoice_items:
        invoice = session.query(models.Invoice).filter(models.Invoice.id == item.invoice_id).first()
        if not invoice:
            continue
            
        person = None
        if invoice.party_id:
            person = session.query(models.Person).filter(models.Person.id == invoice.party_id).first()
        
        # Determine movement type based on invoice type
        is_sale = invoice.invoice_type == 'sale'
        is_purchase = invoice.invoice_type == 'purchase'
        quantity_change = -item.quantity if is_sale else item.quantity if is_purchase else 0
        
        movements.append({
            'id': item.id,
            'invoice_id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'invoice_date': (invoice.client_time or invoice.server_time).isoformat() if (invoice.client_time or invoice.server_time) else None,
            'invoice_type': invoice.invoice_type,
            'direction': 'out' if is_sale else 'in' if is_purchase else 'neutral',
            'type': 'فروش' if is_sale else 'خرید' if is_purchase else 'سایر',
            'quantity': item.quantity,
            'quantity_change': quantity_change,
            'unit_price': item.unit_price,
            'total_price': item.total or (item.unit_price * item.quantity),
            'party': {
                'id': person.id,
                'name': person.name,
                'kind': person.kind,
            } if person else None,
            'status': invoice.status,
        })
    
    # Calculate running stock (from most recent backwards)
    running_stock = current_stock
    for movement in movements:
        movement['stock_after'] = running_stock
        running_stock -= movement['quantity_change']
        movement['stock_before'] = running_stock
    
    return {
        'product': {
            'id': product.id,
            'name': product.name,
            'unit': product.unit,
            'group': product.group,
            'current_stock': current_stock,
        },
        'movements': movements,
        'total_movements': len(movements),
    }


@app.get('/api/sms/providers', response_model=list[schemas.IntegrationConfigOut])
def list_sms_providers(session: Session = Depends(db.get_db), current: models.User = Depends(require_roles(role_names=['Admin']))):
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


@app.post('/api/sms/send')
def api_sms_send(payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(require_roles(role_names=['Admin']))):
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


@app.post('/api/sms/register-user', response_model=schemas.UserOut)
def api_sms_register_user(payload: dict, session: Session = Depends(db.get_db), current: models.User = Depends(require_roles(role_names=['Admin']))):
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


@app.post('/api/assistant/query', response_model=AssistantResponse)
def api_assistant_query(payload: AssistantRequest, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # execute assistant command on behalf of the current user if enabled
    res = None
    try:
        res = __import__('app.ai_assistant', fromlist=['']).run_assistant(session, current, payload.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not isinstance(res, dict):
        raise HTTPException(status_code=500, detail='assistant error')
    # map to AssistantResponse
    return AssistantResponse(ok=bool(res.get('ok')), message=res.get('message', ''), data={k: v for k, v in res.items() if k not in ('ok', 'message')})


@app.post('/api/assistant/toggle', response_model=schemas.UserOut)
def api_assistant_toggle(payload: AssistantToggle, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    # allow user to toggle their own assistant
    try:
        u = crud.set_assistant_enabled(session, current.id, bool(payload.enabled))
        # log action
        try:
            log_activity(session, current.username if hasattr(current, 'username') else None, f"تغییر وضعیت دستیار به {payload.enabled}")
        except Exception:
            pass
        return u
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/exports/invoice/{invoice_id}')
def api_export_invoice(invoice_id: int, format: Optional[str] = 'pdf', session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin', 'Accountant', 'Manager'])(current)
    try:
        if format == 'pdf':
            path = export_invoice_pdf(session, invoice_id)
        elif format == 'csv':
            path = export_invoice_csv(session, invoice_id)
        elif format in ('xls','xlsx'):
            path = export_invoice_excel(session, invoice_id)
        else:
            raise HTTPException(status_code=400, detail='unsupported format')
        # create share token
        import secrets
        token = secrets.token_urlsafe(18)
        filename = os.path.basename(path)
        # default expiry 24h
        from datetime import datetime, timedelta
        expires = datetime.utcnow() + timedelta(hours=24)
        sf = crud.create_shared_file(session, token=token, file_path=path, filename=filename, created_by=current.id, expires_at=expires.isoformat())
        link = f"/api/exports/shared/{token}"
        return {'token': token, 'download_url': link, 'expires_at': sf.expires_at}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/exports/shared/{token}')
def download_shared_file(token: str):
    # public download of shared file if not expired
    # create a short-lived session to lookup the shared file
    sf = crud.get_shared_file_by_token(DB.SessionLocal(), token)
    if not sf:
        raise HTTPException(status_code=404, detail='not found')
    from datetime import datetime
    if sf.expires_at and sf.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail='expired')
    # serve file
    from fastapi.responses import FileResponse
    return FileResponse(sf.file_path, filename=sf.filename or os.path.basename(sf.file_path))


@app.get('/api/prints/invoice/{invoice_id}', response_class=HTMLResponse)
def print_invoice_html(invoice_id: int):
    """Return a responsive HTML invoice template that will fetch invoice JSON and render for print."""
    tpl = os.path.join(os.path.dirname(__file__), '..', 'templates', 'invoice.html')
    if not os.path.exists(tpl):
        raise HTTPException(status_code=404, detail='template not found')
    return FileResponse(tpl, media_type='text/html')


@app.post("/api/persons", response_model=PersonOut)
def api_create_person(p: PersonCreate, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=["Admin", "Accountant"])(current)
    person = crud.create_person(session, p)
    return person


@app.get("/api/persons")
def api_get_persons(q: Optional[str] = None, session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])(current)
    return crud.get_persons(session, q=q)


@app.get('/api/financial/auto-context')
def get_financial_auto_context(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Get smart financial context - auto-creates current financial year and provides date suggestions"""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    try:
        from .financial_automation import auto_determine_financial_context, get_smart_date_suggestions
        
        context = auto_determine_financial_context(session)
        suggestions = get_smart_date_suggestions(session)
        
        return {
            "context": context,
            "date_suggestions": suggestions,
            "blockchain_ready": True,  # هنگامی که در آینده با blockchain ادغام شود
            "auto_managed": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/financial/smart-year')
def create_smart_financial_year(session: Session = Depends(db.get_db), current: models.User = Depends(get_current_user)):
    """Auto-create financial year based on current Jalali calendar"""
    require_roles(role_names=['Admin'])(current)
    try:
        from .financial_automation import get_or_create_current_financial_year
        
        fy = get_or_create_current_financial_year(session)
        
        return {
            "financial_year": {
                "id": fy.id,
                "name": fy.name,
                "start_date": fy.start_date.isoformat() if fy.start_date else None,
                "end_date": fy.end_date.isoformat() if fy.end_date else None,
                "is_closed": fy.is_closed
            },
            "auto_created": True,
            "blockchain_compatible": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Users Management Endpoints ====================

@app.get('/api/roles', response_model=List[schemas.RoleOut])
async def list_roles(current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(db.get_db)):
    """لیست تمام نقش ها - فقط Admin"""
    return crud.get_all_roles(session)


@app.post('/api/roles', response_model=schemas.RoleOut)
def create_role(payload: schemas.RoleCreate, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(db.get_db)):
    r = models.Role(name=payload.name, description=payload.description)
    session.add(r)
    session.commit()
    session.refresh(r)
    return r


@app.patch('/api/roles/{rid}', response_model=schemas.RoleOut)
def update_role(rid: int, payload: schemas.RoleCreate, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(db.get_db)):
    r = session.query(models.Role).filter(models.Role.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail='role not found')
    if payload.name:
        r.name = payload.name
    r.description = payload.description
    session.add(r)
    session.commit()
    session.refresh(r)
    return r


@app.delete('/api/roles/{rid}')
def delete_role(rid: int, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(db.get_db)):
    r = session.query(models.Role).filter(models.Role.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail='role not found')
    session.delete(r)
    session.commit()
    return {"ok": True}


@app.get('/api/roles/{rid}/permissions', response_model=List[schemas.PermissionOut])
def get_role_permissions(rid: int, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(db.get_db)):
    r = session.query(models.Role).filter(models.Role.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail='role not found')
    return r.permissions


@app.post('/api/roles/{rid}/permissions')
def set_role_permissions(rid: int, permission_ids: List[int], current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(db.get_db)):
    r = session.query(models.Role).filter(models.Role.id == rid).first()
    if not r:
        raise HTTPException(status_code=404, detail='role not found')
    perms = session.query(models.Permission).filter(models.Permission.id.in_(permission_ids or [])).all()
    r.permissions = perms
    session.add(r)
    session.commit()
    return {"ok": True, "count": len(perms)}


@app.get('/api/permissions', response_model=List[schemas.PermissionOut])
async def list_permissions(module: Optional[str] = None, current: models.User = Depends(require_roles(role_names=['Admin'])), session: Session = Depends(db.get_db)):
    """لیست تمام permissions - فقط Admin"""
    if module:
        return crud.get_permissions_by_module(session, module)
    return crud.get_all_permissions(session)


@app.post('/api/permissions', response_model=schemas.PermissionOut)
def create_permission(payload: schemas.PermissionCreate, current: models.User = Depends(require_roles(role_ids=[1])), session: Session = Depends(db.get_db)):
    existing = session.query(models.Permission).filter(models.Permission.name == payload.name).first()
    if existing:
        return existing
    p = models.Permission(name=payload.name, description=payload.description, module=payload.module)
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


@app.get('/api/users', response_model=List[schemas.UserOut])
async def list_users(current: models.User = Depends(require_roles(role_names=['Admin'])), session: Session = Depends(db.get_db)):
    """لیست تمام کاربران - فقط Admin"""
    from sqlalchemy.orm import joinedload
    users = session.query(models.User).options(joinedload(models.User.role_obj)).all()
    return users


@app.post('/api/users', response_model=schemas.UserOut)
async def create_user_endpoint(
    user: schemas.UserCreate,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(db.get_db)
):
    """ایجاد کاربر جدید - فقط Admin"""
    
    # بررسی وجود کاربر
    existing = crud.get_user_by_username(session, user.username)
    if existing:
        raise HTTPException(status_code=400, detail='نام کاربری از قبل موجود است')
    
    # ایجاد کاربر جدید
    from .security import get_password_hash
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


@app.patch('/api/users/{user_id}', response_model=schemas.UserOut)
async def update_user(
    user_id: int,
    update_data: schemas.UserUpdate,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(db.get_db)
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


@app.delete('/api/users/{user_id}')
async def delete_user(
    user_id: int,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(db.get_db)
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


@app.get('/api/current-user/permissions', response_model=List[schemas.PermissionOut])
async def get_current_user_permissions(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت permissions کاربر فعلی"""
    if current.role_id:
        role = crud.get_role(session, current.role_id)
        if role:
            return role.permissions
    return []


@app.get('/api/current-user/modules', response_model=List[str])
async def get_current_user_modules(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
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


@app.get('/api/users/preferences', response_model=schemas.UserPreferencesOut)
async def get_user_preferences(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت تنظیمات کاربر فعلی"""
    prefs = crud.get_user_preferences(session, current.id)
    if not prefs:
        # ایجاد تنظیمات پیش‌فرض اگر وجود نداشته باشد
        prefs = crud.create_user_preferences(session, current.id)
    return prefs


@app.get('/api/users/preferences/sidebar-order')
def get_sidebar_order(current: models.User = Depends(get_current_user), session: Session = Depends(db.get_db)):
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


@app.post('/api/users/preferences/sidebar-order')
def set_sidebar_order(payload: dict, current: models.User = Depends(get_current_user), session: Session = Depends(db.get_db)):
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


@app.get('/api/users/preferences/sidebar-side')
def get_sidebar_side(current: models.User = Depends(get_current_user), session: Session = Depends(db.get_db)):
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


@app.post('/api/users/preferences/sidebar-side')
def set_sidebar_side(payload: dict, current: models.User = Depends(get_current_user), session: Session = Depends(db.get_db)):
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


@app.put('/api/users/preferences', response_model=schemas.UserPreferencesOut)
async def update_user_preferences(
    payload: schemas.UserPreferencesUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
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


@app.get('/api/security/devices', response_model=List[schemas.DeviceLoginOut])
async def get_user_devices(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت دستگاه‌های فعال کاربر"""
    devices = crud.get_user_active_devices(session, current.id)
    return devices


@app.delete('/api/security/devices/{device_id}')
async def logout_from_device(
    device_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """خروج از دستگاه مشخص"""
    device = crud.get_device_login(session, device_id)
    
    if not device:
        raise HTTPException(status_code=404, detail='دستگاه یافت نشد')
    
    if device.user_id != current.id:
        raise HTTPException(status_code=403, detail='مجاز به حذف این دستگاه نیستید')
    
    success = crud.logout_device(session, device_id)
    
    if success:
        log_activity(session, current.id, f'/api/security/devices/{device_id}', 'DELETE', 200, f'خروج از دستگاه {device_id}')
        return {'detail': 'شما از این دستگاه خارج شدید'}
    
    raise HTTPException(status_code=500, detail='خروج ناموفق بود')


@app.get('/api/security/login-history')
async def get_login_history(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db),
    limit: int = 20
):
    """دریافت تاریخچه‌ی ورود کاربر"""
    devices = session.query(models.DeviceLogin).filter(
        models.DeviceLogin.user_id == current.id
    ).order_by(models.DeviceLogin.login_at.desc()).limit(limit).all()
    
    return devices


# ==================== Developer API Keys ====================

@app.get('/api/developer/keys', response_model=List[schemas.DeveloperApiKeyOut])
async def list_api_keys(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت تمام کلیدهای API کاربر"""
    keys = crud.get_user_api_keys(session, current.id)
    return keys


@app.post('/api/developer/keys', response_model=schemas.DeveloperApiKeyWithKey)
async def create_api_key(
    payload: schemas.DeveloperApiKeyCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """ایجاد کلید API جدید"""
    api_key, plain_key = crud.create_api_key(session, current.id, payload)
    
    log_activity(session, current.id, '/api/developer/keys', 'POST', 201, 
                f'کلید API جدید {api_key.name} ایجاد شد')
    
    return {
        'id': api_key.id,
        'user_id': api_key.user_id,
        'name': api_key.name,
        'description': api_key.description,
        'enabled': api_key.enabled,
        'rate_limit_per_minute': api_key.rate_limit_per_minute,
        'endpoints': api_key.endpoints,
        'last_used_at': api_key.last_used_at,
        'created_at': api_key.created_at,
        'expires_at': api_key.expires_at,
        'revoked_at': api_key.revoked_at,
        'api_key': plain_key  # Only shown once on creation
    }


@app.put('/api/developer/keys/{key_id}', response_model=schemas.DeveloperApiKeyOut)
async def update_api_key(
    key_id: int,
    payload: schemas.DeveloperApiKeyUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """به‌روزرسانی تنظیمات کلید API"""
    api_key = crud.get_api_key(session, key_id)
    
    if not api_key:
        raise HTTPException(status_code=404, detail='کلید API یافت نشد')
    
    if api_key.user_id != current.id:
        raise HTTPException(status_code=403, detail='مجاز به ویرایش این کلید نیستید')
    
    api_key = crud.update_api_key(session, key_id, payload)
    
    log_activity(session, current.id, f'/api/developer/keys/{key_id}', 'PUT', 200, 
                f'کلید API {api_key.name} به‌روزرسانی شد')
    
    return api_key


@app.post('/api/developer/keys/{key_id}/rotate', response_model=schemas.ApiKeyRotateResponse)
async def rotate_api_key(
    key_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """تولید کلید API جدید (لغو کلید قدیم)"""
    old_key = crud.get_api_key(session, key_id)
    
    if not old_key:
        raise HTTPException(status_code=404, detail='کلید API یافت نشد')
    
    if old_key.user_id != current.id:
        raise HTTPException(status_code=403, detail='مجاز به چرخش این کلید نیستید')
    
    new_key, plain_key = crud.rotate_api_key(session, key_id)
    
    log_activity(session, current.id, f'/api/developer/keys/{key_id}/rotate', 'POST', 200, 
                f'کلید API {old_key.name} چرخش داده شد')
    
    return {
        'message': 'کلید API با موفقیت چرخش داده شد',
        'old_key_id': key_id,
        'new_key_id': new_key.id,
        'new_api_key': plain_key
    }


@app.delete('/api/developer/keys/{key_id}')
async def revoke_api_key(
    key_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """لغو (حذف) کلید API"""
    api_key = crud.get_api_key(session, key_id)
    
    if not api_key:
        raise HTTPException(status_code=404, detail='کلید API یافت نشد')
    
    if api_key.user_id != current.id:
        raise HTTPException(status_code=403, detail='مجاز به حذف این کلید نیستید')
    
    success = crud.revoke_api_key(session, key_id)
    
    if success:
        log_activity(session, current.id, f'/api/developer/keys/{key_id}', 'DELETE', 200, 
                    f'کلید API {api_key.name} لغو شد')
        return {'detail': 'کلید API لغو شد'}
    
    raise HTTPException(status_code=500, detail='لغو ناموفق بود')


@app.get('/api/developer/endpoints')
async def list_available_endpoints(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت فهرست endpoints دسترس‌پذیر برای دیولوپرها"""
    endpoints = [
        {
            'path': '/api/external/fx-rates',
            'method': 'GET',
            'description': 'نرخ ارز (USD, EUR, GBP, etc.)',
            'requires_api_key': True,
            'rate_limit': '100/min'
        },
        {
            'path': '/api/external/crypto-prices',
            'method': 'GET',
            'description': 'قیمت رمزارز (BTC, ETH, etc.)',
            'requires_api_key': True,
            'rate_limit': '100/min'
        },
        {
            'path': '/api/external/ai/product-match',
            'method': 'POST',
            'description': 'تطابق خودکار کالا با AI',
            'requires_api_key': True,
            'rate_limit': '50/min'
        },
        {
            'path': '/api/external/ai/invoice-analysis',
            'method': 'POST',
            'description': 'تحلیل فاکتور با OCR و AI',
            'requires_api_key': True,
            'rate_limit': '20/min'
        },
        {
            'path': '/api/invoices',
            'method': 'GET',
            'description': 'دریافت فاکتورها',
            'requires_api_key': True,
            'rate_limit': '200/min'
        },
        {
            'path': '/api/products',
            'method': 'GET',
            'description': 'دریافت کالاها',
            'requires_api_key': True,
            'rate_limit': '200/min'
        }
    ]
    
    return {'endpoints': endpoints}


@app.get('/api/developer/updates', response_model=schemas.DeveloperAppUpdateList)
async def list_app_updates(current: models.User = Depends(require_roles(role_names=['Admin']))):
    """لیست به‌روزرسانی‌های دریافت‌شده از طریق لینک"""
    updates = _load_update_history()
    return {'updates': updates}


@app.post('/api/developer/updates', response_model=schemas.DeveloperAppUpdateResponse)
async def download_app_update(
    payload: schemas.DeveloperAppUpdateRequest,
    current: models.User = Depends(require_roles(role_names=['Admin'])),
    session: Session = Depends(db.get_db)
):
    """دانلود بسته‌ی به‌روزرسانی از طریق لینک و آماده‌سازی آن"""
    entry_id = str(uuid4())
    entry: dict = {
        'id': entry_id,
        'url': str(payload.url),
        'version': payload.version,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    file_path: Optional[Path] = None

    try:
        file_path, size = _download_update_file(str(payload.url), entry_id)
        entry['filename'] = file_path.name
        entry['size_bytes'] = size

        checksum = _calculate_checksum(file_path)
        entry['checksum'] = checksum

        if payload.checksum and checksum.lower() != payload.checksum.lower():
            entry['status'] = 'failed'
            entry['message'] = 'چک‌سام فایل با مقدار اعلام‌شده مطابقت ندارد.'
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=400, detail=entry['message'])

        extracted_path, extracted_count = _extract_update_archive(file_path)
        entry['extracted_path'] = extracted_path
        entry['extracted_files'] = extracted_count
        entry['status'] = 'success'
        entry['message'] = 'بسته به‌روزرسانی با موفقیت دریافت شد.'

        _append_update_history(entry)
        log_activity(
            session,
            current.id,
            '/api/developer/updates',
            'POST',
            200,
            f'دریافت بسته به‌روزرسانی از {payload.url}'
        )

        return {'detail': entry['message'], 'entry': entry}

    except HTTPException as exc:
        if entry.get('status') != 'failed':
            entry['status'] = 'failed'
            entry['message'] = exc.detail if isinstance(exc.detail, str) else 'خطا در دانلود به‌روزرسانی'
        if file_path and file_path.exists():
            file_path.unlink()
        _append_update_history(entry)
        raise
    except Exception as exc:
        entry['status'] = 'failed'
        entry['message'] = str(exc)
        if file_path and file_path.exists():
            file_path.unlink()
        _append_update_history(entry)
        raise HTTPException(status_code=500, detail='به‌روزرسانی با خطا مواجه شد')


# ==================== Blockchain Audit Trail ====================

@app.get('/api/blockchain/entries')
async def get_blockchain_entries(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    دریافت blockchain entries
    می‌توان فیلتر کرد بر اساس entity_type و entity_id
    """
    from . import blockchain
    
    if entity_type and entity_id:
        # Get specific entity history
        entries = blockchain.get_entity_history(session, entity_type, entity_id)
        return {'entries': entries, 'count': len(entries)}
    else:
        # Get recent entries for current user
        entries = blockchain.get_all_entries_for_user(session, current.id, limit=50)
        return {'entries': entries, 'count': len(entries)}


@app.post('/api/blockchain/verify', response_model=schemas.BlockchainVerifyResponse)
async def verify_blockchain(
    entity_type: str,
    entity_id: str,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    تأیید integrity blockchain برای یک entity
    """
    from . import blockchain
    
    is_valid, message = blockchain.verify_entry_chain(session, entity_type, entity_id)
    entries = blockchain.get_entity_history(session, entity_type, entity_id)
    
    return {
        'is_valid': is_valid,
        'message': message,
        'entries_checked': len(entries)
    }


@app.get('/api/blockchain/proof')
async def get_blockchain_proof(
    entity_type: str,
    entity_id: str,
    entry_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    دریافت merkle proof برای یک blockchain entry
    برای تأیید و export خارج از سیستم
    """
    from . import blockchain
    
    proof = blockchain.export_merkle_proof(session, entity_type, entity_id, entry_id)
    
    if 'error' in proof:
        raise HTTPException(status_code=404, detail=proof['error'])
    
    return proof


@app.get('/api/blockchain/audit-log')
async def get_audit_log(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db),
    limit: int = 100
):
    """
    دریافت blockchain audit log برای کاربر فعلی
    نمایش تمام تغییرات ثبت شده توسط user
    """
    from . import blockchain
    
    entries = blockchain.get_all_entries_for_user(session, current.id, limit=limit)
    
    # Group by entity type
    grouped = {}
    for entry in entries:
        if entry.entity_type not in grouped:
            grouped[entry.entity_type] = []
        grouped[entry.entity_type].append(entry)
    
    return {
        'user_id': current.id,
        'total_entries': len(entries),
        'by_entity_type': {k: len(v) for k, v in grouped.items()},
        'entries': entries
    }


# ==================== Customer Groups Endpoints ====================

@app.get('/api/customer-groups', response_model=List[schemas.CustomerGroupOut])
async def list_customer_groups(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    دریافت لیست گروه‌های مشتری کاربر
    """
    groups = crud.get_user_customer_groups(session, current.id)
    return groups


@app.post('/api/customer-groups', response_model=schemas.CustomerGroupOut)
async def create_customer_group(
    payload: schemas.CustomerGroupCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    ایجاد گروه مشتری جدید
    """
    group = crud.create_customer_group(session, current.id, payload)
    return group


@app.get('/api/customer-groups/{group_id}', response_model=schemas.CustomerGroupOut)
async def get_customer_group(
    group_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    دریافت اطلاعات گروه مشتری
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id and not group.is_shared:
        raise HTTPException(status_code=403, detail='دسترسی رد شد')
    
    return group


@app.put('/api/customer-groups/{group_id}', response_model=schemas.CustomerGroupOut)
async def update_customer_group(
    group_id: int,
    payload: schemas.CustomerGroupUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    به‌روزرسانی گروه مشتری
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند آن را تغییر دهد')
    
    updated = crud.update_customer_group(session, group_id, payload)
    return updated


@app.patch('/api/customer-groups/{group_id}', response_model=schemas.CustomerGroupOut)
async def patch_customer_group(
    group_id: int,
    payload: schemas.CustomerGroupUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    به‌روزرسانی جزئی گروه مشتری
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند آن را تغییر دهد')
    
    updated = crud.update_customer_group(session, group_id, payload)
    return updated


@app.delete('/api/customer-groups/{group_id}')
async def delete_customer_group(
    group_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    حذف گروه مشتری
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند آن را حذف کند')
    
    crud.delete_customer_group(session, group_id)
    return {'message': 'گروه با موفقیت حذف شد'}


@app.post('/api/customer-groups/{group_id}/members/{person_id}')
async def add_member_to_group(
    group_id: int,
    person_id: str,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    افزودن مشتری به گروه
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند اعضای آن را تغییر دهد')
    
    # بررسی وجود مشتری
    person = session.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail='مشتری یافت نشد')
    
    member = crud.add_customer_to_group(session, group_id, person_id)
    return {'message': 'مشتری به گروه اضافه شد', 'member_id': member.id}


@app.delete('/api/customer-groups/{group_id}/members/{person_id}')
async def remove_member_from_group(
    group_id: int,
    person_id: str,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """
    حذف مشتری از گروه
    """
    group = crud.get_customer_group(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail='گروه یافت نشد')
    
    if group.created_by_user_id != current.id:
        raise HTTPException(status_code=403, detail='فقط مالک گروه می‌تواند اعضای آن را تغییر دهد')
    
    success = crud.remove_customer_from_group(session, group_id, person_id)
    if not success:
        raise HTTPException(status_code=404, detail='مشتری در این گروه یافت نشد')
    
    return {'message': 'مشتری از گروه حذف شد'}


# ==================== ICC Shop Endpoints ====================

@app.get('/api/icc/categories', response_model=List[schemas.IccCategoryOut])
async def list_icc_categories(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت تمام دسته‌بندی‌های ICC"""
    categories = crud.get_all_icc_categories(session)
    return categories


@app.post('/api/icc/categories', response_model=schemas.IccCategoryOut)
async def create_icc_category(
    payload: schemas.IccCategoryCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """ایجاد دسته‌بندی ICC"""
    category = crud.create_icc_category(session, payload)
    return category


@app.get('/api/icc/categories/{category_id}', response_model=schemas.IccCategoryOut)
async def get_icc_category(
    category_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت دسته‌بندی ICC"""
    category = crud.get_icc_category(session, category_id)
    if not category:
        raise HTTPException(status_code=404, detail='دسته‌بندی یافت نشد')
    return category


@app.patch('/api/icc/categories/{category_id}', response_model=schemas.IccCategoryOut)
async def update_icc_category(
    category_id: int,
    payload: schemas.IccCategoryUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """به‌روزرسانی دسته‌بندی ICC"""
    category = crud.update_icc_category(session, category_id, payload)
    if not category:
        raise HTTPException(status_code=404, detail='دسته‌بندی یافت نشد')
    return category


@app.delete('/api/icc/categories/{category_id}')
async def delete_icc_category(
    category_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """حذف دسته‌بندی ICC"""
    success = crud.delete_icc_category(session, category_id)
    if not success:
        raise HTTPException(status_code=404, detail='دسته‌بندی یافت نشد')
    return {'message': 'دسته‌بندی با موفقیت حذف شد'}


@app.get('/api/icc/centers', response_model=List[schemas.IccCenterOut])
async def list_icc_centers(
    category_id: Optional[int] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت مراکز ICC"""
    if category_id:
        centers = crud.get_icc_centers_by_category(session, category_id)
    else:
        centers = session.query(models.IccCenter).order_by(models.IccCenter.name).all()
    return centers


@app.post('/api/icc/centers', response_model=schemas.IccCenterOut)
async def create_icc_center(
    payload: schemas.IccCenterCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """ایجاد مرکز ICC"""
    center = crud.create_icc_center(session, payload)
    return center


@app.get('/api/icc/centers/{center_id}', response_model=schemas.IccCenterOut)
async def get_icc_center(
    center_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت مرکز ICC"""
    center = crud.get_icc_center(session, center_id)
    if not center:
        raise HTTPException(status_code=404, detail='مرکز یافت نشد')
    return center


@app.patch('/api/icc/centers/{center_id}', response_model=schemas.IccCenterOut)
async def update_icc_center(
    center_id: int,
    payload: schemas.IccCenterUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """به‌روزرسانی مرکز ICC"""
    center = crud.update_icc_center(session, center_id, payload)
    if not center:
        raise HTTPException(status_code=404, detail='مرکز یافت نشد')
    return center


@app.delete('/api/icc/centers/{center_id}')
async def delete_icc_center(
    center_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """حذف مرکز ICC"""
    success = crud.delete_icc_center(session, center_id)
    if not success:
        raise HTTPException(status_code=404, detail='مرکز یافت نشد')
    return {'message': 'مرکز با موفقیت حذف شد'}


@app.get('/api/icc/units', response_model=List[schemas.IccUnitOut])
async def list_icc_units(
    center_id: Optional[int] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت واحدهای ICC"""
    if center_id:
        units = crud.get_icc_units_by_center(session, center_id)
    else:
        units = session.query(models.IccUnit).order_by(models.IccUnit.name).all()
    return units


@app.post('/api/icc/units', response_model=schemas.IccUnitOut)
async def create_icc_unit(
    payload: schemas.IccUnitCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """ایجاد واحد ICC"""
    unit = crud.create_icc_unit(session, payload)
    return unit


@app.get('/api/icc/units/{unit_id}', response_model=schemas.IccUnitOut)
async def get_icc_unit(
    unit_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت واحد ICC"""
    unit = crud.get_icc_unit(session, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail='واحد یافت نشد')
    return unit


@app.patch('/api/icc/units/{unit_id}', response_model=schemas.IccUnitOut)
async def update_icc_unit(
    unit_id: int,
    payload: schemas.IccUnitUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """به‌روزرسانی واحد ICC"""
    unit = crud.update_icc_unit(session, unit_id, payload)
    if not unit:
        raise HTTPException(status_code=404, detail='واحد یافت نشد')
    return unit


@app.delete('/api/icc/units/{unit_id}')
async def delete_icc_unit(
    unit_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """حذف واحد ICC"""
    success = crud.delete_icc_unit(session, unit_id)
    if not success:
        raise HTTPException(status_code=404, detail='واحد یافت نشد')
    return {'message': 'واحد با موفقیت حذف شد'}


@app.get('/api/icc/extensions', response_model=List[schemas.IccExtensionOut])
async def list_icc_extensions(
    unit_id: Optional[int] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت شاخه‌های ICC"""
    if unit_id:
        extensions = crud.get_icc_extensions_by_unit(session, unit_id)
    else:
        extensions = session.query(models.IccExtension).order_by(models.IccExtension.name).all()
    return extensions


@app.post('/api/icc/extensions', response_model=schemas.IccExtensionOut)
async def create_icc_extension(
    payload: schemas.IccExtensionCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """ایجاد شاخه ICC"""
    extension = crud.create_icc_extension(session, payload)
    return extension


@app.get('/api/icc/extensions/{extension_id}', response_model=schemas.IccExtensionOut)
async def get_icc_extension(
    extension_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت شاخه ICC"""
    extension = crud.get_icc_extension(session, extension_id)
    if not extension:
        raise HTTPException(status_code=404, detail='شاخه یافت نشد')
    return extension


@app.patch('/api/icc/extensions/{extension_id}', response_model=schemas.IccExtensionOut)
async def update_icc_extension(
    extension_id: int,
    payload: schemas.IccExtensionUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """به‌روزرسانی شاخه ICC"""
    extension = crud.update_icc_extension(session, extension_id, payload)
    if not extension:
        raise HTTPException(status_code=404, detail='شاخه یافت نشد')
    return extension


@app.delete('/api/icc/extensions/{extension_id}')
async def delete_icc_extension(
    extension_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """حذف شاخه ICC"""
    success = crud.delete_icc_extension(session, extension_id)
    if not success:
        raise HTTPException(status_code=404, detail='شاخه یافت نشد')
    return {'message': 'شاخه با موفقیت حذف شد'}


# ==================== System Settings API ====================

@app.get('/api/admin/settings', response_model=List[schemas.SystemSettingOut])
async def get_all_settings(
    category: Optional[str] = None,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت تمام تنظیمات سیستم (فقط ادمین)"""
    # Check admin access
    if not current.role or current.role != 'Admin':
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


@app.get('/api/admin/settings/{key}', response_model=schemas.SystemSettingOut)
async def get_setting(
    key: str,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت تنظیم خاص"""
    if not current.role or current.role != 'Admin':
        raise HTTPException(status_code=403, detail='دسترسی محدود')
    
    setting = crud.get_system_setting(session, key)
    if not setting:
        raise HTTPException(status_code=404, detail='تنظیم یافت نشد')
    
    if setting.is_secret:
        setting.value = '***'  # Mask secret value
    
    return setting


@app.post('/api/admin/settings', response_model=schemas.SystemSettingOut)
async def create_setting(
    payload: schemas.SystemSettingCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """ایجاد تنظیم سیستم جدید"""
    if not current.role or current.role != 'Admin':
        raise HTTPException(status_code=403, detail='دسترسی محدود')
    
    # Check if key already exists
    existing = crud.get_system_setting(session, payload.key)
    if existing:
        raise HTTPException(status_code=400, detail='این کلید از قبل وجود دارد')
    
    setting = crud.create_system_setting(session, payload, current.id)
    return setting


@app.patch('/api/admin/settings/{key}', response_model=schemas.SystemSettingOut)
async def update_setting(
    key: str,
    payload: schemas.SystemSettingUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """به‌روزرسانی تنظیم سیستم"""
    if not current.role or current.role != 'Admin':
        raise HTTPException(status_code=403, detail='دسترسی محدود')
    
    setting = crud.update_system_setting(session, key, payload, current.id)
    if not setting:
        raise HTTPException(status_code=404, detail='تنظیم یافت نشد')
    
    if setting.is_secret:
        setting.value = '***'  # Mask secret value
    
    return setting


@app.delete('/api/admin/settings/{key}')
async def delete_setting(
    key: str,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """حذف تنظیم سیستم"""
    if not current.role or current.role != 'Admin':
        raise HTTPException(status_code=403, detail='دسترسی محدود')
    
    success = crud.delete_system_setting(session, key)
    if not success:
        raise HTTPException(status_code=404, detail='تنظیم یافت نشد')
    
    return {'message': 'تنظیم با موفقیت حذف شد'}


# ==================== Dashboard Widgets API ====================

@app.get('/api/dashboard/widgets', response_model=List[schemas.DashboardWidgetOut])
async def get_dashboard_widgets(
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت widgets داشبورد کاربر"""
    widgets = crud.get_user_dashboard_widgets(session, current.id)
    return widgets


@app.post('/api/dashboard/widgets', response_model=schemas.DashboardWidgetOut)
async def create_widget(
    payload: schemas.DashboardWidgetCreate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """ایجاد widget جدید"""
    widget = crud.create_dashboard_widget(session, current.id, payload)
    return widget


@app.get('/api/dashboard/widgets/{widget_id}', response_model=schemas.DashboardWidgetOut)
async def get_widget(
    widget_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """دریافت widget خاص"""
    widget = crud.get_dashboard_widget(session, widget_id)
    if not widget or widget.user_id != current.id:
        raise HTTPException(status_code=404, detail='Widget یافت نشد')
    return widget


@app.patch('/api/dashboard/widgets/{widget_id}', response_model=schemas.DashboardWidgetOut)
async def update_widget(
    widget_id: int,
    payload: schemas.DashboardWidgetUpdate,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """به‌روزرسانی widget"""
    widget = crud.get_dashboard_widget(session, widget_id)
    if not widget or widget.user_id != current.id:
        raise HTTPException(status_code=404, detail='Widget یافت نشد')
    
    updated = crud.update_dashboard_widget(session, widget_id, payload)
    return updated


@app.delete('/api/dashboard/widgets/{widget_id}')
async def delete_widget(
    widget_id: int,
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """حذف widget"""
    widget = crud.get_dashboard_widget(session, widget_id)
    if not widget or widget.user_id != current.id:
        raise HTTPException(status_code=404, detail='Widget یافت نشد')
    
    success = crud.delete_dashboard_widget(session, widget_id)
    if not success:
        raise HTTPException(status_code=400, detail='حذف widget ناموفق بود')
    
    return {'message': 'Widget با موفقیت حذف شد'}


@app.post('/api/dashboard/widgets/reorder')
async def reorder_widgets(
    payload: dict,  # {'widgets': [{'widget_id': 1, 'position_x': 0, 'position_y': 0, ...}, ...]}
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """تغییر موقعیت و اندازه widgets (برای drag-and-drop)"""
    widgets = payload.get('widgets', [])
    success = crud.reorder_dashboard_widgets(session, current.id, widgets)
    if not success:
        raise HTTPException(status_code=400, detail='تغییر ترتیب ناموفق بود')
    
    return {'message': 'ترتیب widgets با موفقیت ذخیره شد'}


@app.post('/api/test/send-sms')
async def test_send_sms(
    payload: dict,  # {'mobile': '...', 'message': '...'}
    current: models.User = Depends(get_current_user),
    session: Session = Depends(db.get_db)
):
    """تست ارسال SMS (فقط برای Admin)"""
    if current.role_id != 1:  # فقط Admin
        raise HTTPException(status_code=403, detail='فقط Admin می‌تواند SMS را تست کند')
    
    mobile = payload.get('mobile', '').strip()
    message = payload.get('message', '').strip()
    
    if not mobile or not message:
        raise HTTPException(status_code=400, detail='mobile و message الزامی است')
    
    from .sms import send_sms
    success, msg = send_sms(session, mobile, message)
    
    return {
        'success': success,
        'message': msg,
        'mobile': mobile,
        'text': message
    }
