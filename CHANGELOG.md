# Changelog

All notable changes to this project should be documented in this file.

## Unreleased

### Added - Operator No-Code Flow (March 2026)
- `/developer` top operator card now includes an inline one-page runbook toggle (`نمایش راهنمای یک صفحه`) so non-technical operators can follow startup/recovery steps without leaving the dashboard.
- Added copy utilities in operator card:
  - `کپی آدرس داشبورد`
  - `کپی نام فایل راهنما`
  - `کپی کل چک لیست`
  - `کپی فقط مراحل بحران (4 مرحله)`
- Added explicit stale-status recovery affordance in operator path: `Core: آنلاین (قدیمی)` + `بروزرسانی وضعیت` guidance.
- Expanded operator docs and README surfaces to match UI behavior:
  - `OPERATOR_NO_CODE_FA.md`
  - `OPERATOR_ONE_PAGE_FA.md`
  - `README.md`
  - `README.fa.md`
- Added/updated targeted tests for `/developer` top-display operator UX (copy and inline guide actions), including clipboard success payload coverage for `کپی آدرس داشبورد` and `کپی نام فایل راهنما`.
- Refined operator copy UX label so dashboard URL action confirms with explicit text `آدرس کپی شد`; added dedicated failure-path test for dashboard URL clipboard action.
- Harmonized operator docs wording with UI success labels across guides/READMEs: `آدرس کپی شد`, `نام فایل کپی شد`, `چک لیست کپی شد`, and `مراحل بحران کپی شد`.
- Added operator-facing release notes summary for this UX/docs pass: `OPERATOR_RELEASE_NOTES_FA_2026_03_08.md`.
- Added no-code readiness endpoint for operator workflows: `GET /api/core/operator/readiness` (score + Persian status + next action).
- Wired `/developer` Smart Control Center to consume and show operator readiness summary (`آمادگی اپراتور`), backend-generated Persian status, and actionable next step from the readiness endpoint.
- Added visual readiness signal in `/developer` Smart Control Center: `امتیاز آمادگی` with color coding (green/yellow/red) for faster non-technical triage.
- Hardened readiness score presentation in UI by normalizing backend values (rounded and clamped to `0..100`) before rendering tone/color.

### Fixed - v0.1.2 (February 2026)
- Tenant scoping regression coverage on SQLite: added invoice and payment list tests enforcing `X-Account-Id` isolation; guarded invoice list serializer `tax_rate` access to avoid AttributeError when the column is absent in SQLite test schemas.
- Legacy backend tests now pass on SQLite: added API auth overrides (invoices/payments) to align with `api_deps.get_current_user`, seeded `account_id` in payment fixtures, and allowed active NFT owners to satisfy permission checks.

### Added - v0.1.2 (February 2026)
- **Complete UI/UX Standardization**: Created standardized Retro component library
  - `RetroCard` - Card component with consistent styling
  - `RetroForm` - Form inputs (Input, Select, Textarea) with labels and error handling
  - `RetroButton` - Button variants (primary, secondary, danger, ghost)
  - `RetroTable` - Data table with sorting and pagination support
  - `RetroModal` - Modal and ConfirmModal components
  - All components support RTL (Right-to-Left) for Persian
  - All components use consistent Retro theme colors
  - Located in `frontend/src/components/ui/`
- **External API Integrations - Real Implementation**:
  - FX Rates: Real-time exchange rates from exchangerate-api.com with fallback
  - Crypto Prices: Real-time cryptocurrency prices from CoinGecko with fallback
  - AI Product Match: Ollama integration with rule-based fallback
  - AI Invoice Analysis: Ollama integration with pattern-based fallback
  - All APIs include proper error handling and fallback mechanisms
- **Components Demo Page**: Created `frontend/src/pages/dev/ComponentsDemo.tsx` showcasing all standardized components
- **Project Cleanup**: Removed 523+ .bak files and temporary files from repository
- **Smart Financial Insights panel**: Enhanced dashboard now visualizes 30-day cashflow rollup from `/api/dashboard/financial` with net trend sparkline, best/worst day highlights, streaks, anomaly hints, and cash-balance chips; mock API updated for offline/demo parity.

