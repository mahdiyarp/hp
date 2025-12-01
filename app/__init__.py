import importlib
import sys
import pathlib

# Ensure backend paths are present so dynamic imports succeed even if
# the repository root lacks package markers for `backend`.
_repo_root = pathlib.Path(__file__).resolve().parent.parent
_backend_root = _repo_root / 'backend'
_backend_app_root = _backend_root / 'app'
for _p in (str(_backend_root), str(_backend_app_root)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

def _import(*candidates):
    last_err = None
    for name in candidates:
        try:
            return importlib.import_module(name)
        except ModuleNotFoundError as e:
            last_err = e
            continue
    raise last_err  # Propagate if all candidates fail

# Load modules with fallbacks: prefer monorepo layout, fallback to flattened.
db = _import('backend.app.db', 'app.db')
models = _import('backend.app.models', 'app.models')
crud = _import('backend.app.crud', 'app.crud')
schemas = _import('backend.app.schemas', 'app.schemas')
core = _import('backend.app.core', 'app.core')
accounting = _import('backend.app.accounting', 'app.accounting')
settings = _import('backend.app.settings', 'app.settings')
services = _import('backend.app.services', 'app.services')
sms_router = _import('backend.app.sms_router', 'app.sms_router')
api = _import('backend.app.api', 'app.api')
models_smart = _import('backend.app.models_smart', 'app.models_smart')
main = _import('backend.app.main', 'app.main')
rate_limit = _import('backend.app.rate_limit', 'app.rate_limit')
search = _import('backend.app.search', 'app.search')

# Register explicit module aliases so `import app.db` works.
sys.modules.setdefault('app.db', db)
sys.modules.setdefault('app.models', models)
sys.modules.setdefault('app.crud', crud)
sys.modules.setdefault('app.schemas', schemas)
sys.modules.setdefault('app.core', core)
sys.modules.setdefault('app.accounting', accounting)
sys.modules.setdefault('app.settings', settings)
sys.modules.setdefault('app.services', services)
sys.modules.setdefault('app.sms_router', sms_router)
sys.modules.setdefault('app.api', api)
sys.modules.setdefault('app.models_smart', models_smart)
sys.modules.setdefault('app.main', main)
sys.modules.setdefault('app.rate_limit', rate_limit)
sys.modules.setdefault('app.search', search)

__all__ = [
    'db', 'models', 'crud', 'schemas', 'main', 'rate_limit', 'search',
    'accounting', 'core', 'settings', 'sms_router', 'api', 'services',
    'models_smart'
]
