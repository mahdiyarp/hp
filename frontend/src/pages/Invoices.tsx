import React from 'react'
import { apiGet } from '../services/api'

type Row = Record<string, any>

const Invoices: React.FC = () => {
  const [items, setItems] = React.useState<Row[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [sortKey, setSortKey] = React.useState<'description' | 'amount' | 'date' | null>(null)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      // Build query params for backend pagination/filter. Keep client-side pagination as fallback.
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (debounced) params.set('search', debounced)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const url = `/api/invoices?${params.toString()}`
      const resp = await apiGet<any>(url)
      const data = Array.isArray(resp) ? resp : (resp?.items ?? resp?.results ?? [])
      setItems(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت فاکتورها')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(id)
  }, [query])

  const filtered = React.useMemo(() => {
    const q = debounced
    const list = items || []
    let res = q
      ? list.filter((row) =>
          [row.description, row.title, row.product, row.date, row.created_at]
            .filter(Boolean)
            .some((v) => String(v).includes(q)),
        )
      : list
    // client-side date range filter (simple lexical for ISO-like dates)
    if (dateFrom) {
      res = res.filter((row) => String(row.date || row.created_at || '').startsWith(dateFrom))
    }
    if (dateTo) {
      res = res.filter((row) => String(row.date || row.created_at || '') <= dateTo)
    }
    if (sortKey) {
      res.sort((a, b) => {
        const va = a[sortKey] ?? ''
        const vb = b[sortKey] ?? ''
        const ca = typeof va === 'number' ? va : String(va)
        const cb = typeof vb === 'number' ? vb : String(vb)
        if (ca < cb) return sortDir === 'asc' ? -1 : 1
        if (ca > cb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return res.slice(start, end)
  }, [items, debounced, page, pageSize, sortKey, sortDir, dateFrom, dateTo])

  const toggleSort = (key: 'description' | 'amount' | 'date') => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="hp-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">فاکتورها</h2>
        <div className="flex items-center gap-2">
          <button className="hp-button" onClick={load} disabled={loading}>
            {loading ? '...' : 'بارگذاری'}
          </button>
          <button
            className="hp-button"
            onClick={() => {
              window.location.hash = 'invoice-new'
            }}
          >
            ثبت فاکتور جدید
          </button>
        </div>
      </div>

      {error && <div className="hp-badge error mt-3">{error}</div>}

      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <input
            className="hp-input w-56"
            placeholder="جستجو"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
          <select
            className="hp-input w-24"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <input
            type="date"
            className="hp-input"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
          />
          <input
            type="date"
            className="hp-input"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-3 py-2">شماره</th>
              <th className="px-3 py-2">مشتری</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => toggleSort('amount')}>
                مبلغ کل
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => toggleSort('date')}>
                تاریخ
              </th>
              <th className="px-3 py-2">وضعیت</th>
              <th className="px-3 py-2">پرداخت</th>
              <th className="px-3 py-2">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered && filtered.length > 0 ? (
              filtered.map((row, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2">{row.code || row.number || row.id || '-'}</td>
                  <td className="px-3 py-2">{row.customer_name || row.customer || '-'}</td>
                  <td className="px-3 py-2">
                    {new Intl.NumberFormat('fa-IR').format(
                      (row.total ?? row.amount ?? row.price ?? 0) as number,
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.jalali_date || row.date || row.created_at || '-'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`hp-badge ${statusClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {renderPaidPercent(row.paid_amount, row.total ?? row.amount)}
                  </td>
                  <td className="px-3 py-2">{actionMenu(row)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-[var(--primary)]/70" colSpan={3}>
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
            disabled={page === 1}
          >
            قبلی
          </button>
          <span className="text-xs">صفحه {page}</span>
          <button
            className="hp-button"
            onClick={() => setPage(page + 1)}
            disabled={(items || []).length <= page * pageSize}
          >
            بعدی
          </button>
        </div>
      </div>
    </div>
  )
}

export default Invoices

function statusClass(status: string | undefined) {
  switch ((status || '').toLowerCase()) {
    case 'draft':
      return 'neutral'
    case 'issued':
    case 'sent':
      return 'info'
    case 'viewed':
      return 'warning'
    case 'paid':
      return 'success'
    case 'overdue':
      return 'error'
    case 'cancelled':
      return 'dark'
    default:
      return 'neutral'
  }
}

function statusLabel(status: string | undefined) {
  const s = (status || '').toLowerCase()
  const map: Record<string, string> = {
    draft: 'پیش‌نویس',
    issued: 'صادر شده',
    sent: 'ارسال شده',
    viewed: 'مشاهده شده',
    paid: 'پرداخت شده',
    overdue: 'معوق',
    cancelled: 'باطل',
  }
  return map[s] || status || '-'
}

function renderPaidPercent(paid?: number, total?: number) {
  const p = Number(paid || 0)
  const t = Number(total || 0)
  if (!t) return '0%'
  const pct = Math.round((p / t) * 100)
  return `${pct}%`
}

function actionMenu(row: any) {
  // Placeholder dropdown; integrate with real handlers later
  return (
    <details className="relative">
      <summary className="hp-button">اقدامات</summary>
      <div className="absolute z-10 mt-1 bg-white border rounded shadow min-w-[10rem]">
        <button
          className="block w-full text-right px-3 py-2 hover:bg-gray-50"
          onClick={() => {
            const id = row.id || row.code || row.number
            if (id) window.location.hash = `invoice-edit:${id}`
          }}
        >
          🖊 ویرایش
        </button>
        <button className="block w-full text-right px-3 py-2 hover:bg-gray-50">📄 مشاهده</button>
        <button className="block w-full text-right px-3 py-2 hover:bg-gray-50">📥 تکثیر</button>
        <button className="block w-full text-right px-3 py-2 hover:bg-gray-50">
          💰 ثبت پرداخت
        </button>
        <button className="block w-full text-right px-3 py-2 hover:bg-gray-50">
          🔁 تغییر وضعیت
        </button>
        <button className="block w-full text-right px-3 py-2 hover:bg-gray-50">🧾 چاپ/PDF</button>
        <button className="block w-full text-right px-3 py-2 hover:bg-gray-50">
          📤 اشتراک لینک
        </button>
        <button className="block w-full text-right px-3 py-2 hover:bg-gray-50 text-red-600">
          🗑 حذف
        </button>
      </div>
    </details>
  )
}
