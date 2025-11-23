from typing import Optional, Tuple
import requests
import random
import string
import time

from sqlalchemy.orm import Session
from . import models, crud
from .security import decrypt_value


SUPPORTED_PROVIDERS = {"ippanel"}
TREASURY_ADDRESS = "treasury"
SMS_TOKEN_FEE = 3

# OTP sessions: {session_id: {phone, otp_code, expires_at, attempts}}
_otp_sessions = {}


def _get_sms_config(session: Session) -> dict:
    """خواندن تنظیمات SMS از system_settings"""
    config: dict = {}

    provider_setting = session.query(models.SystemSettings).filter(
        models.SystemSettings.key == 'sms_provider',
        models.SystemSettings.category == 'sms'
    ).first()
    config['provider'] = provider_setting.value if provider_setting else 'ippanel'

    api_key_setting = session.query(models.SystemSettings).filter(
        models.SystemSettings.key == 'sms_api_key',
        models.SystemSettings.category == 'sms'
    ).first()
    if api_key_setting:
        if api_key_setting.is_secret:
            config['api_key'] = decrypt_value(api_key_setting.value)
        else:
            config['api_key'] = api_key_setting.value

    sender_setting = session.query(models.SystemSettings).filter(
        models.SystemSettings.key == 'sms_sender',
        models.SystemSettings.category == 'sms'
    ).first()
    config['sender'] = sender_setting.value if sender_setting else ''

    return config


def send_sms(session: Session, to: str, message: str, provider: Optional[str] = None, user_id: Optional[int] = None) -> Tuple[bool, str]:
    """
    ارسال SMS با اعمال توکن‌فی برای کاربر (در صورت وجود user_id)
    """
    config = _get_sms_config(session)
    if not config.get('api_key'):
        return False, "تنظیمات SMS ناقص است (api_key)."

    provider = (provider or config.get('provider') or "ippanel").lower()
    api_key = config.get('api_key')
    sender = config.get('sender', '')

    try:
        if provider == "ippanel":
            endpoints = [
                "https://api.ippanel.com/api/v1/sms/send",
                "https://api.ippanel.com/v1/messages",
            ]
            last_status = None
            last_body = None
            for url in endpoints:
                payload = {
                    "originator": sender,
                    "recipients": [to],
                    "recipient": to,
                    "message": message,
                }
                headers = {
                    "Authorization": f"AccessKey {api_key}",
                    "Content-Type": "application/json",
                }
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                last_status = response.status_code
                try:
                    last_body = response.json()
                except Exception:
                    last_body = {}
                if 200 <= response.status_code < 300:
                    # Charge tokens after successful send
                    if user_id:
                        try:
                            account = crud.get_or_create_token_account(session, user_id=user_id)
                            fee_amount = SMS_TOKEN_FEE
                            if account.balance < fee_amount:
                                return False, f'موجودی توکن کافی نیست؛ حداقل {fee_amount} توکن نیاز است'
                            crud.record_token_transfer(
                                session=session,
                                from_account=account,
                                to_address=TREASURY_ADDRESS,
                                amount=fee_amount,
                                fee_amount=0,
                                memo='sms',
                            )
                            crud.add_consumption_log(session, user_id=user_id, service_type='sms', ref_id=to, cost_token=fee_amount, metadata_json=None)
                        except Exception as e:
                            return False, f'کسر توکن برای SMS ناموفق بود: {e}'
                    return True, last_body.get('message', 'SMS ارسال شد')
                if response.status_code == 401:
                    return False, "iPanel: مجوز نامعتبر (401)؛ AccessKey یا حساب را بررسی کنید"
            return False, f"iPanel خطای HTTP: {last_status}; پاسخ: {last_body}"

        return False, f"Provider پشتیبانی نمی‌شود: {provider}"
    except requests.Timeout:
        return False, "Timeout در ارتباط با سرویس SMS"
    except Exception as e:
        return False, f"خطا در ارسال: {str(e)}"


def generate_otp() -> str:
    """کد OTP 6 رقمی"""
    return ''.join(random.choices(string.digits, k=6))


def create_otp_session(phone: str) -> Tuple[str, str]:
    """ایجاد سشن OTP در حافظه"""
    session_id = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    otp_code = generate_otp()
    _otp_sessions[session_id] = {
        'phone': phone,
        'otp_code': otp_code,
        'expires_at': time.time() + 300,
        'attempts': 0
    }
    return session_id, otp_code


def verify_otp_session(session_id: str, otp_code: str) -> Tuple[bool, Optional[str]]:
    """اعتبارسنجی سشن OTP"""
    if session_id not in _otp_sessions:
        return False, None

    session_data = _otp_sessions[session_id]
    if time.time() > session_data['expires_at']:
        del _otp_sessions[session_id]
        return False, None
    if session_data['attempts'] >= 3:
        del _otp_sessions[session_id]
        return False, None

    session_data['attempts'] += 1
    if session_data['otp_code'] == otp_code:
        phone = session_data['phone']
        del _otp_sessions[session_id]
        return True, phone

    return False, None
