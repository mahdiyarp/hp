# Hesabpak (HP)

Monorepo for the Hesabpak accounting platform. The project currently contains:

- `backend/` — FastAPI service with PostgreSQL, Alembic migrations, and pytest suite.
- `frontend/` — React + Vite client (RTL, Jalali-aware UI).
- `infra/` — Deployment notes and docker-compose files.
- `docs/` — Architectural references and planning material.

## Getting Started

```bash
docker compose up --build
```

Backend swagger UI (once running): `http://localhost:8000/docs`  
Frontend app: `http://localhost:3000`

For local development copy `backend/.env.example` → `backend/.env` and adjust secrets.

### Background Scheduler (optional)

A lightweight background scheduler can emit automation events (e.g., overdue cheques reminders).

- Enable with `SCHEDULER_ENABLED=true` in `backend/.env`
- Interval is configurable via `SCHEDULER_INTERVAL_SEC` (default 300 seconds)
- Safe by default: if SMS is not configured in DB system settings, events won't send external requests

### Integrations & Automation

- Admin endpoints under `/api/integrations` for simple provider configs (e.g., FX services) and `/api/integrations/test/sms` for sending a test SMS using system settings
- Automation events currently supported:
	- `invoice.finalized`
	- `payment.posted`
	- `cheque.overdue`
	These trigger best-effort SMS notifications when a phone number is resolvable for the counterparty.
  
- Webhooks: enable an integration with `provider=webhook` and JSON `config` including `{ "url": "https://your.receiver/endpoint" }`. If you set a secret in `api_key`, events will include `X-HP-Signature: sha256=<hmac>` header over the JSON body.
- Test your receiver with `POST /api/integrations/test/webhook?url=...&secret=...` (Admin only).

## Tooling

- Python: `pytest`, `black`, `isort` (managed via `pre-commit`).
- Node: `eslint`, `prettier`, `lint-staged` (configured in `frontend`).
- CI: GitHub Actions workflow under `.github/workflows/ci.yml`.
- Optional 2FA (TOTP) for sign-in flows is available via `/api/auth/otp/*` endpoints.

### Developer Setup

```bash
# backend
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
pip install pre-commit black isort flake8
pre-commit install

# frontend
cd frontend
npm install
npm run prepare   # installs husky hooks
```

See `docs/architecture.md` for module breakdown and roadmap.

 
## Theme and Forms

- The app uses a unified Finance (Receipts & Payments) palette.
- Theme variables are defined in `frontend/src/index.css` under `:root` (e.g., `--retro-border`, `--retro-panel-bg`, `--retro-button-bg`).
- Shared UI utilities live in `frontend/src/components/retroTheme.ts` and read from those variables.
- When building new components, import from `retroTheme` and avoid hardcoded colors.

### Frontend Dev

Run the frontend locally:

```bash
cd frontend
npm install
npm run dev
```

To adjust colors app-wide, update the CSS variables in `frontend/src/index.css`.

## 📚 Documentation

The project includes comprehensive documentation:

- **[DEVELOPER_PROFILE.md](DEVELOPER_PROFILE.md)** — Developer account details, responsibilities, and legal restrictions for Mehdi Pakzamir
- **[TEAM_AND_ACCESS_CONTROL.md](TEAM_AND_ACCESS_CONTROL.md)** — RBAC structure with 6 roles, 23 permissions, and access matrix
- **[API_SECURITY.md](API_SECURITY.md)** — Authentication, authorization, and API security guidelines
- **Exports & Shared Files** — Invoice and Sale Order exports support CSV (always), PDF & Excel (if optional deps installed). Each export creates a time‑limited token stored in DB (`shared_files` table) and exposes `download_url` under `/api/exports/shared/{token}` valid for 24h. Missing optional libraries (reportlab / openpyxl) cause the respective format tests to skip.

### Developer Access

**Developer User**: `mehdi_pakzamir` (ID: 19)
- **Permissions**: All 23 system permissions (finance, sales, people, inventory, settings, backup)
- **Modules**: reports, finance, sales, people, inventory, settings
- **Contact**: mahdiyarp@gmail.com | 09123506545

### Role-Based Access Control (RBAC)

The system implements 6 roles with permission-based authorization:

| Role | Use Case | Key Permissions |
|------|----------|-----------------|
| **Admin** | Full system access | All 23 permissions |
| **Manager** | Operations management | Finance, Sales, People (create/edit), Inventory |
| **Accountant** | Financial management | Finance (view/create/edit/report), People (view) |
| **Salesman** | Sales management | Sales (create/edit/finalize), Inventory (view), People (view/create) |
| **Viewer** | Read-only access | All modules (view only) |
| **Developer** | System development | All 23 permissions (with legal restrictions) |
