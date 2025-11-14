import DashboardModule from './DashboardModule'
import SalesModule from './SalesModule'
import FinanceModule from './FinanceModule'
import InventoryModule from './InventoryModule'
import PeopleModule from './PeopleModule'
import SystemModule from './SystemModule'
import type { ModuleDefinition } from '../components/layout/AppShell'

export const modules: ModuleDefinition[] = [
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
    id: 'settings',
    label: 'تنظیمات سیستم',
    description: 'تاریخ هوشمند، بکاپ‌ها، یکپارچه‌سازی و لاگ‌ها',
    component: SystemModule,
    badge: 'SYSTEM',
  },
]
