from typing import Optional, Tuple, List, Dict
import os
import json
from datetime import datetime
import requests
import random
import string
import time
from urllib.parse import quote

from sqlalchemy.orm import Session
from . import models
from .security import decrypt_value


SUPPORTED_PROVIDERS = {"ippanel", "sms.ir"}

# OTP sessions: {session_id: {phone, otp_code, expires_at, attempts}}
_otp_sessions = {}


def _get_sms_config(session: Session) -> dict:
    """سیستم تنظیمات سے SMS کنفیگریشن حاصل کریں"""
    config = {}
    
    # SMS provider حاصل کریں
    provider_setting = session.query(models.SystemSettings).filter(
        models.SystemSettings.key.in_(['sms_provider','smsir_provider'])
    ).order_by(models.SystemSettings.updated_at.desc()).first()
    
    config['provider'] = (provider_setting.value if provider_setting else 'sms.ir')
    
    # API key حاصل کریں (encrypted ہو سکتا ہے)
    api_key_setting = session.query(models.SystemSettings).filter(
        models.SystemSettings.key.in_(['sms_api_key','smsir_api_key'])
    ).order_by(models.SystemSettings.updated_at.desc()).first()
    
    if api_key_setting:
        if api_key_setting.is_secret:
            config['api_key'] = decrypt_value(api_key_setting.value)
        else:
            config['api_key'] = api_key_setting.value
    
    # Sender number حاصل کریں
    sender_setting = session.query(models.SystemSettings).filter(
        models.SystemSettings.key.in_(['sms_sender','smsir_line_number','smsir_sender'])
    ).order_by(models.SystemSettings.updated_at.desc()).first()
    
    config['sender'] = sender_setting.value if sender_setting else ''
    
    return config


