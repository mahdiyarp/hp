from typing import Optional, Tuple
import requests
import random
import string
import time
from urllib.parse import quote

from sqlalchemy.orm import Session
from . import models
from .security import decrypt_value


SUPPORTED_PROVIDERS = {"ippanel"}

# OTP sessions: {session_id: {phone, otp_code, expires_at, attempts}}
_otp_sessions = {}


def _get_sms_config(session: Session) -> dict:
    """سیستم تنظیمات سے SMS کنفیگریشن حاصل کریں"""
    config = {}
    
    # SMS provider حاصل کریں
    provider_setting = session.query(models.SystemSettings).filter(
        models.SystemSettings.key == 'sms_provider',
        models.SystemSettings.category == 'sms'
    ).first()
    
    config['provider'] = provider_setting.value if provider_setting else 'ippanel'
    
    # API key حاصل کریں (encrypted ہو سکتا ہے)
    api_key_setting = session.query(models.SystemSettings).filter(
        models.SystemSettings.key == 'sms_api_key',
        models.SystemSettings.category == 'sms'
    ).first()
    
    if api_key_setting:
        if api_key_setting.is_secret:
            config['api_key'] = decrypt_value(api_key_setting.value)
        else:
            config['api_key'] = api_key_setting.value
    
    # Sender number حاصل کریں
    sender_setting = session.query(models.SystemSettings).filter(
        models.SystemSettings.key == 'sms_sender',
        models.SystemSettings.category == 'sms'
    ).first()
    
    config['sender'] = sender_setting.value if sender_setting else ''
    
    return config


def send_sms(session: Session, to: str, message: str) -> Tuple[bool, str]:
    """
    SMS پیغام بھیجیں۔
    تنظیمات system_settings ٹیبل سے حاصل کی جاتی ہیں۔
    """
    config = _get_sms_config(session)
    
    if not config.get('api_key'):
        return False, "SMS API کنفیگریشن دستیاب نہیں"
    
    provider = (config.get('provider') or "ippanel").lower()
    api_key = config.get('api_key')
    sender = config.get('sender', '')
    
    try:
        if provider == "ippanel":
            # iPanel API - https://ippanelcom.github.io/Edge-Document/
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
                    return True, "SMS کامیابی سے بھیجا گیا"
                else:
                    return False, f"iPanel خرابی: {data.get('message', 'نامعلوم')}"
            else:
                return False, f"iPanel سرور خرابی ({response.status_code})"
        
        return False, f"نامعاون فراہم کنندہ: {provider}"
    
    except requests.Timeout:
        return False, "درخواست ختم ہو گئی"
    except Exception as e:
        return False, f"خرابی: {str(e)}"


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
