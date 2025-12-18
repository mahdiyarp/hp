import React from 'react'
import { apiGet } from '../services/api'

const Activity: React.FC = () => {
  const [items, setItems] = React.useState<any[]>([])
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet(`/api/activity/recent?page=${page}&limit=${limit}`)
      setItems(res?.items || [])
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت فعالیت‌ها')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [page, limit])

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">فعالیت‌ها</h2>
        <div className="flex items-center gap-2">
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
          <button className="hp-button" onClick={load} disabled={loading}>
            {loading ? '...' : 'بروزرسانی'}
          </button>
        </div>
      </div>
      {error && <div className="hp-badge error mt-2">{error}</div>}

      <div className="overflow-x-auto mt-3">
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
            {items.map((a: any, idx: number) => (
              <tr key={idx} className="border-t">
                <td className="px-3 py-2">{a.created_at || '-'}</td>
                <td className="px-3 py-2">{a.actor || '-'}</td>
                <td className="px-3 py-2">{a.action || '-'}</td>
                <td className="px-3 py-2">
                  {a.entity_type}#{a.entity_id}
                </td>
                <td className="px-3 py-2">{a.detail || '-'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-[var(--primary)]/70" colSpan={5}>
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
          <button className="hp-button" onClick={() => setPage(page + 1)}>
            بعدی
          </button>
        </div>
      </div>
    </div>
  )
}

export default Activity
