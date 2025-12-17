import React from 'react'
import { apiGet, apiPost, apiPut } from '../services/api'

interface Props {
  mode: 'create' | 'edit'
}

const TaskEditor: React.FC<Props> = ({ mode }) => {
  const [id, setId] = React.useState<number | null>(null)
  const [data, setData] = React.useState<any>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee_id: '',
    entity_type: '',
    entity_id: '',
  })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // read hash for edit id
    const raw = (window.location.hash || '').replace('#', '')
    const parts = raw.split(':')
    if (parts[0] === 'task-edit' && parts[1]) {
      const tid = Number(parts[1])
      if (Number.isFinite(tid)) setId(tid)
    }
    // prefill from localStorage if exists
    try {
      if (mode === 'create') {
        const pf = localStorage.getItem('hp.task.prefill')
        if (pf) {
          const obj = JSON.parse(pf)
          setData((d: any) => ({ ...d, ...obj }))
          localStorage.removeItem('hp.task.prefill')
        }
      }
    } catch {}
  }, [mode])

  React.useEffect(() => {
    const load = async () => {
      if (mode === 'edit' && id) {
        try {
          const t = await apiGet(`/api/tasks/${id}`)
          setData(t || {})
        } catch (e: any) {
          setError(e?.message || 'خطا در دریافت وظیفه')
        }
      }
    }
    load()
  }, [mode, id])

  const setField = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }))

  const save = async () => {
    try {
      setSaving(true)
      if (mode === 'create') {
        const created = await apiPost('/api/tasks', data)
        setData(created)
        setId(created?.id || null)
        if (created?.id) window.location.hash = `task-edit:${created.id}`
      } else if (mode === 'edit' && id) {
        const updated = await apiPut(`/api/tasks/${id}`, data)
        setData(updated)
      }
    } catch (e: any) {
      setError(e?.message || 'ذخیره ناموفق')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {mode === 'create' ? 'ایجاد وظیفه' : 'ویرایش وظیفه'} {id ? `#${id}` : ''}
        </h2>
        <button className="hp-button" onClick={save} disabled={saving}>
          {saving ? '...' : 'ذخیره'}
        </button>
      </div>
      {error && <div className="hp-badge error mt-2">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">جزئیات</h3>
          <input
            className="hp-input w-full mb-2"
            placeholder="عنوان"
            value={data.title || ''}
            onChange={(e) => setField('title', e.target.value)}
          />
          <textarea
            className="hp-input w-full mb-2"
            rows={3}
            placeholder="توضیحات"
            value={data.description || ''}
            onChange={(e) => setField('description', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="hp-input"
              value={data.status || 'todo'}
              onChange={(e) => setField('status', e.target.value)}
            >
              <option value="todo">در انتظار</option>
              <option value="doing">در حال انجام</option>
              <option value="done">انجام شده</option>
            </select>
            <select
              className="hp-input"
              value={data.priority || 'medium'}
              onChange={(e) => setField('priority', e.target.value)}
            >
              <option value="low">کم</option>
              <option value="medium">متوسط</option>
              <option value="high">بالا</option>
            </select>
          </div>
        </div>
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">ارجاع</h3>
          <input
            className="hp-input w-full mb-2"
            placeholder="شناسه مسئول"
            value={data.assignee_id || ''}
            onChange={(e) => setField('assignee_id', e.target.value)}
          />
          <input
            className="hp-input w-full mb-2"
            placeholder="نوع موجودیت (contact/person/invoice)"
            value={data.entity_type || ''}
            onChange={(e) => setField('entity_type', e.target.value)}
          />
          <input
            className="hp-input w-full"
            placeholder="شناسه موجودیت"
            value={data.entity_id || ''}
            onChange={(e) => setField('entity_id', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export default TaskEditor
