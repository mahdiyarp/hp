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

## Dev Quickstart (Windows)

1. Install Docker Desktop and ensure Compose is available.
2. Start services:

```powershell
docker compose up -d --build frontend; docker compose up -d --build backend
```

3. Seed demo data (users, NFTs, products, invoices):

```powershell
python.exe backend\scripts\seed_demo.py
```

4. Open the app:

- Frontend: `http://localhost:8080`
- Backend Swagger: `http://localhost:8000/docs`

Notes:
- Developer shortcut login is available via `POST /api/auth/login-dev` used by frontend.
- The developer user is preconfigured: mobile `09123506545`, password `09123506545`.
- Organization features are derived from the user's NFT assets via `/api/org/features`.

### Environment Flags

- `DEV_FEATURES_ENABLED` (default: off): Enables dev-only endpoints like `/api/auth/login-dev` and `/api/dev/assistant/*`. Accepts `true|1|dev|yes`.
- `VITE_DEV_AUTOLOGIN` (frontend, default: `false`): When `true`, the client attempts silent developer login on startup if no token exists.
- `ALLOW_CREATE_ALL_IN_SEED` (default: off): When enabled or when using SQLite, `backend/scripts/seed_demo.py` will call `create_all` to ensure new tables exist.

### Database Migrations

- Apply migrations (including the new `nft_assets` table):

```powershell
docker compose exec backend alembic upgrade head
```

For local development copy `backend/.env.example` → `backend/.env` and adjust secrets.

## Tooling

- Python: `pytest`, `black`, `isort` (managed via `pre-commit`).
- Node: `eslint`, `prettier`, `lint-staged` (configured in `frontend`).
- CI: GitHub Actions workflow under `.github/workflows/ci.yml`.
- Headless smoke test workflow under `.github/workflows/headless-smoke.yml`.
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

## Headless Smoke Test
- Run locally: `npm run smoke` (expects frontend at `http://localhost:3000`).
- CI artifacts: console log and screenshot saved under `workspace/logs/`.

## Financial Year (FY) UX
- Active FY is selectable in the header via the FY selector.
- After changing FY, the app auto-refreshes and all lists (invoices, payments, party ledger, product movement, balances) reflect the selected FY.
- The active FY badge appears next to date badges to confirm the applied FY.
- FY state persists in user preferences and mirrors to localStorage for fast client routing.

## 📚 Documentation

The project includes comprehensive documentation:

- **[DEVELOPER_PROFILE.md](DEVELOPER_PROFILE.md)** — Developer account details, responsibilities, and legal restrictions for Mehdi Pakzamir
- **[TEAM_AND_ACCESS_CONTROL.md](TEAM_AND_ACCESS_CONTROL.md)** — RBAC structure with 6 roles, 23 permissions, and access matrix
- **[API_SECURITY.md](API_SECURITY.md)** — Authentication, authorization, and API security guidelines

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
