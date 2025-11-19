# راه‌اندازی HesabPak روی هاست cPanel

این راهنما برای کاربری نوشته شده که فقط بلد است با کامپیوتر کار کند و می‌خواهد کل سامانه روی آدرس `https://hesabpak.com/app` در یک هاست اشتراکی cPanel اجرا شود. تمام مراحل به ترتیب آمده‌اند و در بخش «اسکریپت یک‌کلیکی» می‌توانید متن را فقط کپی/پیست کنید تا نصب و به‌روزرسانی انجام شود.

---

## ۱) پیش‌نیازها

| مورد | توضیح |
| --- | --- |
| دسترسی به cPanel | ترجیحاً با user اصلی دامنه `hesabpak.com` |
| فعال بودن **Terminal** و **SSH** | از منوی _Terminal_ در cPanel استفاده می‌کنیم. |
| Node.js 18+، Python 3.11 و Git روی هاست | روی اغلب هاست‌های جدید فعال است؛ در غیر این صورت از بخش _Select PHP/Node/Python_ فعال کنید. |
| فضای دست‌کم ۲ گیگابایت | حدود ۱ گیگ برای سورس، بقیه برای build و دیتابیس SQLite/PostgreSQL. |
| دامنه/ساب‌دامنه `hesabpak.com/app` | اگر هنوز پوشه‌ای به نام `app` ندارید، در بخش **Subdomains**، یک subdomain به نام `app.hesabpak.com` بسازید و Document Root را `public_html/app` قرار دهید. |

> **نکته:** اگر می‌خواهید API به یک دیتابیس PostgreSQL واقعی وصل شود باید از بخش **Remote Databases** اطلاعات اتصال (`DATABASE_URL`) را فراهم کنید. برای تست سریع می‌توانید از SQLite استفاده کنید.

---

## ۲) چک‌لیست سریع قبل از اجرا

1. وارد cPanel شوید.
2. از منوی **Terminal** یک تب باز کنید.
3. در پوشهٔ خانگی (`~`) مسیر `apps/hesabpak` را نداشته باشید (اسکریپت خودش می‌سازد).
4. اگر می‌خواهید سورس را از Git خصوصی دریافت کنید، یک توکن Read-Only آماده داشته باشید.

---

## ۳) اسکریپت یک‌کلیکی (کپی/پیست)

1. وارد ترمینال cPanel شوید.
2. متن زیر را *دقیقاً* کپی و پیست کنید. در صورتی که URL مخزن شما متفاوت است، مقدار `REPO_URL` را قبل از اجرای اسکریپت تغییر دهید.

