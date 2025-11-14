import React, { useEffect, useState } from 'react'
import type { ModuleComponentProps, SmartDateState } from '../components/layout/AppShell'
import SmartDatePicker from '../components/SmartDatePicker'
import { apiGet, apiPost, apiDelete } from '../services/api'
import { isoToJalali } from '../utils/num'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroPanel,
  retroPanelPadded,
  retroTableHeader,
  retroMuted,
} from '../components/retroTheme'

interface Backup {
  id: number
  filename: string
  kind: string
  created_at: string | null
  size_bytes: number | null
  note: string | null
}

interface Integration {
  id: number
  name: string
  provider: string
  enabled: boolean
  last_synced_at: string | null
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

export default function SystemModule({ smartDate, onSmartDateChange, sync }: ModuleComponentProps) {
  const [backups, setBackups] = useState<Backup[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', email: '', full_name: '', password: '', role_id: 2 })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    const warn: string[] = []
    try {
      try {
        const backupList = await apiGet<Backup[]>('/api/backups')
        setBackups(backupList)
      } catch (err) {
        console.error(err)
        warn.push('لیست بکاپ‌ها قابل دریافت نیست.')
      }
      try {
        const ints = await apiGet<Integration[]>('/api/integrations')
        setIntegrations(ints)
      } catch (err) {
        console.error(err)
        warn.push('دسترسی به تنظیمات یکپارچه‌سازی محدود است.')
      }
      try {
        const logs = await apiGet<ActivityLog[]>('/api/admin/activity?limit=20')
        setActivities(logs)
      } catch (err) {
        console.error(err)
        warn.push('لاگ‌های فعالیت برای نقش شما در دسترس نیست.')
      }
      try {
        const userList = await apiGet<User[]>('/api/users')
        setUsers(userList)
      } catch (err) {
        console.error(err)
        warn.push('لیست کاربران قابل دریافت نیست.')
      }
      try {
        const roleList = await apiGet<Role[]>('/api/roles')
        setRoles(roleList)
      } catch (err) {
        console.error(err)
        warn.push('لیست نقش‌ها قابل دریافت نیست.')
      }
    } catch (err) {
      console.error(err)
      setError('بارگذاری بخش تنظیمات با مشکل مواجه شد.')
    } finally {
      setWarnings(warn)
      setLoading(false)
    }
  }

  async function createManualBackup() {
    setCreatingBackup(true)
    try {
      await apiPost<Backup>('/api/backups/manual', {})
      await loadData()
    } catch (err) {
      console.error(err)
      setError('ایجاد بکاپ جدید موفق نبود.')
    } finally {
      setCreatingBackup(false)
    }
  }

  async function createUser() {
    try {
      await apiPost('/api/users', newUser)
      setShowUserForm(false)
      setNewUser({ username: '', email: '', full_name: '', password: '', role_id: 2 })
      await loadData()
    } catch (err) {
      console.error(err)
      setError('ایجاد کاربر جدید موفق نبود.')
    }
  }

  async function deleteUser(userId: number) {
    if (!window.confirm('آیا مطمئن هستید؟')) return
    try {
      await apiDelete(`/api/users/${userId}`)
      await loadData()
    } catch (err) {
      console.error(err)
      setError('حذف کاربر موفق نبود.')
    }
  }

  const applySmartDate = (state: SmartDateState) => {
    onSmartDateChange(state)
  }

  if (loading) {
    return (
      <div className={`${retroPanel} p-10 flex items-center justify-center`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 border-4 border-[#1f2e3b] border-dashed rounded-full animate-spin"></div>
          <p className={`${retroHeading} text-[#1f2e3b]`}>در حال بارگذاری تنظیمات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-3 shadow-[4px_4px_0_#c35c5c]">
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className={`${retroPanel} p-4 space-y-2`}>
          <p className={`${retroHeading} text-[#7a6b4f]`}>هشدارهای دسترسی</p>
          <ul className="list-disc list-inside text-xs text-[#7a6b4f] space-y-1">
            {warnings.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>System Console</p>
            <h2 className="text-2xl font-semibold mt-2">تنظیمات پیشرفته</h2>
            <p className={`text-xs ${retroMuted} mt-2`}>
              تاریخ هوشمند فعال: {smartDate.jalali ?? 'انتخاب نشده'} | {smartDate.isoDate ?? 'ISO TBD'}
            </p>
          </div>
          <div className={`${retroPanel} px-4 py-3 text-xs`}>
            <p className={retroHeading}>وضعیت همگام‌سازی</p>
            {sync ? (
              <>
                <p className="mt-2">UTC سرور: {sync.serverUtc.replace('T', ' ').slice(0, 19)}</p>
                <p className="text-[#7a6b4f] mt-1">اختلاف: {sync.serverOffsetSeconds} ثانیه</p>
              </>
            ) : (
              <p className="mt-2 text-[#7a6b4f]">اطلاعات همگام‌سازی موجود نیست.</p>
            )}
          </div>
        </header>
        <SmartDatePicker
          onDateSelected={(iso, jalali) =>
            applySmartDate({ isoDate: iso.slice(0, 10), jalali })
          }
        />
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>Backups</p>
            <h3 className="text-lg font-semibold mt-2">بکاپ‌های سیستم</h3>
          </div>
          <button
            className={`${retroButton} ${creatingBackup ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={createManualBackup}
          >
            {creatingBackup ? 'در حال ایجاد...' : 'ایجاد بکاپ جدید'}
          </button>
        </header>
        {backups.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>نام فایل</th>
                <th className={retroTableHeader}>نوع</th>
                <th className={retroTableHeader}>تاریخ</th>
                <th className={retroTableHeader}>حجم</th>
                <th className={retroTableHeader}>توضیح</th>
              </tr>
            </thead>
            <tbody>
              {backups.slice(0, 10).map(item => (
                <tr key={item.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">{item.filename}</td>
                  <td className="px-3 py-2">
                    <span className={retroBadge}>{item.kind}</span>
                  </td>
                  <td className="px-3 py-2 text-left">
                    {item.created_at ? isoToJalali(item.created_at) : '-'}
                  </td>
                  <td className="px-3 py-2 text-left">
                    {item.size_bytes ? `${(item.size_bytes / 1024).toFixed(1)} KB` : '-'}
                  </td>
                  <td className="px-3 py-2 text-xs text-[#7a6b4f]">{item.note ?? '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-[#7a6b4f]">
            بکاپی یافت نشد یا دسترسی به این بخش محدود است.
          </p>
        )}
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header>
          <p className={retroHeading}>Integrations</p>
          <h3 className="text-lg font-semibold mt-2">یکپارچه‌سازی‌ها</h3>
        </header>
        {integrations.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>نام</th>
                <th className={retroTableHeader}>سرویس</th>
                <th className={retroTableHeader}>وضعیت</th>
                <th className={retroTableHeader}>آخرین همگام‌سازی</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map(intg => (
                <tr key={intg.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">{intg.name}</td>
                  <td className="px-3 py-2">{intg.provider}</td>
                  <td className="px-3 py-2">
                    <span className={`${retroBadge} ${intg.enabled ? '' : 'opacity-50'}`}>
                      {intg.enabled ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-left">
                    {intg.last_synced_at ? isoToJalali(intg.last_synced_at) : '---'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-[#7a6b4f]">هیچ یکپارچه‌سازی ثبت نشده است.</p>
        )}
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header>
          <p className={retroHeading}>Activity Logs</p>
          <h3 className="text-lg font-semibold mt-2">رخدادهای اخیر</h3>
        </header>
        {activities.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>مسیر</th>
                <th className={retroTableHeader}>روش</th>
                <th className={retroTableHeader}>وضعیت</th>
                <th className={retroTableHeader}>کاربر</th>
                <th className={retroTableHeader}>زمان</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(act => (
                <tr key={act.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2 text-xs">{act.path}</td>
                  <td className="px-3 py-2">{act.method}</td>
                  <td className="px-3 py-2">
                    <span className={retroBadge}>{act.status_code}</span>
                  </td>
                  <td className="px-3 py-2">{act.username ?? '---'}</td>
                  <td className="px-3 py-2 text-left">{isoToJalali(act.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-[#7a6b4f]">
            لاگی برای نمایش وجود ندارد یا دسترسی شما محدود است.
          </p>
        )}
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>Users</p>
            <h3 className="text-lg font-semibold mt-2">مدیریت کاربران</h3>
          </div>
          <button
            className={retroButton}
            onClick={() => setShowUserForm(!showUserForm)}
          >
            {showUserForm ? 'لغو' : 'کاربر جدید'}
          </button>
        </header>

        {showUserForm && (
          <div className={`${retroPanel} p-4 space-y-3`}>
            <input
              type="text"
              placeholder="نام کاربری"
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              value={newUser.username}
              onChange={e => setNewUser({ ...newUser, username: e.target.value })}
            />
            <input
              type="email"
              placeholder="ایمیل"
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            />
            <input
              type="text"
              placeholder="نام کامل"
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              value={newUser.full_name}
              onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
            />
            <input
              type="password"
              placeholder="رمز عبور"
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
            />
            <select
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              value={newUser.role_id}
              onChange={e => setNewUser({ ...newUser, role_id: parseInt(e.target.value) })}
            >
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <button className={retroButton} onClick={createUser}>
              ایجاد کاربر
            </button>
          </div>
        )}

        {users.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>نام کاربری</th>
                <th className={retroTableHeader}>ایمیل</th>
                <th className={retroTableHeader}>نام کامل</th>
                <th className={retroTableHeader}>نقش</th>
                <th className={retroTableHeader}>فعال</th>
                <th className={retroTableHeader}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2">{user.username}</td>
                  <td className="px-3 py-2 text-left text-xs">{user.email || '-'}</td>
                  <td className="px-3 py-2 text-left">{user.full_name || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={retroBadge}>
                      {roles.find(r => r.id === user.role_id)?.name || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {user.is_active ? '✓' : '✗'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      className="text-red-600 hover:text-red-800 text-xs"
                      onClick={() => deleteUser(user.id)}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-[#7a6b4f]">هیچ کاربری وجود ندارد.</p>
        )}
      </section>
    </div>
  )
}

