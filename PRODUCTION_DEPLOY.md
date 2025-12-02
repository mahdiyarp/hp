# Production Deployment Guide

This guide explains how to build and deploy HesabPak to a production-like environment using Docker Compose.

## Prerequisites
- Docker Desktop 4.x+
- Windows PowerShell 5.1+ or PowerShell 7+
- Ports available: `5432` (db), `6379` (redis), `8000` (backend), `3000` (frontend)

## 1) Build Frontend Assets
Build once locally so the nginx image can copy the static files without hitting the Rollup optional-deps bug in containers.

```powershell
Set-Location "c:\Users\Mahdi\source\repos\mahdiyarp\09-05\frontend"
cmd /c npm ci  # or: cmd /c npm install
cmd /c npm run build
```

Expected: a `frontend/dist/` folder is created.

## 2) Configure Environment
Create `backend/.env` if missing. Minimal example for Docker Compose:

```
DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/hesabpak
SECRET_KEY=change-me-in-prod
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
REDIS_URL=redis://redis:6379/0
```

## 3) Start Services
From the repository root:

```powershell
Set-Location "c:\Users\Mahdi\source\repos\mahdiyarp\09-05"
docker compose build
Docker compose up -d
```

Alternatively, use the orchestrator script (includes health polling and logging):

```powershell
Set-Location "c:\Users\Mahdi\source\repos\mahdiyarp\09-05"
.\start.bat        # default compose (dev-like)
.\start.bat prod   # uses docker-compose.production.yml if present
```

Tail logs:

```powershell
Get-Content .\logs\latest.log -Wait
```

## 4) Health Verification

```powershell
Invoke-WebRequest http://localhost:8000/api/health | % Content
Invoke-WebRequest http://localhost:8000/api/assistant/health | % Content
Invoke-WebRequest http://localhost:3000 | % StatusCode
```

Expected:
- API: `{ "status": "ok", "db": true, ... }`
- Assistant: `{ "status": "ok" }`
- Frontend: `200`

## 5) Backups & Data
- Use your existing backup scheduler image/stack if configured.
- For PostgreSQL volumes see `docker-compose.yml` volume `db_data`.

## 6) Troubleshooting
- Backend restarts with `entrypoint.sh` not found: rebuild backend (`docker compose build backend`) – LF normalization is handled in Dockerfile.
- Frontend build failure on Rollup native module: ensure you prebuilt `frontend/dist/` locally.
- Ports busy: free `3000/8000/5432` or change host bindings in compose.
# Production Deployment Checklist

## Pre-deployment

- [ ] Update `docker-compose.yml` with production Postgres credentials
- [ ] Set strong `POSTGRES_PASSWORD` in environment
- [ ] Configure backend `.env` with production values:
  - `DATABASE_URL` pointing to production database
  - `SECRET_KEY` (generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
  - `REDIS_URL` if using external Redis
- [ ] Set `DEMO_SEED=false` to prevent demo data creation
- [ ] Review `CORS` origins in `backend/app/main.py` and add production domain
- [ ] Run Alembic migrations on production database:
  ```bash
  docker compose exec backend alembic upgrade head
  ```
- [ ] Configure backup schedule via `BACKUP_INTERVAL_MIN` environment variable
- [ ] Set up external volume backups for `/var/lib/postgresql/data`

## Deployment Steps

1. Build production images:
   ```bash
   docker compose build --no-cache
   ```

2. Start services:
   ```bash
   docker compose up -d
   ```

3. Verify all services are healthy:
   ```bash
   docker compose ps
   ```

4. Check backend logs:
   ```bash
   docker compose logs backend -f
   ```

5. Test API health:
   ```bash
   curl http://localhost:8000/health
   ```

6. Access frontend at configured domain and verify login

## Post-deployment

- [ ] Create admin user via Django shell or API
- [ ] Configure system settings (`/api/settings`)
- [ ] Set up monitoring (optional: Prometheus + Grafana)
- [ ] Configure SSL/TLS with reverse proxy (nginx/Caddy)
- [ ] Enable automated backups and test restore
- [ ] Document API keys for external integrations
- [ ] Run smoke tests on all modules (Invoices, Payments, Reports, Backup)

## Security Hardening

- [ ] Change default Postgres password
- [ ] Restrict database access to backend container only
- [ ] Use secrets management (Docker secrets / Vault) for sensitive env vars
- [ ] Enable rate limiting on public endpoints
- [ ] Review role-based access control (RBAC) permissions
- [ ] Set up audit log monitoring
- [ ] Configure firewall rules for external access

## Rollback Plan

If deployment fails:
1. Stop services: `docker compose down`
2. Restore database backup
3. Roll back to previous image version
4. Investigate logs and fix issues
5. Re-deploy after validation

## Contact

For production support, refer to:
- Architecture docs: `docs/architecture.md`
- API docs: http://your-domain/docs
- GitHub issues: https://github.com/mahdiyarp/hp/issues
