# Thin compatibility shim so `import app` resolves to `backend.app` when running tests from repo root.
# This avoids changing sys.path or test commands.

import importlib
_backend_app = importlib.import_module('backend.app')

# re-export frequently used submodules
from backend.app import db as db
from backend.app import models as models
from backend.app import crud as crud
from backend.app import schemas as schemas
from backend.app import main as main
from backend.app import rate_limit as rate_limit
from backend.app import search as search

__all__ = ['db', 'models', 'crud', 'schemas', 'main', 'rate_limit', 'search']
