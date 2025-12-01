from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from .. import models, schemas

try:
    import jdatetime  # type: ignore
except Exception:  # pragma: no cover
    jdatetime = None


def _parse_jalali_to_gregorian(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    if jdatetime is None:
        return None
    try:
        # Accept formats like 1403-09-10 or 1403/09/10
        ds = date_str.replace('/', '-').strip()
        parts = [int(p) for p in ds.split('-')[:3]]
        if len(parts) != 3:
            return None
        jy, jm, jd = parts
        g = jdatetime.date(jy, jm, jd).togregorian()
        return datetime(g.year, g.month, g.day)
    except Exception:
        return None


def _apply_filters(qs, status: Optional[str], start: Optional[datetime], end: Optional[datetime], near_due_days: Optional[int], overdue: Optional[bool]):
    if status:
        statuses = [s.strip() for s in status.split(',') if s.strip()]
        if statuses:
            qs = qs.filter(models.Cheque.status.in_(statuses))
    if start:
        qs = qs.filter(models.Cheque.due_date >= start)
    if end:
        qs = qs.filter(models.Cheque.due_date <= end)
    if near_due_days is not None and near_due_days >= 0:
        from datetime import timezone, timedelta
        now = datetime.now(timezone.utc)
        qs = qs.filter(models.Cheque.due_date != None, models.Cheque.due_date >= now, models.Cheque.due_date <= now + timedelta(days=near_due_days))
    if overdue:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        qs = qs.filter(models.Cheque.due_date != None, models.Cheque.due_date < now, models.Cheque.status != 'approved')
    return qs


def list_cheques(
    session: Session,
    status: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    near_due_days: Optional[int] = None,
    overdue: Optional[bool] = None,
    limit: int = 100,
) -> List[models.Cheque]:
    qs = session.query(models.Cheque).options(joinedload(models.Cheque.payment)).order_by(models.Cheque.id.desc())
    qs = _apply_filters(qs, status, start, end, near_due_days, overdue)
    return qs.limit(limit).all()


def get_cheque(session: Session, cheque_id: int) -> Optional[models.Cheque]:
    return (
        session.query(models.Cheque)
        .options(joinedload(models.Cheque.payment))
        .filter(models.Cheque.id == cheque_id)
        .first()
    )


def create_cheque(session: Session, payload: schemas.ChequeCreate) -> models.Cheque:
    # Ensure payment exists
    pay = session.query(models.Payment).filter(models.Payment.id == payload.payment_id).first()
    if not pay:
        raise ValueError('payment not found')

    # Parse Jalali dates if provided
    issue_dt = payload.issue_date or _parse_jalali_to_gregorian(payload.issue_date_jalali)
    due_dt = payload.due_date or _parse_jalali_to_gregorian(payload.due_date_jalali)

    ch = models.Cheque(
        payment_id=payload.payment_id,
        cheque_number=payload.cheque_number,
        bank_name=payload.bank_name,
        branch_name=payload.branch_name,
        status=payload.status or 'pending',
        issue_date=issue_dt,
        due_date=due_dt,
        clearing_date=payload.clearing_date,
    )
    session.add(ch)
    session.commit()
    session.refresh(ch)

    # Mirror Payment.due_date if not set
    if due_dt and not pay.due_date:
        pay.due_date = due_dt
        session.add(pay)
        session.commit()

    return ch


def update_cheque(session: Session, cheque_id: int, payload: schemas.ChequeUpdate) -> Optional[models.Cheque]:
    ch = session.query(models.Cheque).filter(models.Cheque.id == cheque_id).first()
    if not ch:
        return None
    data = payload.dict(exclude_unset=True)
    # Handle jalali conversions
    if 'issue_date_jalali' in data:
        data.pop('issue_date_jalali', None)
        val = _parse_jalali_to_gregorian(payload.issue_date_jalali)
        if val:
            data['issue_date'] = val
    if 'due_date_jalali' in data:
        data.pop('due_date_jalali', None)
        val = _parse_jalali_to_gregorian(payload.due_date_jalali)
        if val:
            data['due_date'] = val

    for k, v in data.items():
        if hasattr(ch, k):
            setattr(ch, k, v)
    session.add(ch)

    # Optional: cascade some status to payment
    if 'status' in data and ch.payment_id:
        pay = session.query(models.Payment).filter(models.Payment.id == ch.payment_id).first()
        if pay:
            if data['status'] == 'approved':
                pay.status = 'approved'
            elif data['status'] in ('returned', 'bounced', 'rejected'):
                pay.status = 'rejected'
            session.add(pay)

    session.commit()
    session.refresh(ch)
    return ch


def delete_cheque(session: Session, cheque_id: int) -> bool:
    ch = session.query(models.Cheque).filter(models.Cheque.id == cheque_id).first()
    if not ch:
        return False
    session.delete(ch)
    session.commit()
    return True
*** End Patch