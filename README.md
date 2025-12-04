# HesabPak - سیستم حسابداری فارسی 💰

[![Backend Tests](https://github.com/mahdiyarp/hp/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/mahdiyarp/hp/actions/workflows/backend-tests.yml)
[![UI Smoke](https://github.com/mahdiyarp/hp/actions/workflows/ui-smoke.yml/badge.svg)](https://github.com/mahdiyarp/hp/actions/workflows/ui-smoke.yml)
[![Release](https://github.com/mahdiyarp/hp/actions/workflows/release.yml/badge.svg)](https://github.com/mahdiyarp/hp/actions/workflows/release.yml)

## CI and Tests

- Run tests (Windows PowerShell):
	```powershell
	python -m venv .venv
	.\.venv\Scripts\Activate.ps1
	cd backend
	python -m pip install -r requirements-dev.txt
	$env:DATABASE_URL = 'sqlite:///:memory:'
	python -m pytest -q
	```

- Run with coverage:
	```powershell
	$env:DATABASE_URL = 'sqlite:///:memory:'
	python -m pytest -q --cov=app --cov-report=term-missing
	```

- CI outputs:
	- JUnit: artifact `junit-results-py<version>` contains `pytest.xml`.
	- Coverage: artifact `coverage-report` contains `coverage.xml` and summary comment on PRs.
	- PR Annotations: failing tests are annotated directly on pull requests.

- Lint (Ruff):
	```powershell
	python -m venv .venv
	.\.venv\Scripts\Activate.ps1
	python -m pip install ruff
	ruff check backend
	```

## Developer Workflow (pre-commit)

- Install pre-commit once:
	```powershell
	python -m pip install pre-commit
	pre-commit install
	```

- Run hooks on all files:
	```powershell
	pre-commit run --all-files
	```

- Included hooks:
	- `black`, `isort`, `flake8`
	- `ruff` (lint, autofix for E/F)
	- YAML/JSON checks, whitespace/EOF fixers
	- Optional security: `bandit` on `backend/`

- Enforcing required checks (maintainers):
	1. Settings → Branches → Add rule for `main`.
	2. Enable "Require status checks to pass" and select the workflow checks named like `Backend Tests / tests (3.10|3.11|3.12)`.
	3. Save. New PRs to `main` will require green CI before merge.

سیستم جامع حسابداری و مدیریت تراکنش‌های مالی با رابط کاربری فارسی و امکانات کامل.

## 🚀 راه‌اندازی سریع

### پیش‌نیازها
- Docker و Docker Compose نصب شده
- Windows, macOS یا Linux
- Node.js و npm، Python (ترجیحاً `.venv`)

برای بررسی سریع پیش‌نیازها:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-prereqs.ps1
```

### شروع بلافاصله (Windows)
```batch
start.bat
```

### شروع دستی
```bash
docker compose up -d --build
```

## 📱 دسترسی

| سرویس | آدرس | توضیح |
|------|------|------|
| **رابط کاربری** | http://localhost:3000 | صفحه اصلی برنامه |
| **API** | http://localhost:8000 | سرویس REST API |
| **Swagger Docs** | http://localhost:8000/docs | مستندات API تعاملی |

## 🔐 اطلاعات ورود

```
نام کاربری: developer
رمز عبور: 09123506545
```

## 📚 ماژول‌های اصلی

- Dashboard: خلاصه‌ی فعالیت‌ها
- فاکتورها: مدیریت فاکتورهای فروش/خرید
- پرداخت‌ها: رفت‌ورو پرداخت‌ها
- دریافت‌ها: مدیریت دریافت‌های وجه
- انبار: کنترل موجودی
- اشخاص: مدیریت مشتریان
- گزارش‌ها: تحلیل مالی

## 🛠️ دستورات مفید

```bash
# توقف سرویس‌ها
docker compose down

# توقف و حذف داده‌ها
docker compose down -v

# مشاهده لاگ‌ها
docker compose logs -f

# دسترسی به Backend
docker exec -it hesabpak_backend bash
```

## ✅ اجرای تست‌های Backend

برای اجرای تست‌ها در محیط محلی (بدون Docker):

```powershell
# ایجاد/فعال‌سازی محیط مجازی (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# نصب وابستگی‌ها
python -m pip install -r backend\requirements-dev.txt

# اجرای تست‌ها
pushd backend
python -m pytest
popd
```

یا درون کانتینر (در صورت نصب بودن pytest):

```powershell
docker compose exec backend sh -lc "pip install -q pytest && pytest -q backend/tests"
```

## 🧪 UI Smoke (محلی، بدون پوش)

برای اجرای سریع تست‌های UI روی ویندوز (بدون پوش به گیت‌هاب):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ui-smoke.ps1
# باز کردن خودکار گزارش:
powershell -ExecutionPolicy Bypass -File scripts/ui-smoke.ps1 -OpenReport
```

گزارش‌ها در مسیر `artifacts/ui-smoke/<timestamp>/` ذخیره می‌شوند (HTML report + اسکرین‌شات/ویدیو در خطا).

این اسکریپت در پوشه `frontend` وابستگی‌ها را نصب می‌کند، مرورگرهای Playwright را نصب کرده و تست‌های Playwright داخل `frontend/tests/playwright` را اجرا می‌کند.

## 📂 باز کردن سریع گزارش Playwright

پس از اجرای هر تست (UI smoke / E2E / Dev)، برای باز کردن آخرین گزارش HTML:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/open-playwright-report.ps1
```

در VS Code نیز می‌توانید از تسک `UI: Open Playwright Report` استفاده کنید.

### باز کردن Trace (برای دیباگ دقیق)

برای باز کردن آخرین Trace تولیدشده (فایل .zip) در Trace Viewer:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/open-playwright-trace.ps1
```

در VS Code تسک `UI: Open Playwright Trace (latest)` را اجرا کنید.

## 📦 آماده‌سازی ریلیز محلی (بدون پوش)

برای ساخت `dist` فرانت‌اند و بررسی سلامت API/Assistant به صورت محلی:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-release.ps1
```

خروجی بیلد در `frontend/dist` قرار می‌گیرد. اگر بک‌اند محلی فعال باشد، نتایج سلامت `/api/health` و `/api/assistant/health` در خروجی چاپ می‌شود.

## 🔄 E2E محلی با Docker (بدون پوش)

اجرای تست‌های UI روی استک داکرایز‌شده، همراه با صبر برای سلامت سرویس‌ها:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1

# پایان کار و جمع‌کردن سرویس‌ها:
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -Down
# با باز کردن خودکار گزارش:
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -OpenReport
 
# اجرای سریع بدون بیلد مجدد ایمیج‌ها/فرانت‌اند:
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -NoBuild
# افزایش زمان انتظار سلامت سرویس‌ها (مثال: 300 ثانیه)
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -WaitTimeoutSec 300
# اجرای Headed برای دیباگ (مثال: فقط کرومیوم)
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -Headed -Project chromium
# پرش از نصب مجدد مرورگرها (سریع‌تر روی سیستم‌های آماده)
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -SkipBrowsersInstall

# انتخاب تست‌ها با الگو (grep) یا معکوس
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -Grep "invoice"
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -GrepInvert "slow|flaky"

# تعداد تلاش مجدد (Retries) و حالت دیباگ (PWDEBUG)
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -Retries 2
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -Debug

# کنترل Trace و تعداد Workers
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -Trace on-first-retry
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -Workers 1

# توقف پس از اولین خطا و اجرای Shard
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -MaxFailures 1
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -Shard 1/2

### حالت سریع (Quick)

اجرای سریع با حذف بیلد، بستن سرویس‌ها در پایان و باز کردن گزارش:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -NoBuild -Down -OpenReport -SkipBrowsersInstall
```

### تنظیم زمان انتظار جداگانه برای سرویس‌ها

```powershell
# انتظار طولانی‌تر فقط برای API (مثال: 240 ثانیه)
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -ApiWaitSec 240
# انتظار کوتاه‌تر برای UI (مثال: 60 ثانیه)
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -UiWaitSec 60
```
```

گزارش‌های E2E در مسیر `artifacts/e2e/<timestamp>/` ذخیره می‌شوند.

این اسکریپت فرانت‌اند را بیلد می‌کند، `docker compose up -d --build` اجرا می‌کند، سلامت API و UI را بررسی می‌کند و سپس Playwright را با پیکربندی `playwright.docker.config.js` اجرا می‌کند (baseURL = `http://127.0.0.1:3000`).

## 👨‍💻 UI در حالت Dev + بک‌اند لوکال (بدون پوش)

بک‌اند محلی را اجرا می‌کند، سلامت API را صبر می‌کند، سپس Playwright را مقابل dev server (Vite) اجرا می‌کند. آرتیفکت‌ها در `artifacts/dev/<timestamp>/` ذخیره می‌شوند.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1

# نگه داشتن بک‌اند پس از تست:
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -KeepBackend

# با باز کردن خودکار گزارش:
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -OpenReport
# افزایش زمان انتظار سلامت API (مثال: 300 ثانیه)
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -WaitTimeoutSec 300
# اجرای Headed برای دیباگ (مثال: فقط WebKit)
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -Headed -Project webkit
# پرش از نصب مجدد مرورگرها
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -SkipBrowsersInstall

# انتخاب تست‌ها با grep و معکوس
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -Grep "smoke"
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -GrepInvert "e2e"

# تعداد تلاش مجدد و حالت دیباگ
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -Retries 2
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -Debug

# Trace و Workers
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -Trace retain-on-failure
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -Workers 1

# توقف پس از اولین خطا و Shard
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -MaxFailures 1
powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 -Shard 2/2
```

## 🧹 پاک‌سازی آرتیفکت‌ها

برای آزادسازی فضای دیسک می‌توانید آرتیفکت‌های قدیمی را حذف کنید:

```powershell
# حذف آرتیفکت‌های قدیمی‌تر از 7 روز (پیش‌فرض)
powershell -ExecutionPolicy Bypass -File scripts/clean-artifacts.ps1

# مشخص‌کردن تعداد روز
powershell -ExecutionPolicy Bypass -File scripts/clean-artifacts.ps1 -OlderThanDays 14

# حذف گزارش پیش‌فرض Playwright در frontend نیز
powershell -ExecutionPolicy Bypass -File scripts/clean-artifacts.ps1 -IncludeFrontendReport

# Dry-run برای مشاهده‌ی موارد حذف‌شدنی
powershell -ExecutionPolicy Bypass -File scripts/clean-artifacts.ps1 -WhatIf
```

## 📦 خروجی گرفتن از آخرین آرتیفکت

برای فشرده‌سازی آخرین اجرای آرتیفکت‌ها (جهت ارسال گزارش مشکل):

```powershell
# نوع آرتیفکت را انتخاب کنید: e2e | dev | ui-smoke | backend
powershell -ExecutionPolicy Bypass -File scripts/zip-latest-artifacts.ps1 -Type e2e
```

در VS Code از تسک `Artifacts: Zip latest (pick type)` استفاده کنید.

## 🧰 اجرای سریع تست‌های Backend (اسکریپت)

برای سهولت اجرای تست بک‌اند با SQLite in-memory و نصب وابستگی‌ها:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backend-tests.ps1
```

فلگ‌های مفید:
### Backend tests: QoL flags and examples

- Last failed and failures-first:
	- Run via task: `Terminal > Run Task > Backend: Tests (last failed)`
	- Command:
		- PowerShell: `powershell -ExecutionPolicy Bypass -File scripts\backend-tests.ps1 -LastFailed -FailuresFirst`

- Bail after first failure:
	- Run via task: `Terminal > Run Task > Backend: Tests (bail after 1)`
	- Command:
		- PowerShell: `powershell -ExecutionPolicy Bypass -File scripts\backend-tests.ps1 -MaxFailures 1 -FailuresFirst`

- Coverage + JUnit XML (for CI tools consuming reports):
	- Run via task: `Terminal > Run Task > Backend: Tests (coverage + junit)`
	- Command:
		- PowerShell: `powershell -ExecutionPolicy Bypass -File scripts\backend-tests.ps1 -Coverage -JUnit`

- Pattern filter (pytest -k):
	- Run via task: `Terminal > Run Task > Backend: Tests (pattern)` and enter your `-k` expression.
	- Command:
		- PowerShell: `powershell -ExecutionPolicy Bypass -File scripts\backend-tests.ps1 -K "invoice and not slow"`

Artifacts for backend runs are stored under `artifacts/backend/<timestamp>/` including `test-results/`, coverage HTML (when `-Coverage`), and `junit.xml` (when `-JUnit`).


```powershell
# فیلتر با -k (مثال: فقط اینویس)
powershell -ExecutionPolicy Bypass -File scripts/backend-tests.ps1 -K test_invoice

# مسیر تست‌ها (مثال: فایل/پوشه مشخص)
powershell -ExecutionPolicy Bypass -File scripts/backend-tests.ps1 -TestsPath backend\tests\test_invoice_api.py

# با کاورج و آرشیو خروجی در artifacts/backend/<timestamp>/
powershell -ExecutionPolicy Bypass -File scripts/backend-tests.ps1 -Coverage

# فقط تست‌های شکست‌خورده‌ی آخرین اجرا
powershell -ExecutionPolicy Bypass -File scripts/backend-tests.ps1 -LastFailed

# اجرای تست‌های شکست‌خورده در ابتدا
powershell -ExecutionPolicy Bypass -File scripts/backend-tests.ps1 -FailuresFirst

# توقف پس از اولین خطا
powershell -ExecutionPolicy Bypass -File scripts/backend-tests.ps1 -MaxFailures 1

# خروجی JUnit XML در test-results/pytest.xml (برای گزارش‌گیری)
powershell -ExecutionPolicy Bypass -File scripts/backend-tests.ps1 -JUnit
```

در VS Code می‌توانید از تسک‌های آماده استفاده کنید: `Backend: Tests (last failed)`, `Backend: Tests (bail after 1)`, و `Backend: Tests (coverage + junit)`.

## 🧪 تنظیمات تست و موتور پایگاه داده

برای تست‌های سریع، ما از SQLite in-memory استفاده می‌کنیم. دو متغیر محیطی رفتار ساخت موتور را کنترل می‌کنند:

- `CACHE_TEST_ENGINE=1`: در تست‌هایی که چند درخواست پشت سر هم نیازمند اشتراک یک وضعیت (مثل تست‌های فاکتور و پرداخت) هستند، یک موتور مشترک در حافظه ایجاد می‌شود تا آبجکت‌های ساخته‌شده در درخواست قبلی قابل مشاهده باشند.
- عدم تنظیم یا خالی بودن این متغیر: هر بار یک موتور جدید ساخته می‌شود و ایزولیشن کامل برای تست‌هایی مثل سال مالی فراهم می‌شود.
- `TEST_ISOLATED_ENGINE=1`: حتی اگر `CACHE_TEST_ENGINE` فعال باشد، اجبار به ساخت موتور جدید برای هر تست (ایزولیشن سخت)؛ در تست‌های سال مالی و یکپارچگی نهایی استفاده شده است.

نمونه استفاده در PowerShell:

```powershell
$env:CACHE_TEST_ENGINE = '1'
python -m pytest backend/tests/test_invoice_api.py::test_invoice_api_crud_flow -q

Remove-Item Env:CACHE_TEST_ENGINE  # بازگشت به حالت ایزوله
python -m pytest backend/tests/test_fiscal_year_module.py::test_close_and_lock_transitions -q
```

## 🔗 بلاک‌چین داخلی (Audit Trail)

هر رویداد (ایجاد/به‌روزرسانی پرداخت یا فاکتور) در جدول بلاک‌چین ثبت می‌شود. برای جلوگیری از خطای `UNIQUE constraint failed` روی هش تکراری داده، فیلد `_nonce` (ترکیب timestamp ریزدانه و uuid کوتاه) به payload رویداد تزریق می‌گردد تا هش هر ورودی یکتا باشد ولی ساختار اصلی داده حفظ شود.

---

**نسخه:** 1.0.0
