from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ... import db, models, schemas
from ...services import auth as auth_service
from ..deps import get_current_user, require_roles

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    otp: Optional[str] = Form(None),
    session: Session = Depends(db.get_db),
):
    user = auth_service.authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور نادرست است")

    if user.otp_enabled:
        if not otp:
            raise HTTPException(status_code=428, detail="کد تایید دو مرحله‌ای نیاز است")
        if not auth_service.verify_user_otp(user, otp):
            raise HTTPException(status_code=401, detail="کد تایید نامعتبر است")

    return auth_service.issue_token_response(session, user)


@router.post("/refresh", response_model=schemas.Token)
def refresh_token(payload: schemas.TokenRefreshRequest, session: Session = Depends(db.get_db)):
    return auth_service.refresh_token(session, payload.refresh_token)


@router.post("/logout")
def logout(
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user),
):
    auth_service.revoke_tokens(session, current_user)
    return {"ok": True}


@router.post("/users", response_model=schemas.UserOut)
def create_user(
    payload: schemas.UserCreate,
    session: Session = Depends(db.get_db),
    _: models.User = Depends(require_roles(role_names=["Admin"])),
):
    return auth_service.create_user(session, payload)
