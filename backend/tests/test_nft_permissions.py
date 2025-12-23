import os

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite://")

from app import db, models  # noqa: E402
from app.api import deps  # noqa: E402

ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def _create_user(session, *, with_nft: bool) -> models.User:
    role = models.Role(name="Viewer", description="مشاهده گر")
    session.add(role)
    session.commit()
    session.refresh(role)

    user = models.User(
        username="viewer",
        email="viewer@example.com",
        full_name="Viewer",
        mobile="09120000000",
        hashed_password="hash",
        role=role.name,
        role_id=role.id,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    if with_nft:
        nft = models.NftAsset(
            token_id="HP-NFT-LOCAL-DEV",
            chain="hesabpak",
            contract_address="ORG-ROOT",
            owner_user_id=user.id,
            metadata_json={"features": ["invoices", "payments"]},
            is_active=True,
        )
        session.add(nft)
        session.commit()
        session.refresh(user)

    return user


@pytest.fixture()
def session():
    db.Base.metadata.drop_all(bind=ENGINE)
    db.Base.metadata.create_all(bind=ENGINE)
    sess = TestingSessionLocal()
    try:
        yield sess
    finally:
        sess.close()


def test_require_permissions_denies_user_without_nft(session):
    user = _create_user(session, with_nft=False)
    dependency = deps.require_permissions(["finance_view"])
    with pytest.raises(HTTPException) as exc:
        dependency(current_user=user, session=session)  # type: ignore[arg-type]
    assert exc.value.status_code == 403
    assert "finance_view" in exc.value.detail


def test_require_permissions_allows_nft_owner(session):
    user = _create_user(session, with_nft=True)
    dependency = deps.require_permissions(["finance_view"])
    # Should not raise because NFT grants dev override
    dependency(current_user=user, session=session)  # type: ignore[arg-type]
