## کارهای انجام‌شده
- اضافه کردن صفحه‌ساز با GrapesJS در `frontend/src/modules/PageBuilderModule.tsx` و ثبت/بارگذاری/حذف قالب‌ها از سمت کاربر
- پیاده‌سازی سرویس صفحه‌ساز (`frontend/src/services/pageBuilder.ts`) و تعریف شِمای جدید `PageTemplate*` در `backend/app/schemas.py`
- افزودن endpoit‌های `/api/page-builder/templates` برای لیست، ذخیره و حذف قالب‌ها در `backend/app/main.py` با استفاده از `system_settings`
- به‌روزرسانی `frontend/src/modules/index.ts` برای نمایش ماژول صفحه‌ساز در منوی سمت‌چپ
- اضافه کردن تعریف تایپ برای `grapesjs` (`frontend/src/types/grapesjs.d.ts`) و نگاشت به پروژه
- اصلاح مرورگر خطای `retroInput` با وارد کردن آن در `frontend/src/modules/SystemModule.tsx`
- اجرای `npm run build` در `frontend/` و رفع هشدار ترتیب `@import` در `frontend/src/index.css`
- بهبود فیدبک مالی: افزودن toast به `frontend/src/modules/FinanceModule.tsx` برای اعتبارسنجی فرم، خطاهای بارگذاری و ثبت موفق/ناموفق تراکنش
- پیاده‌سازی مودال تأیید رترو در `frontend/src/context/ConfirmDialogContext.tsx` و جایگزینی تمام `confirm()`‌های People/System/Dashboard/PageBuilder/CustomizableDashboard
- اجرای کامل `npm run test` و `npm run build` در `frontend/` پس از اضافه شدن `ConfirmDialogTestWrapper` و ماک‌های `useI18n`؛ خروجی Vitest و build موفق بود.
- نصب `grapesjs@0.21.5` در `frontend/package.json` تا باندل PageBuilder بدون خطا ساخته شود.
- اجرای `python -m pytest backend/tests` (محیط venv پروژه) و جمع‌آوری گزارش شکست‌ها برای داشبورد، لاگین و سال مالی.

## کارهای باقی‌مانده
- رفع خطاهای pytest (۱۲ مورد) شامل سناریوهای داشبورد، کنترل دسترسی ماژول‌ها، فیسال‌یرو، لاگین تلفنی و SMS template طبق [tests/test_dashboard_endpoints.py](backend/tests/test_dashboard_endpoints.py#L1-L220)، [tests/test_endpoints.py](backend/tests/test_endpoints.py#L1-L70)، [tests/test_fiscal_year_module.py](backend/tests/test_fiscal_year_module.py#L1-L120)، [tests/test_invoice_finalize_integration.py](backend/tests/test_invoice_finalize_integration.py#L1-L60)، [tests/test_phone_login_normalization.py](backend/tests/test_phone_login_normalization.py#L1-L100) و [tests/test_sms_settings_api.py](backend/tests/test_sms_settings_api.py#L200-L320).
- پس از رفع خطاها، اجرای مجدد pytest و به‌روزرسانی گزارش.
