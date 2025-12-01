from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app import db
from app.auth import get_current_user
from fastapi import Depends as _Depends

router = APIRouter(prefix="/api/external/ai", tags=["external-ai"], dependencies=[_Depends(get_current_user)])


def _require_auth_header(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return authorization

@router.post("/product-match")
def product_match(payload: dict, session: Session = Depends(db.get_db), _hdr: str = Depends(_require_auth_header)):
    if not isinstance(payload, dict) or not payload:
        raise HTTPException(status_code=400, detail="Invalid payload")
    return {"matches": []}

@router.post("/invoice-analysis")
def invoice_analysis(payload: dict, session: Session = Depends(db.get_db), _hdr: str = Depends(_require_auth_header)):
    if not isinstance(payload, dict) or not payload:
        raise HTTPException(status_code=400, detail="Invalid payload")
    return {"result": {"lines": []}}
