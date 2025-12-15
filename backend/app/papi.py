from typing import Optional, Tuple, Dict, List
import os
import json
from datetime import datetime, timedelta
import requests
from sqlalchemy.orm import Session
from . import models
from .security import decrypt_value

HISTORY_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs')
PAPI_HISTORY = os.path.join(HISTORY_DIR, 'papi.jsonl')

_otp_sessions: Dict[str, Dict] = {}
_otp_rate: Dict[str, List[datetime]] = {}
# تعداد تلاش‌های ناموفق برای هر موبایل جهت جلوگیری از حملات جستجوی کد
_otp_attempts: Dict[str, Dict] = {}

def _hash_code(code: str, salt: Optional[str] = None) -> str:
    import hashlib, os
    s = salt or os.getenv('OTP_SALT', 'hesabpak_salt')
    return hashlib.sha256((s + ':' + str(code).strip()).encode('utf-8')).hexdigest()

def _ensure_history():
    os.makedirs(HISTORY_DIR, exist_ok=True)
    if not os.path.exists(PAPI_HISTORY):
        with open(PAPI_HISTORY, 'a', encoding='utf-8'):
            pass

def log_event(evt: Dict):
    _ensure_history()
    evt = { **evt, 'ts': datetime.utcnow().isoformat() + 'Z' }
    with open(PAPI_HISTORY, 'a', encoding='utf-8') as f:
        f.write(json.dumps(evt, ensure_ascii=False) + "\n")

def _get_config(session: Session) -> Dict:
    cfg: Dict = {}
    provider = session.query(models.SystemSettings).filter(models.SystemSettings.key=='papi_provider').order_by(models.SystemSettings.updated_at.desc()).first()
    api_key = session.query(models.SystemSettings).filter(models.SystemSettings.key=='papi_api_key').order_by(models.SystemSettings.updated_at.desc()).first()
    sender = session.query(models.SystemSettings).filter(models.SystemSettings.key=='papi_sender').order_by(models.SystemSettings.updated_at.desc()).first()
    cfg['provider'] = (provider.value if provider else 'papi.ir')
    if api_key:
        cfg['api_key'] = decrypt_value(api_key.value) if api_key.is_secret else api_key.value
    cfg['sender'] = (sender.value if sender else '')
    return cfg


def get_config_summary(session: Session) -> Dict:
    """Return a non-sensitive snapshot of the current PApi/api.ir configuration."""
    cfg = _get_config(session)
    base_path = (
        session.query(models.SystemSettings)
        .filter(models.SystemSettings.key == 'papi_base_path')
        .order_by(models.SystemSettings.updated_at.desc())
        .first()
    )
    return {
        'provider': (cfg.get('provider') or 'papi.ir'),
        'has_api_key': bool(cfg.get('api_key')),
        'sender': (cfg.get('sender') or ''),
        'has_sender': bool(cfg.get('sender')),
        'base_path': str(base_path.value).strip() if base_path and base_path.value else None,
    }


def get_active_otp_sessions_count(now: Optional[datetime] = None) -> int:
    """Count active OTP sessions that are not expired and not used."""
    now = now or datetime.utcnow()
    try:
        return len([
            1
            for rec in _otp_sessions.values()
            if rec
            and not rec.get('used')
            and rec.get('expires')
            and isinstance(rec.get('expires'), datetime)
            and now < rec['expires']
        ])
    except Exception:
        return 0

def send_sms(session: Session, to: str, message: str, line_number: Optional[str] = None) -> Tuple[bool, str]:
    cfg = _get_config(session)
    provider = (cfg.get('provider') or 'papi.ir').lower()
    api_key = cfg.get('api_key')
    sender = (line_number or cfg.get('sender') or '').strip()
    if provider in ('mock','demo'):
        try:
            log_event({'provider':'papi','phase':'mock','status':200,'payload':{'to':to,'message':message,'sender':sender}})
        except Exception: pass
        return True, 'PApi mock sent'
    if not api_key:
        return False, 'PApi API key missing'
    # Minimal PApi send per p.api.ir docs (assumed structure)
    headers = { 'Authorization': f'Bearer {api_key}', 'Content-Type':'application/json', 'Accept':'application/json' }
    payload = { 'to': to, 'message': message }
    if sender:
        payload['sender'] = sender
    try:
        resp = requests.post('https://p.api.ir/v1/sms/send', headers=headers, json=payload, timeout=15)
        data = {}
        try:
            data = resp.json()
        except Exception:
            data = {'text': getattr(resp,'text','') }
        if resp.status_code in (200,201) and (data.get('success') or data.get('status') in (1,'ok')):
            return True, 'PApi SMS sent'
        try:
            log_event({'provider':'papi','phase':'send','status':resp.status_code,'payload':payload,'resp':str(data)[:300]})
        except Exception: pass
        return False, f"PApi error ({resp.status_code}): {str(data)[:200]}"
    except Exception as e:
        return False, f"PApi exception: {str(e)}"

