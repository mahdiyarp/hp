import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set in .env")

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
