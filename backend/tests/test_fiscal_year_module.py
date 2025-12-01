import pytest
from datetime import date, timedelta

from app import db, models
from app.accounting import fiscal_service, journal_service


def make_session():
    engine = db.create_test_engine()
    Session = db.create_test_session(engine)
    return Session


def test_only_one_current_year():
    session = make_session()
    fiscal_service.create_fiscal_year(session, title='1402', start_date=date(2023, 3, 21), end_date=date(2024, 3, 19), is_current=True)
    fy2 = fiscal_service.create_fiscal_year(session, title='1403', start_date=date(2024, 3, 20), end_date=date(2025, 3, 19), is_current=True)

    current_count = session.query(models.FinancialYear).filter(models.FinancialYear.is_current.is_(True)).count()
    assert current_count == 1
    assert fiscal_service.get_current_year(session).id == fy2.id


def test_cannot_post_in_locked_year():
    session = make_session()
    fy = fiscal_service.create_fiscal_year(
        session,
        title='FY-Lock',
        start_date=date.today() - timedelta(days=10),
        end_date=date.today() + timedelta(days=10),
        is_current=True,
    )
    fy, _ = fiscal_service.close_year(session, fy.id)
    fiscal_service.lock_year(session, fy.id)

    with pytest.raises(fiscal_service.FiscalYearError):
        journal_service.register_journal_entry(
            session,
            debit_account='Cash',
            credit_account='Sales',
            amount=1000,
            ref_type='test',
            ref_id='1',
        )


def test_create_year_overlapping_range_fails():
    session = make_session()
    fiscal_service.create_fiscal_year(
        session,
        title='FY-Overlap-1',
        start_date=date(2024, 1, 1),
        end_date=date(2024, 12, 31),
    )
    with pytest.raises(fiscal_service.FiscalYearError):
        fiscal_service.create_fiscal_year(
            session,
            title='FY-Overlap-2',
            start_date=date(2024, 6, 1),
            end_date=date(2025, 5, 31),
        )


def test_close_and_lock_transitions():
    session = make_session()
    fy = fiscal_service.create_fiscal_year(
        session,
        title='FY-Transition',
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=30),
        is_current=True,
    )

    fy_closed, _ = fiscal_service.close_year(session, fy.id)
    assert fy_closed.status == 'closed'

    fy_locked = fiscal_service.lock_year(session, fy_closed.id)
    assert fy_locked.status == 'locked'

    with pytest.raises(fiscal_service.FiscalYearError):
        fiscal_service.close_year(session, fy_locked.id)

    with pytest.raises(fiscal_service.FiscalYearError):
        fiscal_service.set_current_year(session, fy_locked.id)
