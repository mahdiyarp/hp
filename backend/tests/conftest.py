import os, sys
# Ensure 'app' package (backend/app) is importable for tests regardless of PYTHONPATH
HERE = os.path.dirname(__file__)
BACKEND_ROOT = os.path.abspath(os.path.join(HERE, '..'))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)
