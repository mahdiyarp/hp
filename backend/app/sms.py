from typing import Optional, Tuple
import requests

from . import models
from .security import decrypt_value


SUPPORTED_PROVIDERS = {"kavenegar", "ghasedak", "ippanel"}


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


def send_sms(session, to: str, message: str, provider_or_name: Optional[str] = None) -> Tuple[bool, str]:
    cfg = _pick_config(session, provider_or_name)
    if not cfg:
        return False, "no sms provider configured/enabled"
    provider = (cfg.provider or "").lower()
    api_key_enc = cfg.api_key
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
            data = {"sender": "", "recipient": to, "message": message}
            r = requests.post(url, headers=headers, json=data, timeout=7)
            if r.status_code in (200, 201):
                return True, "sent"
            return False, f"ippanel status {r.status_code}"
        return False, f"unsupported provider {provider}"
    except Exception as e:
        return False, str(e)
