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
alembic upgrade 0007_ledger || echo "Ledger branch applied or skipped"
alembic upgrade 0016_add_invoice_fk_to_payments || echo "Invoice FK applied or skipped"
alembic upgrade 0017_merge_heads || echo "Merge heads applied or skipped"
alembic upgrade 0018_add_tracking_code || echo "Tracking code migration applied or skipped"
alembic upgrade 0019_product_id || echo "Product ID to invoice items applied or skipped"
alembic upgrade 0020_user_roles_permissions || echo "Roles and permissions migration applied or skipped"
alembic upgrade 0021_add_timestamps_to_users || echo "Timestamps to users migration applied or skipped"
alembic upgrade 0022_user_sms_config || echo "User SMS config migration applied or skipped"
alembic upgrade 0023_add_mobile_to_users || echo "Mobile to users migration applied or skipped"
alembic upgrade 0024_user_preferences || echo "User preferences migration applied or skipped"
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
