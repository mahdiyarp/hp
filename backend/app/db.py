import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Try to load .env placed in the backend directory (package-relative) first so
# imports succeed when tests run from the repo root. Fall back to default load.
base_dir = os.path.abspath(os.path.dirname(__file__))
env_path = os.path.abspath(os.path.join(base_dir, '..', '.env'))
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    # fall back to default behaviour (load from CWD or environment)
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set in .env or environment")

# create engine from DATABASE_URL
try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
except ModuleNotFoundError as e:
    # In some dev containers an external DATABASE_URL (Postgres) may be present
    # but the driver (psycopg2) is not installed in this environment. Fall back
    # to a local sqlite file to allow tests and import-time operations to work.
    import warnings

    warnings.warn(f"Could not create engine for DATABASE_URL; falling back to sqlite: {e}")
    fallback_path = os.path.abspath(os.path.join(base_dir, '..', 'hp_fallback.db'))
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
    e = create_engine('sqlite:///:memory:', connect_args={})
    return e


def create_test_session(engine):
    """Create a session bound to provided engine and create tables for tests."""
    from sqlalchemy.orm import sessionmaker
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()
