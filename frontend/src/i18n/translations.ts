// Clean translations file (fully replaced to remove prior encoding corruption)
// Defines Persian (fa) and English (en) translations used across the app.

export interface Translations { [key: string]: string }

export const fa: Translations = {
  app_name: 'حساب‌پاک',
  loading: 'در حال بارگذاری...',
  error: 'خطا',
  success: 'موفق',
  warning: 'هشدار',
  cancel: 'انصراف',
  save: 'ذخیره',
  edit: 'ویرایش',
  delete: 'حذف',
  close: 'بستن',
  back: 'بازگشت',
  remove: 'حذف',
  are_you_sure: 'مطمئن هستید؟',
  please_fill_required_fields: 'لطفاً فیلدهای لازم را پر کنید',
  dashboard: 'داشبورد',
  dashboard_desc: 'نمای کلی وضعیت سیستم و کسب‌وکار',
  smart_date: 'تاریخ هوشمند',
  fiscal_year: 'سال مالی',
  today: 'امروز',
  this_month: 'این ماه',
  last_seven_days: '۷ روز گذشته',
  invoices: 'فاکتورها',
  payments: 'پرداخت‌ها',
  receipts: 'دریافت‌ها',
  inventory: 'انبار',
  people: 'اشخاص',
  reports: 'گزارش‌ها',
  settings: 'تنظیمات',
  login: 'ورود',
  logout: 'خروج',
  username: 'نام کاربری',
  password: 'رمز عبور',
  remember_me: 'مرا به خاطر بسپار',
  otp_code: 'کد یک‌بارمصرف',
  phone_login: 'ورود با تلفن',
  mobile_number: 'شماره موبایل',
  invalid_credentials: 'نام کاربری یا رمز عبور اشتباه است',
  currency: 'ارز',
  irr: 'ریال',
  usd: 'دلار آمریکا',
  aed: 'درهم امارات',
  auto_convert: 'تبدیل خودکار',
  language: 'زبان',
  persian: 'فارسی',
  english: 'انگلیسی'
}

export const en: Translations = {
  app_name: 'HesabPak',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  cancel: 'Cancel',
  save: 'Save',
  edit: 'Edit',
  delete: 'Delete',
  close: 'Close',
  back: 'Back',
  remove: 'Remove',
  are_you_sure: 'Are you sure?',
  please_fill_required_fields: 'Please fill required fields',
  dashboard: 'Dashboard',
  dashboard_desc: 'Overview of system and business status',
  smart_date: 'Smart date',
  fiscal_year: 'Fiscal year',
  today: 'Today',
  this_month: 'This Month',
  last_seven_days: 'Last 7 Days',
  invoices: 'Invoices',
  payments: 'Payments',
  receipts: 'Receipts',
  inventory: 'Inventory',
  people: 'Parties',
  reports: 'Reports',
  settings: 'Settings',
  login: 'Login',
  logout: 'Logout',
  username: 'Username',
  password: 'Password',
  remember_me: 'Remember me',
  otp_code: 'One-time code',
  phone_login: 'Login with phone',
  mobile_number: 'Mobile number',
  invalid_credentials: 'Invalid username or password',
  currency: 'Currency',
  irr: 'Iranian Rial',
  usd: 'US Dollar',
  aed: 'UAE Dirham',
  auto_convert: 'Auto convert',
  language: 'Language',
  persian: 'Persian',
  english: 'English'
}

export type TranslationKey = keyof typeof fa
export const translations = { fa, en } as const
export type LanguageCode = keyof typeof translations

