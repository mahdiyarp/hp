# چک لیست Go-Live (بدون کدنویسی) - 2026-03-08

## قبل از اعلام انتشار

1. `start.bat` اجرا شود و پیام `[OK] Services are running.` نمایش داده شود.
2. آدرس `http://localhost:8880` باز شود.
3. آدرس `http://localhost:8880/developer` باز شود.
4. در داشبورد `/developer`:
   - Core آنلاین باشد.
   - readiness نمایش داده شود.
   - دکمه های عملیات دستی فعال باشند.

## تست سریع عملیاتی

1. چک سریع سیستم از داشبورد اجرا شود.
2. یک پیام تست در دستیار ارسال شود و پاسخ دریافت شود.
3. وضعیت Agent Monitor لود شود.
4. Live Activity Feed رویداد جدید نشان دهد.

## مسیر بازیابی در صورت خطا

1. `stop.bat`
2. 5 ثانیه صبر
3. `start.bat`
4. بازبینی مجدد `/developer`

## معیار تایید نهایی

- سرویس ها پایدار
- Core و مدل فعال قابل مشاهده
- ارتباط زنده Front/Core برقرار
- کاربر بدون ترمینال قادر به کار روزانه باشد

## خروجی های مرجع

- `OPERATOR_FINAL_HANDOFF_FA_2026_03_08.md`
- `MISSION_COMPLETION_FINAL_2026_03_08_FA.md`
- `EXECUTIVE_STATUS_2026_03_08_FA.md`
- `RELEASE_ANNOUNCEMENT_FA_2026_03_08.md`
