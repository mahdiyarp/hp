from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import schemas, models, db
from app.api import deps

router = APIRouter()

@router.post("/", response_model=schemas.FinancialYearOut)
def create_financial_year(
    *,
    db: Session = Depends(db.get_db),
    financial_year_in: schemas.FinancialYearCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """
    Create new financial year.
    """
    db_obj = models.FinancialYear(**financial_year_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/", response_model=List[schemas.FinancialYearOut])
def read_financial_years(
    db: Session = Depends(db.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """
    Retrieve financial years.
    """
    return db.query(models.FinancialYear).offset(skip).limit(limit).all()


@router.get("/{id}", response_model=schemas.FinancialYearOut)
def read_financial_year(
    *,
    db: Session = Depends(db.get_db),
    id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """
    Get financial year by ID.
    """
    financial_year = db.query(models.FinancialYear).filter(models.FinancialYear.id == id).first()
    if not financial_year:
        raise HTTPException(status_code=404, detail="Financial year not found")
    return financial_year


@router.put("/{id}", response_model=schemas.FinancialYearOut)
def update_financial_year(
    *,
    db: Session = Depends(db.get_db),
    id: int,
    financial_year_in: schemas.FinancialYearUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """
    Update a financial year.
    """
    financial_year = db.query(models.FinancialYear).filter(models.FinancialYear.id == id).first()
    if not financial_year:
        raise HTTPException(status_code=404, detail="Financial year not found")
    
    update_data = financial_year_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(financial_year, field, value)
        
    db.add(financial_year)
    db.commit()
    db.refresh(financial_year)
    return financial_year


@router.delete("/{id}", response_model=schemas.FinancialYearOut)
def delete_financial_year(
    *,
    db: Session = Depends(db.get_db),
    id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """
    Delete a financial year.
    """
    financial_year = db.query(models.FinancialYear).filter(models.FinancialYear.id == id).first()
    if not financial_year:
        raise HTTPException(status_code=404, detail="Financial year not found")
    
    db.delete(financial_year)
    db.commit()
    return financial_year