def send_sms(session: Session, to: str, message: str, line_number: Optional[str] = None) -> Tuple[bool, str]:
    """
    SMS پیغام بھیجیں۔
    تنظیمات system_settings ٹیبل سے حاصل کی جاتی ہیں۔
    """
    config = _get_sms_config(session)
    
    if not config.get('api_key'):
        return False, "SMS API کنفیگریشن دستیاب نہیں"
    
    provider = (config.get('provider') or "sms.ir").lower()
    api_key = config.get('api_key')
    sender = config.get('sender', '')
    
    try:
        # Allow mock provider for demo/testing so frontend can validate UI flows
        if provider in ('mock', 'demo', 'disabled'):
            try:
                log_sms_event({'provider': 'mock', 'phase': 'mock', 'status': 200, 'payload': {'to': to, 'message': message, 'lineNumber': sender}, 'resp': {'status': 200, 'message': 'mock-sent'}})
            except Exception:
                pass
            return True, "SMS ارسال شد (mock)"
    
        if provider == "ippanel":
            # IPPanel simple send
            url = "https://api.ippanel.com/api/v1/sms/send"
            params = {
                "apikey": api_key,
                "recipient": to,
                "message": message,
                "sender": sender
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('result') == True:
                    return True, "SMS ارسال شد (IPPanel)"
                return False, f"IPPanel خطا: {data.get('message', 'نامعلوم')}"
            return False, f"IPPanel خطای سرور ({response.status_code})"

        if provider == "sms.ir":
            # SMS.ir send API (non-bulk), fallback to bulk if needed. Omit lineNumber here; provider-side line applies.
            headers = { 'X-API-KEY': api_key, 'Content-Type': 'application/json', 'Accept': 'application/json' }
            # Normalize one canonical mobile format (prefer 98xxxxxxxxxx)
            to_clean = (to or '').strip()
            if to_clean.startswith('+98'):
                canon = '98' + to_clean[3:]
            elif to_clean.startswith('0') and len(to_clean) >= 11:
                canon = '98' + to_clean[1:]
            elif to_clean.startswith('98'):
                canon = to_clean
            else:
                canon = to_clean
            mobiles = [canon]
            # Primary: /v1/send
            try:
                msg = (message or '').strip()
                payload = { 'messageText': msg, 'mobiles': mobiles }
                ln = (line_number or sender or '').strip()
                if ln:
                    payload['lineNumber'] = ln
                resp = requests.post("https://api.sms.ir/v1/send", headers=headers, json=payload, timeout=10)
                data = {}
                try:
                    data = resp.json()
                except Exception:
                    data = {'text': getattr(resp, 'text', '')}
                if resp.status_code == 200 and (data.get('status') == 1 or data.get('success') is True or data.get('data')):
                    return True, "SMS ارسال شد (sms.ir)"
                try:
                    log_sms_event({'provider': 'sms.ir', 'phase': 'single', 'status': resp.status_code, 'payload': payload, 'resp': str(data)[:300]})
                except Exception:
                    pass
            except Exception:
                pass
            # Fallback: /v1/send/bulk (sendType 1)
            try:
                msg = (message or '').strip()
                bulk_payload = { 'messages': [msg], 'mobiles': mobiles, 'sendType': 1 }
                ln2 = (line_number or sender or '').strip()
                if ln2:
                    bulk_payload['lineNumber'] = ln2
                resp2 = requests.post("https://api.sms.ir/v1/send/bulk", headers=headers, json=bulk_payload, timeout=10)
                data2 = {}
                try:
                    data2 = resp2.json()
                except Exception:
                    data2 = {'text': getattr(resp2, 'text', '')}
                if resp2.status_code == 200 and (data2.get('status') == 1 or data2.get('success') is True or data2.get('data')):
                    return True, "SMS ارسال شد (sms.ir bulk)"
                try:
                    log_sms_event({'provider': 'sms.ir', 'phase': 'bulk', 'status': resp2.status_code, 'payload': bulk_payload, 'resp': str(data2)[:300]})
                except Exception:
                    pass
                # Attempt aligned bulk (sendType 2)
                aligned = { 'messages': [msg for _ in mobiles], 'mobiles': mobiles, 'sendType': 2 }
                if ln2:
                    aligned['lineNumber'] = ln2
                resp3 = requests.post("https://api.sms.ir/v1/send/bulk", headers=headers, json=aligned, timeout=10)
                data3 = {}
                try:
                    data3 = resp3.json()
                except Exception:
                    data3 = {'text': getattr(resp3, 'text', '')}
                if resp3.status_code == 200 and (data3.get('status') == 1 or data3.get('success') is True or data3.get('data')):
                    return True, "SMS ارسال شد (sms.ir bulk aligned)"
                try:
                    log_sms_event({'provider': 'sms.ir', 'phase': 'bulk-aligned', 'status': resp3.status_code, 'payload': aligned, 'resp': str(data3)[:300]})
                except Exception:
                    pass
                return False, f"sms.ir خطا ({resp3.status_code}): {str(data3)[:200]}"
            except Exception as e:
                return False, f"sms.ir استثناء: {str(e)}"

        return False, f"نامعاون ارائه‌دهنده: {provider}"
    
    except requests.Timeout:
        return False, "درخواست ختم ہو گئی"
    except Exception as e:
        return False, f"خرابی: {str(e)}"


# Simple JSONL history store (file-based) to avoid migrations
HISTORY_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs')
HISTORY_FILE = os.path.join(HISTORY_DIR, 'sms.jsonl')

def _ensure_history_file():
    os.makedirs(HISTORY_DIR, exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'a', encoding='utf-8'):
            pass

def log_sms_event(event: Dict):
    _ensure_history_file()
    event = { **event, 'ts': datetime.utcnow().isoformat() + 'Z' }
    with open(HISTORY_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")

def read_sms_history(limit: int = 100) -> List[Dict]:
    _ensure_history_file()
    lines: List[str] = []
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        return []
    entries = []
    for line in lines[-limit:]:
        line = line.strip()
        if not line:
            continue
        try:
            entries.append(json.loads(line))
        except Exception:
            continue
    return list(reversed(entries))


def list_smsir_lines(session: Session) -> Tuple[bool, List[str] | str]:
    """دریافت لیست خطوط sms.ir با استفاده از API key ذخیره شده."""
    config = _get_sms_config(session)
    api_key = config.get('api_key')
    if not api_key:
        return False, 'کلید API تنظیم نشده است'
    headers = {'X-API-KEY': api_key, 'PageSize': '100'}
    try:
        resp = requests.get('https://api.sms.ir/v1/line', headers=headers, timeout=10)
        data = {}
        try:
            data = resp.json()
        except Exception:
            data = {'text': getattr(resp, 'text', '')}
        if resp.status_code == 200 and (data.get('status') == 1):
            lines = [str(x) for x in (data.get('data') or [])]
            return True, lines
        return False, f"خطا ({resp.status_code}): {str(data)[:200]}"
    except Exception as e:
        return False, f"استثناء: {str(e)}"


def generate_otp() -> str:
    """6 ہندسے کا OTP کوڈ تیار کریں"""
    return ''.join(random.choices(string.digits, k=6))


def create_otp_session(phone: str) -> Tuple[str, str]:
    """
    فون نمبر کے لیے OTP سیشن بنائیں۔
    واپسی: (session_id, otp_code)
    """
    session_id = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    otp_code = generate_otp()
    
    _otp_sessions[session_id] = {
        'phone': phone,
        'otp_code': otp_code,
        'expires_at': time.time() + 300,  # 5 منٹ
        'attempts': 0
    }
    
    return session_id, otp_code


def verify_otp_session(session_id: str, otp_code: str) -> Tuple[bool, Optional[str]]:
    """
    OTP کوڈ کی تصدیق کریں۔
    واپسی: (is_valid, phone)
    """
    if session_id not in _otp_sessions:
        return False, None
    
    session_data = _otp_sessions[session_id]
    
    # کی توسیع پذیری چیک کریں
    if time.time() > session_data['expires_at']:
        del _otp_sessions[session_id]
        return False, None
    
    # کوششوں کی تعداد چیک کریں
    if session_data['attempts'] >= 3:
        del _otp_sessions[session_id]
        return False, None
    
    session_data['attempts'] += 1
    
    # کوڈ کی تصدیق کریں
    if session_data['otp_code'] == otp_code:
        phone = session_data['phone']
        del _otp_sessions[session_id]
        return True, phone
    
    return False, None


def peek_session_phone(session_id: str) -> Optional[str]:
    """Return the phone for an existing OTP session without verifying the code (demo use)."""
    data = _otp_sessions.get(session_id)
    if not data:
        return None
    # If expired, treat as missing
    import time as _t
    if _t.time() > data.get('expires_at', 0):
        return None
    return data.get('phone')
