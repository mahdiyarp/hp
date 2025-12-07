
import pytest
from sqlalchemy.orm import Session
from app import crud, models
from datetime import datetime

def test_get_fiscal_year_with_dict(db: Session):
    # Create a dummy fiscal year for testing
    start_date = datetime(2023, 1, 1)
    end_date = datetime(2023, 12, 31)
    fiscal_year = models.FinancialYear(
        name="Test Fiscal Year",
        start_date=start_date,
        end_date=end_date,
        is_current=True
    )
    db.add(fiscal_year)
    db.commit()

    date_dict = {'year': 1402, 'month': 5, 'day': 10}  # Corresponds to 2023-08-01
    retrieved_fiscal_year = crud.get_fiscal_year(db, date=date_dict)
    
    assert retrieved_fiscal_year is not None
    assert retrieved_fiscal_year.name == "Test Fiscal Year"

    db.delete(fiscal_year)
    db.commit()
