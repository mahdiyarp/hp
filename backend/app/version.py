import os
from datetime import datetime

def _root_path():
    # in container the app package is at /app/app, project root is /app
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def get_version_info(changelog_lines: int = 20):
    root = _root_path()
    version_path = os.path.join(root, '..', 'VERSION')
    changelog_path = os.path.join(root, '..', 'CHANGELOG.md')
    version = None
    changelog = None
    try:
        with open(version_path, 'r', encoding='utf-8') as f:
            version = f.read().strip()
    except Exception:
        version = 'unknown'
    try:
        with open(changelog_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            # return the last N non-empty lines
            last = [l.rstrip() for l in lines if l.strip()][-changelog_lines:]
            changelog = '\n'.join(last)
    except Exception:
        changelog = ''

    return {
        'version': version,
        'checked_at': datetime.utcnow().isoformat() + 'Z',
        'changelog_preview': changelog,
    }
