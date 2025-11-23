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

echo "Running migrations (multi-branch sequence)"
set +e
alembic upgrade 0007 || echo "Ledger branch applied or skipped"
alembic upgrade 0016 || echo "Invoice FK applied or skipped"
alembic upgrade 0017 || echo "Merge heads applied or skipped"
alembic upgrade 0018 || echo "Tracking code migration applied or skipped"
alembic upgrade 0019 || echo "Product ID to invoice items applied or skipped"
alembic upgrade 0020 || echo "Roles and permissions migration applied or skipped"
alembic upgrade 0021 || echo "Timestamps to users migration applied or skipped"
alembic upgrade 0022 || echo "User SMS config migration applied or skipped"
alembic upgrade 0023 || echo "Mobile to users migration applied or skipped"
alembic upgrade 0024 || echo "User preferences migration applied or skipped"
alembic upgrade 0025 || echo "Device login migration applied or skipped"
alembic upgrade 0026 || echo "Developer API keys migration applied or skipped"
alembic upgrade 0027 || echo "Blockchain entries migration applied or skipped"
alembic upgrade 0028 || echo "Customer groups migration applied or skipped"
alembic upgrade 0029 || echo "ICC Shop integration migration applied or skipped"
alembic upgrade 0030 || echo "System settings migration applied or skipped"
alembic upgrade 0031 || echo "Dashboard widgets migration applied or skipped"
alembic upgrade 0032 || echo "Dashboard and reports modules migration applied or skipped"
set -e

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
