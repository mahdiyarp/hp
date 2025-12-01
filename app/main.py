# Wrapper module so `import app.main` resolves to `backend.app.main`
from importlib import import_module
_backend_main = import_module('backend.app.main')
# re-export the FastAPI `app` instance
app = getattr(_backend_main, 'app')
get_current_user = getattr(_backend_main, 'get_current_user')
__all__ = ['app', 'get_current_user']
