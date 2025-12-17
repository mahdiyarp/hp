# Compatibility shim so `import app` works both in monorepo layout (`backend/app`)
# and when the code is copied/flattened to `/app`.
import importlib
import sys

# Prefer importing modules from backend.app when available
try:
    importlib.import_module('backend.app.schemas')
    base_prefix = 'backend.app'
except ModuleNotFoundError:
    base_prefix = 'app'

db = importlib.import_module(f'{base_prefix}.db')
models = importlib.import_module(f'{base_prefix}.models')
crud = importlib.import_module(f'{base_prefix}.crud')
import importlib.util
import os
# First import existing app.schemas if present
try:
    schemas = importlib.import_module(f'{base_prefix}.schemas')
except ModuleNotFoundError:
    schemas = None

# Then load backend/app/schemas.py and prefer its symbols
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'app', 'schemas.py')
backend_path = os.path.abspath(backend_path)
if os.path.exists(backend_path):
    spec = importlib.util.spec_from_file_location('backend_app_schemas', backend_path)
    backend_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend_module)  # type: ignore
    # If we had an existing schemas module, update its dict; else, alias to backend
    if schemas is not None:
        for k in dir(backend_module):
            if not k.startswith('_'):
                setattr(schemas, k, getattr(backend_module, k))
        sys.modules['app.schemas'] = schemas
    else:
        sys.modules['app.schemas'] = backend_module
        schemas = backend_module
else:
    # No backend file; ensure sys.modules has whatever we could import
    if schemas is None:
        # Create an empty module placeholder
        import types
        schemas = types.ModuleType('app.schemas')
        sys.modules['app.schemas'] = schemas
    else:
        sys.modules['app.schemas'] = schemas
core = importlib.import_module(f'{base_prefix}.core')
sys.modules['app.core'] = core
accounting = importlib.import_module(f'{base_prefix}.accounting')
sys.modules['app.accounting'] = accounting
sys.modules['app.db'] = db
settings = importlib.import_module(f'{base_prefix}.settings')
sys.modules['app.settings'] = settings
services = importlib.import_module(f'{base_prefix}.services')
sys.modules['app.services'] = services
sms_router = importlib.import_module(f'{base_prefix}.sms_router')
sys.modules['app.sms_router'] = sms_router
api = importlib.import_module(f'{base_prefix}.api')
sys.modules['app.api'] = api
models_smart = importlib.import_module(f'{base_prefix}.models_smart')
sys.modules['app.models_smart'] = models_smart
auth = importlib.import_module(f'{base_prefix}.auth')
sys.modules['app.auth'] = auth
# Expose security module
try:
    security = importlib.import_module(f'{base_prefix}.security')
    sys.modules['app.security'] = security
except ModuleNotFoundError:
    pass
# Expose utils subpackage (date helpers)
try:
    utils = importlib.import_module(f'{base_prefix}.utils')
    sys.modules['app.utils'] = utils
    # also ensure app.utils.date is resolvable
    try:
        utils_date = importlib.import_module(f'{base_prefix}.utils.date')
        sys.modules['app.utils.date'] = utils_date
    except ModuleNotFoundError:
        pass
except ModuleNotFoundError:
    pass
# Expose invoice_logic helpers
try:
    invoice_logic = importlib.import_module(f'{base_prefix}.invoice_logic')
    sys.modules['app.invoice_logic'] = invoice_logic
except ModuleNotFoundError:
    pass
main = importlib.import_module(f'{base_prefix}.main')
rate_limit = importlib.import_module(f'{base_prefix}.rate_limit')
search = importlib.import_module(f'{base_prefix}.search')

__all__ = [
    'db',
    'models',
    'crud',
    'schemas',
    'main',
    'rate_limit',
    'search',
    'accounting',
    'core',
    'settings',
    'sms_router',
    'api',
    'services',
    'models_smart',
    'auth',
]
