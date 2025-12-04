import DashboardModule from './DashboardModule'
import InvoicesModule from './InvoicesModule'
import SaleOrdersModule from './SaleOrdersModule'
import FinanceModule from './FinanceModule'
import InventoryModule from './InventoryModule'
import PeopleModule from './PeopleModule'
import ReportsModule from './ReportsModule'
import SystemModule from './SystemModule'
import CustomerGroupsModule from './CustomerGroupsModule'
import IccShopModule from './IccShopModule'
import RoadmapModule from './RoadmapModule'
import AIModule from './AIModule'
import DeveloperModule from './DeveloperModule'
import PageBuilderModule from './PageBuilderModule'
import SearchModule from './SearchModule'
import type { ModuleDefinition } from '../components/layout/AppShell'

export const modules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'داشبورد',
    description: 'نمایش خلاصه و معمّای خوی معاملات و تحلیل‌های سریع',
    component: DashboardModule,
    badge: 'DASHBOARD',
  },
  {
    id: 'invoices',
    label: 'فاکتورها',
    description: 'مدیریت فاکتورهای فروش و خرید',
    component: InvoicesModule,
    badge: 'INVOICES',
  },
  {
    id: 'sale-orders',
    label: 'سفارشات فروش',
    description: 'مدیریت سفارشات فروش',
    component: SaleOrdersModule,
    badge: 'ORDERS',
  },
  {
    id: 'finance',
    label: 'مالی',
    description: 'پایش جریان‌های نقدی، چک‌ها و حساب‌ها',
    component: FinanceModule,
    badge: 'FINANCE',
  },
  {
    id: 'inventory',
    label: 'انبار',
    description: 'مدیریت موجودی و کالاها',
    component: InventoryModule,
    badge: 'INVENTORY',
  },
  {
    id: 'crm',
    label: 'CRM',
    description: 'مدیریت مشتریان، فعالیت‌ها و گروه‌ها',
    component: PeopleModule,
    badge: 'CRM',
  },
  {
    id: 'reports',
    label: 'گزارش‌ها',
    description: 'گزارش‌های مالی و تحلیلی',
    component: ReportsModule,
    badge: 'REPORTS',
  },
  {
    id: 'system',
    label: 'سیستم',
    description: 'تنظیمات، یکپارچه‌سازی و ابزارهای سیستمی',
    component: SystemModule,
    badge: 'SYSTEM',
  },
  {
    id: 'ai',
    label: 'هوش مصنوعی',
    description: 'ابزارهای هوش مصنوعی و تحلیلگر',
    component: AIModule,
    badge: 'AI',
  },
  {
    id: 'developer',
    label: 'توسعه‌دهنده',
    description: 'ابزارهای توسعه‌دهندگان و API Key',
    component: DeveloperModule,
    badge: 'DEV',
  },
  {
    id: 'page-builder',
    label: 'سازنده صفحات',
    description: 'مدیریت و ساخت صفحات سفارشی',
    component: PageBuilderModule,
    badge: 'BUILDER',
  },

  {
    id: 'search',
    label: 'جستجو',
    description: 'جستجوی پیشرفته در سیستم',
    component: SearchModule,
    badge: 'SEARCH',
  },
  {
    id: 'icc-shop',
    label: 'فروشگاه ICC',
    description: 'مدیریت محصولات و دسته‌بندی‌های فروشگاه ICC',
    component: IccShopModule,
    badge: 'ICC',
  },
  {
    id: 'roadmap',
    label: 'نقشه راه',
    description: 'مشاهده نقشه راه و برنامه‌های آینده',
    component: RoadmapModule,
    badge: 'ROADMAP',
  },
]
