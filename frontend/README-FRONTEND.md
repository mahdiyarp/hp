# Frontend: build & run notes

This file documents how the frontend image is built and served in this repository.

## Settings → Users

- مسیر دسترسی: از منو یا میان‌بر در هدر به `#settings-users`.
- تم کلاسیک و RTL حفظ شده است؛ هیچ تغییری در سبک کلی اعمال نشده.
- ماژول واحد: مسیر `frontend/src/modules/settings/UsersModule.tsx`.
- سرویس‌های مرتبط: `frontend/src/services/auth.ts`, `frontend/src/services/api`.
- تست‌ها: فایل `frontend/tests/users.module.test.tsx` شامل رندر اولیه و بارگذاری داده.

## Smoke tests

- اسموک ناوبری به «کاربران» (#settings-users) در تست `frontend/src/smoke/navigation.test.tsx` پوشش داده شده است.
- اجرای فقط تست‌های اسموک:

```bash
cd frontend
npm run test:smoke --silent
```

- اجرای کل تست‌ها:

```bash
cd frontend
npm test --silent
```

## Build and run (Docker Compose)

From the repository root:

```bash
docker compose up --build
```

This will:
- Build the frontend using `node:20-alpine` and `npm ci` to produce a static `dist` directory.
- Copy the build artifacts into an `nginx:stable-alpine` image and serve them on port `3000`.
- Nginx config at `frontend/nginx.conf` is already adjusted to correctly serve fonts and index.html for an SPA.

## Live mount override (no rebuild)

If Docker registry access is temporarily blocked or you want to iterate on static assets without rebuilding the image, use the compose override that bind-mounts the built `dist` and `nginx.conf` into the running container:

```powershell
# from repo root
docker compose up -d frontend

# or use the helper (builds dist, applies override, verifies HTTP)
./run-frontend-sync.ps1
```

The override file: `docker-compose.override.yml`

- `./frontend/dist` → `/usr/share/nginx/html` (read-only)
- `./frontend/nginx.conf` → `/etc/nginx/conf.d/default.conf` (read-only)

With the override present in the root, `docker compose up -d frontend` will automatically apply it (Compose auto-loads `docker-compose.override.yml`).

## Common issues and how to debug

- If the browser starts downloading the HTML file instead of rendering it:
  - Ensure `nginx.conf` is present in the image (container) at `/etc/nginx/conf.d/default.conf` and that `index.html` is in `/usr/share/nginx/html`.
  - Check Content-Type via network panel � HTML should be `text/html` not `application/octet-stream`.
  - Ensure `try_files $uri $uri/ /index.html;` is in the `location / {}` block.

- Font problems ("Failed to decode downloaded font" / OTS parsing errors):
  - Place a valid WOFF2 file at `frontend/public/fonts/Yekan.woff2` (see `public/fonts/README.txt`).
  - Do not rename TTF to WOFF2; use a real WOFF2 file.
  - Check the browser network tab to confirm a 200 response and correct `content-type` (nginx config maps `.woff2` to `font/woff2`).

- API 404/500 errors from the React app during development:
  - Ensure the backend is running and accessible at the address configured in `frontend/vite.config.ts` (default `http://127.0.0.1:8000`).
  - When served through nginx in Docker, nginx proxies `/api/` to `http://backend:8000` inside the Docker network.

## Development (optional)

If you prefer live development with Vite (hot reload):

1. Run the backend via Docker compose as above.
2. In a separate terminal, run the frontend dev server locally (requires Node):

```bash
cd frontend
npm install
npm run dev
# or with BACKEND_URL env override
BACKEND_URL=http://localhost:8000 npm run dev
```

The Vite dev server runs on port 3000 by default (configured in `vite.config.ts`). It proxies `/api` to the backend address.

## Healthchecks & readiness

The frontend container includes a healthcheck that curls `/` to verify the site is serving. Backend has no healthcheck here; consider adding one if needed.

---

If you want, I can also:
- Add a small health endpoint to the backend for better readiness checks.
- Add a tiny script to validate that required static files (index.html, fonts) exist during image startup and log helpful errors.

## Developer → Assistant

- مسیر: `/#dev-assistant` (فقط برای کاربر توسعه‌دهنده نمایش داده می‌شود).
- قابلیت‌ها: فعال/غیرفعال‌سازی دستیار، ارسال دستور متنی، تاریخچهٔ محلی.
- API‌ها: `/api/assistant/toggle` و `/api/assistant/query` (نیازمند بک‌اند در حال اجرا).
- فایل‌ها:
  - UI: `frontend/src/modules/developer/AssistantModule.tsx`
  - ثبت ماژول: `frontend/src/modules/index.ts` (کلید `dev-assistant`)
- تست E2E: `frontend/e2e/dev-assistant.spec.ts` — اگر `BACKEND_URL` تنظیم نشود، به‌صورت خودکار skip می‌شود.

## فونت یکان (Yekan)

- فونت پیش‌فرض به «Yekan» قفل شده و با `!important` اجازهٔ override ندارد.
- تعریف CSS و قفل سراسری: `frontend/src/index.css`
- همگام‌سازی خودکار فونت قبل از build/preview: `frontend/scripts/sync-fonts.cjs`
- مسیر فونت‌ها: `frontend/public/fonts/` — فایل‌های `Yekan.woff2/woff/ttf` را اینجا قرار دهید.
- تست E2E فونت: `frontend/e2e/font-yekan.spec.ts`

## E2E (Playwright) و OTP (دمو)

- پیش‌نیاز: بک‌اند روی `http://localhost:8000` در حال اجرا باشد. فرانت‌اند می‌تواند از طریق nginx روی `http://localhost:3000` سرو شود (اسکریپت `./run-frontend-sync.ps1`).
- اسکریپت آماده‌سازی تست‌ها (`frontend/scripts/test-setup.cjs`) به‌صورت خودکار قبل از اجرای تست‌ها انجام می‌شود (نصب مرورگرهای Playwright و همگام‌سازی فونت Yekan).

اجرای E2E با PowerShell (Windows):

```powershell
$env:BASE_URL = "http://localhost:3000";
$env:BACKEND_URL = "http://localhost:8000";
$env:DEMO_ALLOW_OTP_NO_SMS = "true";
npm --prefix "frontend" run -s test:e2e
```

اجرای E2E با Bash:

```bash
BASE_URL=http://localhost:3000 \
BACKEND_URL=http://localhost:8000 \
DEMO_ALLOW_OTP_NO_SMS=true \
npm --prefix frontend run -s test:e2e
```

- تست‌ها:
  - ناوبری: `frontend/e2e/navigation.spec.ts`
  - دستیار توسعه‌دهنده: `frontend/e2e/dev-assistant.spec.ts` (با `BACKEND_URL` در غیر این‌صورت skip)
  - چیدمان RTL و سایدبار راست: `frontend/e2e/layout-rtl.spec.ts`
  - نقش‌ها/مجوزها (Users): `frontend/e2e/users-permissions.spec.ts`
  - گزارش فعالیت و خروجی CSV: `frontend/e2e/users-activity.spec.ts`
  - قفل فونت Yekan: `frontend/e2e/font-yekan.spec.ts`
  - ورود OTP (بای‌پس دمو): `frontend/e2e/otp-login.spec.ts` (نیازمند `DEMO_ALLOW_OTP_NO_SMS=true`)

## متغیرهای چیدمان (Layout Vars)

- محل تنظیم: [frontend/src/index.css](frontend/src/index.css)
- متغیرها:
  - `--hp-container-max`: 72rem (معادل Tailwind `max-w-6xl`) — عرض کانتینر مشترک هدر/بدنه.
  - `--hp-container-px`: 1.5rem (معادل `px-6`) — پدینگ افقی کانتینر.
  - `--hp-container-py`: 1.25rem (معادل `py-5`) — پدینگ عمودی پیش‌فرض کانتینر.
  - `--hp-sidebar-width`: 288px (معادل `w-72`) — عرض سایدبار راست.
- هدر سراسری: [frontend/src/components/layout/AppShell.tsx](frontend/src/components/layout/AppShell.tsx) از کلاس `hp-container` و `py-5` استفاده می‌کند.
- نکته: برای یکسانی دقیق با مرجع، عرض‌های سخت‌کُد داخلی مانند `max-w-6xl` در مودال‌ها حذف شده‌اند تا از کانتینر بیرونی پیروی کنند.

## Theme Override (Override فایل تم)

- فایل اختیاری: [frontend/public/theme-override.css](frontend/public/theme-override.css)
- بارگذاری در صفحه: لینک در [frontend/index.html](frontend/index.html) اضافه شده است.
- هدف: تنظیم دقیق رنگ‌ها/فواصل/عرض‌ها بدون دست‌کاری فایل‌های سورس. هر مقدار در این فایل تعریف شود، مقادیر پیش‌فرض `src/index.css` را override می‌کند.
- نمونه متغیرها:

```css
:root {
  --hp-container-max: 72rem;
  --hp-sidebar-width: 288px;
  --retro-panel-bg: #faf4df;
  --retro-border: #c5bca5;
  --retro-button-bg: #154b5f;
}
```

- پیشنهاد: برای هم‌راستاسازی با نسخهٔ مرجع (Reference)، ابتدا تغییرات را در این فایل اعمال کنید و سپس با اسکریپت `./run-frontend-sync.ps1 -NoBuild` سرویس را بازبینی کنید.

- ابزار کمکی برای استخراج متغیرها:

```bash
# نمایش متغیرهای موجود در یک فایل CSS
node scripts/extract-css-vars.cjs frontend/public/theme-override.css

# خروجی JSON برای مقایسه راحت‌تر
node scripts/extract-css-vars.cjs frontend/public/theme-override.css --json
```

می‌توانید مسیر مرجع (مثلاً نسخهٔ F:\hp - Copy) را به اسکریپت بدهید تا تفاوت‌ها را راحت‌تر بررسی کنید.

## گیتینگ دسترسی (Access Gating)
- هر ماژول یک برچسب `feature` دارد (مانند `reports`, `invoices`, `payments`, `products`, `persons`, `settings`).
- لیست ویژگی‌های سازمان از مسیر `/api/org/features` خوانده می‌شود.
- برای کاهش خطاهای 403، چند درخواست سبک با احراز اجرا می‌شود (مثلاً `/api/invoices?limit=1`). اگر پاسخ OK باشد، آن ویژگی فعال تلقی می‌شود.
- نتیجهٔ سرور و تشخیص کلاینتی ادغام می‌شود و `AppShell` فقط ماژول‌هایی را نمایش می‌دهد که `feature` آن در لیست نهایی باشد (به‌جز Admin/Developer که همه را می‌بینند).
- Roadmap: اگر `/api/roadmap` موجود نباشد (404)، ماژول Roadmap بی‌سروصدا مخفی می‌شود تا نویز UI کم شود.
 - مجوزها (Permissions): علاوه بر ویژگی‌ها، برخی ماژول‌ها نیاز به مجوز مشخص دارند. فهرست نام مجوزهای کاربر از `AuthContext` گرفته می‌شود و به `AppShell` پاس داده می‌شود؛ اگر ماژولی `requiredPermissions` داشته باشد، تنها در صورت داشتن همهٔ آن‌ها نمایش داده می‌شود (Admin/Developer از این قانون معاف‌اند).

## تست‌ها
- Smoke Navigation: تست سبک برای `#settings-users` در `frontend/src/smoke/navigation.test.tsx`.
- Roadmap Hidden: تست جدید تأیید می‌کند که در پاسخ 404، کامپوننت Roadmap خروجی رندر نمی‌کند.
 - Permissions Gating: تست سبک برای اطمینان از مخفی‌شدن ماژول‌های بدون مجوز (مثلاً Reports بدون `reports:view`).

## داشبورد: محدودیت نمایش آیتم‌ها

- فهرست «فاکتورهای اخیر» و «محصولات اخیر» دارای محدودکنندهٔ فارسی و قابل‌انتخاب است (۵/۱۰/۲۰/۵۰).
- مقدار پیش‌فرض ۵ است و انتخاب کاربر در LocalStorage با کلیدهای `hp_dash_invoice_limit` و `hp_dash_product_limit` ذخیره می‌شود.
- فایل مرتبط: `frontend/src/modules/DashboardModule.tsx` (props داخلی نیازی به تغییر ندارد).
- تست E2E: `frontend/e2e/dashboard-limits.spec.ts` تأیید می‌کند که تعداد ردیف‌ها با انتخاب کاربر هم‌خوان است.

## راست‌ترازی هدر (RTL)

- کلاس کمکی `hp-container-right` برای راست‌محور کردن کانتینر افزوده شده و در هدر/بدنه اعمال می‌شود.
- فایل‌ها: `frontend/src/index.css` و `frontend/src/components/layout/AppShell.tsx`.