### Changed
- Updated all external API endpoints to use real providers instead of stubs
- Enhanced AI endpoints with Ollama integration and intelligent fallbacks
- Standardized all UI components with consistent spacing and colors
- Updated documentation (MODULE_CHECKLIST.md, START_HERE.md)
- Removed dashboard E2E fallback (and `VITE_HIDE_DASH_FALLBACK` flag), cleaned Playwright env, updated README; dashboard-limits E2E stays green.
- CI now runs full frontend vitest (Node 20, `npm ci`, cache enabled) alongside backend pytest when `frontend/**` or backend files change, keeping both stacks covered on every push/PR.
- Added dedicated coverage workflow (vitest coverage + pytest-cov) with artifacts and manual trigger for on-demand coverage runs.
- CI combo job (vitest+pytest) now caches npm/pip and uses `npm ci` for reproducible installs; README documents how to rerun CI locally.
- Coverage workflow now emits `coverage-summary.txt` and `coverage-badge.json` (frontend + backend blended) for badge/summary consumption.

## Previous Changes

- Added ChainStorageSuite enhancements (load-more, health, proof UX) and documented endpoints; frontend builds remain green.
- Moved offline AI model cache to G:\hp\offline-models via junction to avoid F: fill-up.
- ChainStorageSuite now gated with `chain-suite:access` + optional `VITE_FEATURE_CHAIN_SUITE` flag; ModulePage actions realigned, global-search hook added, new vitest coverage, and frontend type/lint fixes (leaflet d.ts, SystemModule entries type).
### Added
- **DB-backed Rewards + Rate Limit**: جدول‌های `reward_balances` و `reward_events` با مایگریشن `20260105_rewards_tables`, سقف روزانه/ریت‌لیمیت قابل تنظیم با متغیرهای محیطی، ثبت متادیتای IP/UA/Device و لاگ بلاک‌چین.
- **Developer API Keys Management**: Complete implementation of developer API key system with X-API-Key header authentication, rate limiting, endpoint restrictions, and frontend UI for key creation/management
  - Backend middleware (`verify_api_key` dependency) validates X-API-Key header, checks hash against database, updates last_used timestamp
  - Protected external endpoints: `/api/external/ai/*`, `/api/external/fx-rates`, `/api/external/crypto-prices`
  - Frontend module (dev-api-keys) with create form, one-time key display, enable/disable/revoke actions, endpoints reference
  - Test suite: `backend/tests/test_developer_api_keys.py` (5 test scenarios, all passing)
- **ICC Shop Structure & Sync**: Nested ICC tree service, CRUD endpoints (`/api/icc/*`), public structure output `/api/icc-shop/structure`, and sync handler `/api/icc-shop/sync` with dry-run/demo options. Frontend IccShop module now visualizes hierarchy and triggers sync; regression tests live in `backend/tests/test_icc_shop.py`.

### Fixed
- هم‌ترازسازی `ALL_MODULE_IDS` با رجیستری فرانت‌اند و رفع خطای تست ماژول مشترک
- بهبود بلاک‌چین ممیزی: جلوگیری از خطای `UNIQUE constraint failed: blockchain_entries.data_hash` با استفادهٔ مجدد از رکوردهای هم‌هش
- جلوگیری از خطای 500 هنگام ورود دولوپر با اضافه‌کردن `_bootstrap_developer_access_if_needed` و تکمیل importهای روتر ICC (`List` از `typing`)؛ تست لاگین خودکار اکنون پایدار است.

### Infrastructure
- اجرای کامل `python -m pytest backend/tests -q`، `npm run test` و `npm run build` برای تایید صحت تغییرات اخیر

## 0.1.1 - 2025-12-15
- Centralized all user-related frontend logic into Settings → Users. Removed duplicated AccessControl UI. Updated module registry, added unit tests, aligned role updates to PATCH `/api/users/{id}` and permission saves to `POST /api/roles/{rid}/permissions`. Added CI workflow `ci-users.yml`. Per-user SMS save disabled pending backend endpoint.
- Backend PApi: افزودن بای‌پس توسعه/دمو برای OTP/SMS (DEV_FEATURES_ENABLED/DEMO_ALLOW_OTP_NO_SMS) جهت جلوگیری از خطای 502 در نبود API Key. لاگ رویدادهای بای‌پس به `logs/papi.jsonl` افزوده شد.
- 2025-11-14: Fixed DB/session naming mismatch across `main.py` and `crud.py`. Unified parameter name to `session` and updated call sites. Added many bug fixes to restore data endpoints.
- 2025-11-14: Added program `VERSION` and backend `/api/version` endpoint, and frontend display of version in app header/footer.

## 0.1.0 - 2025-11-14
- Initial release (seed).
