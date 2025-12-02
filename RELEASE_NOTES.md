# HesabPak 1.0.0 — Release Notes (2025-12-02)

## Highlights
- New backend health endpoints: `GET /api/health`, `GET /api/health/db` with DB readiness check.
- Production-ready startup: updated `start.bat` with health polling, logging to `logs/latest.log`, and compose mode selection.
- Docker stability improvements:
  - Backend: normalized `entrypoint.sh` line endings; SQLAlchemy 2.0-safe health query.
  - Frontend: serve prebuilt `dist/` via nginx to avoid Rollup native binary issues during container build.
- Security hardening in earlier phases: JWT expirations (access=60m, refresh=7d) and `.env` templates.

## Changes Since Previous Version
- Backend
  - Added `/api/health` and `/api/health/db` endpoints with DB ping.
  - Fixed SQLAlchemy raw query by using `sqlalchemy.text("SELECT 1")`.
  - Docker: ensure `/app/entrypoint.sh` is LF + executable.
- Frontend
  - Dockerfile now copies local `dist/` and serves via nginx.
  - Build remains `vite build` locally; compose uses the prebuilt assets.
- Tooling
  - `start.bat` logs to `logs/latest.log`, corrects assistant health URL, and prefers default compose unless `prod` mode.

## Upgrade Notes
- Ensure you build the frontend locally before `docker compose build` so `frontend/dist/` exists:
  - `cd frontend && npm run build`
- If running Windows PowerShell, npm may require `cmd /c` due to execution policy (already handled in our scripts).
- If you previously relied on in-container frontend builds, switch to the prebuild pattern.

## Verification Checklist
- Backend: `Invoke-WebRequest http://localhost:8000/api/health | % Content` returns `{ "status": "ok", "db": true, ... }`.
- Assistant: `Invoke-WebRequest http://localhost:8000/api/assistant/health | % Content` returns `{ "status":"ok" }`.
- Frontend: `Invoke-WebRequest http://localhost:3000 | % StatusCode` returns `200`.

## Known Issues
- If ports 3000/8000/5432 are in use, `start.bat` will still run but services may fail to bind; free those ports and retry.
