import React from 'react'
export {}
import DashboardModule from './DashboardModule'
import RoadmapModule from './RoadmapModule'
const SalesModule = React.lazy(() => import('./SalesModule'))
import FinanceModule from './FinanceModule'
import InventoryModule from './InventoryModule'
const PeopleModule = React.lazy(() => import('./PeopleModule'))
import ReportsModule from './ReportsModule'
const SystemModule = React.lazy(() => import('./SystemModule'))
const PageBuilderModule = React.lazy(() => import('./PageBuilderModule'))
import UsersModule from './settings/UsersModule'
import BanksModule from './settings/BanksModule'
import DevConsole from './developer/DevConsole'
import AssistantModule from './developer/AssistantModule'
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

const DEVELOPER_ROLES = new Set(['Admin', 'Developer', 'Developer NFT'])

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
    const role = String(payloadJson.role || payloadJson['x-role'] || '')
    if (DEVELOPER_ROLES.has(role)) return true
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
  return (role && DEVELOPER_ROLES.has(role)) || isDeveloperMobileUser()
}

export const modules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'داشبورد',
    description: 'نمایش خلاصه و معمّای خوی معاملات و تحلیل‌های سریع',
    component: DashboardModule,
    badge: 'DASHBOARD',
    feature: 'reports',
    requiredPermissions: ['reports:view'],
  },
  {
    id: 'reports',
    label: 'گزارش‌ها و تحلیل‌ها',
    description: 'سود و زیان، تراز نقدی و ارزش موجودی',
    component: ReportsModule,
    badge: 'REPORTS',
    feature: 'reports',
    requiredPermissions: ['reports:view'],
  },
  {
    id: 'roadmap',
    label: 'نقشه راه',
    description: 'برنامه پیشروی تیم و وضعیت تسک‌های کلیدی',
    component: RoadmapModule,
    badge: 'ROADMAP',
    feature: 'reports',
    requiredPermissions: ['reports:view'],
  },
  {
    id: 'sales',
    label: 'فروش و اسناد',
    description: 'مدیریت فاکتورهای فروش و خرید، همراه با فیلترهای پیشرفته',
    component: SalesModule,
    badge: 'SALES',
    feature: 'invoices',
    requiredPermissions: ['invoices:view'],
  },
  {
    id: 'finance',
    label: 'دریافت و پرداخت',
    description: 'پایش جریان‌های نقدی، چک‌ها و تراز حساب‌ها',
    component: FinanceModule,
    badge: 'TREASURY',
    feature: 'payments',
    requiredPermissions: ['payments:view'],
  },
  {
    id: 'inventory',
    label: 'انبار و کالا',
    description: 'سفارش‌گذاری، مدیریت موجودی و گروه‌بندی کالاها',
    component: InventoryModule,
    badge: 'STOCK',
    feature: 'products',
    requiredPermissions: ['products:view'],
  },
  {
    id: 'people',
    label: 'طرف‌های حساب',
    description: 'مدیریت مشتریان، تأمین‌کنندگان و مخاطبین سیستم',
    component: PeopleModule,
    badge: 'RELATIONS',
    feature: 'persons',
    requiredPermissions: ['persons:view'],
  },
  {
    id: 'settings',
    label: 'تنظیمات سیستم',
    description: 'تاریخ هوشمند، بکاپ‌ها، یکپارچه‌سازی و لاگ‌ها',
    component: SystemModule,
    badge: 'SYSTEM',
    feature: 'settings',
    requiredPermissions: ['settings:view'],
  },
  {
    id: 'settings-users',
    label: 'کاربران',
    description: 'مدیریت کاربران، نقش‌ها، مجوزها و گزارش فعالیت',
    component: UsersModule,
    badge: 'USERS',
    feature: 'settings',
    requiredPermissions: ['settings:manage'],
  },
  {
    id: 'banks',
    label: 'بانک‌ها و شعب',
    description: 'نمایش و جستجوی بانک‌ها و شعب ایران؛ بروزرسانی از منابع',
    component: BanksModule,
    badge: 'BANKS',
    feature: 'settings',
    requiredPermissions: ['settings:view'],
  },
  {
    id: 'developer',
    label: 'کنسول توسعه‌دهنده',
    description: 'پنل کامل دیباگ، تنظیمات، لاگ‌ها و تست‌ها',
    component: DevConsole,
    badge: 'DEV',
    feature: 'settings',
  },
  {
    id: 'page-builder',
    label: 'صفحه‌ساز',
    description: 'ساخت صفحات Drag & Drop با GrapesJS و مدیریت قالب‌ها',
    component: PageBuilderModule,
    badge: 'BUILDER',
    feature: 'settings',
  },
  {
    id: 'dev-assistant',
    label: 'دستیار (Developer)',
    description: 'دستیار متنی برای دستورات سریع توسعه/حسابداری',
    component: AssistantModule,
    badge: 'ASSIST',
    feature: 'settings',
  },
  {
    id: 'sms-panel',
    label: 'پنل پیامک',
    description: 'ارسال، خطوط، تاریخچه و متریک‌ها',
    component: SmsPanel,
    badge: 'SMS',
    feature: 'settings',
  },
  {
    id: 'papi-panel',
    label: 'پنل PApi/OTP',
    description: 'ارسال پیامک و ورود با OTP از p.api.ir',
    component: PApiPanel,
    badge: 'PAPI',
    feature: 'settings',
  },
  {
    id: 'audit',
    label: 'ممیزی و مرکل',
    description: 'نمایش وضعیت زنجیره و ساخت Batch Merkle',
    component: AuditModule,
    badge: 'AUDIT',
    feature: 'settings',
  },
]
