import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../../../components/layout/AppShell'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../../../services/api'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroMuted,
  retroPanel,
  retroPanelPadded,
  retroTableHeader,
} from '../../../components/retroTheme'

interface UserSummary {
  id: number
  username: string
  mobile?: string | null
  email: string | null
  full_name: string | null
  role_id: number | null
  is_active: boolean
  credit?: number | null
  verification_level?: string | null
  nft_id?: string | null
  public_profile?: boolean | null
}

interface RoleSummary {
  id: number
  name: string
  description: string
}

interface PermissionSummary {
  id: number
  name: string
  description?: string | null
  module?: string | null
}

interface ActivityLog {
  id: number
  path: string
  method: string
  detail: string | null
  status_code: number
  created_at: string
  username: string | null
}

type UserFormState = { id?: number; username: string; email?: string; full_name?: string; password?: string; role_id?: number | null }

export default function UsersModule({}: ModuleComponentProps) {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [roles, setRoles] = useState<RoleSummary[]>([])
  const [perms, setPerms] = useState<PermissionSummary[]>([])
  const [userPerms, setUserPerms] = useState<Record<number, Record<number, boolean>>>({})
  const [userSms, setUserSms] = useState<Record<number, any>>({})
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [savingUserPermId, setSavingUserPermId] = useState<number | null>(null)
  const [savingUserSmsId, setSavingUserSmsId] = useState<number | null>(null)
  const [form, setForm] = useState<UserFormState>({ username: '', email: '', full_name: '', password: '', role_id: 2 })

  useEffect(() => {
    void load()
  }, [])

  const filteredUsers = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return users
    return users.filter(u =>
      (u.username || '').toLowerCase().includes(term) ||
      (u.mobile || '').toLowerCase().includes(term) ||
      (u.full_name || '').toLowerCase().includes(term)
    )
  }, [filter, users])

  const latestUsers = useMemo(() => filteredUsers.slice(0, 5), [filteredUsers])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [userRes, roleRes, permRes] = await Promise.all([
        apiGet<UserSummary[]>('/api/users').catch(() => []),
        apiGet<RoleSummary[]>('/api/roles').catch(() => []),
        apiGet<PermissionSummary[]>('/api/permissions').catch(() => []),
      ])
      setUsers(Array.isArray(userRes) ? userRes : [])
      setRoles(Array.isArray(roleRes) ? roleRes : [])
      setPerms(Array.isArray(permRes) ? permRes : [])

      try {
        const up = await apiGet<any>('/api/users/permissions')
        if (up && typeof up === 'object') setUserPerms(up as Record<number, Record<number, boolean>>)
      } catch (e) {
        console.warn('user permission map unavailable', e)
      }
      try {
        const sms = await apiGet<any>('/api/users/preferences/sms')
        if (sms && typeof sms === 'object') setUserSms(sms as Record<number, any>)
      } catch (e) {
        console.warn('user sms prefs unavailable', e)
      }
      try {
        const logs = await apiGet<ActivityLog[]>('/api/admin/activity?limit=5')
        setActivities(Array.isArray(logs) ? logs : [])
      } catch (e) {
        console.warn('activity logs unavailable', e)
      }
    } catch (e) {
      console.error(e)
      setError('دریافت کاربران با خطا مواجه شد')
    } finally {
      setLoading(false)
    }
  }

  async function saveUser() {
    const payload: any = {
      username: (form.username ?? '').trim(),
      full_name: (form.full_name ?? '').trim() || null,
      email: (form.email ?? '').trim() || null,
      password: (form.password ?? '').trim() || undefined,
      role_id: form.role_id ?? null,
    }
    if (!payload.username) return setError('نام کاربری الزامی است')
    try {
      if (form.id) {
        const updated = await apiPatch<UserSummary>(`/api/users/${form.id}`, payload)
        setUsers(us => us.map(u => (u.id === updated.id ? updated : u)))
      } else {
        const created = await apiPost<UserSummary>('/api/users', payload)
        setUsers(us => [created, ...us])
      }
      setForm({ username: '', email: '', full_name: '', password: '', role_id: 2 })
      setShowForm(false)
    } catch (e) {
      console.error(e)
      setError('ذخیره کاربر با خطا مواجه شد')
    }
  }

  async function deleteUser(id: number) {
    if (!window.confirm('حذف کاربر؟')) return
    try {
      await apiDelete(`/api/users/${id}`)
      setUsers(us => us.filter(u => u.id !== id))
    } catch (e) {
      console.error(e)
      setError('حذف کاربر با خطا همراه بود')
    }
  }

  async function saveUserRole(userId: number, roleId: number | null) {
    try {
      await apiPatch(`/api/users/${userId}/role`, { role_id: roleId })
      setUsers(us => us.map(u => (u.id === userId ? { ...u, role_id: roleId } : u)))
    } catch (e) {
      console.warn('role update failed', e)
    }
  }

  async function saveUserPerms(userId: number) {
    setSavingUserPermId(userId)
    try {
      await apiPut(`/api/users/${userId}/permissions`, userPerms[userId] ?? {})
    } catch (e) {
      console.warn('permission update failed', e)
    } finally {
      setSavingUserPermId(null)
    }
  }

  async function saveUserSms(userId: number) {
    setSavingUserSmsId(userId)
    try {
      await apiPut(`/api/users/${userId}/preferences/sms`, userSms[userId] ?? {})
    } catch (e) {
      console.warn('sms preference update failed', e)
    } finally {
      setSavingUserSmsId(null)
    }
  }

  const latestActivity = useMemo(() => activities.slice(0, 5), [activities])

  return (
    <section className={`${retroPanelPadded} space-y-4`}>
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className={retroHeading}>تنظیمات کاربران</p>
          <h3 className="text-lg font-semibold mt-2">مدیریت متمرکز کاربران، نقش و تأیید</h3>
          <p className={retroMuted}>ایجاد/ویرایش کاربر، نقش، اعلان پیامکی و دسترسی‌ها در یک نما.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
            placeholder="جستجو بر اساس نام کاربری، موبایل یا نام"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <button className={retroButton} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'بستن' : (form.id ? 'ویرایش کاربر' : 'کاربر جدید')}
          </button>
        </div>
      </header>

      {error && <p className="text-red-700 text-sm">{error}</p>}

      {showForm && (
        <div className={`${retroPanel} p-4 space-y-2`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              placeholder="نام کاربری (موبایل)"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
            />
            <input
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              placeholder="ایمیل"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              placeholder="نام کامل"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
            />
            <input
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              placeholder="رمز عبور"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
            <select
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              value={form.role_id ?? ''}
              onChange={e => setForm({ ...form, role_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">انتخاب نقش</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button className={retroButton} onClick={saveUser} disabled={!form.username}>
              ذخیره کاربر
            </button>
            <button className={retroButton} onClick={() => { setShowForm(false); setForm({ username: '', email: '', full_name: '', password: '', role_id: 2 }) }}>
              لغو
            </button>
          </div>
        </div>
      )}

      <div className={`${retroPanel} p-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <p className={retroHeading}>آخرین کاربران</p>
          <span className={retroBadge}>{loading ? '...' : `${users.length} کاربر`}</span>
        </div>
        {loading ? (
          <p className={retroMuted}>در حال بارگذاری...</p>
        ) : latestUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {latestUsers.map(user => (
              <div key={user.id} className="border border-[#d9cfb6] rounded p-3 bg-[#faf4de] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{user.username}</span>
                  <span className={`${retroBadge} ${user.is_active ? '' : 'opacity-60'}`}>
                    {user.is_active ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
                <p className={retroMuted}>{user.full_name || '—'}</p>
                <p className="text-xs text-[#7a6b4f]">{user.mobile || user.email || 'شناسه ثبت نشده'}</p>
                <div className="flex flex-wrap gap-2 text-xs items-center">
                  <span className={retroBadge}>نقش: {roles.find(r => r.id === user.role_id)?.name || '—'}</span>
                  {user.verification_level && <span className={retroBadge}>تأیید: {user.verification_level}</span>}
                  {typeof user.credit === 'number' && <span className={retroBadge}>اعتبار: {user.credit}</span>}
                  {user.nft_id && <span className={retroBadge}>NFT: {user.nft_id}</span>}
                  {user.public_profile ? <span className={retroBadge}>پروفایل عمومی</span> : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button className={retroButton} onClick={() => { setForm({ ...user, password: '' }); setShowForm(true) }}>ویرایش</button>
                  <button className="text-red-600 hover:text-red-800" onClick={() => deleteUser(user.id)}>حذف</button>
                </div>
                <details className="rounded border border-[#e6d7b3] p-2 bg-[#fffbee]">
                  <summary className="cursor-pointer text-sm">دسترسی‌ها و اعلان‌ها</summary>
                  <div className="mt-2 space-y-3 text-xs">
                    <div className="space-y-1">
                      <p className={retroMuted}>مجوزها</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        {perms.map(p => {
                          const current = !!(userPerms[user.id]?.[p.id])
                          return (
                            <label key={p.id} className="flex items-center gap-2">
                              <input type="checkbox" checked={current} onChange={e => setUserPerms(prev => ({ ...prev, [user.id]: { ...(prev[user.id] ?? {}), [p.id]: e.target.checked } }))} />
                              {p.name}
                            </label>
                          )
                        })}
                      </div>
                      <button className={retroButton} onClick={() => saveUserPerms(user.id)} disabled={savingUserPermId === user.id}>
                        {savingUserPermId === user.id ? 'در حال ذخیره…' : 'ذخیره مجوزها'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className={retroMuted}>اعلان‌های پیامکی</p>
                      {(() => {
                        const pref = userSms[user.id] ?? {
                          enable_notifications: true,
                          notifications: { invoice_finalize: true, payment_received: true, cheque_due_reminder: true, fiscal_year_close: false },
                          schedule: { daily_reminder_hour: 9, timezone: 'Asia/Tehran' },
                        }
                        return (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center gap-2"><input style={{ accentColor: '#7c3aed' }} type="checkbox" checked={!!pref.enable_notifications} onChange={e => setUserSms(s => ({ ...s, [user.id]: { ...pref, enable_notifications: e.target.checked } }))} />فعال</label>
                              <label className="flex items-center gap-2"><input style={{ accentColor: '#7c3aed' }} type="checkbox" checked={!!pref.notifications?.invoice_finalize} onChange={e => setUserSms(s => ({ ...s, [user.id]: { ...pref, notifications: { ...pref.notifications, invoice_finalize: e.target.checked } } }))} />فاکتور</label>
                              <label className="flex items-center gap-2"><input style={{ accentColor: '#7c3aed' }} type="checkbox" checked={!!pref.notifications?.payment_received} onChange={e => setUserSms(s => ({ ...s, [user.id]: { ...pref, notifications: { ...pref.notifications, payment_received: e.target.checked } } }))} />پرداخت</label>
                              <label className="flex items-center gap-2"><input style={{ accentColor: '#7c3aed' }} type="checkbox" checked={!!pref.notifications?.cheque_due_reminder} onChange={e => setUserSms(s => ({ ...s, [user.id]: { ...pref, notifications: { ...pref.notifications, cheque_due_reminder: e.target.checked } } }))} />یادآور چک</label>
                              <label className="flex items-center gap-2"><input style={{ accentColor: '#7c3aed' }} type="checkbox" checked={!!pref.notifications?.fiscal_year_close} onChange={e => setUserSms(s => ({ ...s, [user.id]: { ...pref, notifications: { ...pref.notifications, fiscal_year_close: e.target.checked } } }))} />سال مالی</label>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input className="input" type="number" min={0} max={23} value={pref.schedule?.daily_reminder_hour ?? 9} onChange={e => setUserSms(s => ({ ...s, [user.id]: { ...pref, schedule: { ...pref.schedule, daily_reminder_hour: Number(e.target.value) } } }))} />
                              <input className="input" value={pref.schedule?.timezone ?? 'Asia/Tehran'} onChange={e => setUserSms(s => ({ ...s, [user.id]: { ...pref, schedule: { ...pref.schedule, timezone: e.target.value } } }))} />
                            </div>
                            <button className={retroButton} onClick={() => saveUserSms(user.id)} disabled={savingUserSmsId === user.id}>
                              {savingUserSmsId === user.id ? 'در حال ذخیره…' : 'ذخیره اعلان‌ها'}
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <p className={retroMuted}>کاربری یافت نشد.</p>
        )}
      </div>

      <div className={`${retroPanel} p-4 space-y-2`}>
        <div className="flex items-center justify-between">
          <p className={retroHeading}>گزارش فعالیت تازه</p>
          <span className={retroBadge}>آخرین ۵ مورد</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className={retroTableHeader}>
              <th>زمان</th>
              <th>کاربر</th>
              <th>مسیر</th>
              <th>متد</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {latestActivity.map(a => (
              <tr key={a.id}>
                <td>{a.created_at}</td>
                <td>{a.username ?? 'سیستم'}</td>
                <td>{a.path}</td>
                <td>{a.method}</td>
                <td>{a.status_code}</td>
              </tr>
            ))}
            {latestActivity.length === 0 && (
              <tr><td colSpan={5} className="text-center text-sm text-[#7a6b4f]">فعالیتی ثبت نشده است.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
