from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import models
from app.crud import cleanup_demo_environment


def test_demo_cleanup_is_disabled_by_default(monkeypatch):
    monkeypatch.delenv("DEMO_MODE", raising=False)
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    with Session() as session:
        assert cleanup_demo_environment(session) is False


def test_demo_cleanup_keeps_auth_tables(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    with Session() as session:
        role = models.Role(name="DemoRole")
        user = models.User(
            username="demo",
            email="demo@example.com",
            hashed_password="x",
            role="Admin",
            is_demo=True,
            is_active=True,
        )
        session.add_all([role, user])
        session.commit()

        assert cleanup_demo_environment(session) is True
        assert session.query(models.User).filter_by(username="demo").one()
        assert session.query(models.Role).filter_by(name="DemoRole").one()
