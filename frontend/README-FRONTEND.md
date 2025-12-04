# Frontend: build & run notes

This file documents how the frontend image is built and served in this repository.

## Build and run (Docker Compose)

From the repository root:

```bash
docker compose up --build
```

This will:
- Build the frontend using `node:20-alpine` and `npm ci` to produce a static `dist` directory.
- Copy the build artifacts into an `nginx:stable-alpine` image and serve them on port `3000`.
- Nginx config at `frontend/nginx.conf` is already adjusted to correctly serve fonts and index.html for an SPA.

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

## UI smoke validation

Headless checks using Playwright are included. We use `@playwright/test` as the single CLI:

```powershell
# From repo root (Windows PowerShell)

# 1) Install browsers locally for this project
cd frontend
npx @playwright/test install --with-deps

# 2) Run the smoke with Vite webServer (list + html reporters)
npx @playwright/test test --config tests/playwright/playwright.config.js --reporter list,html

# 3) Open the latest HTML report
npx @playwright/test show-report --port=0

# Or just use npm scripts
npm run ui:smoke
npm run pw:show-report

# Optional: run the Docker-targeted headless smoke (uses http://localhost:3000)
set URL=http://localhost:3000
node .\scripts\headless_test.js
```

Artifacts:
- Playwright artifacts under `frontend/playwright-report` and `frontend/tests/playwright/test-results`.
- Additional screenshots/logs in `frontend/screenshots` and `frontend/font-diagnostics.log`.

### پایداری اجرا (Windows) و انتظارهای قطعی

- برای جلوگیری از خطاهای ناشی از کش سراسری مرورگرها، مرورگرهای Playwright را به‌صورت محلی نصب کنید:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='0'
npx @playwright/test install --with-deps
```

- برای Smoke پایدار، از انتظارهای قطعی استفاده شده است (به‌جای `networkidle`). توابع کمکی در `tests/playwright/utils/waits.ts` قرار دارند:
  - `waitForVisible(page, selector)`
  - `waitForCount(locator, count)`
  - `waitForText(page, selector, text)`

- اجرای کامل دود (Smoke) و مشاهده گزارش:

```powershell
Push-Location "C:\Users\Mahdi\source\repos\mahdiyarp\09-05\frontend"
$env:PLAYWRIGHT_BROWSERS_PATH='0'
npx.cmd @playwright/test install --with-deps
npx.cmd @playwright/test test tests/playwright/smoke-basic.spec.js tests/playwright/smoke-modules.spec.js tests/playwright/smoke-selectors.spec.js --config tests/playwright/playwright.config.js --reporter=list,html
npx.cmd @playwright/test show-report --port=0
Pop-Location
```

نکته: اگر ترمینال VS Code گاهی با کد «-1» خارج شد، گزارش همچنان روی پورتی تصادفی سرو می‌شود؛ در صورت نیاز دوباره `show-report` را اجرا کنید.

## Healthchecks & readiness

The frontend container includes a healthcheck that curls `/` to verify the site is serving. Backend has no healthcheck here; consider adding one if needed.

---

If you want, I can also:
- Add a small health endpoint to the backend for better readiness checks.
- Add a tiny script to validate that required static files (index.html, fonts) exist during image startup and log helpful errors.
