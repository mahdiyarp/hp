from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from . import fiscal_service
from app import crud


class JournalError(fiscal_service.FiscalYearError):
    """Wrap fiscal errors for journal posting."""


def register_journal_entry(
    session: Session,
    debit_account: str,
    credit_account: str,
    amount: int,
    ref_type: Optional[str] = None,
    ref_id: Optional[str] = None,
    description: Optional[str] = None,
    entry_date: Optional[datetime] = None,
    party_id: Optional[str] = None,
    party_name: Optional[str] = None,
    tracking_code: Optional[str] = None,
):
    """
    Register a journal entry while enforcing fiscal year constraints.
    """
    when = entry_date or datetime.now(timezone.utc)
    fy = fiscal_service.ensure_fiscal_year_allows_posting(session, when)
    if not fy.can_post():
        raise JournalError("ثبت سند در این سال مالی مجاز نیست.", code="fiscal_year_closed")

    return crud.create_ledger_entry(
        session=session,
        ref_type=ref_type,
        ref_id=ref_id,
        debit_account=debit_account,
        credit_account=credit_account,
        amount=amount,
        party_id=party_id,
        party_name=party_name,
        description=description,
        tracking_code=tracking_code,
        entry_date=when,
    )
