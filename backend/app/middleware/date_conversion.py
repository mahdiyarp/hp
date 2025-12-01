"""
Middleware to convert API response dates from Gregorian to Jalali format.
Also handles request date conversion from Jalali to Gregorian.
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from datetime import datetime
import json
from typing import Any, Callable
from app.utils.date import to_shamsi


async def date_conversion_middleware(request: Request, call_next: Callable) -> Response:
    """
    Middleware that:
    1. Checks for X-Date-Format header (for backward compatibility)
    2. Converts all date fields in response to Jalali if needed
    """
    # Check for backward compatibility header
    date_format = request.headers.get('X-Date-Format', 'jalali').lower()
    request.state.date_format = date_format
    
    response = await call_next(request)
    
    # If client explicitly requests Gregorian, return as-is
    if date_format == 'gregorian':
        return response
    
    # For Jalali format, try to convert response body
    try:
        if response.status_code < 300 and hasattr(response, 'body'):
            # Read the response body
            body = b''
            async for chunk in response.body_iterator:
                body += chunk
            
            if body:
                try:
                    data = json.loads(body)
                    # Add Shamsi dates to all datetime fields
                    data_with_shamsi = _add_shamsi_to_data(data)
                    # Return modified response
                    return JSONResponse(
                        content=data_with_shamsi,
                        status_code=response.status_code,
                        headers=dict(response.headers)
                    )
                except (json.JSONDecodeError, TypeError):
                    # Not JSON, return as-is
                    pass
    except Exception:
        # If anything goes wrong, return original response
        pass
    
    return response


def _add_shamsi_to_data(obj: Any) -> Any:
    """
    Recursively add Shamsi (_shamsi suffix) fields to datetime objects in a data structure.
    """
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            result[key] = _add_shamsi_to_data(value)
            
            # If this is a datetime string, add shamsi version
            if isinstance(value, str):
                try:
                    # Try to parse as ISO datetime
                    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    shamsi_key = f"{key}_shamsi"
                    if shamsi_key not in result:
                        result[shamsi_key] = to_shamsi(dt)
                except (ValueError, AttributeError):
                    pass
        return result
    elif isinstance(obj, list):
        return [_add_shamsi_to_data(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj
