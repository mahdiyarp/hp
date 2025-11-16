# Team & Access Control Documentation

## 🏢 تیم توسعه - Development Team

### 👨‍💼 Member 1: Mehdi Pakzamir (Developer)

**مسئولیت‌های اصلی:**
- Architect & Lead Developer
- System Design & Implementation  
- API Development
- Database Design
- Integration Management
- SMS & Payment Gateway Configuration
- Technical Support & Consultation

**سطح دسترسی:** Developer (All 23 Permissions)

**اطلاعات تماس:**
- Email: mahdiyarp@gmail.com
- Mobile: 09123506545
- Phone: 88808881, 09121762222
- Username: `mehdi_pakzamir`

**محدودیت‌های قانونی:**
- ❌ عدم دخل و تصرف در اسناد مالی اتمام‌شده
- ❌ عدم ویرایش سوابق تایید‌شده حسابداری
- ❌ عدم صدور چک یا پرداخت بدون تأیید
- ❌ عدم حذف سوابق مالی دائمی

---

## 🔐 نقش‌ها و دسترسی‌ها (Roles & Permissions)

### نقش‌های سیستم (System Roles)

#### 1️⃣ **Admin** (مدیر کل)
- **کاربران**: کاربران ادمین و نقش‌های مدیریتی
- **مجوزهای**: تمام 23 مجوز
- **دسترسی**: دسترسی کامل به تمام ماژول‌ها

#### 2️⃣ **Manager** (مدیر عملیات)
- **دسترسی**: مدیریت تمام موارد عملیاتی
- **مجوزهای**: 
  - Finance: view, create, edit, report
  - Sales: view, create, edit, finalize
  - People: view, create, edit
  - Inventory: view, create, edit
  - Settings: view

#### 3️⃣ **Accountant** (حسابدار)
- **دسترسی**: مدیریت مالی و حسابداری
- **مجوزهای**:
  - Finance: view, create, edit, report
  - People: view
  - Settings: view (read-only)

#### 4️⃣ **Salesman** (فروشنده)
- **دسترسی**: مدیریت فروش
- **مجوزهای**:
  - Sales: view, create, edit, finalize
  - People: view, create
  - Inventory: view

#### 5️⃣ **Viewer** (بیننده)
- **دسترسی**: تنها مشاهده‌ی داده‌ها
- **مجوزهای**:
  - Finance: view
  - Sales: view
  - People: view
  - Inventory: view
  - Settings: view (read-only)

#### 6️⃣ **Developer** (توسعه‌دهنده)
- **کاربران**: مهدی پاک‌ضمیر
- **مجوزهای**: تمام 23 مجوز (مشابه Admin، اما با محدودیت‌های قانونی)
- **دسترسی**: 
  - All modules (reports, finance, sales, people, inventory, settings)
  - All APIs (read & write)
  - System configuration
  - User management
  - Backup & restore

---

## 🔑 23 مجوز سیستم (System Permissions)

### دسته‌بندی مجوزها:

#### 💰 **Finance Module** (5 مجوز)
```
✓ finance_view      — مشاهده پرداخت‌ها و دریافت‌ها
✓ finance_create    — ایجاد سند مالی جدید
✓ finance_edit      — ویرایش اسناد مالی
✓ finance_delete    — حذف اسناد مالی (با شرط)
✓ finance_report    — دسترسی به گزارشات مالی (P&L, Cash Flow)
```

#### 💳 **Sales Module** (5 مجوز)
```
✓ sales_view        — مشاهده فاکتورهای فروش
✓ sales_create      — ایجاد فاکتور فروش جدید
✓ sales_edit        — ویرایش فاکتورهای فروش
✓ sales_delete      — حذف فاکتورهای فروش
✓ sales_finalize    — تایید و نهایی کردن فاکتور
```

#### 👥 **People Module** (4 مجوز)
```
✓ people_view       — مشاهده مشتریان و تأمین‌کنندگان
✓ people_create     — ایجاد مشتری/تأمین‌کننده جدید
✓ people_edit       — ویرایش اطلاعات شخص
✓ people_delete     — حذف شخص
```

#### 📦 **Inventory Module** (5 مجوز)
```
✓ inventory_view    — مشاهده موجودی کالاها
✓ inventory_create  — ایجاد محصول جدید
✓ inventory_edit    — ویرایش اطلاعات محصول
✓ inventory_delete  — حذف محصول
✓ inventory_adjust  — تنظیم موجودی
```

#### 🛠️ **Settings Module** (3 مجوز)
```
✓ settings_view     — مشاهده تنظیمات سیستم
✓ settings_edit     — تغییر تنظیمات سیستم
✓ users_manage      — ایجاد، ویرایش، حذف کاربران
```

#### 💾 **Backup Module** (1 مجوز)
```
✓ backup_manage     — مدیریت نسخه‌های پشتیبان
```

---

## 📊 ماتریس دسترسی (Access Matrix)

