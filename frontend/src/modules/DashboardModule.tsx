import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiPatch } from '../services/api'
import { toast } from '../utils/toast'
import { useConfirmDialog } from '../context/ConfirmDialogContext'
function AuditStatusCard() {
  const [latest, setLatest] = useState<{ ts: string; merkle_root: string; count: number } | null>(
    null,
  )
  const [chainOk, setChainOk] = useState<boolean | null>(null)
  const [busy, setBusy] = useState<boolean>(false)
  async function refreshStatus() {
    try {
      const batch = await apiGet<any>('/api/audit/otp/batch/latest')
      setLatest({ ts: batch.ts, merkle_root: batch.merkle_root, count: batch.count })
      const entryIds: number[] = Array.isArray(batch.entry_ids) ? batch.entry_ids : []
      if (entryIds.length > 0) {
        try {
          const proof = await apiGet<any>(
            `/api/audit/otp/proof?entity_id=${encodeURIComponent('09123506545')}&entry_id=${entryIds[0]}`,
          )
          setChainOk(Boolean(proof?.chain_is_valid))
        } catch {
          setChainOk(null)
        }
      } else {
        setChainOk(null)
      }
    } catch {
      setLatest(null)
      setChainOk(null)
    }
  }
  useEffect(() => {
    refreshStatus()
    const id = setInterval(refreshStatus, 30000)
    return () => clearInterval(id)
  }, [])
  async function buildBatch() {
    if (busy) return
    setBusy(true)
    try {
      await apiGet<any>('/api/audit/otp/batch/build')
      await refreshStatus()
    } catch {}
    setBusy(false)
  }
  return (
    <div className="border-2 border-[#111827] bg-[#f9fafb] px-4 py-3 shadow-[4px_4px_0_#111827]">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">وضعیت ممیزی زنجیره</div>
        <button
          className="border border-[#111827] bg-white px-2 py-1 text-[11px]"
          onClick={refreshStatus}
          disabled={busy}
        >
          بروزرسانی
        </button>
      </div>
      {latest ? (
        <div className="mt-2 text-xs space-y-1">
          <div>آخرین Batch: {new Date(latest.ts).toLocaleString()}</div>
          <div>تعداد رویدادها: {latest.count}</div>
          <div className="break-all">مرکل‌روت: {latest.merkle_root}</div>
          <div className="flex items-center gap-2">
            <span>اعتبار زنجیره:</span>
            <span
              className={`${chainOk === null ? 'bg-[#f3f4f6] text-[#374151]' : chainOk ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fee2e2] text-[#7f1d1d]'} px-2 py-0.5 rounded-sm border`}
            >
              {chainOk === null ? 'نامشخص' : chainOk ? 'معتبر ✅' : 'نامعتبر ❌'}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-xs flex items-center gap-3">
          <span>Batch موجود نیست</span>
          <button
            className="border border-[#111827] bg-white px-2 py-1 text-[11px] disabled:opacity-50"
            onClick={buildBatch}
            disabled={busy}
          >
            {busy ? 'در حال ساخت…' : 'ساخت Batch'}
          </button>
        </div>
      )}
    </div>
  )
}
import { fetchWithAuth } from '../services/auth'
import { formatNumberFa, isoToJalali } from '../utils/num'
import { parseJalaliInput } from '../utils/date'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroPanel,
  retroPanelPadded,
  retroTableHeader,
  retroMuted,
} from '../components/retroTheme'
import { useI18n } from '../i18n/I18nContext'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import '../styles/sales-dashboard.css'

interface FinancialYear {
  id: number
  name: string
  start_date: string | null
  end_date: string | null
  start_date_jalali?: string | null
  end_date_jalali?: string | null
  is_closed: boolean
}

interface SmartContext {
  current_financial_year: FinancialYear
  current_jalali: {
    year: number
    month: number
    day: number
    formatted: string
  }
  auto_created: boolean
}

interface FinancialData {
  context: SmartContext
  date_suggestions: {
    today: string
    month_start: string
    quarter_start: string
    year_start: string | null
    year_end: string | null
    year_start_iso?: string | null
    year_end_iso?: string | null
  }
}

interface DashboardSummary {
  invoices: {
    today: number
    '7days': number
    month: number
  }
  receipts_today: number
  payments_today: number
  net_today: number
  cash_balances: Record<string, number>
}

interface Invoice {
  id: number
  invoice_number: string | null
  party_name: string | null
  total: number | null
  status: string
  server_time: string
  invoice_type: string
}

interface Product {
  id: string
  name: string
  unit: string | null
  group: string | null
  inventory: number | null
}

interface TrendPoint {
  label: string
  value: number
}

interface OldStockItem {
  product_id: string
  name: string
  inventory: number
  last_price_at?: string | null
}

interface CheckDue {
  id: number
  payment_number: string | null
  party_name: string | null
  amount: number
  due_date: string | null
  status: string
}

interface PriceFeed {
  fx?: Record<string, number> | null
  crypto?: Record<string, { usd: number }> | null
}

interface RoadmapChecklist {
  text: string
  done: boolean
}

interface RoadmapSectionSummary {
  title: string
  bodyText: string
  checklists: RoadmapChecklist[]
}

interface RoadmapResponse {
  title: string
  sections: RoadmapSectionSummary[]
  updated_at?: string
}

