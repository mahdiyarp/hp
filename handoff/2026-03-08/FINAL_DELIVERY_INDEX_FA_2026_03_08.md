# ایندکس نهایی تحویل HESABPAK - 2026-03-08

این فایل مرجع یک‌جای همه خروجی‌های نهایی برای انتشار است.

## لینک PR

- `https://github.com/mahdiyarp/hp/pull/new/copilot/readiness-ui-hardening-publish`

## شاخه انتشار

- `copilot/readiness-ui-hardening-publish`

## وضعیت کلی

- Core (`ai_hp`) فعال
- Model selection (Local/Online + failover) فعال
- Self-Completion فعال
- داشبورد فارسی `/developer` فعال
- ارتباط زنده Core/Frontend فعال
- مسیر No-Code کاربر فعال

## اسناد فنی/عملیاتی

- `MISSION_COMPLETION_FINAL_2026_03_08_FA.md`
- `EXECUTIVE_STATUS_2026_03_08_FA.md`
- `READINESS_UI_RELEASE_SUMMARY_2026_03_08.md`
- `PR_GITHUB_READY_READINESS_2026_03_08.md`
- `PR_REVIEWER_CHECKLIST_READINESS_2026_03_08.md`
- `OPERATOR_FINAL_HANDOFF_FA_2026_03_08.md`
- `GO_LIVE_CHECKLIST_FA_2026_03_08.md`
- `RELEASE_ANNOUNCEMENT_FA_2026_03_08.md`
- `MERGE_PLAYBOOK_FA_2026_03_08.md`
- `MERGE_STATUS_FA.md`
- `POST_MERGE_VERIFY_FA.md`

## اسناد اپراتور (بدون کدنویسی)

- `OPERATOR_NO_CODE_FA.md`
- `OPERATOR_ONE_PAGE_FA.md`
- `OPERATOR_RELEASE_NOTES_FA_2026_03_08.md`

## مسیر کاربر نهایی

- نصب اولیه: `install.bat`
- شروع: `start.bat`
- توقف: `stop.bat`
- داشبورد: `http://localhost:8880/developer`

## شواهد اعتبارسنجی

- Frontend `/developer`: `49 passed files`, `223 passed tests`
- Backend core/self-completion tests: پاس
- Smoke runtime: `all_ok=true`
- Core endpoints: همگی `200`

## چک سریع قبل از Merge

1. PR branch روی remote به‌روز باشد.
2. Reviewer checklist مرور شود.
3. Go-Live checklist اجرا شود.
4. `MERGE_STATUS_FA.md` کامل تیک بخورد.
5. Merge انجام شود.

این بسته آماده تحویل و انتشار است.
