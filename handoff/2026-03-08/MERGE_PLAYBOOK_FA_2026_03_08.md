# Playbook نهایی Merge و انتشار - 2026-03-08

## هدف

این سند مسیر نهایی از باز کردن PR تا اعلام بهره برداری را به صورت قدم به قدم مشخص می کند.

## 1) باز کردن PR

- لینک:
  - `https://github.com/mahdiyarp/hp/pull/new/copilot/readiness-ui-hardening-publish`
- عنوان پیشنهادی:
  - `feat(developer): end-to-end operator readiness wiring in /developer`
- بدنه پیشنهادی:
  - از `PR_GITHUB_READY_READINESS_2026_03_08.md`

## 2) بازبینی سریع قبل از Merge

- مرور `PR_REVIEWER_CHECKLIST_READINESS_2026_03_08.md`
- مرور `GO_LIVE_CHECKLIST_FA_2026_03_08.md`
- تایید اینکه مسیر کاربر نهایی بدون کدنویسی است.

## 3) تایید عملیاتی

- اجرای `start.bat`
- باز کردن:
  - `http://localhost:8880`
  - `http://localhost:8880/developer`
- تایید:
  - Core آنلاین
  - readiness نمایش داده می شود
  - Agent Monitor و Live Activity فعال هستند

## 4) Merge

- Merge PR روی شاخه اصلی
- تایید سلامت بعد از Merge با همان چک های Go-Live

## 5) اعلام انتشار

- متن آماده ارسال تیم:
  - `RELEASE_ANNOUNCEMENT_FA_2026_03_08.md`

## 6) مرجع نهایی یکجا

- `FINAL_DELIVERY_INDEX_FA_2026_03_08.md`

این سند آخرین گام انتشار را استاندارد می کند تا تحویل پروژه کامل و قابل اجرا باشد.
