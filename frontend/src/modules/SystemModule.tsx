import React, { useEffect, useState } from 'react'
import type { ModuleComponentProps, SmartDateState } from '../components/layout/AppShell'
import SmartDatePicker from '../components/SmartDatePicker'
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../services/api'
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

interface Permission {
  id: number
  name: string
  description?: string | null
  module?: string | null
}

interface SystemSetting {
  id: number
  key: string
  value: string | null
  setting_type: string
  display_name: string | null
  description: string | null
  category: string | null
  is_secret: boolean
  created_at: string
  updated_at: string
}

export default function SystemModule({ smartDate, onSmartDateChange, sync }: ModuleComponentProps) {
  const [backups, setBackups] = useState<Backup[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  // moved to AccessControlModule
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<Permission[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [rolePermIds, setRolePermIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', email: '', full_name: '', password: '', role_id: 2 })
  const [newRole, setNewRole] = useState({ name: '', description: '' })
  const showLegacyAccess = false

  // SMS state removed; migrated to Developer settings (sms.ir)
  
  // System Settings state
  const [allSettings, setAllSettings] = useState<SystemSetting[]>([])
  const [settingsByCategory, setSettingsByCategory] = useState<{ [key: string]: SystemSetting[] }>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('general')
  const [sidebarSide, setSidebarSide] = useState<string>('')
  const [savingSidebarSide, setSavingSidebarSide] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  
  // Financial Year state
  type FinancialYear = { id: number; name: string; start_date: string; end_date?: string | null; is_closed: boolean }
  const [fYears, setFYears] = useState<FinancialYear[]>([])
  const [newFY, setNewFY] = useState<{ name: string; start_date: string; end_date?: string }>(() => ({ name: '', start_date: '' }))
  const [savingFY, setSavingFY] = useState(false)

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
      // Roles/Users/Permissions moved to AccessControlModule
      try {
        const settings = await apiGet<SystemSetting[]>('/api/admin/settings')
        try {
          const years = await apiGet<FinancialYear[]>('/api/financial-years')
          setFYears(years)
        } catch (err) {
          console.error(err)
          warn.push('سال‌های مالی قابل دریافت نیست.')
        }
        setAllSettings(settings)
        // Group by category
        const grouped: { [key: string]: SystemSetting[] } = {}
        settings.forEach(s => {
          const cat = s.category || 'other'
          if (!grouped[cat]) grouped[cat] = []
          grouped[cat].push(s)
        })
        setSettingsByCategory(grouped)
      } catch (err) {
        console.error(err)
        warn.push('تنظیمات سیستم قابل دریافت نیست.')
      }
      // load sidebar side preference for this user (if any)
      try {
        const side = await apiGet<string>('/api/users/preferences/sidebar-side')
        if (side === 'left' || side === 'right') {
          setSidebarSide(side)
        }
      } catch (err) {
        // ignore — this endpoint may not exist or user may not have a value
      }
    } catch (err) {
      console.error(err)
      setError('بارگذاری بخش تنظیمات با مشکل مواجه شد.')
    } finally {
      setWarnings(warn)
      setLoading(false)
    }
  }

  async function createFY() {
    const name = (newFY.name || '').trim()
    let startRaw = (newFY.start_date || '').trim()
    if (!startRaw) {
      try {
        const ls = localStorage.getItem('hesabpak_selected_jalali') || ''
        startRaw = ls.trim()
      } catch {}
    }
    if (!name || !startRaw) { alert('نام و تاریخ شروع ضروری است'); return }
    setSavingFY(true)
    try {
      const { parseJalaliInput } = await import('../utils/date')
      const startParsed = parseJalaliInput(startRaw)
      const endParsed = newFY.end_date ? parseJalaliInput(newFY.end_date) : null
      if (!startParsed) { alert('فرمت تاریخ شروع نامعتبر است'); setSavingFY(false); return }
      const payload = {
        name,
        start_date: startParsed?.iso ?? new Date(newFY.start_date).toISOString(),
        end_date: endParsed ? endParsed.iso : (newFY.end_date ? new Date(newFY.end_date).toISOString() : null)
      }
      await apiPost('/api/financial-years', payload)
      await loadData()
      setNewFY({ name: '', start_date: '' })
      alert('سال مالی ایجاد شد')
    } catch (err) {
      console.error(err)
      alert('ایجاد سال مالی با خطا مواجه شد')
    } finally {
      setSavingFY(false)
    }
  }

  async function updateFY(fid: number, patch: Partial<FinancialYear>) {
    try {
      await apiPatch(`/api/financial-years/${fid}`, patch)
      await loadData()
      alert('سال مالی بروزرسانی شد')
    } catch (err) {
      console.error(err)
      alert('بروزرسانی ناموفق بود')
    }
  }

  async function deleteFY(fid: number) {
    if (!confirm('حذف سال مالی؟')) return
    try {
      await apiDelete(`/api/financial-years/${fid}`)
      await loadData()
      alert('حذف شد')
    } catch (err) {
      console.error(err)
      alert('حذف ناموفق بود')
    }
  }

  async function exportFY(fid: number) {
    try {
      const res = await authService.fetchWithAuth(`/api/financial-years/${fid}/export`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financial-year-${fid}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('دانلود ناموفق بود')
    }
  }

  async function setActiveFY(fid: number) {
    try {
      const meId = Number(localStorage.getItem('hesabpak_user_id') || '0')
      await apiPatch(`/api/users/${meId}/preferences`, { active_financial_year_id: fid })
      try { localStorage.setItem('hesabpak_active_fy_id', String(fid)) } catch {}
      // Notify and refresh softly
      try { window.dispatchEvent(new Event('hesabpak-fy-changed')) } catch {}
      setTimeout(() => { try { window.location.reload() } catch {} }, 100)
    } catch (err) {
      console.error(err)
      alert('تنظیم سال فعال ناموفق بود')
    }
  }

  async function saveSidebarSide() {
    if (!sidebarSide) return
    setSavingSidebarSide(true)
    try {
      await apiPost('/api/users/preferences/sidebar-side', { side: sidebarSide })
      try { localStorage.setItem('hesabpak_sidebar_side_v1', sidebarSide) } catch (e) {}
      alert('تنظیم ذخیره شد')
    } catch (err) {
      console.error(err)
      setError('ذخیره تنظیم منوی کناری موفق نبود.')
    } finally {
      setSavingSidebarSide(false)
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

  async function createRole() {
    try {
      await apiPost('/api/roles', newRole)
      setNewRole({ name: '', description: '' })
      await loadData()
    } catch (err) {
      console.error(err)
      setError('ایجاد نقش جدید موفق نبود.')
    }
  }

  async function saveRolePermissions() {
    if (!selectedRoleId) return
    try {
      await apiPost(`/api/roles/${selectedRoleId}/permissions`, rolePermIds)
      await loadData()
    } catch (err) {
      console.error(err)
      setError('ذخیره دسترسی‌های نقش موفق نبود.')
    }
  }

  // SMS utility functions removed

  async function updateSetting(key: string, newValue: string) {
    try {
      await apiPatch(`/api/admin/settings/${key}`, { value: newValue })
      setEditingKey(null)
      setEditValue('')
      await loadData()
    } catch (err) {
      console.error(err)
      setError('به‌روزرسانی تنظیم موفق نبود.')
    }
  }

  async function deleteSetting(key: string) {
    if (!window.confirm('آیا مطمئن هستید؟')) return
    try {
      await apiDelete(`/api/admin/settings/${key}`)
      await loadData()
    } catch (err) {
      console.error(err)
      setError('حذف تنظیم موفق نبود.')
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
        <header>
          {showLegacyAccess && (
            <>
              <p className={retroHeading}>Roles & Permissions</p>
              <h3 className="text-lg font-semibold mt-2">نقش‌ها و دسترسی‌ها</h3>
            </>
          )}
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${retroPanel} p-4 space-y-3`}>
            <p className={retroHeading}>افزودن نقش جدید</p>
            <input className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="نام نقش" value={newRole.name} onChange={e=>setNewRole({...newRole, name: e.target.value})} />
            <input className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="توضیحات" value={newRole.description} onChange={e=>setNewRole({...newRole, description: e.target.value})} />
            <button className={retroButton} onClick={createRole}>ایجاد نقش</button>
          </div>
          <div className={`${retroPanel} p-4 space-y-3`}>
            <p className={retroHeading}>ویرایش دسترسی‌های نقش</p>
            <select className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" value={selectedRoleId ?? ''} onChange={e=>{
              const rid = e.target.value? parseInt(e.target.value): null
              setSelectedRoleId(rid)
              if (rid) {
                const r = roles.find(x=>x.id===rid) as (Role & { permissions?: Permission[] }) | undefined
                if (r && (r as any).permissions) {
                  const ids = ((r as any).permissions as Permission[]).map(p=>p.id)
                  setRolePermIds(ids)
                } else {
                  setRolePermIds([])
                }
              } else {
                setRolePermIds([])
              }
            }}>
              <option value="">انتخاب نقش...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {selectedRoleId && (
              <div className="max-h-64 overflow-y-auto border border-[#c5bca5] bg-[#faf4de] p-2">
                {perms.map(p => {
                  const checked = rolePermIds.includes(p.id)
                  return (
                    <label key={p.id} className="flex items-center gap-2 py-1 text-sm">
                      <input type="checkbox" checked={checked} onChange={e=>{
                        setRolePermIds(prev => e.target.checked ? Array.from(new Set([...prev, p.id])) : prev.filter(id=>id!==p.id))
                      }}/>
                      <span>{p.name}</span>
                      <span className={`${retroBadge}`}>{p.module ?? '—'}</span>
                    </label>
                  )
                })}
              </div>
            )}
            <div className="flex gap-2">
              {showLegacyAccess && (
                <button className={retroButton} onClick={saveRolePermissions} disabled={!selectedRoleId}>ذخیره</button>
              )}
              <span className={retroMuted}>ابتدا نقش را انتخاب و دسترسی‌ها را تیک بزنید.</span>
            </div>
          </div>
        </div>
      </section>

      {/* SMS Gateway moved to Developer settings. Removed from SystemModule to avoid undefined state. */}

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
          {/* Financial Years Management */}
          <div className={`${retroPanel} p-4`}>
            <p className={`${retroHeading} text-[#7a6b4f]`}>سال‌های مالی</p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`${retroHeading}`}>ایجاد سال مالی جدید</p>
                <div className="mt-2 flex flex-col gap-2">
                  <input className="rounded p-2" placeholder="نام (مثلاً 1404)" value={newFY.name} onChange={e => setNewFY({ ...newFY, name: e.target.value })} />
                  <input className="rounded p-2" data-jdp data-jdp-only-date data-jdp-dir="rtl" placeholder="تاریخ شروع (شمسی)" value={newFY.start_date} onFocus={e=>{ try{ (window as any).jalaliDatepicker?.show(e.target) }catch{} }} onChange={e => setNewFY({ ...newFY, start_date: e.target.value })} />
                  <input className="rounded p-2" data-jdp data-jdp-only-date data-jdp-dir="rtl" placeholder="تاریخ پایان (شمسی)" value={newFY.end_date ?? ''} onFocus={e=>{ try{ (window as any).jalaliDatepicker?.show(e.target) }catch{} }} onChange={e => setNewFY({ ...newFY, end_date: e.target.value })} />
                  <button className={`${retroButton}`} disabled={savingFY} onClick={createFY}>ایجاد سال مالی</button>
                </div>
              </div>
              <div>
                <p className={`${retroHeading}`}>لیست و عملیات</p>
                <div className="mt-2 space-y-2">
                  {fYears.length === 0 && <p className={retroMuted}>سال مالی ثبت نشده است.</p>}
                  {fYears.map(y => (
                    <div key={y.id} className="flex items-center justify-between gap-2 border rounded p-2">
                      <div className="flex items-center gap-2">
                        <span className={`${retroBadge}`}>{y.name}</span>
                        <span className={retroMuted}>از {isoToJalali(y.start_date)} تا {y.end_date ? isoToJalali(y.end_date) : '—'}</span>
                        {y.is_closed && <span className={`${retroBadge} bg-red-800`}>بسته</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className={`${retroButton}`} onClick={() => exportFY(y.id)}>دانلود</button>
                        <button className={`${retroButton}`} onClick={() => setActiveFY(y.id)}>تنظیم به سال فعال</button>
                        <button className={`${retroButton}`} onClick={() => updateFY(y.id, { is_closed: !y.is_closed })}>{y.is_closed ? 'بازکردن' : 'بستن'}</button>
                        <button className={`${retroButton}`} onClick={() => deleteFY(y.id)}>حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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

      {/* Combined: Users + Roles & Permissions + SMS Register */}
      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex items-center justify-between">
          <div>
            <p className={retroHeading}>مدیریت کاربران و نقش‌ها</p>
            <h3 className="text-lg font-semibold mt-2">زیبا، منسجم و کاربردی</h3>
          </div>
        </header>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Card: نقش‌ها و دسترسی‌ها */}
          <div className={`${retroPanel} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <p className={`${retroHeading} text-[#7a6b4f]`}>نقش‌ها و دسترسی‌ها</p>
              <span className={`${retroBadge}`}>{roles.length} نقش</span>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-auto">
              {roles.map(r => (
                <div key={r.id} className="border border-[#d9cfb6] rounded p-2 bg-[#faf4de]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{r.name}</span>
                    <span className={`${retroBadge}`}>{(r.permissions||[]).length} مجوز</span>
                  </div>
                  <p className="text-xs text-[#7a6b4f] mt-1">{r.description || '—'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(r.permissions||[]).slice(0,8).map(p => (
                      <span key={`${r.id}-${p.id}`} className={`${retroBadge}`}>{p.name}</span>
                    ))}
                    {(r.permissions||[]).length > 8 && (
                      <span className={`${retroBadge} bg-[#1f2e3b]`}>+{(r.permissions||[]).length - 8}</span>
                    )}
                  </div>
                </div>
              ))}
              {roles.length === 0 && (
                <p className={retroMuted}>نقشی ثبت نشده است.</p>
              )}
            </div>
          </div>

          {/* Card: ارسال پیامک و ثبت کاربر — removed (migrated to Developer settings) */}

          {/* Card: مدیریت کاربران */}
          <div className={`${retroPanel} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <p className={`${retroHeading} text-[#7a6b4f]`}>مدیریت کاربران</p>
              <button className={retroButton} onClick={()=>setShowUserForm(!showUserForm)}>{showUserForm?'لغو':'کاربر جدید'}</button>
            </div>
            {showUserForm && (
              <div className="space-y-2">
                <input type="text" placeholder="نام کاربری" className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                <input type="email" placeholder="ایمیل" className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                <input type="text" placeholder="نام کامل" className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} />
                <input type="password" placeholder="رمز عبور" className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                <select className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" value={newUser.role_id || ''} onChange={e => setNewUser({ ...newUser, role_id: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">انتخاب نقش</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button className={retroButton} onClick={createUser}>ثبت</button>
              </div>
            )}
            <div className="space-y-2 max-h-[320px] overflow-auto">
              {users.length === 0 && <p className={retroMuted}>کاربری یافت نشد.</p>}
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between border border-[#d9cfb6] rounded p-2 bg-[#faf4de]">
                  <div className="flex items-center gap-2">
                    <span className={`${retroBadge}`}>{u.username}</span>
                    <span className={retroMuted}>{u.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${retroBadge}`}>{u.role || '—'}</span>
                    <span className={`${retroBadge} ${u.is_active? '' : 'opacity-50'}`}>{u.is_active? 'فعال' : 'غیرفعال'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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

      {/* SMS gateway UI moved to DeveloperModule (sms.ir) */}

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

      <section className={`${retroPanelPadded} space-y-4`}>
        <header>
          <p className={retroHeading}>System Settings</p>
          <h3 className="text-lg font-semibold mt-2">تنظیمات سیستم</h3>
        </header>
        
        <div className="mb-4 space-y-3">
          <div className={`${retroPanel} p-3`}> 
            <p className={retroHeading}>جهت منو</p>
            <p className="text-xs text-[#7a6b4f]">محل نمایش منوی کناری را برای این کاربر انتخاب کنید.</p>
            <div className="mt-3 flex items-center gap-2">
              <select className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de] text-sm" value={sidebarSide} onChange={e=>setSidebarSide(e.target.value)}>
                <option value="">پیشفرض (راست)</option>
                <option value="right">راست</option>
                <option value="left">چپ</option>
              </select>
              <button className={`${retroButton} ${savingSidebarSide ? 'opacity-50 pointer-events-none' : ''}`} onClick={saveSidebarSide}>
                ذخیره
              </button>
            </div>
          </div>

          <div>
          <p className={retroHeading}>دسته</p>
          <select 
            className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">همه</option>
            {Object.keys(settingsByCategory).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className={`${retroPanel} p-4`}>
          {(selectedCategory ? settingsByCategory[selectedCategory] || [] : allSettings).length > 0 ? (
            <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
              <thead>
                <tr>
                  <th className={retroTableHeader}>کلید</th>
                  <th className={retroTableHeader}>مقدار</th>
                  <th className={retroTableHeader}>توضیح</th>
                  <th className={retroTableHeader}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {(selectedCategory ? settingsByCategory[selectedCategory] || [] : allSettings).map(setting => (
                  <tr key={setting.key} className="border-b border-[#d9cfb6]">
                    <td className="px-3 py-2 font-mono text-xs">{setting.key}</td>
                    <td className="px-3 py-2">
                      {editingKey === setting.key ? (
                        <input
                          type={setting.is_secret ? 'password' : 'text'}
                          className="border border-[#c5bca5] px-2 py-1 bg-white text-xs"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateSetting(setting.key, editValue)
                            if (e.key === 'Escape') setEditingKey(null)
                          }}
                        />
                      ) : (
                        <span className={setting.is_secret ? 'text-gray-400' : ''}>
                          {setting.is_secret ? '***' : setting.value || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#7a6b4f]">{setting.description || '-'}</td>
                    <td className="px-3 py-2 text-center space-x-2">
                      {editingKey === setting.key ? (
                        <>
                          <button
                            className="text-green-600 hover:text-green-800 text-xs"
                            onClick={() => updateSetting(setting.key, editValue)}
                          >
                            ✓
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800 text-xs"
                            onClick={() => setEditingKey(null)}
                          >
                            ✗
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            onClick={() => {
                              setEditingKey(setting.key)
                              setEditValue(setting.value || '')
                            }}
                          >
                            ویرایش
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800 text-xs"
                            onClick={() => deleteSetting(setting.key)}
                          >
                            حذف
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-[#7a6b4f]">هیچ تنظیمی در این دسته وجود ندارد.</p>
          )}
        </div>
        </div>
      </section>
    </div>
  )
}

