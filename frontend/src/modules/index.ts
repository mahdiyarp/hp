import DashboardModule from './DashboardModule'
import SalesModule from './SalesModule'
import FinanceModule from './FinanceModule'
import InventoryModule from './InventoryModule'
import PeopleModule from './PeopleModule'
import SystemModule from './SystemModule'
import type { ModuleDefinition } from '../components/layout/AppShell'
import ReportsModule from './ReportsModule'
import SearchModule from './SearchModule'

export const modules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'داشبورد مرکزی',
    description: 'نمای کلی وضعیت مالی، موجودی و شاخص‌های کلیدی',
    component: DashboardModule,
    badge: 'OVERVIEW',
  },
  {
    id: 'sales',
    label: 'فروش و اسناد',
    description: 'مدیریت فاکتورهای فروش و خرید، همراه با فیلترهای پیشرفته',
    component: SalesModule,
    badge: 'SALES',
  },
  {
    id: 'finance',
    label: 'دریافت و پرداخت',
    description: 'پایش جریان‌های نقدی، چک‌ها و تراز حساب‌ها',
    component: FinanceModule,
    badge: 'TREASURY',
  },
  {
    id: 'inventory',
    label: 'انبار و کالا',
    description: 'سفارش‌گذاری، مدیریت موجودی و گروه‌بندی کالاها',
    component: InventoryModule,
    badge: 'STOCK',
  },
  {
    id: 'people',
    label: 'طرف‌های حساب',
    description: 'مدیریت مشتریان، تأمین‌کنندگان و مخاطبین سیستم',
    component: PeopleModule,
    badge: 'RELATIONS',
  },
  {
    id: 'reports',
    label: 'گزارش‌های مالی',
    description: 'تحلیل سود و زیان، ارزش موجودی و تراز نقدی',
    component: ReportsModule,
    badge: 'ANALYTICS',
  },
  {
    id: 'search',
    label: 'جستجوی هوشمند',
    description: 'جستجوی یکپارچه در کالاها، فاکتورها و پرداخت‌ها',
    component: SearchModule,
    badge: 'SEARCH',
  },
  {
    id: 'system',
    label: 'تنظیمات سیستم',
    description: 'تاریخ هوشمند، بکاپ‌ها، یکپارچه‌سازی و لاگ‌ها',
    component: SystemModule,
    badge: 'SYSTEM',
  },
]
