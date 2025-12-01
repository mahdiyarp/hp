import json
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.settings.models import AppSettings
from app import models


DEFAULT_SETTINGS: Dict[str, Any] = {
    "theme": "system",  # light | dark | system
    "rtl": True,
    "currency": "irr",
    "language": "fa",
    "default_fiscal_year_id": None,
    "invoice_default_tax_rate": 0,
    "invoice_prefix_template": "INV-{{year}}-{{counter}}",
    "invoice_auto_sms": False,
    "invoice_numbering_mode": "auto",
    "invoice_default_payment_terms": 0,
    "sidebar_order": [],
    "sidebar_collapsed": False,
    "notifications": {"email": True, "sms": False, "desktop": False},
    "backup": {"path": "/data/backups", "auto": False, "cron": "0 3 * * *"},
}


def _load_settings(session: Session) -> AppSettings:
    row = session.query(AppSettings).first()
    if not row:
        row = AppSettings(data=json.dumps(DEFAULT_SETTINGS, ensure_ascii=False))
        session.add(row)
        session.commit()
        session.refresh(row)
    return row


def get_settings(session: Session) -> Dict[str, Any]:
    row = _load_settings(session)
    try:
        data = json.loads(row.data) if row.data else {}
    except Exception:
        data = {}
    merged = {**DEFAULT_SETTINGS, **data}
    return merged


def save_settings(session: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    row = _load_settings(session)
    merged = {**DEFAULT_SETTINGS, **payload}
    row.data = json.dumps(merged, ensure_ascii=False)
    session.add(row)
    session.commit()
    session.refresh(row)
    return merged


def patch_setting(session: Session, field: str, value: Any) -> Dict[str, Any]:
    current = get_settings(session)
    current[field] = value
    return save_settings(session, current)


def ensure_fiscal_year_id(session: Session, fiscal_year_id: Optional[int]) -> Optional[int]:
    if fiscal_year_id is None:
        return None
    exists = session.query(models.FinancialYear.id).filter(models.FinancialYear.id == fiscal_year_id).first()
    return fiscal_year_id if exists else None
