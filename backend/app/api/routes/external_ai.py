from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import db, models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/external/ai", tags=["External AI"])


@router.post("/product-match")
def product_match(payload: dict, current: models.User = Depends(get_current_user), session: Session = Depends(db.get_db)):
    if not current:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"matches": []}


@router.post("/invoice-analysis", response_model=schemas.DocumentAnalysisResult)
def invoice_analysis(payload: dict, current: models.User = Depends(get_current_user), session: Session = Depends(db.get_db)):
    if not current:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return schemas.DocumentAnalysisResult(summary="", items=[], confidence=0.0)