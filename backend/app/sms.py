from typing import Optional, Tuple
import requests
import random
import string
import time

from . import models
from .security import decrypt_value


SUPPORTED_PROVIDERS = {"kavenegar", "ghasedak", "ippanel"}

# OTP sessions: {session_id: {phone, otp_code, expires_at, attempts}}
_otp_sessions = {}


def _pick_config(session, provider_or_name: Optional[str] = None) -> Optional[models.IntegrationConfig]:
    q = session.query(models.IntegrationConfig).filter(models.IntegrationConfig.enabled == True)
    if provider_or_name:
        # try by exact name first
        cfg = q.filter(models.IntegrationConfig.name == provider_or_name).first()
        if cfg:
            return cfg
        # else by provider
        cfg = q.filter(models.IntegrationConfig.provider == provider_or_name).first()
        if cfg:
            return cfg
    # fallback: first enabled SMS provider
    cfg = (
        session.query(models.IntegrationConfig)
        .filter(models.IntegrationConfig.enabled == True)
        .filter(models.IntegrationConfig.provider.in_(list(SUPPORTED_PROVIDERS)))
        .first()
    )
    return cfg


def _pick_user_config(session, user_id: int) -> Optional[models.UserSmsConfig]:
    """دریافت تنظیمات SMS کاربر اگر فعال باشد"""
    config = session.query(models.UserSmsConfig).filter(
        models.UserSmsConfig.user_id == user_id,
        models.UserSmsConfig.enabled == True
    ).first()
    return config


def send_sms(session, to: str, message: str, provider_or_name: Optional[str] = None, user_id: Optional[int] = None) -> Tuple[bool, str]:
    """
    ارسال پیام SMS.
    اگر user_id ارائه شود، ابتدا تنظیمات کاربر را بررسی می‌کند.
    اگر فعال نباشد، تنظیمات سیستم را استفاده می‌کند.
    """
    config = None
    
    # اگر user_id ارائه شود، اول تنظیمات کاربر را بررسی کنید
    if user_id:
        config = _pick_user_config(session, user_id)
    
    # اگر تنظیمات کاربر نبود، تنظیمات سیستم را استفاده کنید
    if not config:
        config = _pick_config(session, provider_or_name)
    
    if not config:
        return False, "no sms provider configured/enabled"
    
    provider = (config.provider or "").lower()
    api_key_enc = config.api_key
    api_key = decrypt_value(api_key_enc) if api_key_enc else None
    if not api_key:
        return False, "missing api key"
    
    try:
        if provider == "kavenegar":
            url = f"https://api.kavenegar.com/v1/{api_key}/sms/send.json"
            r = requests.get(url, params={"receptor": to, "message": message}, timeout=7)
            if r.status_code == 200:
                return True, "sent"
            return False, f"kavenegar status {r.status_code}"
        
        if provider == "ghasedak":
            url = "https://api.ghasedak.me/v2/sms/send/simple"
            headers = {"apikey": api_key}
            data = {"receptor": to, "message": message}
            r = requests.post(url, headers=headers, data=data, timeout=7)
            if r.status_code in (200, 201):
                return True, "sent"
            return False, f"ghasedak status {r.status_code}"
        
        if provider == "ippanel":
            url = "https://api.ippanel.com/api/v1/sms/send"
            headers = {"Authorization": f"Bearer {api_key}"}
            sender = ""
            # اگر UserSmsConfig باشد، sender را از آن استفاده کنید
            if isinstance(config, models.UserSmsConfig):
                sender = config.sender_name or ""
            data = {"sender": sender, "recipient": to, "message": message}
            r = requests.post(url, headers=headers, json=data, timeout=7)
            if r.status_code in (200, 201):
                return True, "sent"
            return False, f"ippanel status {r.status_code}"
        
        return False, f"unsupported provider {provider}"
    except Exception as e:
        return False, str(e)


def generate_otp() -> str:
    """تولید کد OTP 6 رقمی"""
    return ''.join(random.choices(string.digits, k=6))


def create_otp_session(phone: str) -> Tuple[str, str]:
    """
    ایجاد جلسه OTP برای شماره تلفن.
    بازگشت: (session_id, otp_code)
    """
    session_id = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    otp_code = generate_otp()
    
    _otp_sessions[session_id] = {
        'phone': phone,
        'otp_code': otp_code,
        'expires_at': time.time() + 300,  # 5 دقیقه
        'attempts': 0
    }
    
    return session_id, otp_code


def verify_otp_session(session_id: str, otp_code: str) -> Tuple[bool, Optional[str]]:
    """
    تأیید کد OTP.
    بازگشت: (is_valid, phone)
    """
    if session_id not in _otp_sessions:
        return False, None
    
    session_data = _otp_sessions[session_id]
    
    # بررسی انقضا
    if time.time() > session_data['expires_at']:
        del _otp_sessions[session_id]
        return False, None
    
    # بررسی تعداد تلاش‌ها
    if session_data['attempts'] >= 3:
        del _otp_sessions[session_id]
        return False, None
    
    session_data['attempts'] += 1
    
    # بررسی کد
    if session_data['otp_code'] == otp_code:
        phone = session_data['phone']
        del _otp_sessions[session_id]
        return True, phone
    
    return False, None

