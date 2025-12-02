# Changelog

All notable changes to this project should be documented in this file.

## 1.0.0 - 2025-12-02

Highlights:
- Backend health endpoints `/api/health` and `/api/health/db` with DB readiness check (SQLAlchemy 2.0 safe).
- start.bat startup hardened: health polling, logging to `logs/latest.log`, compose mode selection.
- Backend Docker: normalize `entrypoint.sh` line endings to avoid exec errors.
- Frontend Docker: serve prebuilt `dist/` via nginx to avoid Rollup native module issues inside containers.
- Documentation: added `RELEASE_NOTES.md` and `PRODUCTION_DEPLOY.md` with step-by-step commands.

Verification:
- `GET /api/health` => `{ status: "ok", db: true, ... }`
- `GET /api/assistant/health` => `{ status: "ok" }`
- Frontend responds `200` at `http://localhost:3000`.

Upgrade notes:
- Build `frontend/dist/` locally before `docker compose build`.
- Ensure `backend/.env` has `DATABASE_URL`, `SECRET_KEY`, JWT expirations, and `REDIS_URL`.

## Unreleased

- 2025-12-02: **Phase 1-5 Product Completion**
  - **Backend**: Added `/api/backups/` endpoints (list, create, download, delete) and `/api/reports/` aggregation endpoints (sales, cash, stock, pnl, payments) to power dashboard widgets.
  - **Frontend**: Created `BackupRestore.tsx` page with full UI for manual backups; integrated backup navigation in sidebar; added reusable `Toast`, `Skeleton`, `Modal` components for consistent UX.
  - **Tests**: Added `test_backups_api.py` and `test_reports_api.py` for new endpoints; all invoice/payment calculation tests passing.
  - **Person Timeline**: Enhanced `/api/persons/{id}/timeline` to include related invoices, payments, and tasks (replaced stub with real aggregation).
  - **CI/DevOps**: Hardened GitHub Actions workflows (matrix testing Python 3.10/3.11/3.12, JUnit XML output, coverage reports with PR sticky comments, migrations validation, Ruff linting, Dependabot, concurrency controls, timeouts).
  - **Documentation**: Added `PRODUCTION_DEPLOY.md` with pre-deployment checklist, security hardening guide, and rollback plan.
  - **Status**: All core modules complete (Dashboard, Invoices, Payments, Reports, Backup/Restore, Settings, Activity, Tasks, Persons, Products, Contacts); production-ready with full test coverage and deployment documentation.

- 2025-11-23: Overhauled the invoice module (new CRUD/status endpoints, exports, printable template, attachments, settings defaults, and UI) and added automated API/calculation/UI tests.
- 2025-11-14: Fixed DB/session naming mismatch across `main.py` and `crud.py`. Unified parameter name to `session` and updated call sites. Added many bug fixes to restore data endpoints.
- 2025-11-14: Added program `VERSION` and backend `/api/version` endpoint, and frontend display of version in app header/footer.

## 0.1.0 - 2025-11-14
- Initial release (seed).
