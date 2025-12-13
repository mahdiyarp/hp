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

## SMS.ir Setup & Testing

- Backend SystemSettings keys (DB):
	- `sms_provider` (category `sms`): e.g. `sms.ir` یا `ippanel`
	- `sms_api_key` (category `sms`, می‌تواند secret باشد)
	- `sms_sender` (category `sms`): شماره خط فرستنده
	- `sms_webhook_token` (برای امنیت وبهوک؛ اگر ست نشود، درخواست بدون توکن رد می‌شود)
- Frontend DevConsole: تب SMS برای ارسال تست، تاریخچه، CSV و متریک‌ها.
- Testing:
	- "Send OTP Test" uses `/api/smsir/test-otp` and sends a sample code.
	- "Send Free Text" uses `/api/sms/send` with `{ mobile, message }`.
- Developer mock behavior:
	- When `smsir_enabled=true`, even developer user sends real SMS.
	- When disabled or misconfigured, developer user gets `mock: offline dev delivery` responses.
- Logs:
```powershell
docker compose logs -f backend
```

## Dev Quickstart (Windows)

1. Install Docker Desktop and ensure Compose is available.
2. Start services:

```powershell
docker compose up -d db
docker compose up -d backend
Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
docker compose up -d --build frontend
```

3. Seed demo data (users, NFTs, products, invoices):

```powershell
python.exe backend\scripts\seed_demo.py
```

4. Open the app:

- Frontend: `http://localhost:3000`
- Backend Swagger: `http://localhost:8000/docs`

Notes:
- Developer shortcut login is available via `POST /api/auth/login-dev` used by frontend.
- The developer user is preconfigured: mobile `09123506545`, password `09123506545`.
- Organization features are derived from the user's NFT assets via `/api/org/features`.

#### Verify quickly (PowerShell)

```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/version" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:3000/api/version" -UseBasicParsing

# Optional: get dev token and confirm modules via frontend proxy
$loginBody = @{ username = "developer"; password = "developer" } | ConvertTo-Json
$tokenResp = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login-dev" -Method Post -ContentType "application/json" -Body $loginBody -UseBasicParsing
$token = ($tokenResp.Content | ConvertFrom-Json).access_token
Invoke-WebRequest -Uri "http://localhost:3000/api/current-user/modules" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing
```

### Environment Flags

- `DEV_FEATURES_ENABLED` (default: off): Enables dev-only endpoints like `/api/auth/login-dev` and `/api/dev/assistant/*`. Accepts `true|1|dev|yes`.
- `VITE_DEV_AUTOLOGIN` (frontend, default: `false`): When `true`, the client attempts silent developer login on startup if no token exists.
- Theme: ذخیره تم در `localStorage` با کلید `theme` (`light|dark|system`)؛ حالت `system` بر اساس `prefers-color-scheme` عمل می‌کند.
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
npm run test      # vitest؛ تست‌های ساده DevConsole و تم
```

See `docs/architecture.md` for module breakdown and roadmap.

## Headless Smoke Test
- Run locally: `npm run smoke` (expects frontend at `http://localhost:3000`).
- CI workflow: see [.github/workflows/smoke.yml](.github/workflows/smoke.yml) for automated headless run on push/PR.
- CI artifacts: console log and screenshot saved under `workspace/logs/`.

## Audit Status Card
- The dashboard includes an audit status card rendering latest OTP audit batch: timestamp, event count, and Merkle root.
- A quick chain validity indicator is derived from a sample Merkle proof.
- File: [frontend/src/modules/DashboardModule.tsx](frontend/src/modules/DashboardModule.tsx)

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
