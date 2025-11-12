"""backend.app package marker

This file makes the `backend/app` directory a Python package so tests and imports
like `from app import db` work when running tests from the repository root.
"""

__all__ = [
    'db',
    'models',
    'crud',
    'schemas',
]
"""backend.app package initializer

This file makes the `backend/app` folder a Python package so tests and imports
like `from app import db` work when running tests from the repository root.
"""

from . import db as db
from . import models as models
from . import crud as crud
from . import schemas as schemas

__all__ = ["db", "models", "crud", "schemas"]
