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

### Settings → Users (جدید)

- مسیر جدید «تنظیمات → کاربران» تنها مرجع مدیریت کاربران است: ساخت/ویرایش کاربر، تعیین نقش و مشاهده مجوزها.
- ذخیره مجوزها در حال حاضر «نقش‌محور» است (تغییرات روی نقش ذخیره می‌شود).
- ترجیحات پیامکِ کاربر فقط خواندنی است؛ دکمهٔ ذخیرهٔ فردبه‌فرد تا افزوده‌شدن اندپوینت بک‌اند غیرفعال شده است.

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

### OTP از طریق PApi (حالت dev)

- اندپوینت‌های جدید:
	- `POST /api/papi/otp/start` → شروع OTP (در dev/دمو بدون نیاز به API Key با بای‌پس امن فعال می‌شود)
	- `POST /api/papi/otp/verify` → تایید OTP و صدور توکن
- فلگ‌های محیطی:
	- `DEV_FEATURES_ENABLED=true` یا `ENVIRONMENT=development|dev|local`
	- `DEMO_ALLOW_OTP_NO_SMS=true` برای اجازه دادن به ادامهٔ جریان حتی در صورت شکست ارسال SMS
- مثال سریع (PowerShell):

```powershell
$payload = @{ mobile = '09123456789' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/api/papi/otp/start -Method Post -ContentType 'application/json' -Body $payload

# استفاده از کد دیباگ برگشتی در پاسخ start
$code = '123456'
$verify = @{ mobile = '09123456789'; code = $code } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/api/papi/otp/verify -Method Post -ContentType 'application/json' -Body $verify
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

### Frontend E2E (Playwright)

برای اجرای تست‌های E2E فرانت‌اند (Playwright):

PowerShell (Windows):

```powershell
$env:BASE_URL = "http://localhost:3000";
$env:BACKEND_URL = "http://localhost:8000";
$env:DEMO_ALLOW_OTP_NO_SMS = "true";
npm --prefix "frontend" run -s test:e2e
```

Bash:

```bash
BASE_URL=http://localhost:3000 \
BACKEND_URL=http://localhost:8000 \
DEMO_ALLOW_OTP_NO_SMS=true \
npm --prefix frontend run -s test:e2e
```

نکات:
- اسکریپت آماده‌سازی تست‌ها به‌صورت خودکار قبل از اجرا انجام می‌شود: همگام‌سازی فونت Yekan و نصب مرورگرهای Playwright (`frontend/scripts/test-setup.cjs`).
- تست OTP به حالت دمو نیاز دارد: `DEMO_ALLOW_OTP_NO_SMS=true`.
- جزئیات بیشتر و فهرست تست‌ها در [frontend/README-FRONTEND.md](frontend/README-FRONTEND.md) آمده است.

## Frontend zero-rebuild sync (Windows)

When Docker registry pulls are blocked or you want instant updates on port 3000 without rebuilding the image, use the live-mount override and helper:

- Sync and verify:

```powershell
./run-frontend-sync.ps1
```

- Skip rebuild if `frontend/dist` is already fresh:

```powershell
./run-frontend-sync.ps1 -NoBuild
```

Compose auto-loads [docker-compose.override.yml](docker-compose.override.yml), which bind-mounts [frontend/dist](frontend/dist) and [frontend/nginx.conf](frontend/nginx.conf) read-only into the running container. This keeps 3000 serving the latest build/config until you can run a clean image rebuild.

### Toggle override

Enable or disable the live-mount override and restart the frontend service:

```powershell
./toggle-frontend-override.ps1 -Action enable   # enable override mounts
./toggle-frontend-override.ps1 -Action disable  # disable override mounts
./toggle-frontend-override.ps1 -Action status   # show current state
```

### Local Backend Tests (No Proxy)

برای اجرای تست‌های بک‌اند علیه سرور محلی بدون تداخل پراکسی:

```powershell
# 1) اجرای سرور تست محلی (VS Code Task موجود)
# Task: Start test backend  → سرور روی http://127.0.0.1:8123 بالا می‌آید

# 2) اجرای تست‌ها با پاک‌سازی پراکسی‌ها و ست‌کردن API_BASE_URL
Remove-Item Env:HTTP_PROXY -ErrorAction Ignore
Remove-Item Env:HTTPS_PROXY -ErrorAction Ignore
Remove-Item Env:ALL_PROXY -ErrorAction Ignore
Set-Item Env:NO_PROXY 'localhost,127.0.0.1'
Set-Item Env:API_BASE_URL 'http://127.0.0.1:8123'
python -m pytest -q backend/tests
```

می‌توانید از تسک VS Code استفاده کنید: «Run backend tests (no proxy)».

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
- Headless smoke test workflow under `.github/workflows/headless-smoke.yml`.
- Optional 2FA (TOTP) for sign-in flows is available via `/api/auth/otp/*` endpoints.

### Frontend Environment & Fonts

- `VITE_BACKEND_URL`: When serving the frontend from a different origin (e.g., port 3000 behind Nginx), set this to the backend base (e.g., `http://localhost:8000`). The client will prefix all `/api/*` calls with this value. Without it, same-origin proxy is used.
- Fonts: The UI is locked to Yekan to avoid OTS decode errors. A cleanup script removes obviously corrupt WOFF2 placeholders and ensures a valid Yekan is present:

```powershell
npm --prefix frontend run clean-fonts
```

This runs during CI and before preview/build via the existing scripts. If you provide licensed IranYekan/Vazirmatn, keep them >10KB and valid; otherwise the fallback mapping to `Yekan` remains active.
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