| Permission | Admin | Manager | Accountant | Salesman | Viewer | Developer |
|-----------|-------|---------|-----------|----------|--------|-----------|
| finance_view | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| finance_create | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| finance_edit | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| finance_delete | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️* |
| finance_report | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| sales_view | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| sales_create | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| sales_edit | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| sales_delete | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️* |
| sales_finalize | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| people_view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| people_create | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| people_edit | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| people_delete | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️* |
| inventory_view | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| inventory_create | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| inventory_edit | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| inventory_delete | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️* |
| inventory_adjust | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| settings_view | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| settings_edit | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| users_manage | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| backup_manage | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

**⚠️ توجه:** Developer می‌تواند حذف کند اما با شرط قانونی (سوابق اتمام‌شده قابل حذف نیستند)

---

## 🔗 API Access Control

### Endpoint Authorization

تمام endpoints از `require_permissions()` decorator استفاده می‌کنند:

```python
@app.get('/api/payments')
def list_payments(..., current: models.User = Depends(get_current_user)):
    require_permissions(['finance_view'])(current)
    # ... rest of logic
```

### Permission Inheritance

- هر کاربر از نقش خود تمام مجوزها را به‌ارث می‌برد
- بررسی دسترسی: اگر کاربر **یکی** از مجوزهای الزامی را داشته باشد، دسترسی اعطا می‌شود
- Audit logging: هر درخواست ثبت می‌شود (user, timestamp, endpoint, result)

---

## 🔒 SMS & Integration Services

### 1. SMS Providers
```
✓ Kavenegar  — HTTP GET with apikey
✓ Ghasedak   — HTTP POST with apikey header
✓ IPPanel    — HTTP POST with Bearer token
```

### 2. Authorization
- **Accountant/Salesman**: Can send test messages only
- **Manager/Admin**: Can configure providers
- **Developer**: Full access (configure + send + test)

### 3. Configuration
- SMS Config stored in database with encryption
- API Keys never exposed in logs
- Test endpoint available for verification

---

## 🎯 وظایف و مسئولیت‌ها (Responsibilities)

### Mehdi Pakzamir (Developer)

#### 1️⃣ طراحی و توسعه
- ✓ معماری سیستم
- ✓ پیاده‌سازی APIs
- ✓ طراحی Database
- ✓ Integration با سرویس‌های خارجی

#### 2️⃣ کنترل و نظارت
- ✓ Performance monitoring
- ✓ Security auditing
- ✓ Error handling & debugging
- ✓ Log review & analysis

#### 3️⃣ پشتیبانی مالی
- ✓ Problem solving
- ✓ Feature requests review
- ✓ Technical consultation
- ✓ System optimization

#### 4️⃣ ارائه سرویس
- ✓ API documentation
- ✓ User training
- ✓ Troubleshooting
- ✓ System maintenance

#### 5️⃣ مدیریت سیستم
- ✓ User account creation
- ✓ Role assignment
- ✓ Backup & restore
- ✓ Migration & updates

---

## ⚠️ قوانین و محدودیت‌ها (Rules & Restrictions)

### Developer Cannot:
```
❌ تغییر سوابق مالی تایید‌شده (اسناد نهایی‌شده)
❌ حذف معاملات بدون بکاپ قبلی
❌ دسترسی به حساب‌های شخصی کاربران دیگر
❌ استخراج اطلاعات شخصی مشتریان بدون مجوز
❌ تغییر تاریخ معاملات برای تعدیل گزارشات
❌ دسترسی برای کاری غیرقانونی
```

### Developer Can:
```
✅ ایجاد داده‌های تست برای توسعه
✅ دسترسی به لاگ‌های کامل
✅ ویرایش تنظیمات سیستم
✅ مدیریت کاربران و نقش‌ها
✅ کنترل SMS و Integration
✅ بکاپ و بازیابی داده‌ها
```

---

## 📋 Audit & Compliance

### Activity Logging
تمام فعالیت‌ها ثبت می‌شوند:
- **User**: نام کاربر
- **Timestamp**: زمان دقیق (UTC)
- **Action**: نوع عملیات (CREATE, UPDATE, DELETE, VIEW)
- **Resource**: چه داده‌ای تغییر یافت
- **Details**: تغییرات قبل و بعد

### Audit Review
- گزارشات قابل‌جستجو
- فیلتر بر اساس user, date range, action
- Export برای auditing خارجی

### Compliance
- ✅ GDPR compliant (no unnecessary data extraction)
- ✅ Audit trail available
- ✅ Encryption for sensitive data
- ✅ Backup retention policy

---

## 🔄 تغییرات و بروز‌رسانی (Change Log)

| تاریخ | نسخه | تغییرات |
|------|------|---------|
| 14/11/2025 | 1.0 | ایجاد Developer Profile و تیم |
| TBD | 1.1 | اضافه کردن نقش‌های جدید (اگر لازم) |
| TBD | 2.0 | اضافه کردن Permission groups |

---

**سند مرجع**: Team & Access Control Documentation  
**وضعیت**: ✅ فعال  
**آخرین بروز‌رسانی**: 14 نوامبر 2025  
**نسخه**: 1.0
