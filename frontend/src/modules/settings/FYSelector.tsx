import React, { useEffect, useState } from 'react'
import { apiGet, apiPatch } from '../../services/api'

type FinancialYear = {
  id: number
  name: string
  start_date?: string | null
  end_date?: string | null
  is_closed?: boolean
}

export default function FYSelector() {
  const [years, setYears] = useState<FinancialYear[]>([])
  const [activeFyId, setActiveFyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const storedFy = localStorage.getItem('hesabpak_active_fy_id')
        setActiveFyId(storedFy ? Number(storedFy) : null)
        const list = await apiGet<any[]>('/api/financial-years')
        setYears(list || [])
      } catch (e: any) {
        setError(e?.message || 'خطا در دریافت سال‌های مالی')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const onChange = async (fid: number) => {
    setSaving(true)
    setError(null)
    try {
      const uid = Number(localStorage.getItem('hesabpak_user_id') || '0')
      if (!uid || !Number.isFinite(uid)) {
        // اگر کاربر لاگین نیست، فقط سمت کلاینت ذخیره کن و رفرش نرم انجام بده
        setActiveFyId(fid)
        try {
          localStorage.setItem('hesabpak_active_fy_id', String(fid))
        } catch {}
        try {
          window.dispatchEvent(new Event('hesabpak-fy-changed'))
        } catch {}
        setSaving(false)
        return
      }
      await apiPatch(`/api/users/${uid}/preferences`, { active_financial_year_id: fid })
      setActiveFyId(fid)
      try {
        localStorage.setItem('hesabpak_active_fy_id', String(fid))
      } catch {}
      // Trigger a lightweight UI refresh so lists reflect new FY
      try {
        window.dispatchEvent(new Event('hesabpak-fy-changed'))
      } catch {}
      // Fallback: hard reload to ensure all modules pick up FY immediately
      setTimeout(() => {
        try {
          window.location.reload()
        } catch {}
      }, 100)
    } catch (e: any) {
      setError(e?.message || 'خطا در ذخیره تنظیمات')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 dark:bg-slate-900/50 backdrop-blur p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">تنظیمات</div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">سال مالی فعال</div>
        </div>
        {saving && <div className="text-xs text-slate-500">در حال ذخیره…</div>}
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="animate-pulse h-9 w-48 rounded-md bg-slate-200 dark:bg-slate-700" />
        ) : (
          <div className="flex items-center gap-3">
            <select
              className="h-10 w-64 rounded-md border-slate-300 bg-white/80 px-3 text-slate-800 shadow-sm outline-none transition focus:border-[var(--retro-input-focus)] focus:ring-2 focus:ring-[var(--retro-input-focus)] dark:bg-slate-800 dark:text-slate-100"
              value={activeFyId ?? ''}
              onChange={(e) => onChange(Number(e.target.value))}
            >
              <option value="" disabled>
                انتخاب کنید…
              </option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>

            {activeFyId && (
              <div className="text-xs text-slate-500">
                انتخاب‌شده:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {years.find((y) => y.id === activeFyId)?.name}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* helper info */}
      <div className="mt-4 text-xs text-slate-500">
        با انتخاب سال مالی، تمام لیست‌ها (فاکتور، دریافت، دفتر اشخاص و موجودی کالا) در همان بازه
        زمانی نشان داده می‌شود.
      </div>
    </div>
  )
}
