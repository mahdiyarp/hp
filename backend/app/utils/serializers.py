"""
Response serializers that add Shamsi (Jalali) dates to output schemas.
"""

from datetime import datetime, date
from typing import Any, Dict, Optional
from app.utils.date import to_shamsi


def add_shamsi_fields(obj: Any, shamsi_fields: Dict[str, str]) -> Dict[str, Any]:
    """
    Add Shamsi date fields to a Pydantic model instance or dict.
    
    Args:
        obj: Pydantic model instance or dictionary
        shamsi_fields: Mapping of {source_field: target_shamsi_field}
                      e.g. {'created_at': 'created_at_shamsi'}
    
    Returns:
        Dictionary with added Shamsi fields
    """
    if hasattr(obj, 'dict'):
        data = obj.dict()
    elif isinstance(obj, dict):
        data = obj.copy()
    else:
        return obj
    
    for source_field, target_field in shamsi_fields.items():
        if source_field in data:
            value = data[source_field]
            if isinstance(value, (datetime, date)):
                data[target_field] = to_shamsi(value)
            elif value is None:
                data[target_field] = None
    
    return data


def serialize_with_shamsi(obj: Any, shamsi_map: Dict[str, str]) -> Dict[str, Any]:
    """
    Serialize a Pydantic model to dict with Shamsi dates.
    Convenience wrapper around add_shamsi_fields.
    """
    return add_shamsi_fields(obj, shamsi_map)
