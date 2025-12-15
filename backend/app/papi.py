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

def start_otp(session: Session, mobile: str, code: Optional[str] = None) -> Tuple[bool, str]:
    # Rate limiting: max 3 requests in 5 minutes per mobile
    now = datetime.utcnow()
    window = now - timedelta(minutes=5)
    hist = _otp_rate.get(mobile, [])
    hist = [t for t in hist if t > window]
    if len(hist) >= 3:
        try:
            log_event({'provider':'papi','phase':'otp-rate-limit','status':429,'payload':{'mobile':mobile}})
        except Exception:
            pass
        return False, 'Rate limited. Try later.'
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
    # Send the actual code in the message for demo/testing
    ok, info = send_sms(session, mobile, f"OTP: {code}", None)
    try:
        log_event({'provider':'papi','phase':'otp-start','status':200 if ok else 400,'payload':{'mobile':mobile},'resp':info})
    except Exception: pass
    return ok, info

def verify_otp(session: Session, mobile: str, code: str) -> Tuple[bool, str]:
    rec = _otp_sessions.get(mobile)
    if not rec:
        return False, 'OTP not found'
    if rec.get('used'):
        return False, 'OTP already used'
    if datetime.utcnow() > rec['expires']:
        return False, 'OTP expired'
    if _hash_code(code) != rec.get('code_hash'):
        return False, 'Invalid OTP'
    rec['used'] = True
    _otp_sessions[mobile] = rec
    try:
        log_event({'provider':'papi','phase':'otp-verify','status':200,'payload':{'mobile':mobile}})
    except Exception: pass
    return True, 'OTP verified'

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
