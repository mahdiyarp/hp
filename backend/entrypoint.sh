#!/bin/sh
set -e

echo "Waiting for database to be available..."
until python - <<'PY'
import os
from sqlalchemy import create_engine
db_url = os.getenv('DATABASE_URL')
if not db_url:
    raise SystemExit(1)
try:
    create_engine(db_url).connect()
    print('db ok')
    raise SystemExit(0)
except Exception:
    raise SystemExit(1)
PY
do
  echo "Database unavailable - sleeping"
  sleep 1
done

echo "Running migrations"
# Use 'heads' to apply all head revisions (handles multiple heads in repo history)
alembic upgrade heads

# optional demo seeding
if [ "${DEMO_SEED:-}" = "true" ]; then
    if [ ! -f "/app/.seed_done" ]; then
        echo "Seeding demo data (DEMO_SEED=true)"
        python /app/scripts/seed_demo.py || true
        touch /app/.seed_done
    else
        echo "Demo seed already applied"
    fi
fi

echo "Starting server"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