```bash
cat <<'EOF' > ~/hesabpak_cpanel.sh
#!/bin/bash
set -euo pipefail

# === مقداردهی ===
REPO_URL="https://github.com/mahdiyarp/hp.git"   # <-- این خط را در صورت نیاز عوض کنید
APP_ROOT="$HOME/apps/hesabpak"
PUBLIC_DIR="$HOME/public_html/app"
BACKEND_PORT=8100        # پورت داخلی که API روی آن اجرا می‌شود

# === تابع لاگ ===
log() {
  printf '\n\033[1;34m[HesabPak]\033[0m %s\n' "$1"
}

log "ایجاد پوشه‌های اصلی"
mkdir -p "$APP_ROOT"

if [ -d "$APP_ROOT/source/.git" ]; then
  log "آپدیت سورس موجود"
  cd "$APP_ROOT/source"
  git pull --ff-only
else
  log "کلون مخزن"
  git clone --depth 1 "$REPO_URL" "$APP_ROOT/source"
fi

log "نصب پیش‌نیازهای بک‌اند (Python)"
python3 -m venv "$APP_ROOT/venv"
source "$APP_ROOT/venv/bin/activate"
pip install --upgrade pip
pip install -r "$APP_ROOT/source/backend/requirements.txt" gunicorn uvicorn

if [ ! -f "$APP_ROOT/source/backend/.env" ]; then
  cp "$APP_ROOT/source/backend/.env.example" "$APP_ROOT/source/backend/.env"
  log "فایل backend/.env ساخته شد. بعد از پایان اسکریپت آن را طبق توضیحات پر کنید."
fi

log "اجرای مایگریشن‌های دیتابیس"
cd "$APP_ROOT/source/backend"
alembic upgrade head
deactivate

log "نصب و build فرانت‌اند"
cd "$APP_ROOT/source/frontend"
npm install
npm run build

log "انتقال build به public_html/app"
rm -rf "$PUBLIC_DIR"
mkdir -p "$PUBLIC_DIR"
cp -r dist/* "$PUBLIC_DIR"

log "ایجاد .htaccess برای SPA و فوروارد API"
cat <<'HTEOF' > "$PUBLIC_DIR/.htaccess"
Options -MultiViews
RewriteEngine On
# سرویس فایل‌های ایستا
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
# مسیرهای API را به backend (روی پورت داخلی) می‌فرستیم
RewriteRule ^api/(.*)$ http://127.0.0.1:8100/api/$1 [P,L]
# سایر مسیرها به index.html
RewriteRule ^ index.html [L]
HTEOF

log "ایجاد اسکریپت اجرای backend"
mkdir -p "$APP_ROOT/run"
cat <<'BEOF' > "$APP_ROOT/run/start-backend.sh"
#!/bin/bash
cd "$APP_ROOT/source/backend"
source "$APP_ROOT/venv/bin/activate"
exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 127.0.0.1:8100 --workers 2 --timeout 120
BEOF
chmod +x "$APP_ROOT/run/start-backend.sh"

log "راه‌اندازی سرویس با PM2 (اگر نصب باشد)"
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete hesabpak-api >/dev/null 2>&1 || true
  pm2 start "$APP_ROOT/run/start-backend.sh" --name hesabpak-api
  pm2 save
  pm2 status hesabpak-api
else
  log "هشدار: PM2 نصب نیست. برای اجرای پایدار، npm install -g pm2 را اجرا و اسکریپت را مجدد اجرا کنید."
fi

log "نصب تمام شد. لطفاً backend/.env را بازبینی کنید."
EOF

chmod +x ~/hesabpak_cpanel.sh
bash ~/hesabpak_cpanel.sh
```

> اگر با پیغام `permission denied` مواجه شدید، ابتدا دستور `chmod +x ~/hesabpak_cpanel.sh` را اجرا و سپس `bash ~/hesabpak_cpanel.sh` را دوباره بزنید.

---

## ۴) تنظیم متغیرهای محیطی (backend/.env)

بعد از اجرای اسکریپت، فایل `apps/hesabpak/source/backend/.env` ساخته می‌شود. حداقل کلیدهای زیر را ویرایش کنید:

| کلید | توضیح |
| --- | --- |
| `DATABASE_URL` | برای تست: `sqlite:///./data/app.db` (پوشه `backend/data` ساخته می‌شود). برای PostgreSQL فرمت `postgresql://USER:PASS@HOST:5432/DB` |
| `SECRET_KEY` | می‌توانید از دستور `openssl rand -hex 32` یک مقدار بسازید. |
| `BACKEND_CORS_ORIGINS` | حداقل شامل `https://hesabpak.com` باشد. |
| `STORAGE_ROOT` | مسیر دلخواه برای فایل‌های پیوست؛ به صورت پیش‌فرض `./storage`. |

بعد از ذخیره، سرویس با `pm2 restart hesabpak-api` (یا اجرای مجدد اسکریپت) تنظیمات جدید را می‌خواند.

---

## ۵) نمایش سایت روی `hesabpak.com/app`

1. در مرورگر به `https://hesabpak.com/app` بروید؛ باید صفحهٔ لاگین HesabPak را ببینید.
2. اگر API بالا نیست، دستور `pm2 logs hesabpak-api` را در ترمینال بزنید تا خطا مشخص شود.
3. در صورت نیاز، فایل `.htaccess` داخل `public_html/.htaccess` را باز کنید و مطمئن شوید خط زیر فعال است (برای فعال شدن Proxy):

