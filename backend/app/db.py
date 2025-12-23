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

# On Windows/dev, prefer local sqlite when pointing to docker host 'db'.
if os.name == 'nt' and ('@db' in DATABASE_URL or '://db' in DATABASE_URL):
    fallback_path = os.path.abspath(os.path.join(base_dir, '..', 'hp_local.db'))
    DATABASE_URL = f"sqlite:///{fallback_path}"

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


_TEST_ENGINE = None


def create_test_engine():
    """Return a shared in-memory sqlite engine for tests using StaticPool."""
    global _TEST_ENGINE
    if _TEST_ENGINE is None:
        from sqlalchemy import create_engine
        from sqlalchemy.pool import StaticPool
        _TEST_ENGINE = create_engine(
            'sqlite://',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
    return _TEST_ENGINE


def create_test_session(engine, *, reset_schema: bool = True):
    """Create a clean test session bound to the provided engine."""
    from sqlalchemy.orm import sessionmaker

    if reset_schema:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()

# --- Minimal runtime schema compatibility fixes ---
def ensure_schema_compat():
    """Apply lightweight SQL fixes to keep schema compatible with tests.
    Safe to call on startup; uses IF NOT EXISTS guards.
    """
    try:
        from sqlalchemy import text
        backend = engine.url.get_backend_name()
        with engine.begin() as conn:
            if backend == 'sqlite':
                # Add columns on sqlite if missing via PRAGMA table_info
                def _has_col(table: str, col: str) -> bool:
                    rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
                    names = [r[1] for r in rows]
                    return col in names
                try:
                    if _has_col('financial_years', 'title') is False:
                        conn.exec_driver_sql("ALTER TABLE financial_years ADD COLUMN title VARCHAR(128)")
                except Exception:
                    pass
                try:
                    if _has_col('financial_years', 'status') is False:
                        conn.exec_driver_sql("ALTER TABLE financial_years ADD COLUMN status VARCHAR(32)")
                except Exception:
                    pass
                try:
                    if _has_col('financial_years', 'is_current') is False:
                        conn.exec_driver_sql("ALTER TABLE financial_years ADD COLUMN is_current BOOLEAN DEFAULT 0")
                except Exception:
                    pass
            else:
                # Postgres-compatible guards
                conn.execute(text(
                    """
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='financial_years' AND column_name='title'
                        ) THEN
                            ALTER TABLE financial_years ADD COLUMN title VARCHAR(128);
                        END IF;
                    END$$;
                    """
                ))
                conn.execute(text(
                    """
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='financial_years' AND column_name='status'
                        ) THEN
                            ALTER TABLE financial_years ADD COLUMN status VARCHAR(32);
                        END IF;
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='financial_years' AND column_name='is_current'
                        ) THEN
                            ALTER TABLE financial_years ADD COLUMN is_current BOOLEAN DEFAULT FALSE;
                        END IF;
                    END$$;
                    """
                ))
    except Exception:
        # Best-effort; ignore on sqlite or if permissions fail
        pass
