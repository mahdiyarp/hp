import React from 'react'
import { apiGet } from '../services/api'

type SalesSummary = any
type CashSummary = any
type StockSummary = any
type PnlSummary = any

const Dashboard: React.FC = () => {
  const [sales, setSales] = React.useState<SalesSummary | null>(null)
  const [cash, setCash] = React.useState<CashSummary | null>(null)
  const [stock, setStock] = React.useState<StockSummary | null>(null)
  const [pnl, setPnl] = React.useState<PnlSummary | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [layout, setLayout] = React.useState<string[]>(()=>{
    try { const raw = localStorage.getItem('hp.dashboard.layout'); if (raw) return JSON.parse(raw) } catch {}
    return ['sales','cash','stock','pnl','payments']
  })
  const [paymentsSum, setPaymentsSum] = React.useState<number>(0)
  const [activity, setActivity] = React.useState<any>({ items: [], total: 0, page: 1, limit: 10 })
  const [error, setError] = React.useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)
      const startIso = todayStart.toISOString()
      const endIso = todayEnd.toISOString()
      const [s, c, st, p, act, pay] = await Promise.all([
        apiGet<SalesSummary>('/api/reports/sales'),
        apiGet<CashSummary>('/api/reports/cash'),
        apiGet<StockSummary>('/api/reports/stock'),
        apiGet<PnlSummary>('/api/reports/pnl'),
        apiGet('/api/activity/recent?page=1&limit=10'),
        apiGet(`/api/reports/payments?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}&direction=in`)
      ])
      setSales(s)
      setCash(c)
      setStock(st)
      setPnl(p)
      setActivity(act||{ items: [], total: 0, page: 1, limit: 10 })
      try { setPaymentsSum(Number(pay?.total||0)) } catch {}
    } catch (e: any) {
      setError(e?.message || 'خطا در بارگذاری گزارش‌ها')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  const fmt = (v: any) => {
    const n = typeof v === 'number' ? v : Number(v || 0)
    return new Intl.NumberFormat('fa-IR').format(n)
  }

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, key: string) => {
    e.dataTransfer.setData('text/plain', key)
  }
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault() }
  const onDrop = (e: React.DragEvent<HTMLDivElement>, targetKey: string) => {
    e.preventDefault()
    const srcKey = e.dataTransfer.getData('text/plain')
    if (!srcKey || srcKey === targetKey) return
    const order = [...layout]
    const si = order.indexOf(srcKey)
    const ti = order.indexOf(targetKey)
    if (si === -1 || ti === -1) return
    order.splice(si, 1)
    order.splice(ti, 0, srcKey)
    setLayout(order)
    try { localStorage.setItem('hp.dashboard.layout', JSON.stringify(order)) } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="hp-button" onClick={load} disabled={loading}>{loading ? '...' : 'بروزرسانی'}</button>
        {error && <span className="hp-badge error">{error}</span>}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="hp-card p-4" draggable onDragStart={(e)=>onDragStart(e,'sales')} onDragOver={onDragOver} onDrop={(e)=>onDrop(e,'sales')}>
          <div className="text-xs text-[var(--primary)]/70">فروش امروز</div>
          <div className="text-2xl font-bold mt-1">{fmt(sales?.today || sales?.total || 0)} تومان</div>
        </div>
        <div className="hp-card p-4" draggable onDragStart={(e)=>onDragStart(e,'cash')} onDragOver={onDragOver} onDrop={(e)=>onDrop(e,'cash')}>
          <div className="text-xs text-[var(--primary)]/70">نقدینگی</div>
          <div className="text-2xl font-bold mt-1">{fmt(cash?.balance || cash?.total || 0)} تومان</div>
        </div>
        <div className="hp-card p-4" draggable onDragStart={(e)=>onDragStart(e,'stock')} onDragOver={onDragOver} onDrop={(e)=>onDrop(e,'stock')}>
          <div className="text-xs text-[var(--primary)]/70">موجودی انبار</div>
          <div className="text-2xl font-bold mt-1">{fmt(stock?.value || stock?.total || 0)}</div>
        </div>
        <div className="hp-card p-4" draggable onDragStart={(e)=>onDragStart(e,'pnl')} onDragOver={onDragOver} onDrop={(e)=>onDrop(e,'pnl')}>
          <div className="text-xs text-[var(--primary)]/70">سود و زیان</div>
          <div className="text-2xl font-bold mt-1">{fmt(pnl?.net || pnl?.profit || 0)} تومان</div>
        </div>
        <div className="hp-card p-4" draggable onDragStart={(e)=>onDragStart(e,'payments')} onDragOver={onDragOver} onDrop={(e)=>onDrop(e,'payments')}>
          <div className="text-xs text-[var(--primary)]/70">جمع پرداخت‌های اخیر</div>
          <div className="text-2xl font-bold mt-1">{fmt(paymentsSum)} تومان</div>
        </div>
      </section>

      <section className="hp-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">فعالیت‌های اخیر</h2>
          <button className="hp-button ghost text-sm">مشاهده همه</button>
        </div>
        <div className="mt-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2">زمان</th>
                <th className="px-3 py-2">کاربر</th>
                <th className="px-3 py-2">اقدام</th>
                <th className="px-3 py-2">موجودیت</th>
                <th className="px-3 py-2">جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {(activity.items||[]).map((a:any, idx:number)=>(
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2">{a.created_at || '-'}</td>
                  <td className="px-3 py-2">{a.actor || '-'}</td>
                  <td className="px-3 py-2">{a.action || '-'}</td>
                  <td className="px-3 py-2">{a.entity_type}#{a.entity_id}</td>
                  <td className="px-3 py-2">{a.detail || '-'}</td>
                </tr>
              ))}
              {(activity.items||[]).length===0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-[var(--primary)]/70" colSpan={5}>{loading?'در حال بارگذاری...':'فعالیتی ثبت نشده'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