/*
  BEGIN LEGACY CORRUPTED CONTENT (commented out to restore type safety and remove syntax errors)
  The following block was mojibake from previous encoding issues and is now disabled.
  If you need any additional keys, add them to the clean fa/en objects above instead.
  close: 'ط·آ·ط¢آ¨ط·آ·ط¢آ³ط·آ·ط¹آ¾ط·آ¸أ¢â‚¬آ ',



  back: 'ط·آ·ط¢آ¨ط·آ·ط¢آ§ط·آ·ط¢آ²ط·آ¹ط¢آ¯ط·آ·ط¢آ´ط·آ·ط¹آ¾',



  remove: 'ط·آ·ط¢آ­ط·آ·ط¢آ°ط·آ¸ط¸آ¾',



  are_you_sure: 'ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ·ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ¦ط·آ¸أ¢â‚¬آ  ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ³ط·آ·ط¹آ¾ط·ط›ط¥â€™ط·آ·ط¢آ¯ط·آ·ط¹ط›',



  please_fill_required_fields: 'ط·آ¸أ¢â‚¬â€چط·آ·ط¢آ·ط·آ¸ط¸آ¾ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ¹ ط·آ¸ط¸آ¾ط·ط›ط¥â€™ط·آ¸أ¢â‚¬â€چط·آ·ط¢آ¯ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ§ط·ط›ط¥â€™ ط·آ·ط¢آ¶ط·آ·ط¢آ±ط·آ¸ط«â€ ط·آ·ط¢آ±ط·ط›ط¥â€™ ط·آ·ط¢آ±ط·آ·ط¢آ§ ط·آ¸ط¢آ¾ط·آ·ط¢آ± ط·آ¹ط¢آ©ط·آ¸أ¢â‚¬آ ط·ط›ط¥â€™ط·آ·ط¢آ¯',







  // Dashboard



  dashboard: 'ط·آ·ط¢آ¯ط·آ·ط¢آ§ط·آ·ط¢آ´ط·آ·ط¢آ¨ط·آ¸ط«â€ ط·آ·ط¢آ±ط·آ·ط¢آ¯',



  dashboard_desc: 'ط·آ¸أ¢â‚¬آ ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ§ط·ط›ط¥â€™ ط·آ¹ط¢آ©ط·آ¸أ¢â‚¬â€چط·ط›ط¥â€™ ط·آ¸ط«â€  ط·آ·ط¹آ¾ط·آ·ط¢آ­ط·آ¸أ¢â‚¬â€چط·ط›ط¥â€™ط·آ¸أ¢â‚¬â€چ ط·آ·ط¢آ³ط·آ·ط¢آ±ط·ط›ط¥â€™ط·آ·ط¢آ¹ ط·آ·ط¹آ¾ط·آ·ط¢آ±ط·آ·ط¢آ§ط·آ¹ط¢آ©ط·آ¸أ¢â‚¬آ ط·آ·ط¢آ´ط£آ¢أ¢â€ڑآ¬ط¥â€™ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ§',



  smart_date: 'ط·آ·ط¹آ¾ط·آ·ط¢آ§ط·آ·ط¢آ±ط·ط›ط¥â€™ط·آ·ط¢آ® ط·آ¸أ¢â‚¬طŒط·آ¸ط«â€ ط·آ·ط¢آ´ط·آ¸أ¢â‚¬آ¦ط·آ¸أ¢â‚¬آ ط·آ·ط¢آ¯',



  fiscal_year: 'ط·آ·ط¢آ³ط·آ·ط¢آ§ط·آ¸أ¢â‚¬â€چ ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ§ط·آ¸أ¢â‚¬â€چط·ط›ط¥â€™',



  today: 'ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ±ط·آ¸ط«â€ ط·آ·ط¢آ²',



  this_month: 'ط·آ·ط¢آ§ط·ط›ط¥â€™ط·آ¸أ¢â‚¬آ  ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ§ط·آ¸أ¢â‚¬طŒ',



  last_seven_days: 'ط·ط›ط¢آ· ط·آ·ط¢آ±ط·آ¸ط«â€ ط·آ·ط¢آ² ط·آ¹ط¢آ¯ط·آ·ط¢آ°ط·آ·ط¢آ´ط·آ·ط¹آ¾ط·آ¸أ¢â‚¬طŒ',



  



  // Navigation



  invoices: 'ط·آ¸ط¸آ¾ط·آ·ط¢آ§ط·آ¹ط¢آ©ط·آ·ط¹آ¾ط·آ¸ط«â€ ط·آ·ط¢آ±ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ§',



  payments: 'ط·آ¸ط¢آ¾ط·آ·ط¢آ±ط·آ·ط¢آ¯ط·آ·ط¢آ§ط·آ·ط¢آ®ط·آ·ط¹آ¾ط£آ¢أ¢â€ڑآ¬ط¥â€™ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ§',



  receipts: 'ط·آ·ط¢آ¯ط·آ·ط¢آ±ط·ط›ط¥â€™ط·آ·ط¢آ§ط·آ¸ط¸آ¾ط·آ·ط¹آ¾ط£آ¢أ¢â€ڑآ¬ط¥â€™ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ§',



  inventory: 'ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ ط·آ·ط¢آ¨ط·آ·ط¢آ§ط·آ·ط¢آ±',



  people: 'ط·آ·ط¢آ§ط·آ·ط¢آ´ط·آ·ط¢آ®ط·آ·ط¢آ§ط·آ·ط¢آµ',



  reports: 'ط·آ¹ط¢آ¯ط·آ·ط¢آ²ط·آ·ط¢آ§ط·آ·ط¢آ±ط·آ·ط¢آ´ط£آ¢أ¢â€ڑآ¬ط¥â€™ط·آ¸أ¢â‚¬طŒط·آ·ط¢آ§',



  settings: 'ط·آ·ط¹آ¾ط·آ¸أ¢â‚¬آ ط·آ·ط¢آ¸ط·ط›ط¥â€™ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ§ط·آ·ط¹آ¾',







  // Auth



  login: 'ط·آ¸ط«â€ ط·آ·ط¢آ±ط·آ¸ط«â€ ط·آ·ط¢آ¯',



  logout: 'ط·آ·ط¢آ®ط·آ·ط¢آ±ط·آ¸ط«â€ ط·آ·ط¢آ¬',



  username: 'ط·آ¸أ¢â‚¬آ ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ¦ ط·آ¹ط¢آ©ط·آ·ط¢آ§ط·آ·ط¢آ±ط·آ·ط¢آ¨ط·آ·ط¢آ±ط·ط›ط¥â€™',



  password: 'ط·آ·ط¢آ±ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ² ط·آ·ط¢آ¹ط·آ·ط¢آ¨ط·آ¸ط«â€ ط·آ·ط¢آ±',



  remember_me: 'ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ±ط·آ·ط¢آ§ ط·آ·ط¢آ¨ط·آ¸أ¢â‚¬طŒ ط·آ·ط¢آ®ط·آ·ط¢آ§ط·آ·ط¢آ·ط·آ·ط¢آ± ط·آ·ط¢آ¨ط·آ·ط¢آ³ط·آ¸ط¢آ¾ط·آ·ط¢آ§ط·آ·ط¢آ±',



  otp_code: 'ط·آ¹ط¢آ©ط·آ·ط¢آ¯ ط·ط›ط¥â€™ط·آ¹ط¢آ©ط£آ¢أ¢â€ڑآ¬ط¥â€™ط·آ·ط¢آ¨ط·آ·ط¢آ§ط·آ·ط¢آ± ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آµط·آ·ط¢آ±ط·آ¸ط¸آ¾',



  phone_login: 'ط·آ¸ط«â€ ط·آ·ط¢آ±ط·آ¸ط«â€ ط·آ·ط¢آ¯ ط·آ·ط¢آ¨ط·آ·ط¢آ§ ط·آ·ط¹آ¾ط·آ¸أ¢â‚¬â€چط·آ¸ط¸آ¾ط·آ¸أ¢â‚¬آ ',



  mobile_number: 'ط·آ·ط¢آ´ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ§ط·آ·ط¢آ±ط·آ¸أ¢â‚¬طŒ ط·آ¸أ¢â‚¬آ¦ط·آ¸ط«â€ ط·آ·ط¢آ¨ط·آ·ط¢آ§ط·ط›ط¥â€™ط·آ¸أ¢â‚¬â€چ',



  invalid_credentials: 'ط·آ¸أ¢â‚¬آ ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ¦ ط·آ¹ط¢آ©ط·آ·ط¢آ§ط·آ·ط¢آ±ط·آ·ط¢آ¨ط·آ·ط¢آ±ط·ط›ط¥â€™ ط·ط›ط¥â€™ط·آ·ط¢آ§ ط·آ·ط¢آ±ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ² ط·آ·ط¢آ¹ط·آ·ط¢آ¨ط·آ¸ط«â€ ط·آ·ط¢آ± ط·آ¸أ¢â‚¬آ ط·آ·ط¢آ§ط·آ·ط¢آ¯ط·آ·ط¢آ±ط·آ·ط¢آ³ط·آ·ط¹آ¾ ط·آ·ط¢آ§ط·آ·ط¢آ³ط·آ·ط¹آ¾',







  // Currency



  currency: 'ط·آ·ط¢آ§ط·آ·ط¢آ±ط·آ·ط¢آ²',



  irr: 'ط·آ·ط¢آ±ط·ط›ط¥â€™ط·آ·ط¢آ§ط·آ¸أ¢â‚¬â€چ ط·آ·ط¢آ§ط·ط›ط¥â€™ط·آ·ط¢آ±ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ ',



  usd: 'ط·آ·ط¢آ¯ط·آ¸أ¢â‚¬â€چط·آ·ط¢آ§ط·آ·ط¢آ± ط·آ·ط¢آ¢ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ±ط·ط›ط¥â€™ط·آ¹ط¢آ©ط·آ·ط¢آ§',



  aed: 'ط·آ·ط¢آ¯ط·آ·ط¢آ±ط·آ¸أ¢â‚¬طŒط·آ¸أ¢â‚¬آ¦ ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ¦ط·آ·ط¢آ§ط·آ·ط¢آ±ط·آ·ط¢آ§ط·آ·ط¹آ¾',



  auto_convert: 'ط·آ·ط¹آ¾ط·آ·ط¢آ¨ط·آ·ط¢آ¯ط·ط›ط¥â€™ط·آ¸أ¢â‚¬â€چ ط·آ·ط¢آ®ط·آ¸ط«â€ ط·آ·ط¢آ¯ط·آ¹ط¢آ©ط·آ·ط¢آ§ط·آ·ط¢آ±',







  // Language



  language: 'ط·آ·ط¢آ²ط·آ·ط¢آ¨ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ ',



  persian: 'ط·آ¸ط¸آ¾ط·آ·ط¢آ§ط·آ·ط¢آ±ط·آ·ط¢آ³ط·ط›ط¥â€™',



  english: 'ط·آ·ط¢آ§ط·آ¸أ¢â‚¬آ ط·آ¹ط¢آ¯ط·آ¸أ¢â‚¬â€چط·ط›ط¥â€™ط·آ·ط¢آ³ط·ط›ط¥â€™',



  // Language: Persian (Farsi)

  export const fa = {

    // General

    app_name: 'ط­ط³ط§ط¨â€Œظ¾ط§ع©',

    loading: 'ط¯ط± ط­ط§ظ„ ط¨ط§ط±ع¯ط°ط§ط±غŒ...',

    error: 'ط®ط·ط§',

    success: 'ظ…ظˆظپظ‚',

    warning: 'ظ‡ط´ط¯ط§ط±',

    cancel: 'ط§ظ†طµط±ط§ظپ',

    save: 'ط°ط®غŒط±ظ‡',

    edit: 'ظˆغŒط±ط§غŒط´',

    delete: 'ط­ط°ظپ',

    close: 'ط¨ط³طھظ†',

    back: 'ط¨ط§ط²ع¯ط´طھ',

    remove: 'ط­ط°ظپ',

    are_you_sure: 'ظ…ط·ظ…ط¦ظ† ظ‡ط³طھغŒط¯طں',

    please_fill_required_fields: 'ظ„ط·ظپط§ظ‹ ظپغŒظ„ط¯ظ‡ط§غŒ ط¶ط±ظˆط±غŒ ط±ط§ ظ¾ط± ع©ظ†غŒط¯',


    // Dashboard

    dashboard: 'ط¯ط§ط´ط¨ظˆط±ط¯',

    dashboard_desc: 'ظ†ظ…ط§غŒ ع©ظ„غŒ ظˆ طھط­ظ„غŒظ„ ط³ط±غŒط¹ طھط±ط§ع©ظ†ط´â€Œظ‡ط§',

    smart_date: 'طھط§ط±غŒط® ظ‡ظˆط´ظ…ظ†ط¯',

    fiscal_year: 'ط³ط§ظ„ ظ…ط§ظ„غŒ',

    today: 'ط§ظ…ط±ظˆط²',

    this_month: 'ط§غŒظ† ظ…ط§ظ‡',

    last_seven_days: 'غ· ط±ظˆط² ع¯ط°ط´طھظ‡',

  

    // Navigation

    invoices: 'ظپط§ع©طھظˆط±ظ‡ط§',

    payments: 'ظ¾ط±ط¯ط§ط®طھâ€Œظ‡ط§',

    receipts: 'ط¯ط±غŒط§ظپطھâ€Œظ‡ط§',

    inventory: 'ط§ظ†ط¨ط§ط±',

    people: 'ط§ط´ط®ط§طµ',

    reports: 'ع¯ط²ط§ط±ط´â€Œظ‡ط§',

    settings: 'طھظ†ط¸غŒظ…ط§طھ',


    // Auth

    login: 'ظˆط±ظˆط¯',

    logout: 'ط®ط±ظˆط¬',

    username: 'ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ',

    password: 'ط±ظ…ط² ط¹ط¨ظˆط±',

    remember_me: 'ظ…ط±ط§ ط¨ظ‡ ط®ط§ط·ط± ط¨ط³ظ¾ط§ط±',

    otp_code: 'ع©ط¯ غŒع©â€Œط¨ط§ط± ظ…طµط±ظپ',

    phone_login: 'ظˆط±ظˆط¯ ط¨ط§ طھظ„ظپظ†',

    mobile_number: 'ط´ظ…ط§ط±ظ‡ ظ…ظˆط¨ط§غŒظ„',

    invalid_credentials: 'ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ غŒط§ ط±ظ…ط² ط¹ط¨ظˆط± ظ†ط§ط¯ط±ط³طھ ط§ط³طھ',


    // Currency

    currency: 'ط§ط±ط²',

    irr: 'ط±غŒط§ظ„ ط§غŒط±ط§ظ†',

    usd: 'ط¯ظ„ط§ط± ط¢ظ…ط±غŒع©ط§',

    aed: 'ط¯ط±ظ‡ظ… ط§ظ…ط§ط±ط§طھ',

    auto_convert: 'طھط¨ط¯غŒظ„ ط®ظˆط¯ع©ط§ط±',


    // Language

    language: 'ط²ط¨ط§ظ†',

    persian: 'ظپط§ط±ط³غŒ',

    english: 'ط§ظ†ع¯ظ„غŒط³غŒ',

    arabic: 'ط¹ط±ط¨غŒ',

    kurdish: 'ع©ط±ط¯غŒ',


    // Customer Groups

    customer_groups: 'ع¯ط±ظˆظ‡â€Œظ‡ط§غŒ ظ…ط´طھط±غŒ',

    manage_customer_groups_description: 'ع¯ط±ظˆظ‡â€Œظ‡ط§غŒ ظ…ط´طھط±غŒ ط±ط§ ط¨ط±ط§غŒ ط³ط§ط²ظ…ط§ظ†â€Œط¯ظ‡غŒ ط¨ظ‡طھط± ط§غŒط¬ط§ط¯ ظˆ ظ…ط¯غŒط±غŒطھ ع©ظ†غŒط¯',

    create_group: 'ط§غŒط¬ط§ط¯ ع¯ط±ظˆظ‡',

    edit_group: 'ظˆغŒط±ط§غŒط´ ع¯ط±ظˆظ‡',

    group_name: 'ظ†ط§ظ… ع¯ط±ظˆظ‡',

    group_description: 'طھظˆط¶غŒط­ ع¯ط±ظˆظ‡',

    is_shared: 'ط§ط´طھط±ط§ع©غŒ',

    no_groups_yet: 'ظ‡ظ†ظˆط² ع¯ط±ظˆظ‡غŒ ط³ط§ط®طھظ‡ ظ†ط´ط¯ظ‡ ط§ط³طھ',

    no_members_yet: 'ظ‡ظ†ظˆط² ط¹ط¶ظˆغŒ ط§ظپط²ظˆط¯ظ‡ ظ†ط´ط¯ظ‡ ط§ط³طھ',

    add_member: 'ط§ظپط²ظˆط¯ظ† ط¹ط¶ظˆ',

    select_person: 'ط§ظ†طھط®ط§ط¨ ط´ط®طµ',

    members: 'ط§ط¹ط¶ط§',

    shared: 'ط§ط´طھط±ط§ع©غŒ',

    private: 'ط®طµظˆطµغŒ',

    please_select_group_and_member: 'ظ„ط·ظپط§ظ‹ ع¯ط±ظˆظ‡ ظˆ ط¹ط¶ظˆ ط±ط§ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯',

    name: 'ظ†ط§ظ…',

  

    // ICC Shop

    integration: 'غŒع©ظ¾ط§ط±ع†ظ‡â€Œط³ط§ط²غŒ',

    icc_shop: 'ظپط±ظˆط´ع¯ط§ظ‡ ICC',

    registration: 'ط«ط¨طھâ€Œظ†ط§ظ…',

    active_module: 'ظ…ط§ع©ظˆظ„ ظپط¹ط§ظ„',

    module_not_found: 'ظ…ط§ع©ظˆظ„ غŒط§ظپطھ ظ†ط´ط¯',

    loading_system: 'ط¯ط± ط­ط§ظ„ ط¨ط§ط±ع¯ط°ط§ط±غŒ ط³غŒط³طھظ…...',

    command_pad: 'ظ¾ظ†ظ„ ظپط±ظ…ط§ظ†',

    activity_counter: 'ط´ظ…ط§ط±ظ†ط¯ظ‡ ظپظ†ط§ظ„غŒطھ',

    sales_trend: 'ط±ظˆظ†ط¯ ظپط±ظˆط´',

    latest_invoices: 'ط¢ط®ط±غŒظ† ظپط§ع©طھظˆط±ظ‡ط§',

    inventory_snapshot: 'ظ†ظ…ط§غŒ ظ„ط­ط¸ظ‡â€Œط§غŒ ظ…ظˆط¬ظˆط¯غŒ',

    aging_inventory: 'ظ…ظˆط¬ظˆط¯غŒ ط±ط§ع©ط¯',

    checks_due: 'ع†ع©â€Œظ‡ط§غŒ ط³ط±ط±ط³غŒط¯',

    fx_rates: 'ظ†ط±ط® ط§ط±ط²',

    crypto: 'ط±ظ…ط²ط§ط±ط²',

    categories: 'ط¯ط³طھظ‡â€Œظ‡ط§',

    centers: 'ظ…ط±ط§ع©ط²',

    units: 'ظˆط§ط­ط¯ظ‡ط§',

    extensions: 'ط§ظپط²ظˆظ†ظ‡â€Œظ‡ط§',

    // Messages

    save_success: 'طھط؛غŒغŒط±ط§طھ ط¨ط§ ظ…ظˆظپظ‚غŒطھ ط°ط®غŒط±ظ‡ ط´ط¯',

    delete_confirm: 'ط§ط² ط­ط°ظپ ط§غŒظ† ظ…ظˆط±ط¯ ظ…ط·ظ…ط¦ظ† ظ‡ط³طھغŒط¯طں',

    operation_failed: 'ط¹ظ…ظ„غŒط§طھ ظ†ط§ظ…ظˆظپظ‚ ط¨ظˆط¯',

    session_expired: 'ظ†ط´ط³طھ ط´ظ…ط§ ظ…ظ†ظ‚ط¶غŒ ط´ط¯ظ‡ ط§ط³طھ',

  }


  // Language: English

  export const en = {

    // General

    app_name: 'HesabPak',

    loading: 'Loading...',

    error: 'Error',

    success: 'Success',

    warning: 'Warning',

    cancel: 'Cancel',

    save: 'Save',

    edit: 'Edit',

    delete: 'Delete',

    close: 'Close',

    back: 'Back',

    remove: 'Remove',

    are_you_sure: 'Are you sure?',

    please_fill_required_fields: 'Please fill required fields',


    // Dashboard

    dashboard: 'Dashboard',

    dashboard_desc: 'Overview and quick analysis of transactions',

    smart_date: 'Smart Date',

    fiscal_year: 'Fiscal Year',

    today: 'Today',

    this_month: 'This Month',

    last_seven_days: 'Last 7 Days',


    // Navigation

    invoices: 'Invoices',

    payments: 'Payments',

    receipts: 'Receipts',

    inventory: 'Inventory',

    people: 'Parties',

    reports: 'Reports',

    settings: 'Settings',


    // Auth

    login: 'Login',

    logout: 'Logout',

    username: 'Username',

    password: 'Password',

    remember_me: 'Remember me',

    otp_code: 'One-time code',

    phone_login: 'Login with phone',

    mobile_number: 'Mobile number',

    invalid_credentials: 'Invalid username or password',


    // Currency

    currency: 'Currency',

    irr: 'Iranian Rial',

    usd: 'US Dollar',

    aed: 'UAE Dirham',

    auto_convert: 'Auto convert',


    // Language

    language: 'Language',

    persian: 'Persian',

    english: 'English',

    arabic: 'Arabic',

    kurdish: 'Kurdish',

  }


  // Language: Arabic (placeholder uses English to avoid encoding issues)

  export const ar = {

    ...en,

  }


  // Language: Kurdish (placeholder uses English to avoid encoding issues)

  export const ku = {

    ...en,

  }


  export type TranslationKey = keyof typeof fa


  export const translations = {

    fa,

    en,

    ar,

    ku,

  } as const


  export type LanguageCode = keyof typeof translations


  today: 'Today',



  this_month: 'This Month',



  last_seven_days: 'Last 7 Days',







  // Navigation



  invoices: 'Invoices',



  payments: 'Payments',



  receipts: 'Receipts',



  inventory: 'Inventory',



  people: 'Parties',



  reports: 'Reports',



  settings: 'Settings',







  // Auth



  login: 'Login',



  logout: 'Logout',



  username: 'Username',



  password: 'Password',



  remember_me: 'Remember me',



  otp_code: 'One-time code',



  phone_login: 'Login with phone',



  mobile_number: 'Mobile number',



  invalid_credentials: 'Invalid username or password',







  // Currency



  currency: 'Currency',



  irr: 'Iranian Rial',



  usd: 'US Dollar',



  aed: 'UAE Dirham',



  auto_convert: 'Auto convert',







  // Language



  language: 'Language',



  persian: 'Persian',



  english: 'English',



  arabic: 'Arabic',



  kurdish: 'Kurdish',



}







// Language: Arabic (placeholder uses English to avoid encoding issues)



export const ar = {



  ...en,



}







// Language: Kurdish (placeholder uses English to avoid encoding issues)



export const ku = {



  ...en,



}







export type TranslationKey = keyof typeof fa







export const translations = {



  fa,



  en,



  ar,



  ku,



} as const







export type LanguageCode = keyof typeof translations
*/



