import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet } from '../services/api'
import { formatNumberFa, isoToJalali } from '../utils/num'
import { exportToCsv } from '../utils/export'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroInput,
  retroPanel,
  retroPanelPadded,
  retroTableHeader,
  retroMuted,
} from '../components/retroTheme'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

interface PnLReport {
  sales: number
  purchases: number
  gross_profit: number
  start: string | null
  end: string | null
}

interface CashReport {
  method: string
  balance: number
}

interface StockValuation {
  product_id: string
  name: string
  inventory: number
  unit_price: number | null
  total_value: number
}

const CASH_METHODS = ['cash', 'bank', 'pos']

interface InvoiceMatch {
  id: number
  invoice_number: string | null
  party_name: string | null
  total: number | null
  server_time: string | null
}

interface ReportsQueryResponse {
  query: string
  matches: InvoiceMatch[]
}

interface PersonReportEntry {
  party_id: string
  party_name: string | null
  total_sale: number
  total_purchase: number
  net: number
}

interface PersonOption {
  id: string
  name: string
}

export default function ReportsModule({ smartDate }: ModuleComponentProps) {
  const [rangeDays, setRangeDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [pnl, setPnl] = useState<PnLReport | null>(null)
  const [cashAll, setCashAll] = useState<CashReport | null>(null)
  const [cashMethods, setCashMethods] = useState<Record<string, number>>({})
  const [stock, setStock] = useState<StockValuation[]>([])
  const [persons, setPersons] = useState<PersonOption[]>([])
  const [selectedPerson, setSelectedPerson] = useState<string>('')
  const [personReport, setPersonReport] = useState<PersonReportEntry | null>(null)
  const [personLoading, setPersonLoading] = useState(false)
  const [nlQuery, setNlQuery] = useState('')
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryMatches, setQueryMatches] = useState<InvoiceMatch[]>([])
  const [queryError, setQueryError] = useState<string | null>(null)

  const pnlChartData = useMemo(() => {
    if (!pnl) return null
    return {
      labels: ['فروش', 'خرید', 'سود ناخالص'],
      datasets: [
        {
          label: 'ریال',
          data: [pnl.sales, pnl.purchases, pnl.gross_profit],
          backgroundColor: ['#4f6f52', '#c35c5c', '#1f2e3b'],
          borderWidth: 0,
        },
      ],
    }
  }, [pnl])

  const cashChartData = useMemo(() => {
    const entries = Object.entries(cashMethods)
    if (entries.length === 0) return null
    return {
      labels: entries.map(([method]) => method),
      datasets: [
        {
          label: 'تراز',
          data: entries.map(([, value]) => value),
          backgroundColor: entries.map((_, idx) =>
            ['#154b5f', '#d7caa4', '#f4a259', '#8fb339', '#6c4a4a'][idx % 5],
          ),
          borderWidth: 0,
        },
      ],
    }
  }, [cashMethods])

  useEffect(() => {
    loadReports(rangeDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays, smartDate.isoDate])

  useEffect(() => {
    void loadPersons()
  }, [])

  async function loadReports(days: number) {
    setLoading(true)
    setError(null)
    const newWarnings: string[] = []
    try {
      const endDate = smartDate.isoDate ? new Date(`${smartDate.isoDate}T00:00:00Z`) : new Date()
      const startDate = new Date(endDate.getTime())
      startDate.setUTCDate(startDate.getUTCDate() - days)

      const startParam = startDate.toISOString()
      const endParam = new Date(endDate.getTime() + 24 * 3600 * 1000).toISOString()
      try {
        const pnlData = await apiGet<PnLReport>(
          `/api/reports/pnl?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(
            endParam,
          )}`,
        )
        setPnl(pnlData)
      } catch (err) {
        console.error(err)
        newWarnings.push('گزارش سود و زیان در دسترس نیست.')
      }

      try {
        const cashData = await apiGet<CashReport>('/api/reports/cash')
        setCashAll(cashData)
      } catch (err) {
        console.error(err)
        newWarnings.push('تراز نقدی کلی قابل دسترس نیست.')
      }

      const methodEntries: Record<string, number> = {}
      await Promise.all(
        CASH_METHODS.map(method =>
          apiGet<CashReport>(`/api/reports/cash?method=${method}`)
            .then(res => {
              methodEntries[method] = res.balance
            })
            .catch(err => {
              console.error(err)
              newWarnings.push(`تراز روش ${method} قابل خواندن نیست.`)
            }),
        ),
      )
      setCashMethods(methodEntries)

      try {
        const stockData = await apiGet<StockValuation[]>('/api/reports/stock')
        setStock(stockData)
      } catch (err) {
        console.error(err)
        newWarnings.push('گزارش ارزش موجودی ناموفق بود.')
      }
    } catch (err) {
      console.error(err)
      setError('بارگذاری گزارش‌ها با خطا روبه‌رو شد.')
    } finally {
      setWarnings(newWarnings)
      setLoading(false)
    }
  }

  const stockTotals = useMemo(() => {
    const count = stock.length
    const totalValue = stock.reduce((acc, item) => acc + (item.total_value || 0), 0)
    return { count, totalValue }
  }, [stock])

  const exportPnl = () => {
    if (!pnl) return
    exportToCsv(
      [
        {
          بازه_شروع: pnl.start ?? smartDate.isoDate ?? '---',
          بازه_پایان: pnl.end ?? smartDate.isoDate ?? '---',
          فروش: pnl.sales,
          خرید: pnl.purchases,
          سود_ناخالص: pnl.gross_profit,
        },
      ],
      `pnl-${smartDate.isoDate || 'report'}`,
    )
  }

  const exportCash = () => {
    if (!cashAll) return
    const rows = Object.entries(cashMethods).map(([method, balance]) => ({
      روش: method,
      مانده: balance,
    }))
    exportToCsv(rows, 'cash-balances')
  }

  const exportStock = () => {
    if (stock.length === 0) return
    const rows = stock.map(item => ({
      شناسه: item.product_id,
      نام: item.name,
      موجودی: item.inventory,
      قیمت_واحد: item.unit_price ?? '',
      ارزش_کل: item.total_value,
    }))
    exportToCsv(rows, 'stock-valuation')
  }

  async function loadPersons() {
    try {
      const list = await apiGet<PersonOption[]>('/api/persons')
      setPersons(list)
      if (list.length > 0) {
        setSelectedPerson(list[0].id)
        void loadPersonReport(list[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function loadPersonReport(partyId: string) {
    if (!partyId) {
      setPersonReport(null)
      return
    }
    setPersonLoading(true)
    try {
      const data = await apiGet<PersonReportEntry>(
        `/api/reports/person?party_id=${encodeURIComponent(partyId)}`,
      )
      setPersonReport(data)
    } catch (err) {
      console.error(err)
      setPersonReport(null)
    } finally {
      setPersonLoading(false)
    }
  }

  async function runNaturalQuery() {
    if (!nlQuery.trim()) {
      setQueryError('لطفاً متن جستجو را وارد کنید.')
      return
    }
    setQueryLoading(true)
    setQueryError(null)
    try {
      const result = await apiPost<ReportsQueryResponse>('/api/reports/query', { q: nlQuery })
      setQueryMatches(result.matches || [])
    } catch (err: any) {
      setQueryError(err?.message || 'جستجو ناموفق بود.')
      setQueryMatches([])
    } finally {
      setQueryLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`${retroPanel} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 border-4 border-[var(--retro-button-bg)] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} text-[var(--retro-button-bg)]`}>در حال گردآوری گزارش‌ها...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-3 shadow-[4px_4px_0_#c35c5c]">
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className={`${retroPanel} p-4 space-y-2`}>
          <p className={`${retroHeading} text-[var(--retro-muted-text)]`}>هشدارهای گزارش</p>
          <ul className="list-disc list-inside text-xs text-[var(--retro-muted-text)] space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>Analytics Suite</p>
            <h2 className="text-2xl font-semibold mt-2">گزارش‌های مالی</h2>
            <p className={`text-xs ${retroMuted} mt-2`}>
              براساس تاریخ مرجع {smartDate.jalali ?? 'نامشخص'} (ISO {smartDate.isoDate ?? '---'})
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <label className={`${retroHeading} flex items-center gap-2`}>
              بازه (روز)
              <select
                value={rangeDays}
                onChange={e => setRangeDays(Number(e.target.value))}
                className={`${retroInput} w-28`}
              >
                <option value={7}>۷</option>
                <option value={30}>۳۰</option>
                <option value={90}>۹۰</option>
                <option value={365}>۳۶۵</option>
              </select>
            </label>
            <button className={`${retroButton}`} onClick={() => loadReports(rangeDays)}>
              بازخوانی
            </button>
            <button className={`${retroButton}`} onClick={exportPnl} disabled={!pnl}>
              خروجی CSV
            </button>
          </div>
        </header>

        {pnl ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
              <p className={retroHeading}>فروش</p>
              <p className="text-lg font-semibold">{formatNumberFa(pnl.sales)} ریال</p>
            </div>
            <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
              <p className={retroHeading}>خرید</p>
              <p className="text-lg font-semibold">{formatNumberFa(pnl.purchases)} ریال</p>
            </div>
            <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
              <p className={retroHeading}>سود ناخالص</p>
              <p className="text-lg font-semibold">{formatNumberFa(pnl.gross_profit)} ریال</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#7a6b4f]">گزارش سود و زیان بارگذاری نشد.</p>
        )}

        {pnlChartData && (
          <div className="bg-white border border-[#d9cfb6] rounded-sm p-3">
            <Bar
              data={pnlChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'top' as const } },
              }}
              height={220}
            />
          </div>
        )}
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <p className={retroHeading}>Cash Position</p>
            <h3 className="text-lg font-semibold mt-2">تراز نقدی</h3>
          </div>
          <div className="flex gap-2">
            <button className={retroButton} onClick={exportCash} disabled={!cashAll}>
              خروجی CSV
            </button>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>کل منابع نقدی</p>
            <p className="text-lg font-semibold">
              {formatNumberFa(cashAll?.balance ?? 0)} ریال
            </p>
          </div>
          <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>روش‌های اصلی</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {CASH_METHODS.map(method => (
                <span key={method} className={retroBadge}>
                  {method} : {formatNumberFa(cashMethods[method] ?? 0)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {cashChartData && (
          <div className="max-w-xl mx-auto">
            <Doughnut
              data={cashChartData}
              options={{
                plugins: {
                  legend: { position: 'bottom' as const, labels: { usePointStyle: true } },
                },
              }}
            />
          </div>
        )}
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <p className={retroHeading}>Stock Valuation</p>
            <h3 className="text-lg font-semibold mt-2">ارزش موجودی</h3>
            <p className={`text-xs ${retroMuted} mt-2`}>
              تعداد کالا: {formatNumberFa(stockTotals.count)} | ارزش کل:{' '}
              {formatNumberFa(stockTotals.totalValue)} ریال
            </p>
          </div>
          <button className={retroButton} onClick={exportStock} disabled={stock.length === 0}>
            خروجی CSV
          </button>
        </header>
        {stock.length > 0 ? (
          <table className="w-full border border-[var(--retro-border)] bg-[var(--retro-panel-bg)] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>کالا</th>
                <th className={retroTableHeader}>موجودی</th>
                <th className={retroTableHeader}>قیمت واحد</th>
                <th className={retroTableHeader}>ارزش کل</th>
              </tr>
            </thead>
            <tbody>
              {stock.slice(0, 12).map(item => (
                <tr key={item.product_id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2 text-left">{formatNumberFa(item.inventory)}</td>
                  <td className="px-3 py-2 text-left">
                    {item.unit_price ? formatNumberFa(item.unit_price) : 'نامشخص'}
                  </td>
                  <td className="px-3 py-2 text-left">
                    {formatNumberFa(item.total_value)} ریال
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-[#7a6b4f]">اطلاعات ارزش موجودی در دسترس نیست.</p>
        )}
      </section>

      {pnl?.start && pnl?.end && (
        <section className={`${retroPanel} p-4 text-xs text-[#7a6b4f]`}>
          <p className={retroHeading}>Period</p>
          <p className="mt-2">
            از {isoToJalali(pnl.start ?? '')} تا {isoToJalali(pnl.end ?? '')}
          </p>
        </section>
      )}

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <p className={retroHeading}>Person Turnover</p>
            <h3 className="text-lg font-semibold mt-2">گردش طرف حساب</h3>
          </div>
          <select
            className={`${retroInput} w-full lg:w-64`}
            value={selectedPerson}
            onChange={e => {
              setSelectedPerson(e.target.value)
              void loadPersonReport(e.target.value)
            }}
          >
            {persons.map(person => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </header>
        {personLoading ? (
          <p className="text-xs text-[#7a6b4f]">در حال محاسبه...</p>
        ) : personReport ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner">
              <p className={retroHeading}>فروش</p>
              <p className="text-lg font-semibold">{formatNumberFa(personReport.total_sale)} ریال</p>
            </div>
            <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner">
              <p className={retroHeading}>خرید</p>
              <p className="text-lg font-semibold">{formatNumberFa(personReport.total_purchase)} ریال</p>
            </div>
            <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner">
              <p className={retroHeading}>خالص</p>
              <p className="text-lg font-semibold">{formatNumberFa(personReport.net)} ریال</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#7a6b4f]">اطلاعاتی برای این طرف حساب یافت نشد.</p>
        )}
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header>
          <p className={retroHeading}>Natural Query</p>
          <h3 className="text-lg font-semibold mt-2">تحلیل متنی گزارش‌ها</h3>
        </header>
        <div className="flex flex-col lg:flex-row gap-3">
          <input
            className={`${retroInput} flex-1`}
            placeholder="مثلاً: فاکتورهای فروش این ماه برای شرکت طلوع افق"
            value={nlQuery}
            onChange={e => setNlQuery(e.target.value)}
          />
          <button className={retroButton} onClick={runNaturalQuery} disabled={queryLoading}>
            {queryLoading ? 'در حال جستجو...' : 'اجرا'}
          </button>
        </div>
        {queryError && <p className="text-xs text-[#7a1f1f]">{queryError}</p>}
        {queryMatches.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>شماره</th>
                <th className={retroTableHeader}>طرف حساب</th>
                <th className={retroTableHeader}>مبلغ</th>
                <th className={retroTableHeader}>زمان</th>
              </tr>
            </thead>
            <tbody>
              {queryMatches.map(match => (
                <tr key={match.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">{match.invoice_number || `#${match.id}`}</td>
                  <td className="px-3 py-2">{match.party_name || '-'}</td>
                  <td className="px-3 py-2 text-left">
                    {formatNumberFa(match.total || 0)} <span className="text-xs">ریال</span>
                  </td>
                  <td className="px-3 py-2 text-left">
                    {match.server_time ? isoToJalali(match.server_time) : '---'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !queryLoading && nlQuery && <p className="text-xs text-[#7a6b4f]">نتیجه‌ای یافت نشد.</p>
        )}
      </section>
    </div>
  )
}

