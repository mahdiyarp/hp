# Changelog

All notable changes to this project should be documented in this file.

## Unreleased

- (بدون تغییر)

## 0.1.1 - 2025-12-15
- Centralized all user-related frontend logic into Settings → Users. Removed duplicated AccessControl UI. Updated module registry, added unit tests, aligned role updates to PATCH `/api/users/{id}` and permission saves to `POST /api/roles/{rid}/permissions`. Added CI workflow `ci-users.yml`. Per-user SMS save disabled pending backend endpoint.
- Backend PApi: افزودن بای‌پس توسعه/دمو برای OTP/SMS (DEV_FEATURES_ENABLED/DEMO_ALLOW_OTP_NO_SMS) جهت جلوگیری از خطای 502 در نبود API Key. لاگ رویدادهای بای‌پس به `logs/papi.jsonl` افزوده شد.
- 2025-11-14: Fixed DB/session naming mismatch across `main.py` and `crud.py`. Unified parameter name to `session` and updated call sites. Added many bug fixes to restore data endpoints.
- 2025-11-14: Added program `VERSION` and backend `/api/version` endpoint, and frontend display of version in app header/footer.

## 0.1.0 - 2025-11-14
- Initial release (seed).
