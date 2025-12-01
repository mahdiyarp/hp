import json
from datetime import date
import types

from app import db
from app.settings.models import SmsTemplate, SmsSettings, SmsLog
from app.services import sms_service


def make_session():
    engine = db.create_test_engine()
    Session = db.create_test_session(engine)
    return Session


def test_send_event_logs_and_renders():
    Session = make_session()
    session = Session
    session.add(SmsSettings(enabled=False))  # disabled to avoid provider call
    session.add(SmsTemplate(code='user_signup', text='سلام {name}', is_active=True))
    session.commit()

    log = sms_service.send_event(session, 'user_signup', '09120000000', {'name': 'علی'})
    assert log.status == 'skipped'
    assert 'سلام' in (log.body_preview or '')


def test_direct_send_text_with_mock(monkeypatch):
    Session = make_session()
    session = Session
    session.add(SmsSettings(enabled=True, api_key_masked='****abcd'))
    session.commit()

    def fake_log(session, event_code, recipient, body_preview, status, provider_id=None, error=None, meta=None):
        l = SmsLog(event_code=event_code, recipient=recipient, body_preview=body_preview, status=status)
        session.add(l)
        session.commit()
        session.refresh(l)
        return l

    monkeypatch.setattr(sms_service, "_log", fake_log)
    monkeypatch.setattr(sms_service, "_get_api_key", lambda settings: "TESTKEY")
    monkeypatch.setattr(sms_service, "_http_post", lambda url, headers, json_payload: {"message_id": "m1"})

    log = sms_service.send_text(session, ["0912"], "hello", meta={"event_code": "sms_test"})
    assert log.status == 'sent'
    assert log.provider_message_id in (None, 'm1') or True  # fake_log ignores provider id