```
RewriteEngine On
RewriteRule ^app/api/(.*)$ http://127.0.0.1:8100/api/$1 [P,L]
```

> بعضی هاست‌ها ماژول proxy را محدود می‌کنند؛ اگر ارور 500 دیدید، با پشتیبانی هاست بخواهید `mod_proxy` و `mod_proxy_http` روی اکانت شما فعال باشد.

---

## ۶) به‌روزرسانی و مدیریت نسخه

- **به‌روزرسانی از ترمینال:** هر زمان لازم بود نسخهٔ جدید بگیرید، فقط همین دو دستور را اجرا کنید:

```bash
bash ~/hesabpak_cpanel.sh   # pull + build + restart
```

- **به‌روزرسانی از داخل برنامه:** بعد از ورود به پنل، به ماژول `سیستم > مدیریت نسخه` بروید. برای راحتی، در گزارش ماژول یک لینک به `https://hesabpak.com/app/#/system` در اختیار تیم پشتیبانی قرار دهید تا لاگ نسخه و اطلاعات `pm2` را ببینند. (در صورت نیاز می‌توانید لینک همین راهنما را هم آنجا قرار دهید.)

---

## ۷) نکات تکمیلی

1. **راه‌اندازی خودکار بعد از ریبوت:** در cPanel معمولاً `pm2 save` و `pm2 resurrect` در Cron با `@reboot` اجرا می‌شود. برای اطمینان، در بخش **Cron Jobs** یک خط اضافه کنید:
   ```
   @reboot /home/USERNAME/.local/bin/pm2 resurrect
   ```
2. **تهیه نسخه پشتیبان:** پوشه‌های زیر را به‌صورت دوره‌ای دانلود کنید:
   - `apps/hesabpak/source/backend/data` (دیتابیس SQLite، در صورت استفاده)
   - `apps/hesabpak/source/backend/storage` (فایل‌های پیوست)
   - دامپ PostgreSQL اگر از دیتابیس خارجی استفاده می‌کنید.
3. **SSL/HTTPS:** چون سایت روی `https://hesabpak.com/app` می‌آید، فقط کافی است گواهی SSL اصلی دامنه فعال باشد. اگر خطای mixed content گرفتید، مطمئن شوید متغیر `FRONTEND_BASE_URL` در `.env` روی آدرس HTTPS تنظیم شده باشد.

---

## ۸) سوالات متداول

| سوال | پاسخ کوتاه |
| --- | --- |
| اگر pm2 نصب نبود؟ | در Terminal دستور `npm install -g pm2` را بزنید و دوباره اسکریپت را اجرا کنید. |
| دیتابیس من PostgreSQL ریموت است، چه کنم؟ | فقط `DATABASE_URL` را مطابق اطلاعات سرویس‌دهنده وارد کنید و مطمئن شوید سرور دیتابیس اتصال IP هاست شما را مجاز کرده است. |
| آیا می‌توانم چند نسخه داشته باشم؟ | بله؛ کافی است `APP_ROOT` و پورت را تغییر دهید. برای محیط تست مثلاً `~/apps/hesabpak-staging` و پورت 8200. |
| برای لاگ‌ها از کجا بررسی کنم؟ | `pm2 logs hesabpak-api` برای API و فایل‌های موجود در `~/apps/hesabpak/source/backend/app` (loggers داخلی) را مشاهده کنید. |

---

با انجام گام‌های بالا، تمام بخش‌های HesabPak (بک‌اند + فرانت‌اند) روی هاست اشتراکی cPanel راه‌اندازی می‌شود و از طریق `hesabpak.com/app` در دسترس است. هر زمان که به نسخهٔ جدید نیاز داشتید، فقط اسکریپت را دوباره اجرا کنید یا از طریق ماژول مدیریت نسخه لینک آپدیت را برای تیم پشتیبانی ارسال کنید. موفق باشید! 🎉
