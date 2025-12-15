import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../../components/layout/AppShell'
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../../services/api'
import {
  retroHeading,
  retroPanel,
  retroPanelPadded,
  retroButton,
  retroBadge,
  retroTableHeader,
  retroMuted,
} from '../../components/retroTheme'

interface User {
  id: number
  username: string
  email: string | null
  full_name: string | null
  role_id: number | null
  is_active: boolean
}

interface Role {
  id: number
  name: string
  description: string
}

interface Permission {
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

interface SmsSettingsPayload {
  provider?: string
  api_key?: string
  sender?: string
  enable_notifications?: boolean
  notifications?: {
    invoice_finalize?: boolean
    payment_received?: boolean
    cheque_due_reminder?: boolean
    fiscal_year_close?: boolean
  }
  schedule?: {
    daily_reminder_hour?: number
    timezone?: string
  }
}

interface UserSmsSettingsPayload {
  enable_notifications?: boolean
  notifications?: {
    invoice_finalize?: boolean
    payment_received?: boolean
    cheque_due_reminder?: boolean
    fiscal_year_close?: boolean
  }
  schedule?: {
    daily_reminder_hour?: number
    timezone?: string
  }
}

export default function AccessControlModule({}: ModuleComponentProps) {
  const [users, setUsers] = useState<User[]>([])
  const [userSortKey, setUserSortKey] = useState<'id' | 'username' | 'full_name' | 'email' | 'role_id' | 'is_active'>('id')
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('asc')
  const [userPage, setUserPage] = useState(1)
  const [userPageSize, setUserPageSize] = useState(10)
  const [roles, setRoles] = useState<Role[]>([])
    const [roleForm, setRoleForm] = useState<{ id?: number; name: string; description: string }>({ name: '', description: '' })
    const [userForm, setUserForm] = useState<{ id?: number; username: string; full_name?: string; email?: string; role_id?: number | null }>({ username: '', full_name: '', email: '', role_id: null })
  const [perms, setPerms] = useState<Permission[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [activityFilter, setActivityFilter] = useState<{ user?: string; method?: string; status?: string; path?: string }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userPerms, setUserPerms] = useState<Record<number, Record<number, boolean>>>({})
  const [savingUserPermId, setSavingUserPermId] = useState<number | null>(null)
  const [smsSettings, setSmsSettings] = useState<SmsSettingsPayload>({
    provider: 'sms.ir',
    api_key: '',
    sender: '',
    enable_notifications: true,
    notifications: {
      invoice_finalize: true,
      payment_received: true,
      cheque_due_reminder: true,
      fiscal_year_close: false,
    },
    schedule: { daily_reminder_hour: 9, timezone: 'Asia/Tehran' },
  })
  const [savingSms, setSavingSms] = useState(false)
  const [testSmsText, setTestSmsText] = useState('سلام! این یک پیام تستی است.')
  const [testSmsTo, setTestSmsTo] = useState('')
  const [userSms, setUserSms] = useState<Record<number, UserSmsSettingsPayload>>({})
  const [savingUserSmsId, setSavingUserSmsId] = useState<number | null>(null)
  const [activityPage, setActivityPage] = useState(1)
  const [activityPageSize, setActivityPageSize] = useState(10)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      try {
        const u = await apiGet<User[]>('/api/users')
        setUsers(u)
      } catch (e) {}
      // Load SMS settings (if backend exposes system_settings)
      try {
        const sys = await apiGet<any>('/api/admin/settings')
        const smsKey = Array.isArray(sys)
          ? (sys.find((s: any) => s.key === 'system.sms.settings')?.value ?? null)
          : null
        if (smsKey) {
          try {
            const parsed = JSON.parse(String(smsKey))
            if (parsed && typeof parsed === 'object') {
              setSmsSettings({ ...smsSettings, ...parsed })
            }
          } catch (_) {}
        }
      } catch (_) {}
      // Load per-user SMS preferences (if backend exposes endpoint)
      try {
        const hasToken = !!localStorage.getItem('hesabpak_access_token')
        if (hasToken) {
          const prefs = await apiGet<any>('/api/users/preferences/sms')
          if (prefs && typeof prefs === 'object') {
            setUserSms(prefs as Record<number, UserSmsSettingsPayload>)
          }
        }
      } catch (_) {}
      try {
        const r = await apiGet<Role[]>('/api/roles')
        setRoles(r)
      } catch (e) {}
      try {
        const p = await apiGet<Permission[]>('/api/permissions')
        setPerms(p)
      } catch (e) {}
      // Optionally load per-user permission overrides
      try {
        const up = await apiGet<any>('/api/users/permissions')
        if (up && typeof up === 'object') setUserPerms(up as Record<number, Record<number, boolean>>)
      } catch (e) {}
      try {
        const a = await apiGet<ActivityLog[]>('/api/admin/activity?limit=200')
        setActivities(a)
      } catch (e) {}
    } catch (e) {
      setError('بارگذاری ماژول دسترسی‌ها با مشکل مواجه شد')
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = useMemo(() => {
    const f = activityFilter
    return activities.filter(a => (
      (!f.user || (a.username ?? '').toLowerCase().includes(f.user.toLowerCase())) &&
      (!f.method || a.method.toLowerCase() === f.method.toLowerCase()) &&
      (!f.status || String(a.status_code) === String(f.status)) &&
      (!f.path || a.path.toLowerCase().includes(f.path.toLowerCase()))
    ))
  }, [activities, activityFilter])

  const pagedActivities = useMemo(() => {
    const start = (activityPage - 1) * activityPageSize
    return filteredActivities.slice(start, start + activityPageSize)
  }, [filteredActivities, activityPage, activityPageSize])

  function exportActivitiesCsv() {
    const rows = [
      ['time', 'user', 'path', 'method', 'status', 'detail'],
      ...filteredActivities.map(a => [a.created_at, a.username ?? 'سیستم', a.path, a.method, String(a.status_code), (a.detail ?? '').replace(/\n/g, ' ')]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activities_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function createOrUpdateRole() {
    const payload = { name: roleForm.name.trim(), description: roleForm.description?.trim() ?? '' }
    if (!payload.name) return alert('نام نقش الزامی است')
    try {
      if (roleForm.id) {
        const updated = await apiPatch<Role>(`/api/roles/${roleForm.id}`, payload)
        setRoles(rs => rs.map(r => r.id === updated.id ? updated : r))
      } else {
        const created = await apiPost<Role>('/api/roles', payload)
        setRoles(rs => [created, ...rs])
      }
      setRoleForm({ name: '', description: '' })
    } catch (e) {
      alert('ثبت نقش ناموفق بود')
    }
  }

  async function deleteRole(id: number) {
    if (!confirm('حذف این نقش؟')) return
    try {
      await apiDelete(`/api/roles/${id}`)
      setRoles(rs => rs.filter(r => r.id !== id))
    } catch (e) {
      alert('حذف نقش ناموفق بود')
    }
  }

  async function createOrUpdateUser() {
    const payload: any = {
      username: (userForm.username ?? '').trim(),
      full_name: (userForm.full_name ?? '').trim() || null,
      email: (userForm.email ?? '').trim() || null,
      role_id: userForm.role_id ?? null,
    }
    if (!payload.username) return alert('نام کاربری الزامی است')
    try {
      if (userForm.id) {
        const updated = await apiPatch<User>(`/api/users/${userForm.id}`, payload)
        setUsers(us => us.map(u => u.id === updated.id ? updated : u))
      } else {
        const created = await apiPost<User>('/api/users', payload)
        setUsers(us => [created, ...us])
      }
      setUserForm({ username: '', full_name: '', email: '', role_id: null })
    } catch (e) {
      alert('ثبت کاربر ناموفق بود')
    }
  }

  async function saveUserRole(userId: number, roleId: number | null) {
    try {
      await apiPatch(`/api/users/${userId}/role`, { role_id: roleId })
      setUsers(us => us.map(u => (u.id === userId ? { ...u, role_id: roleId } : u)))
    } catch (e) {}
  }

  async function saveUserPerms(userId: number) {
    setSavingUserPermId(userId)
    try {
      await apiPut(`/api/users/${userId}/permissions`, userPerms[userId] ?? {})
    } catch (e) {}
    finally {
      setSavingUserPermId(null)
    }
  }

  async function saveSmsSettings() {
    setSavingSms(true)
    try {
      // Store sms.ir keys individually so backend picks them up
      const kv: Record<string, string> = {}
      if (smsSettings.api_key) kv['smsir_api_key'] = String(smsSettings.api_key)
      if (smsSettings.sender) kv['smsir_line_number'] = String(smsSettings.sender)
      if ((smsSettings as any).otp_template_id) kv['smsir_otp_template_id'] = String((smsSettings as any).otp_template_id)
      kv['smsir_enabled'] = String((smsSettings.provider ?? '').toLowerCase() === 'sms.ir')
      for (const [key, value] of Object.entries(kv)) {
        await apiPut(`/api/admin/settings/${key}`, { value })
      }
    } catch (e) {
      // ignore
    } finally {
      setSavingSms(false)
    }
  }

  async function sendTestSms() {
    setSavingSms(true)
    try {
      if ((smsSettings.provider ?? '').toLowerCase() === 'sms.ir' && (smsSettings.api_key || '').length > 0) {
        const res = await apiPost<any>('/api/smsir/test-otp', { mobile: testSmsTo, code: '123456' })
        const msg = res?.detail ? 'ارسال OTP (sms.ir) انجام شد' : 'ارسال OTP انجام شد'
        alert(msg)
      } else {
        // برای درگاه‌های عمومی یا زمانی که sms.ir تنظیم نشده، از تست عمومی استفاده کن
        const res = await apiPost<{ sent?: boolean; detail?: string }>('/api/sms/test', { mobile: testSmsTo, message: testSmsText })
        alert(res?.detail || 'پیام تستی ارسال شد')
      }
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'ارسال پیام تستی ناموفق بود.'
      alert(msg)
    } finally {
      setSavingSms(false)
    }
  }

  async function sendGenericSms() {
    // ارسال متن دلخواه از مسیر عمومی بک‌اند
    setSavingSms(true)
    try {
      const res = await apiPost<{ sent?: boolean; detail?: string }>('/api/sms/send', {
        mobile: testSmsTo,
        message: testSmsText,
      })
      alert(res?.detail || (res?.sent ? 'پیام ارسال شد' : 'ارسال ناموفق بود'))
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'ارسال عمومی پیامک ناموفق بود.'
      alert(msg)
    } finally {
      setSavingSms(false)
    }
  }

  async function saveUserSms(userId: number) {
    setSavingUserSmsId(userId)
    try {
      await apiPut(`/api/users/${userId}/preferences/sms`, userSms[userId] ?? {})
    } catch (e) {
      // ignore
    } finally {
      setSavingUserSmsId(null)
    }
  }

  const byRole = useMemo(() => {
    const map: Record<string, User[]> = {}
    users.forEach(u => {
      const key = String(u.role_id ?? 'بدون نقش')
      if (!map[key]) map[key] = []
      map[key].push(u)
    })
    return map
  }, [users])

  const smsPerms = useMemo(() => {
    return perms.filter(p => (p.module || '').toLowerCase().includes('sms'))
  }, [perms])

  return (
    <div className={`${retroPanelPadded} space-y-6`}>
      <div className="space-y-1">
        <p className={`${retroHeading} text-[#1f2e3b]`}>پنل دسترسی و نقش‌ها</p>
        <p className={`${retroMuted}`}>مدیریت نقش‌ها، مجوزها، کاربران و اعلان‌های پیامکی</p>
        {error ? <div className={`${retroBadge} mt-2`}>خطا: {error}</div> : null}
        {loading && <div className={`${retroMuted} mt-2`}>در حال بارگذاری…</div>}

      </div>
      <section className={`${retroPanel} space-y-3`}>
        <div className="space-y-1">
          <p className={`${retroHeading} text-[#1f2e3b]`}>نقش‌ها</p>
          <p className={`${retroMuted}`}>مدیریت، جست‌وجو و ویرایش نقش‌ها</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="input w-full" placeholder="نام نقش" value={roleForm.name}
            onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))} />
          <input className="input w-full" placeholder="توضیح" value={roleForm.description}
            onChange={e => setRoleForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2">
            <button className={retroButton} onClick={createOrUpdateRole}>{roleForm.id ? 'ویرایش نقش' : 'ایجاد نقش'}</button>
            {roleForm.id ? <button className={retroButton} onClick={() => setRoleForm({ name: '', description: '' })}>انصراف</button> : null}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className={retroTableHeader}>
              <th>ID</th>
              <th>نام نقش</th>
              <th>توضیح</th>
              <th>اقدامات</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.description}</td>
                <td className="whitespace-nowrap">
                  <button className={retroButton} onClick={() => setRoleForm({ id: r.id, name: r.name, description: r.description })}>ویرایش</button>
                  <button className={retroButton} onClick={() => deleteRole(r.id)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* تنظیمات اعلان پیامک در سکشن جداگانه حذف شد و در جدول کاربران ادغام می‌شود */}

      <section className={`${retroPanel} space-y-3`}>
        <div className="space-y-1">
          <p className={`${retroHeading} text-[#1f2e3b]`}>کاربران</p>
          <p className={`${retroMuted}`}>فهرست کاربران، نقش، وضعیت و دسترسی‌ها</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="input w-full" placeholder="نام کاربری" value={userForm.username}
            onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} />
          <input className="input w-full" placeholder="نام کامل" value={userForm.full_name ?? ''}
            onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} />
          <input className="input w-full" placeholder="ایمیل" value={userForm.email ?? ''}
            onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
          <select className="input w-full" value={userForm.role_id ?? ''}
            onChange={e => setUserForm(f => ({ ...f, role_id: e.target.value === '' ? null : Number(e.target.value) }))}>
            <option value="">بدون نقش</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button className={retroButton} onClick={createOrUpdateUser}>{userForm.id ? 'ویرایش کاربر' : 'ایجاد کاربر'}</button>
            {userForm.id ? <button className={retroButton} onClick={() => setUserForm({ username: '', full_name: '', email: '', role_id: null })}>انصراف</button> : null}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-2">
          <input className="input w-full" placeholder="دعوت: ایمیل" onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} value={userForm.email ?? ''} />
          <input className="input w-full" placeholder="دعوت: موبایل" onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} value={userForm.username} />
          <select className="input w-full" value={userForm.role_id ?? ''}
            onChange={e => setUserForm(f => ({ ...f, role_id: e.target.value === '' ? null : Number(e.target.value) }))}>
            <option value="">نقش دعوت</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button className={retroButton} onClick={async () => {
              try {
                const payload: any = { email: (userForm.email ?? '').trim() || undefined, mobile: (userForm.username ?? '').trim() || undefined, role_id: userForm.role_id ?? undefined }
                const res = await apiPost('/api/admin/users/invite', payload)
                alert('دعوت ارسال شد')
              } catch (e) {
                alert('ارسال دعوت ناموفق بود')
              }
            }}>ارسال دعوت</button>
            <button className={retroButton} onClick={() => setUserForm({ username: '', full_name: '', email: '', role_id: null })}>پاک کردن</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className={retroTableHeader}>
              <th><button className="underline" onClick={() => { setUserSortKey('id'); setUserSortDir(d => (userSortKey==='id' ? (d==='asc'?'desc':'asc') : 'asc')) }}>ID</button></th>
              <th><button className="underline" onClick={() => { setUserSortKey('username'); setUserSortDir(d => (userSortKey==='username' ? (d==='asc'?'desc':'asc') : 'asc')) }}>نام کاربری</button></th>
              <th><button className="underline" onClick={() => { setUserSortKey('full_name'); setUserSortDir(d => (userSortKey==='full_name' ? (d==='asc'?'desc':'asc') : 'asc')) }}>نام کامل</button></th>
              <th><button className="underline" onClick={() => { setUserSortKey('email'); setUserSortDir(d => (userSortKey==='email' ? (d==='asc'?'desc':'asc') : 'asc')) }}>ایمیل</button></th>
              <th><button className="underline" onClick={() => { setUserSortKey('role_id'); setUserSortDir(d => (userSortKey==='role_id' ? (d==='asc'?'desc':'asc') : 'asc')) }}>نقش</button></th>
              <th><button className="underline" onClick={() => { setUserSortKey('is_active'); setUserSortDir(d => (userSortKey==='is_active' ? (d==='asc'?'desc':'asc') : 'asc')) }}>وضعیت</button></th>
              <th>اعلان‌های پیامک</th>
              <th>تخصیص مجوزها</th>
              <th>ذخیره</th>
              <th>ویرایش</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const sorted = [...users].sort((a, b) => {
                const k = userSortKey
                const av = (a as any)[k]
                const bv = (b as any)[k]
                let cmp = 0
                if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv)
                else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
                else cmp = String(av ?? '').localeCompare(String(bv ?? ''))
                return userSortDir === 'asc' ? cmp : -cmp
              })
              const total = sorted.length
              const pages = Math.max(1, Math.ceil(total / userPageSize))
              const page = Math.min(userPage, pages)
              const start = (page - 1) * userPageSize
              const view = sorted.slice(start, start + userPageSize)
              return view.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>
                  <select className="input w-full" value={u.role_id ?? ''}
                    onChange={e => {
                      const val = e.target.value === '' ? null : Number(e.target.value)
                      void saveUserRole(u.id, val)
                    }}>
                    <option value="">بدون نقش</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>
                <td>{u.is_active ? 'فعال' : 'غیرفعال'}</td>
                <td>
                  {(() => {
                    const pref = userSms[u.id] ?? {
                      enable_notifications: true,
                      notifications: { invoice_finalize: true, payment_received: true, cheque_due_reminder: true, fiscal_year_close: false },
                      schedule: { daily_reminder_hour: 9, timezone: 'Asia/Tehran' },
                    }
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2"><input style={{accentColor:'#7c3aed'}} type="checkbox" checked={!!pref.enable_notifications} onChange={e => setUserSms(s => ({ ...s, [u.id]: { ...pref, enable_notifications: e.target.checked } }))} />فعال</label>
                        <label className="flex items-center gap-2"><input style={{accentColor:'#7c3aed'}} type="checkbox" checked={!!pref.notifications?.invoice_finalize} onChange={e => setUserSms(s => ({ ...s, [u.id]: { ...pref, notifications: { ...pref.notifications, invoice_finalize: e.target.checked } } }))} />فاکتور</label>
                        <label className="flex items-center gap-2"><input style={{accentColor:'#7c3aed'}} type="checkbox" checked={!!pref.notifications?.payment_received} onChange={e => setUserSms(s => ({ ...s, [u.id]: { ...pref, notifications: { ...pref.notifications, payment_received: e.target.checked } } }))} />پرداخت</label>
                        <label className="flex items-center gap-2"><input style={{accentColor:'#7c3aed'}} type="checkbox" checked={!!pref.notifications?.cheque_due_reminder} onChange={e => setUserSms(s => ({ ...s, [u.id]: { ...pref, notifications: { ...pref.notifications, cheque_due_reminder: e.target.checked } } }))} />چک</label>
                        <label className="flex items-center gap-2"><input style={{accentColor:'#7c3aed'}} type="checkbox" checked={!!pref.notifications?.fiscal_year_close} onChange={e => setUserSms(s => ({ ...s, [u.id]: { ...pref, notifications: { ...pref.notifications, fiscal_year_close: e.target.checked } } }))} />سال مالی</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input" type="number" min={0} max={23} value={pref.schedule?.daily_reminder_hour ?? 9} onChange={e => setUserSms(s => ({ ...s, [u.id]: { ...pref, schedule: { ...pref.schedule, daily_reminder_hour: Number(e.target.value) } } }))} />
                          <input className="input" value={pref.schedule?.timezone ?? 'Asia/Tehran'} onChange={e => setUserSms(s => ({ ...s, [u.id]: { ...pref, schedule: { ...pref.schedule, timezone: e.target.value } } }))} />
                        </div>
                        <button className={retroButton} onClick={() => saveUserSms(u.id)} disabled={savingUserSmsId === u.id}>{savingUserSmsId === u.id ? 'در حال ذخیره…' : 'ذخیره'}</button>
                      </div>
                    )
                  })()}
                </td>
                <td>
                  <details className="rounded-sm border border-[#d7caa4] p-2">
                    <summary className="cursor-pointer text-sm">مشاهده/ویرایش مجوزها</summary>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {perms.map(p => {
                        const current = !!(userPerms[u.id]?.[p.id])
                        return (
                          <label key={p.id} className="flex items-center gap-2">
                            <input type="checkbox" checked={current}
                              onChange={e => setUserPerms(prev => ({
                                ...prev,
                                [u.id]: { ...(prev[u.id] ?? {}), [p.id]: e.target.checked },
                              }))} />
                            {p.name}
                          </label>
                        )
                      })}
                    </div>
                  </details>
                </td>
                <td>
                  <button className={`${retroButton}`} onClick={() => saveUserPerms(u.id)} disabled={savingUserPermId === u.id}>
                    {savingUserPermId === u.id ? 'در حال ذخیره…' : 'ذخیره'}
                  </button>
                </td>
                <td>
                  <button className={retroButton} onClick={() => setUserForm({ id: u.id, username: u.username, full_name: u.full_name ?? '', email: u.email ?? '', role_id: u.role_id })}>ویرایش</button>
                </td>
              </tr>
              ))
            })()}
          </tbody>
        </table>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm">
            صفحه {userPage}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">تعداد در صفحه</label>
            <select className="input" value={userPageSize} onChange={e => { setUserPageSize(Number(e.target.value)); setUserPage(1) }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button className={retroButton} onClick={() => setUserPage(p => Math.max(1, p - 1))}>قبلی</button>
            <button className={retroButton} onClick={() => setUserPage(p => p + 1)}>بعدی</button>
          </div>
        </div>
      </section>

      <section className={`${retroPanel} space-y-3`}>
        <div className="space-y-1">
          <p className={`${retroHeading} text-[#1f2e3b]`}>مجوزها</p>
          <p className={`${retroMuted}`}>مجوزهای سیستم بر اساس ماژول</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className={retroTableHeader}>
              <th>ID</th>
              <th>نام</th>
              <th>ماژول</th>
              <th>توضیح</th>
            </tr>
          </thead>
          <tbody>
            {perms.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.module ?? '—'}</td>
                <td>{p.description ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={`${retroPanel} space-y-3`}>
        <div className="space-y-1">
          <p className={`${retroHeading} text-[#1f2e3b]`}>گزارش فعالیت کاربران</p>
          <p className={`${retroMuted}`}>آخرین درخواست‌ها و عملیات حساس</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="input w-full" placeholder="فیلتر کاربر" value={activityFilter.user ?? ''}
            onChange={e => setActivityFilter(f => ({ ...f, user: e.target.value }))} />
          <input className="input w-full" placeholder="فیلتر مسیر" value={activityFilter.path ?? ''}
            onChange={e => setActivityFilter(f => ({ ...f, path: e.target.value }))} />
          <select className="input w-full" value={activityFilter.method ?? ''}
            onChange={e => setActivityFilter(f => ({ ...f, method: e.target.value || undefined }))}>
            <option value="">متد</option>
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
          <input className="input w-full" placeholder="وضعیت (مثلا 200)" value={activityFilter.status ?? ''}
            onChange={e => setActivityFilter(f => ({ ...f, status: e.target.value }))} />
          <div className="flex items-center justify-end">
            <button className={retroButton} onClick={exportActivitiesCsv}>خروجی CSV</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className={retroTableHeader}>
              <th>زمان</th>
              <th>کاربر</th>
              <th>مسیر</th>
              <th>متد</th>
              <th>وضعیت</th>
              <th>جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {pagedActivities.map(a => (
              <tr key={a.id}>
                <td>{a.created_at}</td>
                <td>{a.username ?? 'سیستم'}</td>
                <td>{a.path}</td>
                <td>{a.method}</td>
                <td>{a.status_code}</td>
                <td>{a.detail ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <label className="text-sm">نمایش</label>
            <select className="input" value={activityPageSize} onChange={e => { setActivityPageSize(Number(e.target.value)); setActivityPage(1) }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className={retroButton} disabled={activityPage===1} onClick={() => setActivityPage(p => Math.max(1, p-1))}>قبلی</button>
            <span className={retroMuted}>صفحه {activityPage}</span>
            <button className={retroButton} disabled={activityPage*activityPageSize>=filteredActivities.length} onClick={() => setActivityPage(p => p+1)}>بعدی</button>
          </div>
          <div className="flex items-center gap-2">
            <button className={retroButton} onClick={() => window.print()}>پرینت</button>
          </div>
        </div>
      </section>

      <section className={`${retroPanel} space-y-3`}>
        <div className="space-y-1">
          <p className={`${retroHeading} text-[#1f2e3b]`}>پنل SMS و ناتیفیکیشن‌ها</p>
          <p className={`${retroMuted}`}>پیکربندی درگاه، اعلان‌ها و زمان‌بندی یادآورها</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className={retroBadge}>درگاه پیامک</p>
            <div className="mt-2 space-y-2">
              <select className="input w-full" value={smsSettings.provider}
                onChange={e => setSmsSettings(s => ({ ...s, provider: e.target.value }))}>
                <option value="sms.ir">sms.ir</option>
                <option value="ippanel">IPPanel</option>
              </select>
              <input className="input w-full" placeholder="API Key" value={smsSettings.api_key ?? ''}
                onChange={e => setSmsSettings(s => ({ ...s, api_key: e.target.value }))} />
              <input className="input w-full" placeholder="شماره ارسال کننده" value={smsSettings.sender ?? ''}
                onChange={e => setSmsSettings(s => ({ ...s, sender: e.target.value }))} />
            </div>
          </div>
          <div>
            <p className={retroBadge}>اعلان‌ها</p>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!smsSettings.enable_notifications}
                  onChange={e => setSmsSettings(s => ({ ...s, enable_notifications: e.target.checked }))} />
                فعال‌سازی اعلان‌ها
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!smsSettings.notifications?.invoice_finalize}
                  onChange={e => setSmsSettings(s => ({ ...s, notifications: { ...s.notifications, invoice_finalize: e.target.checked } }))} />
                اعلان نهایی‌سازی فاکتور
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!smsSettings.notifications?.payment_received}
                  onChange={e => setSmsSettings(s => ({ ...s, notifications: { ...s.notifications, payment_received: e.target.checked } }))} />
                اعلان دریافت پرداخت
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!smsSettings.notifications?.cheque_due_reminder}
                  onChange={e => setSmsSettings(s => ({ ...s, notifications: { ...s.notifications, cheque_due_reminder: e.target.checked } }))} />
                یادآور سررسید چک
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!smsSettings.notifications?.fiscal_year_close}
                  onChange={e => setSmsSettings(s => ({ ...s, notifications: { ...s.notifications, fiscal_year_close: e.target.checked } }))} />
                اعلان بستن سال مالی
              </label>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className={retroBadge}>زمان‌بندی یادآورها</p>
            <div className="mt-2 space-y-2">
              <input className="input w-full" type="number" min={0} max={23}
                value={smsSettings.schedule?.daily_reminder_hour ?? 9}
                onChange={e => setSmsSettings(s => ({ ...s, schedule: { ...s.schedule, daily_reminder_hour: Number(e.target.value) } }))}
                placeholder="ساعت یادآور روزانه (0-23)" />
              <input className="input w-full" value={smsSettings.schedule?.timezone ?? 'Asia/Tehran'}
                onChange={e => setSmsSettings(s => ({ ...s, schedule: { ...s.schedule, timezone: e.target.value } }))}
                placeholder="منطقه زمانی" />
            </div>
          </div>
          <div>
            <p className={retroBadge}>ارسال تست (SMS.ir)</p>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select className="input w-full" value={smsSettings.provider ?? ''}
                  onChange={e => setSmsSettings(s => ({ ...s, provider: e.target.value }))}>
                  <option value="">انتخاب درگاه…</option>
                  <option value="sms.ir">SMS.ir</option>
                  <option value="mock">Mock (توسعه)</option>
                </select>
                <input className="input w-full" placeholder="شماره خط ارسال (line_number)"
                  value={smsSettings.sender ?? ''}
                  onChange={e => setSmsSettings(s => ({ ...s, sender: e.target.value }))} />
                <input className="input w-full" placeholder="API Key"
                  value={smsSettings.api_key ?? ''}
                  onChange={e => setSmsSettings(s => ({ ...s, api_key: e.target.value }))} />
                <input className="input w-full" placeholder="Secret Key"
                  value={smsSettings.secret_key ?? ''}
                  onChange={e => setSmsSettings(s => ({ ...s, secret_key: e.target.value }))} />
                <input className="input w-full" placeholder="OTP Template ID (sms.ir)"
                  value={(smsSettings as any).otp_template_id ?? ''}
                  onChange={e => setSmsSettings(s => ({ ...s, otp_template_id: e.target.value }))} />
              </div>
              <textarea className="input w-full" rows={3} value={testSmsText}
                onChange={e => setTestSmsText(e.target.value)} />
              <input className="input w-full" placeholder="شماره گیرنده (مثال: 0912xxxxxxx)"
                value={testSmsTo}
                onChange={e => setTestSmsTo(e.target.value)} />
              <div className="flex gap-2">
                <button className={retroButton} onClick={saveSmsSettings} disabled={savingSms}>
                  {savingSms ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
                </button>
                <button className={retroButton} onClick={sendTestSms} disabled={savingSms}>
                  {savingSms ? 'در حال ارسال…' : 'ارسال OTP تستی'}
                </button>
                <button className={retroButton} onClick={sendGenericSms} disabled={savingSms}>
                  {savingSms ? 'در حال ارسال…' : 'ارسال متن دلخواه'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
