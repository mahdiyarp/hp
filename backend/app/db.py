from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_test_engine():
    """Helper for tests: create an in-memory sqlite engine and return it."""
    from sqlalchemy import create_engine
    # Use StaticPool to ensure a single in-memory database across connections
    # and check_same_thread=False for TestClient worker threads.
    from sqlalchemy.pool import StaticPool
    e = create_engine(
        'sqlite://',
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    return e


def create_test_session(engine):
    """Create a session bound to provided engine and create tables for tests."""
    from sqlalchemy.orm import sessionmaker
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()
