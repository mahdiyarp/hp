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

---

**نسخه:** 1.0.0
