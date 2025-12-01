import os
import threading
import time
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .. import db, models
from .automation import trigger_event


class _Scheduler(threading.Thread):
    def __init__(self, interval_sec: int = 300):
        super().__init__(daemon=True)
        self.interval = interval_sec
        self._stop = threading.Event()

    def run(self):
        while not self._stop.is_set():
            try:
                self.tick()
            except Exception:
                pass
            self._stop.wait(self.interval)

    def stop(self):
        self._stop.set()

    def tick(self):
        # Create a session per tick
        session: Session = db.SessionLocal()
        try:
            self._check_overdue_cheques(session)
            # TODO: add invoice unpaid → overdue and ledger integrity checks
        finally:
            session.close()

    def _check_overdue_cheques(self, session: Session):
        now = datetime.now(timezone.utc)
        cheques = session.query(models.Cheque).join(models.Payment, models.Cheque.payment_id == models.Payment.id).filter(
            models.Cheque.due_date != None,  # noqa: E711
            models.Cheque.due_date < now,
            models.Cheque.status != 'approved'
        ).all()
        for ch in cheques:
            # Try to find mobile via person by name
            mobile = None
            party_name = None
            if ch.payment and ch.payment.party_name:
                party_name = ch.payment.party_name
                per = session.query(models.Person).filter(models.Person.name == party_name).first()
                if per and per.mobile:
                    mobile = per.mobile
            message = f"یادآوری: چک سررسید شده {ch.cheque_number or ch.id} برای {party_name or ''}"
            trigger_event(session, 'cheque.overdue', {
                'cheque_id': ch.id,
                'party_name': party_name,
                'mobile': mobile,
                'message': message,
            })


_scheduler: _Scheduler | None = None


def start_scheduler():
    global _scheduler
    if _scheduler is None and os.getenv('SCHEDULER_ENABLED', 'false').lower() in ('1', 'true', 'yes'):
        interval = int(os.getenv('SCHEDULER_INTERVAL_SEC', '300'))
        _scheduler = _Scheduler(interval)
        _scheduler.start()


def stop_scheduler():
    global _scheduler
    if _scheduler is not None:
        _scheduler.stop()
        _scheduler = None
