import sys
import traceback
import os

# ensure backend dir is importable
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND = os.path.join(ROOT, 'backend')
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

print('PYTHONPATH[0]=', sys.path[0])

try:
    import app
    print('Imported app package successfully. Available attrs:', [k for k in dir(app) if not k.startswith('_')])
    # Try importing key submodules
    import importlib
    for m in ('db', 'models', 'crud'):
        try:
            mod = importlib.import_module(f'app.{m}')
            print(f'app.{m} imported: ', getattr(mod, '__name__', str(mod)))
        except Exception as ie:
            print(f'FAILED importing app.{m}:')
            traceback.print_exc()
except Exception:
    print('Import of app failed — traceback below:')
    traceback.print_exc()
