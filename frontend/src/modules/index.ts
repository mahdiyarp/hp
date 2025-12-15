export { }
import DashboardModule from './DashboardModule'
import SalesModule from './SalesModule'
import FinanceModule from './FinanceModule'
import InventoryModule from './InventoryModule'
import PeopleModule from './PeopleModule'
import ReportsModule from './ReportsModule'
import SystemModule from './SystemModule'
import UsersModule from './settings/UsersModule'
import BanksModule from './settings/BanksModule'
import DevConsole from './developer/DevConsole'
import SmsPanel from './sms/SmsPanel'
import PApiPanel from './PApiPanel'
import AuditModule from './audit/AuditModule'
import { getAccessToken, loginDeveloper } from '../services/auth'
import type { ModuleDefinition } from '../components/layout/AppShell'

function base64urlDecode(input: string): string {
  try {
    let b64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    if (pad === 2) b64 += '=='
    else if (pad === 3) b64 += '='
    return atob(b64)
  } catch {
    return ''
  }
}

function isDeveloperMobileUser(): boolean {
  try {
    const token = getAccessToken()
    if (!token) return false
    // Lightweight decode JWT payload without external libs
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payloadStr = base64urlDecode(parts[1])
    if (!payloadStr) return false
    const payloadJson = JSON.parse(payloadStr)
    const sub = String(payloadJson.sub || '')
    // Allow developer menu only for the specific mobile user
    return sub === '09123506545' || sub === 'developer'
  } catch {
    return false
  }
}

function getUserRoleFromToken(): string | null {
  try {
    const token = getAccessToken()
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payloadStr = base64urlDecode(parts[1])
    if (!payloadStr) return null
    const payloadJson = JSON.parse(payloadStr)
    const role = String(payloadJson.role || payloadJson['x-role'] || '')
    return role || null
  } catch {
    return null
  }
}

function isAdminOrDeveloper(): boolean {
  const role = getUserRoleFromToken()
  return role === 'Admin' || isDeveloperMobileUser()
}

export const modules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'داشبورد',
    description: 'نمایش خلاصه و معمّای خوی معاملات و تحلیل‌های سریع',
    component: DashboardModule,
    badge: 'DASHBOARD',
    feature: 'reports',
  },
  {
    id: 'reports',
    label: 'گزارش‌ها و تحلیل‌ها',
    description: 'سود و زیان، تراز نقدی و ارزش موجودی',
    component: ReportsModule,
    badge: 'REPORTS',
    feature: 'reports',
  },
  {
    id: 'sales',
    label: 'فروش و اسناد',
    description: 'مدیریت فاکتورهای فروش و خرید، همراه با فیلترهای پیشرفته',
    component: SalesModule,
    badge: 'SALES',
    feature: 'invoices',
  },
  {
    id: 'finance',
    label: 'دریافت و پرداخت',
    description: 'پایش جریان‌های نقدی، چک‌ها و تراز حساب‌ها',
    component: FinanceModule,
    badge: 'TREASURY',
    feature: 'payments',
  },
  {
    id: 'inventory',
    label: 'انبار و کالا',
    description: 'سفارش‌گذاری، مدیریت موجودی و گروه‌بندی کالاها',
    component: InventoryModule,
    badge: 'STOCK',
    feature: 'products',
  },
  {
    id: 'people',
    label: 'طرف‌های حساب',
    description: 'مدیریت مشتریان، تأمین‌کنندگان و مخاطبین سیستم',
    component: PeopleModule,
    badge: 'RELATIONS',
    feature: 'persons',
  },
  {
    id: 'settings',
    label: 'تنظیمات سیستم',
    description: 'تاریخ هوشمند، بکاپ‌ها، یکپارچه‌سازی و لاگ‌ها',
    component: SystemModule,
    badge: 'SYSTEM',
    hidden: !isAdminOrDeveloper(),
    feature: 'settings',
  },
  {
    id: 'settings-users',
    label: 'کاربران',
    description: 'مدیریت کاربران، نقش‌ها، مجوزها و گزارش فعالیت',
    component: UsersModule,
    badge: 'USERS',
    hidden: !isAdminOrDeveloper(),
    feature: 'settings',
  },
  {
    id: 'banks',
    label: 'بانک‌ها و شعب',
    description: 'نمایش و جستجوی بانک‌ها و شعب ایران؛ بروزرسانی از منابع',
    component: BanksModule,
    badge: 'BANKS',
    feature: 'settings',
  },
  {
    id: 'developer',
    label: 'کنسول توسعه‌دهنده',
    description: 'پنل کامل دیباگ، تنظیمات، لاگ‌ها و تست‌ها',
    component: DevConsole,
    badge: 'DEV',
    hidden: !isDeveloperMobileUser(),
    feature: 'settings',
  },
  {
    id: 'sms-panel',
    label: 'پنل پیامک',
    description: 'ارسال، خطوط، تاریخچه و متریک‌ها',
    component: SmsPanel,
    badge: 'SMS',
    hidden: !isAdminOrDeveloper(),
    feature: 'settings',
  },
  {
    id: 'papi-panel',
    label: 'پنل PApi/OTP',
    description: 'ارسال پیامک و ورود با OTP از p.api.ir',
    component: PApiPanel,
    badge: 'PAPI',
    hidden: !isAdminOrDeveloper(),
    feature: 'settings',
  },
  {
    id: 'audit',
    label: 'ممیزی و مرکل',
    description: 'نمایش وضعیت زنجیره و ساخت Batch Merkle',
    component: AuditModule,
    badge: 'AUDIT',
    hidden: !isAdminOrDeveloper(),
    feature: 'settings',
  },
]
