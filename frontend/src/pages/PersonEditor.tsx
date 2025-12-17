import React from 'react'
import { apiGet, apiPost, apiPut } from '../services/api'

interface Props {
  mode: 'create' | 'edit'
}

const PersonEditor: React.FC<Props> = ({ mode }) => {
  const [id, setId] = React.useState<number | null>(null)
  const [data, setData] = React.useState<any>({
    name: '',
    national_id: '',
    phone: '',
    email: '',
    address: '',
    status: 'active',
    tags: '',
  })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const raw = (window.location.hash || '').replace('#', '')
    const parts = raw.split(':')
    if (parts[0] === 'person-edit' && parts[1]) {
      const pid = Number(parts[1])
      if (Number.isFinite(pid)) setId(pid)
    }
  }, [])

  React.useEffect(() => {
    const load = async () => {
      if (mode === 'edit' && id) {
        try {
          const p = await apiGet(`/api/persons/${id}`)
          setData(p || {})
        } catch (e: any) {
          setError(e?.message || 'خطا در دریافت شخص')
        }
      }
    }
    load()
  }, [mode, id])

  const setField = (k: string, v: any) => {
    setData((d: any) => ({ ...d, [k]: v }))
    bumpDirty()
  }
  const [dirty, setDirty] = React.useState(0)
  const bumpDirty = () => setDirty((n) => n + 1)

  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (!dirty) return
      try {
        setSaving(true)
        if (mode === 'create') {
          const created = await apiPost('/api/persons', data)
          setData(created)
          setId(created?.id || null)
          if (created?.id) window.location.hash = `person-edit:${created.id}`
        } else if (mode === 'edit' && id) {
          const updated = await apiPut(`/api/persons/${id}`, data)
          setData(updated)
        }
      } catch (e: any) {
        setError(e?.message || 'ذخیره ناموفق')
      } finally {
        setSaving(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [dirty, data, mode, id])

  return (
    <div className="hp-card p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {mode === 'create' ? 'ایجاد شخص' : 'ویرایش شخص'} {id ? `#${id}` : ''}
        </h2>
        <span className="text-xs">{saving ? 'در حال ذخیره...' : 'ذخیره خودکار'}</span>
      </div>
      {error && <div className="hp-badge error mt-2">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">مشخصات</h3>
          <input
            className="hp-input w-full mb-2"
            placeholder="نام"
            value={data.name || ''}
            onChange={(e) => setField('name', e.target.value)}
          />
          <input
            className="hp-input w-full mb-2"
            placeholder="کد ملی"
            value={data.national_id || ''}
            onChange={(e) => setField('national_id', e.target.value)}
          />
          <input
            className="hp-input w-full mb-2"
            placeholder="تلفن"
            value={data.phone || ''}
            onChange={(e) => setField('phone', e.target.value)}
          />
          <input
            className="hp-input w-full mb-2"
            placeholder="ایمیل"
            value={data.email || ''}
            onChange={(e) => setField('email', e.target.value)}
          />
          <input
            className="hp-input w-full mb-2"
            placeholder="آدرس"
            value={data.address || ''}
            onChange={(e) => setField('address', e.target.value)}
          />
          <select
            className="hp-input w-full mb-2"
            value={data.status || 'active'}
            onChange={(e) => setField('status', e.target.value)}
          >
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
            <option value="blacklist">بلک‌لیست</option>
          </select>
          <textarea
            className="hp-input w-full"
            rows={3}
            placeholder="برچسب‌ها (با کاما)"
            value={data.tags || ''}
            onChange={(e) => setField('tags', e.target.value)}
          />
        </div>
        <div className="hp-card p-3">
          <h3 className="font-semibold mb-2">بینش هوشمند</h3>
          <div className="text-xs text-[var(--primary)]/70">به‌زودی: پیشنهادهای هوشمند</div>
        </div>
      </div>

      {id && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="hp-card p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">فعالیت‌ها</h3>
              <button
                className="hp-button ghost"
                onClick={async () => {
                  /* no-op */
                }}
              >
                بروزرسانی
              </button>
            </div>
            <EntityTimeline entityType="person" entityId={id} />
          </div>
          <div className="hp-card p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">وظایف مرتبط</h3>
              <button
                className="hp-button"
                onClick={() => {
                  try {
                    localStorage.setItem(
                      'hp.task.prefill',
                      JSON.stringify({ entity_type: 'person', entity_id: id }),
                    )
                  } catch {}
                  window.location.hash = 'task-new'
                }}
              >
                ایجاد وظیفه
              </button>
            </div>
            <EntityTasks entityType="person" entityId={id} />
          </div>
        </div>
      )}
    </div>
  )
}

export default PersonEditor

const EntityTimeline: React.FC<{ entityType: string; entityId: number }> = ({
  entityType,
  entityId,
}) => {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  React.useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await apiGet(
          `/api/activity/recent?entity_type=${entityType}&entity_id=${entityId}`,
        )
        setItems(res?.items || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [entityType, entityId])
  return (
    <div className="mt-2 text-sm">
      {loading && <div className="text-[var(--primary)]/70">در حال بارگذاری...</div>}
      {!loading && items.length === 0 && (
        <div className="text-[var(--primary)]/70">موردی یافت نشد</div>
      )}
      <ul className="space-y-2">
        {items.map((a: any, idx: number) => (
          <li key={idx} className="border rounded p-2">
            <div className="text-xs text-[var(--primary)]/60">{a.created_at}</div>
            <div className="font-medium">
              {a.action} — {a.actor || '-'}
            </div>
            <div className="text-xs">{a.detail || ''}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const EntityTasks: React.FC<{ entityType: string; entityId: number }> = ({
  entityType,
  entityId,
}) => {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  React.useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await apiGet(`/api/tasks?entity_type=${entityType}&entity_id=${entityId}`)
        setItems(res?.items || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [entityType, entityId])
  return (
    <div className="mt-2 text-sm">
      {loading && <div className="text-[var(--primary)]/70">در حال بارگذاری...</div>}
      {!loading && items.length === 0 && (
        <div className="text-[var(--primary)]/70">وظیفه‌ای ثبت نشده</div>
      )}
      <ul className="space-y-2">
        {items.map((t: any) => (
          <li key={t.id} className="border rounded p-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-[var(--primary)]/70">
                {t.status} • {t.priority}
              </div>
            </div>
            <button
              className="hp-button secondary"
              onClick={() => {
                window.location.hash = `task-edit:${t.id}`
              }}
            >
              ویرایش
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
