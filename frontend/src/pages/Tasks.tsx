import React from 'react'
import { apiGet } from '../services/api'

const Tasks: React.FC = () => {
  const [items, setItems] = React.useState<any[]>([])
  const [status, setStatus] = React.useState('')
  const [assignee, setAssignee] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (status) params.set('status', status)
      if (assignee) params.set('assignee_id', assignee)
      const res = await apiGet(`/api/tasks?${params.toString()}`)
      setItems(res?.items || [])
    } catch(e:any){ setError(e?.message||'خطا در دریافت وظایف'); setItems([]) } finally { setLoading(false) }
  }

  React.useEffect(()=>{ load() }, [status, assignee, page, limit])

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">وظایف</h2>
        <div className="flex items-center gap-2">
          <select className="hp-input" value={status} onChange={(e)=>{setStatus(e.target.value); setPage(1)}}>
            <option value="">همه وضعیت‌ها</option>
            <option value="todo">در انتظار</option>
            <option value="doing">در حال انجام</option>
            <option value="done">انجام شده</option>
          </select>
          <input className="hp-input w-40" placeholder="شناسه مسئول" value={assignee} onChange={(e)=>{setAssignee(e.target.value); setPage(1)}} />
          <select className="hp-input" value={limit} onChange={(e)=>{setLimit(Number(e.target.value)); setPage(1)}}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button className="hp-button" onClick={()=>{ window.location.hash = 'task-new' }}>ایجاد وظیفه</button>
          <button className="hp-button" onClick={load} disabled={loading}>{loading?'...':'بروزرسانی'}</button>
        </div>
      </div>
      {error && <div className="hp-badge error mt-2">{error}</div>}

      <div className="overflow-x-auto mt-3">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-right">
              <th className="px-3 py-2">عنوان</th>
              <th className="px-3 py-2">وضعیت</th>
              <th className="px-3 py-2">اولویت</th>
              <th className="px-3 py-2">موعد</th>
              <th className="px-3 py-2">ارجاع</th>
              <th className="px-3 py-2">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t:any)=> (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">{t.title}</td>
                <td className="px-3 py-2"><span className={`hp-badge ${t.status==='done'?'success':t.status==='doing'?'dark':'default'}`}>{t.status}</span></td>
                <td className="px-3 py-2">{t.priority||'-'}</td>
                <td className="px-3 py-2">{t.due_date || '-'}</td>
                <td className="px-3 py-2">{t.entity_type?`${t.entity_type}#${t.entity_id}`:'-'}</td>
                <td className="px-3 py-2"><button className="hp-button secondary" onClick={()=>{ window.location.hash = `task-edit:${t.id}` }}>ویرایش</button></td>
              </tr>
            ))}
            {items.length===0 && (
              <tr>
                <td className="px-3 py-6 text-center text-[var(--primary)]/70" colSpan={6}>{loading?'در حال بارگذاری...':'موردی یافت نشد'}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center gap-2 mt-3">
          <button className="hp-button" onClick={()=> setPage(Math.max(1, page-1))} disabled={page===1}>قبلی</button>
          <span className="text-xs">صفحه {page}</span>
          <button className="hp-button" onClick={()=> setPage(page+1)}>بعدی</button>
        </div>
      </div>
    </div>
  )
}

export default Tasks
