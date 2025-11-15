from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from . import models, crud
import jdatetime


def _to_jalali_str(dt: Optional[datetime]) -> Optional[str]:
    """Convert Gregorian datetime/date to Jalali YYYY/MM/DD string."""
    if not dt:
        return None
    try:
        if isinstance(dt, datetime):
            jdt = jdatetime.datetime.fromgregorian(datetime=dt)
        else:
            jdt = jdatetime.date.fromgregorian(date=dt)
        return jdt.strftime("%Y/%m/%d")
    except Exception:
        return None


def get_current_jalali_year() -> int:
    """Get current Jalali/Persian year"""
    now = jdatetime.datetime.now()
    return now.year


def get_or_create_current_financial_year(db: Session) -> models.FinancialYear:
    """
    Auto-create financial year based on current Jalali calendar.
    Persian financial year typically runs from 1 Farvardin to 30 Esfand.
    """
    current_jalali_year = get_current_jalali_year()
    
    # Check if current year already exists
    existing = db.query(models.FinancialYear).filter(
        models.FinancialYear.name == f"سال مالی {current_jalali_year}"
    ).first()
    
    if existing:
        return existing
    
    # Create new financial year
    start_jalali = jdatetime.date(current_jalali_year, 1, 1)  # 1 Farvardin
    end_jalali = jdatetime.date(current_jalali_year, 12, 29)  # 29 Esfand (accounting for leap years)
    
    # Convert to Gregorian ISO dates
    start_gregorian = start_jalali.togregorian()
    end_gregorian = end_jalali.togregorian()
    
    fy = crud.create_financial_year(
        session=db,
        name=f"سال مالی {current_jalali_year}",
        start_date=start_gregorian.isoformat(),
        end_date=end_gregorian.isoformat()
    )
    
    return fy


def auto_determine_financial_context(db: Session) -> dict:
    """
    Automatically determine financial context based on blockchain/distributed principles:
    - Current financial year
    - Auto-create if needed
    - Return context for UI
    """
    # Check if current year already exists
    current_jalali_year = get_current_jalali_year()
    existing = db.query(models.FinancialYear).filter(
        models.FinancialYear.name == f"سال مالی {current_jalali_year}"
    ).first()
    
    current_fy = get_or_create_current_financial_year(db)
    
    # Get current Jalali date info
    now_jalali = jdatetime.datetime.now()
    
    context = {
        "current_financial_year": {
            "id": current_fy.id,
            "name": current_fy.name,
            "start_date": current_fy.start_date.isoformat() if current_fy.start_date else None,
            "end_date": current_fy.end_date.isoformat() if current_fy.end_date else None,
            "start_date_jalali": _to_jalali_str(current_fy.start_date),
            "end_date_jalali": _to_jalali_str(current_fy.end_date),
            "is_closed": current_fy.is_closed
        },
        "current_jalali": {
            "year": now_jalali.year,
            "month": now_jalali.month,
            "day": now_jalali.day,
            "formatted": now_jalali.strftime("%Y/%m/%d")
        },
        "auto_created": existing is None  # Will be True if we just created it
    }
    
    return context


def get_smart_date_suggestions(db: Session) -> dict:
    """
    Provide smart date suggestions based on:
    - Current date
    - Financial year boundaries  
    - Common business dates (month-end, quarter-end, etc.)
    """
    now = jdatetime.datetime.now()
    current_fy = get_or_create_current_financial_year(db)
    
    suggestions = {
        "today": now.strftime("%Y/%m/%d"),
        "month_start": jdatetime.date(now.year, now.month, 1).strftime("%Y/%m/%d"),
        "quarter_start": None,  # Will calculate below
        "year_start": _to_jalali_str(current_fy.start_date),
        "year_start_iso": current_fy.start_date.isoformat() if current_fy.start_date else None,
        "year_end": _to_jalali_str(current_fy.end_date),
        "year_end_iso": current_fy.end_date.isoformat() if current_fy.end_date else None
    }
    
    # Calculate quarter start
    quarter_month = ((now.month - 1) // 3) * 3 + 1
    quarter_start = jdatetime.date(now.year, quarter_month, 1)
    suggestions["quarter_start"] = quarter_start.strftime("%Y/%m/%d")
    
    return suggestions
