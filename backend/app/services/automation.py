from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from .. import models
from ..sms import send_sms

# Simple event dispatcher. Can be extended to Telegram, WhatsApp, webhooks, etc.
# Supported events: invoice.finalized, payment.posted, cheque.overdue


def _find_party_mobile(session: Session, party_id: Optional[str], party_name: Optional[str]) -> Optional[str]:
    if party_id:
        per = session.query(models.Person).filter(models.Person.id == party_id).first()
        if per and per.mobile:
            return per.mobile
    if party_name:
        per = session.query(models.Person).filter(models.Person.name == party_name).first()
        if per and per.mobile:
            return per.mobile
    return None


def _safe_send_sms(session: Session, to: Optional[str], message: Optional[str]) -> None:
    if not to or not message:
        return
    try:
        send_sms(session, to, message)
    except Exception:
        # Never raise from automation path
        pass


def trigger_event(session: Session, event: str, payload: Dict[str, Any]) -> None:
    # Load enabled integrations (for future expansion)
    _ = session.query(models.IntegrationConfig).filter(models.IntegrationConfig.enabled == True).all()  # noqa: E712

    if event == 'cheque.overdue':
        try:
            mobile = payload.get('mobile') or _find_party_mobile(
                session, payload.get('party_id'), payload.get('party_name')
            )
            message = payload.get('message') or 'یادآوری سررسید چک'
            _safe_send_sms(session, mobile, message)
        except Exception:
            pass

    elif event == 'invoice.finalized':
        try:
            mobile = _find_party_mobile(session, payload.get('party_id'), payload.get('party_name'))
            if mobile:
                inv_no = payload.get('invoice_number') or payload.get('id')
                total = payload.get('total')
                msg = f"فاکتور شما تایید شد. شماره: {inv_no} مبلغ: {total}"
                _safe_send_sms(session, mobile, msg)
        except Exception:
            pass

    elif event == 'payment.posted':
        try:
            mobile = _find_party_mobile(session, payload.get('party_id'), payload.get('party_name'))
            if mobile:
                pay_no = payload.get('payment_number') or payload.get('id')
                amount = payload.get('amount')
                msg = f"پرداخت ثبت شد. شماره: {pay_no} مبلغ: {amount}"
                _safe_send_sms(session, mobile, msg)
        except Exception:
            pass

    # Other events: no-ops for now
    return
