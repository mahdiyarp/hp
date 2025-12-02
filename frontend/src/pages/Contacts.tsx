import React from 'react'
import { apiGet } from '../services/api'

const Contacts: React.FC = () => {
  const [items, setItems] = React.useState<any[]>([])
  const [q, setQ] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)
  const [status, setStatus] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (debounced) params.set('q', debounced)
      if (status) params.set('status', status)
      const res = await apiGet(`/api/contacts?${params.toString()}`)
      setItems(res?.items || [])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(()=>{ const t = setTimeout(()=> setDebounced(q.trim()), 300); return ()=> clearTimeout(t) }, [q])
  React.useEffect(()=>{ load() }, [debounced, page, limit, status])

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">مخاطبین</h2>
        <div className="flex items-center gap-2">
          <input className="hp-input w-56" placeholder="جستجو" value={q} onChange={(e)=>{setQ(e.target.value); setPage(1)}} />
          <select className="hp-input" value={status} onChange={(e)=>{setStatus(e.target.value); setPage(1)}}>
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
            <option value="blacklist">بلک‌لیست</option>
          </select>
          <select className="hp-input" value={limit} onChange={(e)=>{setLimit(Number(e.target.value)); setPage(1)}}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button className="hp-button" onClick={()=>{ window.location.hash = 'contact-new' }}>ایجاد مخاطب</button>
        </div>
      </div>

      <div className="overflow-x-auto mt-3">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-right">
              <th className="px-3 py-2">شناسه</th>
              <th className="px-3 py-2">تلفن</th>
              <th className="px-3 py-2">ایمیل</th>
              <th className="px-3 py-2">شرکت</th>
              <th className="px-3 py-2">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.phone || '-'}</td>
                <td className="px-3 py-2">{c.email || '-'}</td>
                <td className="px-3 py-2">{c.company || '-'}</td>
                <td className="px-3 py-2 flex items-center gap-2">
                  <span className={`hp-badge ${c.status==='blacklist'?'error':c.status==='inactive'?'dark':'success'}`}>{c.status||'-'}</span>
                  <button className="hp-button secondary" onClick={()=>{ window.location.hash = `contact-edit:${c.id}` }}>ویرایش</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-[var(--primary)]/70" colSpan={5}>{loading?'در حال بارگذاری...':'موردی یافت نشد'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Contacts
