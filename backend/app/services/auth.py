from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..security import (
    create_access_token,
    create_refresh_token,
    verify_otp as verify_totp,
    verify_password,
    decode_token,
    decrypt_value,
)


def authenticate_user(session: Session, username: str, password: str) -> Optional[models.User]:
    user = crud.get_user_by_username(session, username)
    if not user:
        return None
    if not user.is_active:
        raise HTTPException(status_code=403, detail="کاربر غیر فعال است")
    if not verify_password(password, user.hashed_password):
        return None
    return user


def verify_user_otp(user: models.User, otp_code: str) -> bool:
    if not user.otp_secret:
        return False
    secret = decrypt_value(user.otp_secret)
    return verify_totp(secret, otp_code)


def issue_token_response(session: Session, user: models.User) -> schemas.Token:
    access_token = create_access_token(user.username)
    refresh_token = create_refresh_token(user.username)
    crud.set_refresh_token(session, user, refresh_token)
    return schemas.Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        otp_required=False,
        user=schemas.UserOut.from_orm(user),
    )


def refresh_token(session: Session, token: str) -> schemas.Token:
    payload = decode_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="توکن نامعتبر است")
    user = crud.get_user_by_username(session, username)
    if not user:
        raise HTTPException(status_code=401, detail="توکن تازه‌سازی معتبر نیست")
    if not crud.verify_refresh_token(session, user, token):
        raise HTTPException(status_code=401, detail="توکن تازه‌سازی معتبر نیست")
    return issue_token_response(session, user)


def revoke_tokens(session: Session, user: models.User) -> None:
    crud.clear_refresh_token(session, user)


def create_user(session: Session, payload: schemas.UserCreate) -> models.User:
    existing = crud.get_user_by_username(session, payload.username)
    if existing:
        raise HTTPException(status_code=400, detail="نام کاربری تکراری است")
    try:
        return crud.create_user_with_role(
            session,
            username=payload.username,
            password=payload.password,
            full_name=payload.full_name,
            email=payload.email,
            mobile=payload.mobile,
            role_id=payload.role_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
