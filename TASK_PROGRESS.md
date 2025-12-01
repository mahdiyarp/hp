## کارهای انجام‌شده
- اضافه کردن صفحه‌ساز با GrapesJS در `frontend/src/modules/PageBuilderModule.tsx` و ثبت/بارگذاری/حذف قالب‌ها از سمت کاربر
- پیاده‌سازی سرویس صفحه‌ساز (`frontend/src/services/pageBuilder.ts`) و تعریف شِمای جدید `PageTemplate*` در `backend/app/schemas.py`
- افزودن endpoit‌های `/api/page-builder/templates` برای لیست، ذخیره و حذف قالب‌ها در `backend/app/main.py` با استفاده از `system_settings`
- به‌روزرسانی `frontend/src/modules/index.ts` برای نمایش ماژول صفحه‌ساز در منوی سمت‌چپ
- اضافه کردن تعریف تایپ برای `grapesjs` (`frontend/src/types/grapesjs.d.ts`) و نگاشت به پروژه
- اصلاح مرورگر خطای `retroInput` با وارد کردن آن در `frontend/src/modules/SystemModule.tsx`

## کارهای باقی‌مانده
- اجرای `docker compose up --build` یا `npm run build` در `frontend/` تا بسته‌های جدید ساخته شوند و خطاهای runtime (مثلاً گس اولیه) آزمایش شود
- تست کامل جریان ورود، ارسال/دریافت قالب، و سازگاری منوی صفحه‌ساز با داده‌های backend
- بررسی دقیق‌تر لاگ‌ها پس از اجرای سرور و اطمینان از واکنش صحیح endpointهای جدید (در صورت نیاز می‌توان تست‌های دستی API نوشت)
