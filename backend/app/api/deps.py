from typing import List, Optional

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .. import db, models
from ..security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(db.get_db),
) -> models.User:
    try:
        payload = decode_token(token)
        username = payload.get("sub")
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if not username:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    user = session.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(
    role_ids: Optional[List[int]] = None,
    role_names: Optional[List[str]] = None,
):
    def _dependency(current_user: models.User = Depends(get_current_user)) -> models.User:
        if not current_user.role_id and role_ids:
            raise HTTPException(status_code=403, detail="کاربر نقشی ندارد")

        if role_ids and current_user.role_id not in role_ids:
            raise HTTPException(status_code=403, detail="شما دسترسی ندارید")

        if role_names:
            role_name = None
            if current_user.role_obj:
                role_name = current_user.role_obj.name
            else:
                role_name = current_user.role
            if role_name not in role_names:
                raise HTTPException(status_code=403, detail="شما دسترسی ندارید")
        return current_user

    return _dependency


def require_permissions(permission_names: List[str]):
    def _dependency(current_user: models.User = Depends(get_current_user)) -> models.User:
        if not current_user.role_obj:
            raise HTTPException(status_code=403, detail="کاربر نقشی ندارد")

        user_perm_names = {perm.name for perm in (current_user.role_obj.permissions or [])}
        if not user_perm_names.intersection(set(permission_names)):
            raise HTTPException(
                status_code=403,
                detail=f"شما دسترسی ندارید. نیاز به یکی از این دسترسی‌ها: {', '.join(permission_names)}",
            )
        return current_user

    return _dependency
