"""
Date conversion utilities for Gregorian (Miladi) <-> Jalali (Shamsi) conversion.

This module provides functions to convert between Gregorian and Jalali (Persian) calendars.
All database operations use Gregorian UTC dates.
All API responses and inputs use Jalali (Shamsi) format: YYYY/MM/DD
"""

import jdatetime
from datetime import datetime, date as date_type
from typing import Union, Optional, Tuple


def to_shamsi(dt: Optional[Union[datetime, date_type]]) -> Optional[str]:
    """
    Convert a Gregorian datetime/date to Jalali (Shamsi) string format.
    
    Args:
        dt: datetime or date object (assumed UTC/Gregorian)
    
    Returns:
        Shamsi date string in format 'YYYY/MM/DD' or None if input is None
    
    Example:
        >>> to_shamsi(datetime(2024, 1, 1))
        '1402/10/11'
    """
    if dt is None:
        return None
    
    if isinstance(dt, datetime):
        dt = dt.date()
    
    try:
        j = jdatetime.date.fromgregorian(date=dt)
        return j.strftime('%Y/%m/%d')
    except Exception as e:
        raise ValueError(f"Failed to convert date {dt} to Shamsi: {e}")


def to_gregorian(jdate: Union[str, dict]) -> datetime:
    """
    Convert a Jalali (Shamsi) date string or dict to Gregorian datetime.
    
    Args:
        jdate: Shamsi date in format 'YYYY/MM/DD', 'YYYY-MM-DD', or dict with 'year', 'month', 'day'
    
    Returns:
        Gregorian datetime object at midnight UTC
    
    Example:
        >>> to_gregorian('1402/10/11')
        datetime(2024, 1, 1, 0, 0, 0)
        >>> to_gregorian('1402-10-11')
        datetime(2024, 1, 1, 0, 0, 0)
        >>> to_gregorian({'year': 1402, 'month': 10, 'day': 11})
        datetime(2024, 1, 1, 0, 0, 0)
    """
    try:
        if isinstance(jdate, dict):
            year = jdate.get('year') or jdate.get('y')
            month = jdate.get('month') or jdate.get('m')
            day = jdate.get('day') or jdate.get('d')
            j = jdatetime.date(year, month, day)
        elif isinstance(jdate, str):
            # Handle both YYYY/MM/DD and YYYY-MM-DD formats
            jdate_normalized = jdate.replace('-', '/')
            parts = jdate_normalized.split('/')
            if len(parts) != 3:
                raise ValueError(f"Invalid Shamsi date format: {jdate}")
            year, month, day = map(int, parts)
            j = jdatetime.date(year, month, day)
        else:
            raise TypeError(f"Expected str or dict, got {type(jdate)}")
        
        # Convert to Gregorian
        g = j.togregorian()
        # Return as datetime at midnight UTC
        return datetime.combine(g, datetime.min.time())
    except Exception as e:
        raise ValueError(f"Failed to convert Shamsi date {jdate} to Gregorian: {e}")


def parse_shamsi_date(date_str: Optional[str]) -> Optional[datetime]:
    """
    Parse a Shamsi date string and return Gregorian datetime.
    Convenience wrapper for to_gregorian that handles None gracefully.
    
    Args:
        date_str: Shamsi date string or None
    
    Returns:
        Gregorian datetime or None
    """
    if not date_str:
        return None
    return to_gregorian(date_str)


def format_shamsi(dt: Optional[Union[datetime, date_type]]) -> Optional[str]:
    """
    Alias for to_shamsi for readability.
    Format a datetime as Shamsi string.
    """
    return to_shamsi(dt)


def get_shamsi_range(
    start_shamsi: str,
    end_shamsi: str
) -> Tuple[datetime, datetime]:
    """
    Convert a range of Shamsi dates to Gregorian datetimes.
    
    Args:
        start_shamsi: Start date in Shamsi format
        end_shamsi: End date in Shamsi format
    
    Returns:
        Tuple of (start_datetime, end_datetime) in Gregorian
    """
    return to_gregorian(start_shamsi), to_gregorian(end_shamsi)


def shamsi_now() -> str:
    """
    Get current datetime in Shamsi format.
    
    Returns:
        Current Shamsi date as 'YYYY/MM/DD'
    """
    return to_shamsi(datetime.utcnow())


def is_valid_shamsi_date(date_str: str) -> bool:
    """
    Check if a string is a valid Shamsi date.
    
    Args:
        date_str: Date string to validate
    
    Returns:
        True if valid, False otherwise
    """
    try:
        to_gregorian(date_str)
        return True
    except (ValueError, TypeError):
        return False


def gregorian_to_shamsi_range_inclusive(
    start_gregorian: datetime,
    end_gregorian: datetime
) -> Tuple[str, str]:
    """
    Convert Gregorian date range to Shamsi range (inclusive).
    Useful for fiscal year boundaries.
    
    Args:
        start_gregorian: Start datetime (Gregorian)
        end_gregorian: End datetime (Gregorian)
    
    Returns:
        Tuple of (start_shamsi, end_shamsi) as strings
    """
    return to_shamsi(start_gregorian), to_shamsi(end_gregorian)
