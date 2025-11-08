import os
import tempfile
import json
from datetime import datetime, timezone

import pytest
import sys
import os

# Ensure backend package importable when running tests from repo root
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

try:
    from app import db as app_db
    from app import crud, models
except Exception:
    pytest.skip('backend deps not installed (skipping DB tests)', allow_module_level=True)


@pytest.fixture(scope='module')
def engine_and_session():
    # Use SQLite in-memory DB for quick unit tests
    engine = app_db.create_test_engine() if hasattr(app_db, 'create_test_engine') else None
    if engine is None:
        pytest.skip('no test engine helper available')
    session = app_db.create_test_session(engine)
    try:
        yield session
    finally:
        session.close()


def test_create_backup_snapshot(engine_and_session):
    s = engine_and_session
    # create a few rows
    p = models.Person(id='p1', name='Alice', name_norm='alice')
    s.add(p)
    s.commit()
    bk = crud.create_backup(s, created_by=None, kind='manual', note='unit-test')
    assert bk is not None
    assert os.path.exists(bk.file_path)
    with open(bk.file_path, 'r', encoding='utf-8') as fh:
        payload = json.load(fh)
    assert 'meta' in payload


def test_financial_year_close_creates_rollover(engine_and_session):
    s = engine_and_session
    # create simple ledger entries
    le1 = models.LedgerEntry(debit_account='Cash', credit_account='Sales', amount=1000)
    le2 = models.LedgerEntry(debit_account='Expenses', credit_account='Cash', amount=200)
    s.add_all([le1, le2])
    s.commit()
    fy = crud.create_financial_year(s, name='UTest', start_date=datetime.utcnow().isoformat())
    closed = crud.close_financial_year(s, fy.id, closed_by=None)
    assert closed is not None
    assert closed.is_closed is True
    assert closed.opening_balances is not None
