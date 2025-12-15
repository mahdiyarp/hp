import pytest

# Ensure DB is clean for financial year tests across sessions
try:
    from app import db as DB  # type: ignore
    from sqlalchemy import text
except Exception:
    DB = None

@pytest.fixture(scope='session', autouse=True)
def _clean_financial_years_once():
    if DB is None:
        return
    try:
        with DB.engine.connect() as conn:
            # Best-effort cleanup to avoid unique violations on name
            conn.execute(text("DELETE FROM financial_years"))
            conn.commit()
    except Exception:
        # Ignore if DB or table not available in certain test modes
        pass