def start_otp(session: Session, mobile: str, code: Optional[str] = None) -> Tuple[bool, str, Dict]:
    # Rate limiting: max 3 requests in 5 minutes per mobile
    now = datetime.utcnow()
    window = now - timedelta(minutes=5)
    hist = _otp_rate.get(mobile, [])
    hist = [t for t in hist if t > window]
    if len(hist) >= 3:
        retry_after = max(30, int(((min(hist) + timedelta(minutes=5)) - now).total_seconds())) if hist else 300
        try:
            log_event({'provider':'papi','phase':'otp-rate-limit','status':429,'payload':{'mobile':mobile,'retry_after':retry_after}})
        except Exception:
            pass
        return False, f'به دلیل تکرار درخواست، ارسال مجدد کد تا {max(1, retry_after//60)} دقیقه محدود شد', {
            'retry_after_seconds': retry_after,
            'lock_reason': 'otp_rate',
        }
    # Respect existing lockouts to avoid bypassing failed-attempt rules
    attempts_info = _otp_attempts.get(mobile) or {'attempts': 0, 'locked_until': None}
    locked_until = attempts_info.get('locked_until')
    if locked_until and isinstance(locked_until, datetime) and now < locked_until:
        remaining = int((locked_until - now).total_seconds() // 60) + 1
        return False, f'به دلیل تلاش ناموفق، ارسال مجدد کد تا {remaining} دقیقه مسدود است', {
            'locked_until': locked_until.isoformat() + 'Z',
            'lock_reason': 'otp_attempts',
            'lock_remaining_minutes': remaining,
        }
    hist.append(now)
    _otp_rate[mobile] = hist

    # If a code is provided (demo/testing), use it; otherwise generate
    code = str(code or str(now.microsecond % 1000000).zfill(6))
    _otp_sessions[mobile] = {
        'code': code,
        'code_hash': _hash_code(code),
        'expires': now + timedelta(minutes=3),  # short-lived
        'used': False,
    }
    # Reset failed-attempts window on each new issuance
    _otp_attempts[mobile] = {'attempts': 0, 'locked_until': None}
    # Send the actual code in the message for demo/testing
    ok, info = send_sms(session, mobile, f"OTP: {code}", None)
    try:
        log_event({'provider':'papi','phase':'otp-start','status':200 if ok else 400,'payload':{'mobile':mobile},'resp':info})
    except Exception: pass
    return ok, info, {'expires_at': (_otp_sessions[mobile]['expires'].isoformat() + 'Z')}

def verify_otp(session: Session, mobile: str, code: str) -> Tuple[bool, str, Dict]:
    rec = _otp_sessions.get(mobile)
    attempts_info = _otp_attempts.get(mobile) or {'attempts': 0, 'locked_until': None}
    now = datetime.utcnow()

    locked_until = attempts_info.get('locked_until')
    if locked_until and isinstance(locked_until, datetime) and now < locked_until:
        remaining = int((locked_until - now).total_seconds() // 60) + 1
        return False, f'به دلیل تلاش ناموفق، ورود موقتاً مسدود است؛ {remaining} دقیقه بعد تلاش کنید', {
            'locked_until': locked_until.isoformat() + 'Z',
            'lock_remaining_minutes': remaining,
            'lock_reason': 'otp_attempts',
        }

    if not rec:
        attempts_info['attempts'] = attempts_info.get('attempts', 0) + 1
        _otp_attempts[mobile] = attempts_info
        return False, 'کد تایید یافت نشد؛ لطفاً دوباره درخواست دهید', {'remaining_attempts': max(0, 5 - attempts_info['attempts'])}
    if rec.get('used'):
        attempts_info['attempts'] = attempts_info.get('attempts', 0) + 1
        _otp_attempts[mobile] = attempts_info
        return False, 'این کد قبلاً استفاده شده است؛ کد جدید دریافت کنید', {'remaining_attempts': max(0, 5 - attempts_info['attempts'])}
    if now > rec['expires']:
        attempts_info['attempts'] = attempts_info.get('attempts', 0) + 1
        _otp_attempts[mobile] = attempts_info
        return False, 'کد منقضی شده است؛ کد جدید دریافت کنید', {'remaining_attempts': max(0, 5 - attempts_info['attempts'])}
    if _hash_code(code) != rec.get('code_hash'):
        attempts_info['attempts'] = attempts_info.get('attempts', 0) + 1
        remaining_attempts = max(0, 5 - attempts_info['attempts'])
        if attempts_info['attempts'] >= 5:
            attempts_info['locked_until'] = now + timedelta(minutes=5)
            _otp_attempts[mobile] = attempts_info
            return False, 'کد نادرست؛ به دلیل تکرار خطا برای ۵ دقیقه قفل شد', {
                'locked_until': attempts_info['locked_until'].isoformat() + 'Z',
                'remaining_attempts': 0,
                'lock_reason': 'otp_attempts',
                'lock_remaining_minutes': 5,
            }
        _otp_attempts[mobile] = attempts_info
        return False, f'کد نادرست؛ {remaining_attempts} تلاش دیگر مجاز است', {'remaining_attempts': remaining_attempts}

    rec['used'] = True
    _otp_sessions[mobile] = rec
    _otp_attempts[mobile] = {'attempts': 0, 'locked_until': None}
    try:
        log_event({'provider':'papi','phase':'otp-verify','status':200,'payload':{'mobile':mobile}})
    except Exception: pass
    return True, 'OTP verified', {'remaining_attempts': 5}

def get_otp_debug(mobile: str) -> Dict:
    rec = _otp_sessions.get(mobile)
    if not rec:
        return {'exists': False}
    return {
        'exists': True,
        'code': rec.get('code'),
        'expires': rec.get('expires').isoformat() + 'Z',
        'used': bool(rec.get('used')),
    }
