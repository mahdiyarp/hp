from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import crud, models, schemas
from app.api.deps import get_current_user, require_roles
from app.db import get_db

router = APIRouter()


@router.get('/auto-context')
def get_financial_auto_context(session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """Get smart financial context - auto-creates current financial year and provides date suggestions"""
    require_roles(role_names=['Admin', 'Accountant', 'Manager', 'Viewer'])(current)
    try:
        from app.financial_automation import auto_determine_financial_context, get_smart_date_suggestions
        
        context = auto_determine_financial_context(session)
        suggestions = get_smart_date_suggestions(session)
        
        return {
            "context": context,
            "date_suggestions": suggestions,
            "blockchain_ready": True,  # هنگامی که در آینده با blockchain ادغام شود
            "auto_managed": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/smart-year')
def create_smart_financial_year(session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    """Auto-create financial year based on current Jalali calendar"""
    require_roles(role_names=['Admin'])(current)
    try:
        from app.financial_automation import get_or_create_current_financial_year
        
        fy = get_or_create_current_financial_year(session)
        
        return {
            "financial_year": {
                "id": fy.id,
                "name": fy.name,
                "start_date": fy.start_date.isoformat() if fy.start_date else None,
                "end_date": fy.end_date.isoformat() if fy.end_date else None,
                "is_closed": fy.is_closed
            },
            "auto_created": True,
            "blockchain_compatible": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/years', response_model=List[schemas.FinancialYearOut])
def list_financial_years(session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    return crud.get_financial_years(session)


@router.post('/years/{fid}/close', response_model=schemas.FinancialYearOut)
def close_financial_year_endpoint(fid: int, session: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_roles(role_names=['Admin'])(current)
    fy = crud.close_financial_year(session, fid, create_rollover=True, closed_by=current.id)
    if not fy:
        raise HTTPException(status_code=404, detail='Financial year not found')
    return fy
