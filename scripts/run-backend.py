"""Run backend uvicorn with PYTHONPATH set from .env.run if present.
This script is additive and non-destructive. It spawns uvicorn as a detached process when run via subprocess.
"""
import os
import subprocess
import sys

# Load .env.run if exists
env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.run')
if os.path.exists(env_file):
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    os.environ[k.strip()] = v.strip()
    except Exception:
        pass

# Ensure PYTHONPATH includes repo root
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('PYTHONPATH', root)

# Build uvicorn command
port = os.environ.get('BACKEND_PORT') or os.environ.get('PORT') or '8881'
cmd = [sys.executable, '-m', 'uvicorn', 'backend.app.main:app', '--reload', '--host', '127.0.0.1', '--port', str(port)]
print('Starting backend with:', ' '.join(cmd))
# Spawn as detached process
if os.name == 'nt':
    # On Windows, use creationflags
    DETACHED_PROCESS = 0x00000008
    subprocess.Popen(cmd, cwd=root, env=os.environ, creationflags=DETACHED_PROCESS)
else:
    subprocess.Popen(cmd, cwd=root, env=os.environ, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, preexec_fn=os.setpgrp)

print('Backend process started.')
