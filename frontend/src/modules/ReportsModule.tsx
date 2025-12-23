import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../components/layout/AppShell'
import { apiGet } from '../services/api'
import { formatNumberFa, isoToJalali, jalaliToIso } from '../utils/num'
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
// Charts are loaded dynamically to avoid hard dependency during tests.
// If loading fails (e.g., dev machine missing chart.js), UI will render without charts.
let Bar: React.ComponentType<any> | null = null
let Doughnut: React.ComponentType<any> | null = null

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
  const [chartsReady, setChartsReady] = useState(false)
  const [rangeDays, setRangeDays] = useState(30)
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [jalaliStart, setJalaliStart] = useState('')
  const [jalaliEnd, setJalaliEnd] = useState('')
  const [costMethod, setCostMethod] = useState<'FIFO' | 'LIFO'>(() => {
    const raw = localStorage.getItem('reports.costMethod')
    return raw === 'LIFO' ? 'LIFO' : 'FIFO'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [pnl, setPnl] = useState<PnLReport | null>(null)
  const [cashAll, setCashAll] = useState<CashReport | null>(null)
  const [cashMethods, setCashMethods] = useState<Record<string, number>>({})
  const [stock, setStock] = useState<StockValuation[]>([])
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(() => {
    try {
      return localStorage.getItem('reports.stock.hideZero') !== 'false'
    } catch {
      return true
    }
  })
  const [hideNegativeStock, setHideNegativeStock] = useState<boolean>(() => {
    try {
      return localStorage.getItem('reports.stock.hideNegative') === 'true'
    } catch {
      return false
    }
  })
  const [computedSales, setComputedSales] = useState(0)
  const [computedCOGS, setComputedCOGS] = useState(0)
  const [salesTrend, setSalesTrend] = useState<Array<{ date: string; total: number }>>([])
  const [productLedgerOpen, setProductLedgerOpen] = useState<null | {
    product_id: string
    name: string
    entries: Array<{
      date: string
      type: 'purchase' | 'sale'
      qty: number
      unit: number
      total: number
      running: number
    }>
  }>(null)

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays, smartDate.isoDate, useCustomRange, jalaliStart, jalaliEnd, costMethod])

  useEffect(() => {
    // Dynamically load chart libraries; ignore failures in environments missing chart deps
    ;(async () => {
      try {
        await import('chart.js/auto')
        // chart.js/auto pre-registers all necessary elements
        const rc = await import('react-chartjs-2')
        Bar = rc.Bar
        Doughnut = rc.Doughnut
        setChartsReady(true)
      } catch (e) {
        console.warn('Charts unavailable; rendering without charts.', e)
        setChartsReady(false)
      }
    })()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('reports.costMethod', costMethod)
    } catch {}
  }, [costMethod])

  useEffect(() => {
    try {
      localStorage.setItem('reports.stock.hideZero', String(hideZeroStock))
    } catch {}
  }, [hideZeroStock])

  useEffect(() => {
    try {
      localStorage.setItem('reports.stock.hideNegative', String(hideNegativeStock))
    } catch {}
  }, [hideNegativeStock])

  function resolveRange(): { startIso: string; endIso: string; days: number } {
    // end inclusive -> add 1 day when calling backend daily endpoints
    const endDate = smartDate.isoDate ? new Date(`${smartDate.isoDate}T00:00:00Z`) : new Date()
    if (useCustomRange && jalaliStart && jalaliEnd) {
      const s = jalaliToIso(jalaliStart)
      const e = jalaliToIso(jalaliEnd)
      const startIso = s || endDate.toISOString()
      const endIso = e || endDate.toISOString()
      const diffDays = Math.max(
        1,
        Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / (24 * 3600 * 1000)),
      )
      return { startIso, endIso, days: diffDays }
    }
    const startDate = new Date(endDate.getTime())
    startDate.setUTCDate(startDate.getUTCDate() - rangeDays)
    return { startIso: startDate.toISOString(), endIso: endDate.toISOString(), days: rangeDays }
  }

  async function loadReports() {
    setLoading(true)
    setError(null)
    const newWarnings: string[] = []
    try {
      const { startIso, endIso, days } = resolveRange()
      const startParam = startIso
      const endParam = new Date(new Date(endIso).getTime() + 24 * 3600 * 1000).toISOString()
      try {
        const pnlData = await apiGet<PnLReport>(
          `/api/reports/pnl?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(
            endParam,
          )}&method=${encodeURIComponent(costMethod)}`,
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
        CASH_METHODS.map((method) =>
          apiGet<CashReport>(`/api/reports/cash?method=${method}`)
            .then((res) => {
              methodEntries[method] = res.balance
            })
            .catch((err) => {
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

      // Load invoices to compute FIFO/LIFO based gross profit and product-ledger base
      // prefer server-side calculations; fallback removed for simplicity and performance
      if (pnl && (pnl as any).sales != null) setComputedSales((pnl as any).sales as number)
      if (pnl && (pnl as any).cogs != null) setComputedCOGS((pnl as any).cogs as number)

      // Load sales trends for chart
      try {
        const trend = await apiGet<{
          days: number
          series: Array<{ date: string; total: number }>
        }>(`/api/dashboard/sales-trends?days=${days}`)
        setSalesTrend(trend.series || [])
      } catch (err) {
        console.error(err)
      }
    } catch (err) {
      console.error(err)
      setError('بارگذاری گزارش‌ها با خطا روبه‌رو شد.')
    } finally {
      setWarnings(newWarnings)
      setLoading(false)
    }
  }

  function computePnLWithCost(
    invoices: Array<any>,
    startT: number,
    endT: number,
    method: 'FIFO' | 'LIFO',
  ) {
    // Build events up to endT; compute revenue in [startT,endT] and COGS based on layers
    const byProduct: Record<string, Array<any>> = {}
    for (const inv of invoices) {
      const t = inv.server_time ? new Date(inv.server_time).getTime() : 0
      if (!t) continue
      if (t > endT) continue
      const type = inv.invoice_type
      for (const it of inv.items) {
        if (!it.product_id) continue
        byProduct[it.product_id] = byProduct[it.product_id] || []
        byProduct[it.product_id].push({
          t,
          type,
          qty: Number(it.quantity || 0),
          unit: Number(it.unit_price || 0),
          total: Number(it.total || 0),
          name: it.description || '',
        })
      }
    }
    let totalRevenue = 0
    let totalCOGS = 0
    for (const pid of Object.keys(byProduct)) {
      const events = byProduct[pid].sort((a, b) => a.t - b.t)
      const layers: Array<{ qty: number; cost: number }> = []
      let lastCost = 0
      const takeFromLayers = (need: number) => {
        let takenCost = 0
        while (need > 0) {
          const idx = method === 'FIFO' ? 0 : layers.length - 1
          const layer = layers[idx]
          if (!layer) {
            // no layers left, fallback to lastCost
            takenCost += need * lastCost
            need = 0
            break
          }
          const use = Math.min(need, layer.qty)
          takenCost += use * layer.cost
          layer.qty -= use
          need -= use
          if (layer.qty <= 0) layers.splice(idx, 1)
        }
        return takenCost
      }
      for (const ev of events) {
        if (ev.type === 'purchase') {
          // purchase increases layers
          layers.push({ qty: ev.qty, cost: ev.unit })
          lastCost = ev.unit || lastCost
        } else if (ev.type === 'sale') {
          // sale decreases layers
          const lineRevenue = ev.total
          if (ev.t >= startT) {
            totalRevenue += lineRevenue
            const cost = takeFromLayers(ev.qty)
            totalCOGS += cost
          } else {
            // before period: consume without counting revenue/cost
            takeFromLayers(ev.qty)
          }
        }
      }
    }
    return { sales: Math.round(totalRevenue), cogs: Math.round(totalCOGS) }
  }

  function openProductLedger(p: StockValuation) {
    try {
      const { startIso, endIso } = resolveRange()
      apiGet<
        Array<{
          date: string
          type: 'purchase' | 'sale'
          qty: number
          unit: number
          total: number
          running: number
        }>
      >(
        `/api/ledger/product/${encodeURIComponent(p.product_id)}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`,
      )
        .then((rows) => {
          const entries = (rows || []).map((r) => ({ ...r, date: r.date }))
          setProductLedgerOpen({ product_id: p.product_id, name: p.name, entries })
        })
        .catch((err) => {
          console.error(err)
        })
    } catch (e) {
      console.error(e)
    }
  }

  const stockTotals = useMemo(() => {
    const filtered = stock.filter((it) => {
      if (hideZeroStock && (it.inventory ?? 0) === 0) return false
      if (hideNegativeStock && (it.inventory ?? 0) < 0) return false
      return true
    })
    const count = filtered.length
    const totalValue = filtered.reduce((acc, item) => acc + (item.total_value || 0), 0)
    return { count, totalValue }
  }, [stock, hideZeroStock, hideNegativeStock])

  const filteredStock = useMemo(() => {
    return stock.filter((it) => {
      if (hideZeroStock && (it.inventory ?? 0) === 0) return false
      if (hideNegativeStock && (it.inventory ?? 0) < 0) return false
      return true
    })
  }, [stock, hideZeroStock, hideNegativeStock])

  if (loading) {
    return (
      <div className={`${retroPanel} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 border-4 border-[var(--retro-button-bg)] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} text-[var(--retro-button-bg)]`}>
            در حال گردآوری گزارش‌ها...
          </p>
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
            <div className="flex items-center gap-2">
              <label className={`${retroHeading}`}>محاسبه سود با</label>
              <select
                className={`${retroInput}`}
                value={costMethod}
                onChange={(e) => setCostMethod(e.target.value as 'FIFO' | 'LIFO')}
              >
                <option value="FIFO">FIFO</option>
                <option value="LIFO">LIFO</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className={`${retroHeading}`}>بازه سفارشی (شمسی)</label>
              <input
                value={jalaliStart}
                onChange={(e) => setJalaliStart(e.target.value)}
                placeholder="۱۴۰۴/۰۹/۰۱"
                className={`${retroInput} w-28`}
              />
              <span className="text-xs">تا</span>
              <input
                value={jalaliEnd}
                onChange={(e) => setJalaliEnd(e.target.value)}
                placeholder="۱۴۰۴/۰۹/۳۰"
                className={`${retroInput} w-28`}
              />
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={useCustomRange}
                  onChange={(e) => setUseCustomRange(e.target.checked)}
                />{' '}
                فعال
              </label>
            </div>
            {!useCustomRange && (
              <label className={`${retroHeading} flex items-center gap-2`}>
                بازه (روز)
                <select
                  value={rangeDays}
                  onChange={(e) => setRangeDays(Number(e.target.value))}
                  className={`${retroInput} w-28`}
                >
                  <option value={7}>۷</option>
                  <option value={30}>۳۰</option>
                  <option value={90}>۹۰</option>
                  <option value={365}>۳۶۵</option>
                </select>
              </label>
            )}
            <button className={`${retroButton} !bg-[#1f2e3b]`} onClick={() => loadReports()}>
              بازخوانی
            </button>
          </div>
        </header>

        {pnl ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
              <p className={retroHeading}>فروش</p>
              <p className="text-lg font-semibold">
                {formatNumberFa(computedSales || pnl.sales)} ریال
              </p>
            </div>
            <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
              <p className={retroHeading}>بهای تمام‌شده (COGS)</p>
              <p className="text-lg font-semibold">{formatNumberFa(computedCOGS)} ریال</p>
            </div>
            <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
              <p className={retroHeading}>سود ناخالص</p>
              <p className="text-lg font-semibold">
                {formatNumberFa((computedSales || 0) - (computedCOGS || 0))} ریال
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#7a6b4f]">گزارش سود و زیان بارگذاری نشد.</p>
        )}
      </section>

      {/* Sales Trend Chart */}
      {salesTrend.length > 0 && (
        <section className={`${retroPanelPadded} space-y-4`}>
          <header>
            <p className={retroHeading}>Sales Trend</p>
            <h3 className="text-lg font-semibold mt-2">نمودار فروش</h3>
          </header>
          <div className="w-full overflow-x-auto">
            <svg width={Math.max(600, salesTrend.length * 18)} height={180} role="img">
              {(() => {
                const max = Math.max(1, ...salesTrend.map((s) => s.total))
                const barW = 12
                const gap = 6
                return salesTrend.map((s, idx) => {
                  const h = Math.round((s.total / max) * 140)
                  const x = idx * (barW + gap) + 40
                  const y = 160 - h
                  return (
                    <g key={s.date}>
                      <rect x={x} y={y} width={barW} height={h} fill="#5b4a2f" />
                    </g>
                  )
                })
              })()}
              {/* Axis */}
              <line
                x1={30}
                y1={160}
                x2={Math.max(560, salesTrend.length * 18)}
                y2={160}
                stroke="#c5bca5"
              />
            </svg>
          </div>
        </section>
      )}

      <section className={`${retroPanelPadded} space-y-4`}>
        <header>
          <p className={retroHeading}>Cash Position</p>
          <h3 className="text-lg font-semibold mt-2">تراز نقدی</h3>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>کل منابع نقدی</p>
            <p className="text-lg font-semibold">{formatNumberFa(cashAll?.balance ?? 0)} ریال</p>
          </div>
          <div className="border border-[var(--retro-input-border)] bg-[var(--retro-input-bg)] px-4 py-3 shadow-inner space-y-1">
            <p className={retroHeading}>روش‌های اصلی</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {CASH_METHODS.map((method) => (
                <span key={method} className={retroBadge}>
                  {method} : {formatNumberFa(cashMethods[method] ?? 0)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header>
          <p className={retroHeading}>Stock Valuation</p>
          <h3 className="text-lg font-semibold mt-2">ارزش موجودی</h3>
          <p className={`text-xs ${retroMuted} mt-2`}>
            تعداد کالا: {formatNumberFa(stockTotals.count)} | ارزش کل:{' '}
            {formatNumberFa(stockTotals.totalValue)} ریال
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hideZeroStock}
                onChange={(e) => setHideZeroStock(e.target.checked)}
              />
              عدم نمایش موجودی صفر
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hideNegativeStock}
                onChange={(e) => setHideNegativeStock(e.target.checked)}
              />
              عدم نمایش موجودی منفی
            </label>
          </div>
        </header>
        {filteredStock.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>کالا</th>
                <th className={retroTableHeader}>موجودی</th>
                <th className={retroTableHeader}>قیمت واحد</th>
                <th className={retroTableHeader}>ارزش کل</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.slice(0, 50).map((item) => (
                <tr
                  key={item.product_id}
                  className="border-b border-[#d9cfb6] hover:bg-[#f6f1df] cursor-pointer"
                  onClick={() => openProductLedger(item)}
                >
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2 text-left">{formatNumberFa(item.inventory)}</td>
                  <td className="px-3 py-2 text-left">
                    {item.unit_price ? formatNumberFa(item.unit_price) : 'نامشخص'}
                  </td>
                  <td className="px-3 py-2 text-left">{formatNumberFa(item.total_value)} ریال</td>
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

      {productLedgerOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setProductLedgerOpen(null)}
        >
          <div
            className="w-[720px] max-w-[95vw] bg-[#faf4de] border-2 border-[#c5bca5] shadow-[6px_6px_0_#c5bca5] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-[#1f2e3b]">گردش کالا: {productLedgerOpen.name}</h4>
              <button className={`${retroButton}`} onClick={() => setProductLedgerOpen(null)}>
                بستن
              </button>
            </div>
            {productLedgerOpen.entries.length ? (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
                  <thead>
                    <tr>
                      <th className={retroTableHeader}>تاریخ</th>
                      <th className={retroTableHeader}>نوع</th>
                      <th className={retroTableHeader}>مقدار</th>
                      <th className={retroTableHeader}>فی</th>
                      <th className={retroTableHeader}>جمع</th>
                      <th className={retroTableHeader}>مانده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productLedgerOpen.entries.map((r, idx) => (
                      <tr key={idx} className="border-b border-[#d9cfb6]">
                        <td className="px-3 py-2 text-xs">{isoToJalali(r.date)}</td>
                        <td className="px-3 py-2 text-xs">
                          {r.type === 'purchase' ? 'خرید' : 'فروش'}
                        </td>
                        <td className="px-3 py-2 text-left font-mono">{formatNumberFa(r.qty)}</td>
                        <td className="px-3 py-2 text-left font-mono">{formatNumberFa(r.unit)}</td>
                        <td className="px-3 py-2 text-left font-mono">{formatNumberFa(r.total)}</td>
                        <td className="px-3 py-2 text-left font-mono">
                          {formatNumberFa(r.running)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-[#7a6b4f]">رکوردی در بازه انتخابی یافت نشد.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