export default function DashboardModule({
  smartDate,
  onSmartDateChange,
  onNavigate,
}: ModuleComponentProps) {
  const { t } = useI18n()
  const confirmDialog = useConfirmDialog()
  const [viewMode, setViewMode] = useState<'summary' | 'widgets'>('summary')
  // محدودیت نمایش برای جداول «فاکتورهای اخیر» و «محصولات اخیر»
  const [invoiceLimit, setInvoiceLimit] = useState<number>(() => {
    try {
      const v = localStorage.getItem('hp_dash_invoice_limit')
      return v ? Math.max(1, Number(v)) : 5
    } catch {
      return 5
    }
  })
  const [productLimit, setProductLimit] = useState<number>(() => {
    try {
      const v = localStorage.getItem('hp_dash_product_limit')
      return v ? Math.max(1, Number(v)) : 5
    } catch {
      return 5
    }
  })

  useEffect(() => {
    try { localStorage.setItem('hp_dash_invoice_limit', String(invoiceLimit)) } catch {}
  }, [invoiceLimit])
  useEffect(() => {
    try { localStorage.setItem('hp_dash_product_limit', String(productLimit)) } catch {}
  }, [productLimit])
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [trendRange, setTrendRange] = useState<'today' | '3days' | 'custom'>('today')
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo, setCustomTo] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)
  const [refreshMs, setRefreshMs] = useState<number>(30000)
  const [oldStock, setOldStock] = useState<OldStockItem[]>([])
  const [checksDue, setChecksDue] = useState<CheckDue[]>([])
  const [prices, setPrices] = useState<PriceFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [persons, setPersons] = useState<
    Array<{ id: string; name: string; mobile: string | null }>
  >([])
  const [roadmapSummary, setRoadmapSummary] = useState<RoadmapResponse | null>(null)
  type DashboardWidget = {
    id: number
    widget_type: string
    title?: string | null
    position_x: number
    position_y: number
    width: number
    height: number
    enabled: boolean
    order: number
  }
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [widgetsLoading, setWidgetsLoading] = useState(false)
  const [newWidget, setNewWidget] = useState<{ type: string; title: string }>({
    type: 'payments',
    title: '',
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadTrend() {
    let fromIso = ''
    let toIso = ''
    const now = new Date()
    const end = new Date(now)
    const start = new Date(now)
    if (trendRange === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (trendRange === '3days') {
      start.setDate(start.getDate() - 2)
      start.setHours(0, 0, 0, 0)
    } else {
      fromIso = customFrom
      toIso = customTo
    }
    if (!fromIso) fromIso = start.toISOString()
    if (!toIso) toIso = end.toISOString()
    const res = await fetchWithAuth(
      `/api/reports/sales-trend?from_iso=${encodeURIComponent(fromIso)}&to_iso=${encodeURIComponent(toIso)}&bucket=${trendRange === 'today' ? 'hour' : 'day'}`,
    )
    const data = await res.json().catch(() => ({}))
    setTrend(Array.isArray(data.points) ? data.points : [])
  }

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(
      () => {
        loadTrend().catch(() => {})
      },
      Math.max(10000, refreshMs),
    )
    return () => clearInterval(id)
  }, [autoRefresh, refreshMs, trendRange, customFrom, customTo])

  async function loadDashboardData() {
    setLoading(true)
    setError(null)
    const newWarnings: string[] = []
    try {
      const results = await Promise.allSettled([
        apiGet<FinancialData>('/api/financial/auto-context'),
        apiGet<DashboardSummary>('/api/dashboard/summary'),
        apiGet<Invoice[]>(`/api/invoices?limit=50`),
        apiGet<Product[]>(`/api/products?limit=50`),
        Promise.resolve({ series: [] as TrendPoint[] }),
        apiGet<OldStockItem[]>(`/api/dashboard/old-stock?days=60&limit=50`),
        apiGet<CheckDue[]>(`/api/dashboard/checks-due?within_days=21&limit=50`),
        apiGet<PriceFeed>('/api/dashboard/prices'),
        apiGet<Array<{ id: string; name: string; mobile: string | null }>>('/api/persons'),
        apiGet<DashboardWidget[]>('/api/dashboard/widgets'),
        apiGet<RoadmapResponse>('/api/roadmap'),
      ])

      const [
        financialRes,
        summaryRes,
        invoicesRes,
        productsRes,
        _trendRes,
        oldStockRes,
        checksRes,
        pricesRes,
        personsRes,
        widgetsRes,
        roadmapRes,
      ] = results

      if (financialRes.status === 'fulfilled') {
        setFinancialData(financialRes.value)
      } else {
        newWarnings.push('اطلاعات سال مالی دریافت نشد.')
      }

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value)
      } else {
        newWarnings.push('خلاصه داشبورد در دسترس نیست.')
      }

      if (invoicesRes.status === 'fulfilled') {
        setInvoices(invoicesRes.value)
      } else {
        newWarnings.push('فهرست فاکتورهای اخیر بارگذاری نشد.')
      }

      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value)
      } else {
        newWarnings.push('فهرست محصولات اخیر قابل دسترس نیست.')
      }

      try {
        await loadTrend()
      } catch {
        newWarnings.push('روند فروش قابل نمایش نیست.')
      }

      if (oldStockRes.status === 'fulfilled') {
        setOldStock(oldStockRes.value)
      } else {
        newWarnings.push('تحلیل موجودی راکد ناموفق بود.')
      }

      if (checksRes.status === 'fulfilled') {
        setChecksDue(checksRes.value)
      } else {
        newWarnings.push('فهرست چک‌های سررسید بارگذاری نشد.')
      }

      if (pricesRes.status === 'fulfilled') {
        setPrices(pricesRes.value)
      } else {
        newWarnings.push('نمایش نرخ ارز/رمز ارز ممکن نیست.')
      }

      if (personsRes.status === 'fulfilled') {
        setPersons(personsRes.value)
      } else {
        newWarnings.push('فهرست طرف‌های حساب برای یادآور چک در دسترس نیست.')
      }

      if (widgetsRes.status === 'fulfilled') {
        setWidgets(widgetsRes.value)
      } else {
        newWarnings.push('Widgets داشبورد بارگذاری نشد.')
      }

      if (roadmapRes && roadmapRes.status === 'fulfilled') {
        setRoadmapSummary(roadmapRes.value)
      } else {
        newWarnings.push('نقشه راه سیستم در دسترس نیست.')
      }

      if (
        financialRes.status === 'rejected' &&
        summaryRes.status === 'rejected' &&
        invoicesRes.status === 'rejected'
      ) {
        setError('امکان بارگذاری داشبورد وجود ندارد. لطفاً بعداً تلاش کنید.')
      }
    } catch (err) {
      setError('بارگذاری داده‌ها با خطا روبه‌رو شد.')
      console.error('Error loading dashboard data:', err)
    } finally {
      setWarnings(newWarnings)
      setLoading(false)
    }
  }

  const jalaliStart = useMemo(() => {
    const val = financialData?.context.current_financial_year
    if (!val) return { start: '-', end: '-' }
    const start = val.start_date_jalali || (val.start_date ? isoToJalali(val.start_date) : '-')
    const end = val.end_date_jalali || (val.end_date ? isoToJalali(val.end_date) : '-')
    return { start, end }
  }, [financialData])

  const maxTrend = useMemo(() => trend.reduce((acc, cur) => Math.max(acc, cur.value), 0), [trend])
  const getTrendBarHeightClass = (value: number) => {
    if (maxTrend <= 0 || value <= 0) return 'dashboard-trend-bar-height-0'
    const bucket = Math.min(10, Math.max(1, Math.round((value / maxTrend) * 10)))
    return `dashboard-trend-bar-height-${bucket}`
  }
  const getRoadmapProgressWidthClass = (percent: number) => {
    if (percent <= 0) return 'roadmap-progress-width-0'
    const bucket = Math.min(10, Math.max(1, Math.round(percent / 10)))
    return `roadmap-progress-width-${bucket}`
  }

  const handleSuggestion = (label: string | null) => {
    if (!label) return
    const parsed = parseJalaliInput(label)
    if (parsed) {
      onSmartDateChange({
        isoDate: parsed.iso.slice(0, 10),
        jalali: parsed.jalali,
      })
    }
  }

  const quickAddPayment = (direction: 'in' | 'out') => {
    // Prefill a minimal payment form in Finance and navigate there
    window.dispatchEvent(
      new CustomEvent('finance-prefill', {
        detail: { direction, party_name: '', amount: '', reference: '', note: '' },
      }),
    )
    if (onNavigate) {
      onNavigate('finance')
    } else {
      window.dispatchEvent(new CustomEvent('switch-module', { detail: { module: 'finance' } }))
    }
  }

  const openRoadmapModule = () => {
    if (onNavigate) {
      onNavigate('roadmap')
    } else {
      window.dispatchEvent(new CustomEvent('switch-module', { detail: { module: 'roadmap' } }))
    }
  }

  const roadmapStats = useMemo(() => {
    if (!roadmapSummary) return { done: 0, total: 0, percent: 0 }
    const checklist = roadmapSummary.sections.flatMap((section) => section.checklists || [])
    if (checklist.length === 0) return { done: 0, total: 0, percent: 0 }
    const done = checklist.filter((item) => item.done).length
    return { done, total: checklist.length, percent: Math.round((done / checklist.length) * 100) }
  }, [roadmapSummary])
  const roadmapProgressClass = getRoadmapProgressWidthClass(roadmapStats.percent)

  const roadmapHighlights = useMemo(() => {
    if (!roadmapSummary) return []
    return roadmapSummary.sections
      .filter((section) => section.title && section.title !== '---')
      .slice(0, 3)
  }, [roadmapSummary])

  const roadmapUpdatedJalali = useMemo(() => {
    if (!roadmapSummary?.updated_at) return null
    try {
      return isoToJalali(roadmapSummary.updated_at)
    } catch (err) {
      return null
    }
  }, [roadmapSummary])

  const findMobileByName = (name: string | null) => {
    if (!name) return null
    const p = persons.find((pr) => pr.name === name)
    return p?.mobile || null
  }

  const sendCheckReminder = async (check: CheckDue) => {
    const mobile = findMobileByName(check.party_name)
    if (!mobile) {
      toast.warning('شماره موبایل برای این طرف حساب یافت نشد')
      return
    }
    const msg = `یادآوری سررسید چک:\nشماره: ${check.payment_number || check.id}\nمبلغ: ${formatNumberFa(check.amount)} ریال\nسررسید: ${check.due_date ? isoToJalali(check.due_date) : ''}`
    try {
      await apiPost('/api/sms/send', { to: mobile, message: msg })
      toast.success('یادآور پیامک ارسال شد')
    } catch (e: any) {
      toast.error(`ارسال پیامک ناموفق بود: ${e?.message || ''}`)
    }
  }

  const approveCheque = async (check: CheckDue) => {
    try {
      await apiPatch(`/api/payments/${check.id}`, { status: 'approved' })
      // refresh checks list
      await loadDashboardData()
      toast.success('چک تایید شد')
    } catch (e: any) {
      toast.error(`تایید چک ناموفق بود: ${e?.message || ''}`)
    }
  }

  const reloadWidgets = async () => {
    try {
      setWidgetsLoading(true)
      const list = await apiGet<DashboardWidget[]>('/api/dashboard/widgets')
      setWidgets(list)
    } finally {
      setWidgetsLoading(false)
    }
  }

  const createWidget = async () => {
    try {
      const payload = {
        widget_type: newWidget.type,
        title: newWidget.title || undefined,
        position_x: 0,
        position_y: (widgets[widgets.length - 1]?.position_y ?? -1) + 1,
        width: 3,
        height: 3,
        enabled: true,
        order: widgets.length,
      }
      await apiPost('/api/dashboard/widgets', payload)
      setNewWidget({ type: 'payments', title: '' })
      await reloadWidgets()
    } catch (e: any) {
      toast.error(`ایجاد ویجت ناموفق بود: ${e?.message || ''}`)
    }
  }

  const toggleWidget = async (w: DashboardWidget) => {
    try {
      await apiPatch(`/api/dashboard/widgets/${w.id}`, { enabled: !w.enabled })
      await reloadWidgets()
    } catch (e: any) {
      toast.error(`به‌روزرسانی ویجت ناموفق بود: ${e?.message || ''}`)
    }
  }

  const removeWidget = async (w: DashboardWidget) => {
    const confirmed = await confirmDialog({
      message: 'این ویجت حذف شود؟',
      confirmText: 'حذف',
      tone: 'danger',
    })
    if (!confirmed) return
    try {
      await apiPost(`/api/dashboard/widgets/${w.id}`, undefined, { method: 'DELETE' } as any)
      await reloadWidgets()
    } catch (e: any) {
      toast.error(`حذف ویجت ناموفق بود: ${e?.message || ''}`)
    }
  }

  const moveWidget = async (w: DashboardWidget, dir: 'up' | 'down') => {
    const idx = widgets.findIndex((x) => x.id === w.id)
    const swapWith = dir === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swapWith < 0 || swapWith >= widgets.length) return
    const a = widgets[idx]
    const b = widgets[swapWith]
    // swap position_y as a simple order
    const payload = {
      widgets: [
        {
          widget_id: a.id,
          position_x: a.position_x,
          position_y: b.position_y,
          width: a.width,
          height: a.height,
        },
        {
          widget_id: b.id,
          position_x: b.position_x,
          position_y: a.position_y,
          width: b.width,
          height: b.height,
        },
      ],
    }
    try {
      await apiPost('/api/dashboard/widgets/reorder', payload)
      await reloadWidgets()
    } catch (e: any) {
      toast.error(`تغییر ترتیب ناموفق بود: ${e?.message || ''}`)
    }
  }

  // بخش نمایش جزئیات
  if (loading) {
    return (
      <div className={`${retroPanel} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} tracking-[0.4em] text-[#1f2e3b]`}>{t('loading_system')}</p>
        </div>
      </div>
    )
  }

  // کنترل‌های نمای تنظیم‌پذیر و تعداد آیتم‌ها حذف شدند.

  return (
    <div className="space-y-8">
      <AuditStatusCard />
        {error && (
          <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-3 shadow-[4px_4px_0_#c35c5c]">
            {error}
          </div>
        )}

        {warnings.length > 0 && (
          <div className={`${retroPanel} p-4 space-y-2`}>
            <p className={`${retroHeading} text-[#7a6b4f]`}>هشدارهای بارگذاری</p>
            <ul className="list-disc list-inside text-xs text-[#7a6b4f] space-y-1">
              {warnings.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {financialData && (
          <section className={`${retroPanelPadded} space-y-6`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#c5bca5] pb-4">
              <div>
                <p className={`${retroHeading} tracking-[0.6em]`}>Smart Fiscal Context</p>
                <h2 className="text-2xl font-semibold mt-2">
                  {financialData.context.current_financial_year.name}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`${retroBadge} bg-[#f4edd9] border-[#9a8b6a]`}>
                  تاریخ امروز: {financialData.context.current_jalali.formatted}
                </span>
                {financialData.context.auto_created && (
                  <span className={`${retroBadge} border-[#4f704f] bg-[#e7f4e7] text-[#295329]`}>
                    سال مالی به‌صورت خودکار ایجاد شد
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                <p className={`${retroHeading}`}>سال مالی</p>
                <p className="text-lg font-semibold">
                  {financialData.context.current_financial_year.name}
                </p>
                <p className={`text-xs ${retroMuted}`}>
                  وضعیت: {financialData.context.current_financial_year.is_closed ? 'بسته' : 'باز'}
                </p>
              </div>
              <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                <p className={retroHeading}>شروع سال</p>
                <p className="text-lg font-semibold">{jalaliStart.start}</p>
              </div>
              <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                <p className={retroHeading}>پایان سال</p>
                <p className="text-lg font-semibold">{jalaliStart.end}</p>
              </div>
              <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
                <p className={retroHeading}>پیشنهاد تاریخ</p>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => handleSuggestion(financialData.date_suggestions.today)}
                    className="underline text-[#154b5f]"
                    type="button"
                  >
                    امروز: {financialData.date_suggestions.today}
                  </button>
                  <button
                    onClick={() => handleSuggestion(financialData.date_suggestions.month_start)}
                    className="underline text-[#154b5f]"
                    type="button"
                  >
                    اول ماه: {financialData.date_suggestions.month_start}
                  </button>
                  <button
                    onClick={() => handleSuggestion(financialData.date_suggestions.quarter_start)}
                    className="underline text-[#154b5f]"
                    type="button"
                  >
                    شروع فصل: {financialData.date_suggestions.quarter_start}
                  </button>
                  {financialData.date_suggestions.year_start && (
                    <button
                      onClick={() => handleSuggestion(financialData.date_suggestions.year_start)}
                      className="underline text-[#154b5f]"
                      type="button"
                    >
                      آغاز سال مالی: {financialData.date_suggestions.year_start}
                    </button>
                  )}
                  {financialData.date_suggestions.year_end && (
                    <button
                      onClick={() => handleSuggestion(financialData.date_suggestions.year_end)}
                      className="underline text-[#154b5f]"
                      type="button"
                    >
                      پایان سال مالی: {financialData.date_suggestions.year_end}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <div className={retroPanelPadded}>
            <header className="mb-3">
              <p className={retroHeading}>{t('activity_counter')}</p>
              <h3 className="text-lg font-semibold mt-2">خلاصه عملیات</h3>
            </header>
            {summary ? (
              <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                <thead>
                  <tr>
                    <th className={retroTableHeader}>شاخص</th>
                    <th className={retroTableHeader}>مقدار</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#d9cfb6]">
                    <td className="px-3 py-2">فاکتورهای امروز</td>
                    <td className="px-3 py-2 text-left">
                      {formatNumberFa(summary.invoices.today)}
                    </td>
                  </tr>
                  <tr className="border-b border-[#d9cfb6]">
                    <td className="px-3 py-2">فاکتورهای ۷ روز اخیر</td>
                    <td className="px-3 py-2 text-left">
                      {formatNumberFa(summary.invoices['7days'])}
                    </td>
                  </tr>
                  <tr className="border-b border-[#d9cfb6]">
                    <td className="px-3 py-2">فاکتورهای ماه جاری</td>
                    <td className="px-3 py-2 text-left">
                      {formatNumberFa(summary.invoices.month)}
                    </td>
                  </tr>
                  <tr className="border-b border-[#d9cfb6]">
                    <td className="px-3 py-2">دریافتی‌های امروز</td>
                    <td className="px-3 py-2 text-left">
                      {formatNumberFa(summary.receipts_today)} ریال
                    </td>
                  </tr>
                  <tr className="border-b border-[#d9cfb6]">
                    <td className="px-3 py-2">پرداخت‌های امروز</td>
                    <td className="px-3 py-2 text-left">
                      {formatNumberFa(summary.payments_today)} ریال
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-[#1f2e3b]">خالص جریان نقدی</td>
                    <td className="px-3 py-2 text-left font-semibold">
                      {formatNumberFa(summary.net_today)} ریال
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-[#7a6b4f]">اطلاعات خلاصه در دسترس نیست.</p>
            )}
            {summary && (
              <div className="mt-4 text-xs">
                <p className={`${retroHeading} mb-1`}>Cash Balances</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {Object.entries(summary.cash_balances).map(([method, value]) => (
                    <div
                      key={method}
                      className="border border-[#bfb69f] bg-[#f6f1df] px-3 py-2 shadow-inner"
                    >
                      <p className={`${retroHeading} text-[10px] leading-relaxed`}>{method}</p>
                      <p className="text-sm font-semibold">{formatNumberFa(value)} ریال</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={retroPanelPadded}>
            <header className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={retroHeading}>{t('sales_trend')}</p>
                <h3 className="text-lg font-semibold mt-2">روند فروش ۳۰ روز اخیر</h3>
              </div>
              <button className={`${retroButton} text-[11px]`} onClick={loadDashboardData}>
                به‌روزرسانی
              </button>
            </header>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <button
                className={`${retroButton} text-[11px]`}
                onClick={() => {
                  setTrendRange('today')
                  loadTrend()
                }}
              >
                امروز
              </button>
              <button
                className={`${retroButton} text-[11px]`}
                onClick={() => {
                  setTrendRange('3days')
                  loadTrend()
                }}
              >
                ۳ روز
              </button>
              <input
                className="input text-xs"
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                title="شروع بازه"
                placeholder="شروع بازه"
              />
              <input
                className="input text-xs"
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                title="پایان بازه"
                placeholder="پایان بازه"
              />
              <button
                className={`${retroButton} text-[11px]`}
                onClick={() => {
                  setTrendRange('custom')
                  loadTrend()
                }}
              >
                اعمال بازه
              </button>
              <label className="flex items-center gap-2 ml-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>بروزرسانی خودکار</span>
              </label>
              <input
                className="input text-xs w-24"
                type="number"
                min={10000}
                step={5000}
                value={refreshMs}
                onChange={(e) => setRefreshMs(Number(e.target.value) || 30000)}
                title="فاصله بروزرسانی (ms)"
                placeholder="ms"
              />
            </div>
            {trend.length > 0 ? (
              <div className="h-48 flex items-end gap-1">
                {trend.map((point) => {
                  const heightClass = getTrendBarHeightClass(point.value)
                  return (
                    <div key={point.label} className="dashboard-trend-bar flex-1 flex flex-col items-center gap-2">
                      <div
                        className={`dashboard-trend-bar-fill ${heightClass}`}
                        title={`${point.label} : ${formatNumberFa(point.value)} ریال`}
                      ></div>
                      <span className="text-[10px] text-[#7a6b4f]">{point.label}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-[#7a6b4f]">داده‌ای برای نمایش روند فروش وجود ندارد.</p>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={retroPanelPadded}>
            <header className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={retroHeading}>Payments</p>
                <h3 className="text-lg font-semibold mt-2">پرداخت‌ها و دریافت‌ها</h3>
              </div>
              <div className="flex gap-2">
                <button
                  className={`${retroButton} text-[11px]`}
                  onClick={() => quickAddPayment('in')}
                >
                  دریافت سریع
                </button>
                <button
                  className={`${retroButton} text-[11px]`}
                  onClick={() => quickAddPayment('out')}
                >
                  پرداخت سریع
                </button>
              </div>
            </header>
            {summary ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner">
                  <p className={retroHeading}>دریافتی امروز</p>
                  <p className="text-lg font-semibold">
                    {formatNumberFa(summary.receipts_today)} ریال
                  </p>
                </div>
                <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner">
                  <p className={retroHeading}>پرداخت امروز</p>
                  <p className="text-lg font-semibold">
                    {formatNumberFa(summary.payments_today)} ریال
                  </p>
                </div>
                <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner">
                  <p className={retroHeading}>خالص</p>
                  <p className="text-lg font-semibold">{formatNumberFa(summary.net_today)} ریال</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#7a6b4f]">اطلاعات پرداخت در دسترس نیست.</p>
            )}
          </div>
          <div className={retroPanelPadded}>
            <header className="mb-3">
              <p className={retroHeading}>Balances</p>
              <h3 className="text-lg font-semibold mt-2">تراز نقدی به تفکیک روش</h3>
            </header>
            {summary ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Object.entries(summary.cash_balances).map(([method, value]) => (
                  <div
                    key={method}
                    className="border border-[#bfb69f] bg-[#f6f1df] px-3 py-2 shadow-inner"
                  >
                    <p className={`${retroHeading} text-[10px]`}>{method}</p>
                    <p className="text-sm font-semibold">{formatNumberFa(value)} ریال</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#7a6b4f]">داده‌ای برای تراز نقدی یافت نشد.</p>
            )}
          </div>
        </section>

        {roadmapHighlights.length > 0 && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className={retroPanelPadded}>
              <header className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className={retroHeading}>HP Roadmap</p>
                  <h3 className="text-lg font-semibold mt-2">پیشرفت نقشه راه</h3>
                  {roadmapUpdatedJalali && (
                    <p className={`text-[11px] ${retroMuted} mt-1`}>
                      به‌روزرسانی: {roadmapUpdatedJalali}
                    </p>
                  )}
                </div>
                <button className={`${retroButton} text-[11px]`} onClick={openRoadmapModule}>
                  ورود به نقشه راه
                </button>
              </header>
              <div className="space-y-4">
                <div className="text-sm">
                  {roadmapStats.total > 0 ? (
                    <p>
                      {formatNumberFa(roadmapStats.done)} از {formatNumberFa(roadmapStats.total)}{' '}
                      تسک تکمیل شده است.
                    </p>
                  ) : (
                    <p className={retroMuted}>چک‌لیستی برای این نقشه راه ثبت نشده است.</p>
                  )}
                </div>
                <div className="h-3 bg-[#e0d8c1] rounded-full overflow-hidden border border-[#bfb69f]">
                  <div className={`roadmap-progress-fill ${roadmapProgressClass} h-full bg-[#154b5f]`}></div>
                </div>
                <p className="text-xs text-[#4b3d2d] leading-6">
                  ماژول‌های توسعه‌دهندگان، امنیت و ساختار سازمانی در این نسخه به صورت مرحله‌ای دنبال
                  می‌شوند. برای تخصیص منابع یا بازبینی اولویت‌ها وارد بخش Roadmap شوید.
                </p>
              </div>
            </div>

            <div className={retroPanelPadded}>
              <header className="mb-3">
                <p className={retroHeading}>Highlights</p>
                <h3 className="text-lg font-semibold mt-2">سه گام مهم بعدی</h3>
              </header>
              <div className="space-y-3">
                {roadmapHighlights.map((section) => {
                  const total = section.checklists.length
                  const done = section.checklists.filter((item) => item.done).length
                  const percent = total > 0 ? Math.round((done / total) * 100) : 0
                  const paragraph =
                    section.bodyText
                      ?.split(/\n+/)
                      .map((part) => part.trim())
                      .find(Boolean) || 'توضیحی ثبت نشده است.'
                  return (
                    <div
                      key={section.title}
                      className="border border-[#c5bca5] bg-[#faf4de] p-3 rounded-sm shadow-inner"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`${retroHeading} text-sm`}>{section.title}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f2e3b] text-[#f6f1df]">
                          {percent}% انجام شده
                        </span>
                      </div>
                      <p className="text-xs text-[#4b3d2d] leading-5">{paragraph}</p>
                      {section.checklists.length > 0 && (
                        <ul className="mt-2 space-y-1 text-[11px]">
                          {section.checklists.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  item.done ? 'bg-green-600' : 'bg-yellow-500'
                                }`}
                              ></span>
                              <span className={item.done ? 'line-through opacity-70' : ''}>
                                {item.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className={retroPanelPadded}>
            <header className="mb-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className={retroHeading}>{t('latest_invoices')}</p>
                <h3 className="text-lg font-semibold mt-2">فاکتورهای اخیر</h3>
              </div>
              <label className="text-xs flex items-center gap-2">
                <span>تعداد نمایش:</span>
                <select
                  className="bg-[var(--retro-input-bg)] border border-[var(--retro-input-border)] text-[var(--retro-input-text)] px-2 py-1 text-xs rounded-sm"
                  value={invoiceLimit}
                  onChange={(e) => setInvoiceLimit(Number(e.target.value) || 5)}
                  aria-label="تعداد نمایش فاکتورهای اخیر"
               >
                  <option value={5}>۵</option>
                  <option value={10}>۱۰</option>
                  <option value={20}>۲۰</option>
                  <option value={50}>۵۰</option>
                </select>
              </label>
            </header>
            {invoices.length > 0 ? (
              <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                <thead>
                  <tr className="text-right">
                    <th className={retroTableHeader}>شماره</th>
                    <th className={retroTableHeader}>طرف حساب</th>
                    <th className={retroTableHeader}>نوع</th>
                    <th className={retroTableHeader}>مبلغ</th>
                    <th className={retroTableHeader}>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, invoiceLimit).map((inv) => (
                    <tr key={inv.id} className="border-b border-[#d9cfb6]">
                      <td className="px-3 py-2">
                        {inv.invoice_number || `#${inv.id}`}
                        <span className="block text-[10px] text-[#7a6b4f] mt-1">
                          {inv.server_time ? isoToJalali(inv.server_time) : '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{inv.party_name || 'نامشخص'}</td>
                      <td className="px-3 py-2 text-left">{inv.invoice_type}</td>
                      <td className="px-3 py-2 text-left">
                        {formatNumberFa(inv.total || 0)} <span className="text-xs">ریال</span>
                      </td>
                      <td
                        className={`px-3 py-2 text-left ${retroHeading} tracking-[0.3em] text-xs`}
                      >
                        {inv.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-[#7a6b4f]">هیچ فاکتور ثبت نشده است.</p>
            )}
            <div className="mt-4 flex justify-end">
              <button className={`${retroButton} text-[11px]`} onClick={() => onNavigate('sales')}>
                رفتن به ماژول فروش
              </button>
            </div>
          </section>

          <section className={retroPanelPadded}>
            <header className="mb-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className={retroHeading}>{t('inventory_snapshot')}</p>
                <h3 className="text-lg font-semibold mt-2">محصولات اخیر</h3>
              </div>
              <label className="text-xs flex items-center gap-2">
                <span>تعداد نمایش:</span>
                <select
                  className="bg-[var(--retro-input-bg)] border border-[var(--retro-input-border)] text-[var(--retro-input-text)] px-2 py-1 text-xs rounded-sm"
                  value={productLimit}
                  onChange={(e) => setProductLimit(Number(e.target.value) || 5)}
                  aria-label="تعداد نمایش محصولات اخیر"
                >
                  <option value={5}>۵</option>
                  <option value={10}>۱۰</option>
                  <option value={20}>۲۰</option>
                  <option value={50}>۵۰</option>
                </select>
              </label>
            </header>
            {products.length > 0 ? (
              <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                <thead>
                  <tr className="text-right">
                    <th className={retroTableHeader}>نام</th>
                    <th className={retroTableHeader}>گروه</th>
                    <th className={retroTableHeader}>موجودی</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, productLimit).map((prod) => (
                    <tr key={prod.id} className="border-b border-[#d9cfb6]">
                      <td className="px-3 py-2">
                        {prod.name}
                        <span className="block text-[10px] text-[#7a6b4f] mt-1">
                          واحد: {prod.unit || 'عدد'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{prod.group || 'بدون گروه'}</td>
                      <td className="px-3 py-2 text-left">{formatNumberFa(prod.inventory || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-[#7a6b4f]">محصولی ثبت نشده است.</p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                className={`${retroButton} text-[11px]`}
                onClick={() => onNavigate('inventory')}
              >
                مدیریت موجودی
              </button>
            </div>
          </section>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={retroPanelPadded}>
            <header className="mb-3">
              <p className={retroHeading}>{t('aging_inventory')}</p>
              <h3 className="text-lg font-semibold mt-2">محصولات راکد</h3>
            </header>
            {oldStock.length > 0 ? (
              <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                <thead>
                  <tr>
                    <th className={retroTableHeader}>محصول</th>
                    <th className={retroTableHeader}>موجودی</th>
                    <th className={retroTableHeader}>آخرین قیمت</th>
                  </tr>
                </thead>
                <tbody>
                  {oldStock.map((item) => (
                    <tr key={item.product_id} className="border-b border-[#d9cfb6]">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-left">{formatNumberFa(item.inventory)}</td>
                      <td className="px-3 py-2 text-left">
                        {item.last_price_at ? isoToJalali(item.last_price_at) : 'نامشخص'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-[#7a6b4f]">
                محصول راکدی یافت نشد یا دسترسی به این بخش محدود است.
              </p>
            )}
          </div>

          <div className={retroPanelPadded}>
            <header className="mb-3">
              <p className={retroHeading}>{t('checks_due')}</p>
              <h3 className="text-lg font-semibold mt-2">چک‌های در شرف سررسید</h3>
            </header>
            {checksDue.length > 0 ? (
              <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                <thead>
                  <tr>
                    <th className={retroTableHeader}>شماره</th>
                    <th className={retroTableHeader}>طرف حساب</th>
                    <th className={retroTableHeader}>مبلغ</th>
                    <th className={retroTableHeader}>سررسید</th>
                    <th className={retroTableHeader}>یادآور</th>
                    <th className={retroTableHeader}>تایید</th>
                  </tr>
                </thead>
                <tbody>
                  {checksDue.map((item) => (
                    <tr key={item.id} className="border-b border-[#d9cfb6]">
                      <td className="px-3 py-2">{item.payment_number || `#${item.id}`}</td>
                      <td className="px-3 py-2">{item.party_name || 'نامشخص'}</td>
                      <td className="px-3 py-2 text-left">{formatNumberFa(item.amount)}</td>
                      <td className="px-3 py-2 text-left">
                        {item.due_date ? isoToJalali(item.due_date) : '-'}
                      </td>
                      <td className="px-3 py-2 text-left">
                        <button
                          className={`${retroButton} text-[11px]`}
                          onClick={() => sendCheckReminder(item)}
                          disabled={!findMobileByName(item.party_name)}
                          title={
                            findMobileByName(item.party_name) ? 'ارسال پیامک' : 'موبایل یافت نشد'
                          }
                        >
                          SMS
                        </button>
                      </td>
                      <td className="px-3 py-2 text-left">
                        <button
                          className={`${retroButton} text-[11px]`}
                          onClick={() => approveCheque(item)}
                        >
                          تایید
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-[#7a6b4f]">چکی با شرایط تعیین‌شده یافت نشد.</p>
            )}
          </div>
        </section>

        <section className={retroPanelPadded}>
          <header className="mb-3">
            <p className={retroHeading}>{t('command_pad')}</p>
            <h3 className="text-lg font-semibold mt-2">عملیات سریع سیستم</h3>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-center">
            <button className={`${retroButton} w-full`} onClick={() => onNavigate('sales')}>
              صدور فاکتور جدید
            </button>
            <button className={`${retroButton} w-full`} onClick={() => onNavigate('inventory')}>
              ثبت کالای جدید
            </button>
            <button className={`${retroButton} w-full`} onClick={() => onNavigate('finance')}>
              دریافت / پرداخت
            </button>
            <button className={`${retroButton} w-full`} onClick={() => onNavigate('reports')}>
              گزارش‌های مالی
            </button>
            <button className={`${retroButton} w-full`} onClick={openRoadmapModule}>
              نقشه راه سیستم
            </button>
          </div>
          <p className={`${retroHeading} text-[10px] mt-4 tracking-[0.4em]`}>
            برای مدیریت جزئیات هر فرآیند، از ماژول‌های تخصصی استفاده کنید.
          </p>
        </section>

        {prices && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={retroPanelPadded}>
              <header className="mb-3">
                <p className={retroHeading}>FX Rates</p>
                <h3 className="text-lg font-semibold mt-2">نرخ ارز (USD پایه)</h3>
              </header>
              {prices.fx ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {Object.entries(prices.fx).map(([symbol, value]) => (
                    <div
                      key={symbol}
                      className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner"
                    >
                      <p className={`${retroHeading} mb-1`}>{symbol}</p>
                      <p className="text-lg font-semibold">{formatNumberFa(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#7a6b4f]">نرخ ارز از سرویس بیرونی دریافت نشد.</p>
              )}
            </div>

            <div className={retroPanelPadded}>
              <header className="mb-3">
                <p className={retroHeading}>Crypto</p>
                <h3 className="text-lg font-semibold mt-2">قیمت رمزارز</h3>
              </header>
              {prices.crypto ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {Object.entries(prices.crypto).map(([symbol, value]) => (
                    <div
                      key={symbol}
                      className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner"
                    >
                      <p className={`${retroHeading} mb-1`}>{symbol.toUpperCase()}</p>
                      <p className="text-lg font-semibold">{formatNumberFa(value.usd)} USD</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#7a6b4f]">قیمت رمزارز در دسترس نیست.</p>
              )}
            </div>
          </section>
        )}
      </div>
  )
}
