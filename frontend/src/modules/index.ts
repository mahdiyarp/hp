import DashboardModule from './DashboardModule'
import SalesModule from './SalesModule'
import FinanceModule from './FinanceModule'
import InventoryModule from './InventoryModule'
import PeopleModule from './PeopleModule'
import ReportsModule from './ReportsModule'
import SystemModule from './SystemModule'
import AccessControlModule from './settings/AccessControlModule'
import BanksModule from './settings/BanksModule'
import DeveloperModule from './settings/DeveloperModule'
import { getAccessToken, loginDeveloper } from '../services/auth'
import type { ModuleDefinition } from '../components/layout/AppShell'

function isDeveloperMobileUser(): boolean {
  try {
    const token = getAccessToken()
    if (!token) return false
    // Lightweight decode JWT payload without external libs
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payloadJson = JSON.parse(atob(parts[1]))
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
    const payloadJson = JSON.parse(atob(parts[1]))
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
    id: 'access-control',
    label: 'نقش‌ها و دسترسی‌ها',
    description: 'مدیریت نقش‌ها، کاربران، مجوزها و گزارش فعالیت',
    component: AccessControlModule,
    badge: 'ADMIN',
    // نمایش فقط برای کاربر دولوپر NFT
    hidden: !isDeveloperMobileUser(),
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
    label: 'تنظیمات توسعه‌دهنده',
    description: 'ابزارهای دیباگ و لاگ‌ها؛ فقط برای دولوپر',
    component: DeveloperModule,
    badge: 'DEV',
    hidden: !isDeveloperMobileUser(),
    feature: 'settings',
  },
]
