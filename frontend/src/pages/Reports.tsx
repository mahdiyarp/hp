import React from 'react'
import { apiGet } from '../services/api'

const Reports: React.FC = () => {
  const [filters, setFilters] = React.useState<any>({
    from: '',
    to: '',
    customer: '',
    product: '',
    status: '',
  })
  const [items, setItems] = React.useState<any[]>([])
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const canView = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('hp.perms')
      if (!raw) return true
      const perms = JSON.parse(raw)
      return !!perms?.reports_view
    } catch {
      return true
    }
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.customer) params.set('customer', filters.customer)
      if (filters.product) params.set('product', filters.product)
      if (filters.status) params.set('status', filters.status)
      const res = await apiGet(`/api/reports/sales?${params.toString()}`)
      const arr = Array.isArray(res) ? res : res?.items || []
      setItems(arr)
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت گزارش')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [filters, page, limit])

  const exportCsv = async () => {
    if (!canView) return
    try {
      const params = new URLSearchParams()
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      window.open(`/api/reports/sales.csv?${params.toString()}`, '_blank')
    } catch {}
  }

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">گزارشات</h2>
        <div className="flex items-center gap-2">
          <button className="hp-button" onClick={load} disabled={loading || !canView}>
            {loading ? '...' : 'بروزرسانی'}
          </button>
          <button className="hp-button" onClick={exportCsv} disabled={!canView}>
            خروجی CSV
          </button>
        </div>
      </div>
      {!canView && (
        <div className="hp-badge error mt-2 text-xs">شما دسترسی مشاهده گزارشات را ندارید</div>
      )}
      {error && <div className="hp-badge error mt-2">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
        <input
          className="hp-input"
          placeholder="از تاریخ (YYYY-MM-DD)"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          className="hp-input"
          placeholder="تا تاریخ (YYYY-MM-DD)"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
        <input
          className="hp-input"
          placeholder="مشتری"
          value={filters.customer}
          onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
        />
        <input
          className="hp-input"
          placeholder="کالا"
          value={filters.product}
          onChange={(e) => setFilters({ ...filters, product: e.target.value })}
        />
        <select
          className="hp-input"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="draft">پیش‌نویس</option>
          <option value="final">نهایی</option>
          <option value="paid">پرداخت شده</option>
        </select>
        <select
          className="hp-input"
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value))
            setPage(1)
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="overflow-x-auto mt-3">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-3 py-2">تاریخ</th>
              <th className="px-3 py-2">مشتری</th>
              <th className="px-3 py-2">مبلغ</th>
              <th className="px-3 py-2">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-3 py-2">{r.date || r.created_at || '-'}</td>
                <td className="px-3 py-2">{r.customer || r.customer_name || '-'}</td>
                <td className="px-3 py-2">
                  {new Intl.NumberFormat('fa-IR').format(Number(r.total || r.amount || 0))}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`hp-badge ${r.status === 'final' ? 'success' : r.status === 'paid' ? 'success' : 'dark'}`}
                  >
                    {r.status || '-'}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-[var(--primary)]/70" colSpan={4}>
                  {loading ? 'در حال بارگذاری...' : 'موردی یافت نشد'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center gap-2 mt-3">
          <button
            className="hp-button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || !canView}
          >
            قبلی
          </button>
          <span className="text-xs">صفحه {page}</span>
          <button className="hp-button" onClick={() => setPage(page + 1)} disabled={!canView}>
            بعدی
          </button>
        </div>
      </div>
    </div>
  )
}

export default Reports
