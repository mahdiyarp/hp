# Compatibility shim so `import app` works both in monorepo layout (`backend/app`)
# and when the code is copied/flattened to `/app`.
import importlib
import sys

try:
    importlib.import_module('backend.app')
    base_prefix = 'backend.app'
except ModuleNotFoundError:
    base_prefix = 'app'

db = importlib.import_module(f'{base_prefix}.db')
models = importlib.import_module(f'{base_prefix}.models')
crud = importlib.import_module(f'{base_prefix}.crud')
schemas = importlib.import_module(f'{base_prefix}.schemas')
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
]
