Reports System
===============

Overview
--------
This folder adds a basic reports subsystem (backend + frontend) with:

- FastAPI router at `backend/app/reports/router.py`
- Reports engine at `backend/app/reports/engine.py`
- CSV export helper at `backend/app/reports/export/csv.py`
- Frontend module at `frontend/src/modules/reports`

Usage
-----
1. Start backend and frontend as usual.
2. Open Reports page in frontend (module not yet wired into navigation; import `ReportsModule` where needed).
3. API endpoints:
   - `GET /api/reports/sales` - returns `summary` and `series`
   - `GET /api/reports/pnl` - profit & loss summary
   - `GET /api/reports/stock` - stock valuation
   - `GET /api/reports/cash` - cash balances

Seeding / Testing
-----------------
Use existing invoices/payments endpoints to create test data. The frontend will read data from endpoints.

Notes / Next steps
------------------
- Add more report queries into `backend/app/reports/queries`
- Implement PDF/Excel exports using Jinja2/reportlab/openpyxl
- Integrate templates and i18n strings into main app
- Add Playwright tests under `tests/playwright/reports` to validate rendering and exports
