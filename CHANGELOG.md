# Changelog

All notable changes to this project should be documented in this file.

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
