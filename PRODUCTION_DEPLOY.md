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
