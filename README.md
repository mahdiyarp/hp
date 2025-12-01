# HesabPak - سیستم حسابداری فارسی 💰

سیستم جامع حسابداری و مدیریت تراکنش‌های مالی با رابط کاربری فارسی و امکانات کامل.

## 🚀 راه‌اندازی سریع

### پیش‌نیازها
- Docker و Docker Compose نصب شده
- Windows, macOS یا Linux

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
