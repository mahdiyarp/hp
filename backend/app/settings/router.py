from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import db
from app import schemas
from app.settings import service

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=schemas.AppSettingsOut)
def get_app_settings(session: Session = Depends(db.get_db)):
    data = service.get_settings(session)
    return schemas.AppSettingsOut(**data)


@router.put("", response_model=schemas.AppSettingsOut)
def put_app_settings(payload: schemas.AppSettingsIn, session: Session = Depends(db.get_db)):
    data = payload.dict(exclude_unset=True)
    if data.get("default_fiscal_year_id"):
        data["default_fiscal_year_id"] = service.ensure_fiscal_year_id(session, data["default_fiscal_year_id"])
    saved = service.save_settings(session, data)
    return schemas.AppSettingsOut(**saved)


@router.patch("/{field}", response_model=schemas.AppSettingsOut)
def patch_app_setting(field: str, payload: schemas.AppSettingField, session: Session = Depends(db.get_db)):
    if payload.value is None:
        raise HTTPException(status_code=400, detail="Value required")
    saved = service.patch_setting(session, field, payload.value)
    return schemas.AppSettingsOut(**saved)
