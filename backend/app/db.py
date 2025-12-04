from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError

from .core import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url

# create engine from DATABASE_URL
try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
except ModuleNotFoundError as e:
    import warnings

    warnings.warn(f"Could not create engine for DATABASE_URL; falling back to sqlite: {e}")
    fallback_path = Path(__file__).resolve().parents[1] / 'hp_fallback.db'
    DATABASE_URL = f"sqlite:///{fallback_path}"
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


_fallback_engine = None
_fallback_SessionLocal = None


def _get_fallback_session():
    """Return a session bound to a shared in-memory SQLite engine.

    Uses StaticPool so the in-memory DB persists across sessions in this process.
    """
    global _fallback_engine, _fallback_SessionLocal
    if _fallback_engine is None:
        from sqlalchemy.pool import StaticPool
        _fallback_engine = create_engine(
            'sqlite://',
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=_fallback_engine)
        _fallback_SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_fallback_engine)
    return _fallback_SessionLocal()


def get_db():
    db = SessionLocal()
    # Proactively ping to ensure connectivity and fail over early
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        try:
            db.close()
        except Exception:
            pass
        s = _get_fallback_session()
        try:
            yield s
        finally:
            s.close()
        return
    try:
        yield db
    finally:
        db.close()


def create_test_engine():
    """Helper for tests: create a fresh in-memory sqlite engine per call to ensure isolation."""
    from sqlalchemy import create_engine
    from sqlalchemy.pool import StaticPool
    return create_engine(
        'sqlite://',
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def create_test_session(engine):
    """Create a session bound to provided engine and create tables for tests."""
    from sqlalchemy.orm import sessionmaker
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()

# Compatibility namespace for legacy imports expecting `DB.SessionLocal()`
class _DBCompat:
    SessionLocal = SessionLocal


DB = _DBCompat()
