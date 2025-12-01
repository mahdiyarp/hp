import React, { useEffect, useState } from 'react'
import type { ModuleComponentProps, SmartDateState } from '../components/layout/AppShell'
import SmartDatePicker from '../components/SmartDatePicker'
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api'
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

interface BlockchainEntry {
  id: number
  entity_type: string
  entity_id: string
  action: string
  timestamp: string
  current_hash: string
  previous_hash: string | null
}

export default function SystemModule({ smartDate, onSmartDateChange, sync }: ModuleComponentProps) {
  const [backups, setBackups] = useState<Backup[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
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

  // SMS state
  const [smsTest, setSmsTest] = useState({ to: '', message: 'کد تست حساب‌پاک', provider: '' })
  const [smsReg, setSmsReg] = useState({ username: '', full_name: '', mobile: '', role_id: 2 })
  
  // System Settings state
  const [allSettings, setAllSettings] = useState<SystemSetting[]>([])
  const [settingsByCategory, setSettingsByCategory] = useState<{ [key: string]: SystemSetting[] }>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('sms')
  const [sidebarSide, setSidebarSide] = useState<string>('')
  const [savingSidebarSide, setSavingSidebarSide] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  // Payment Methods state
  interface PaymentMethod {
    id: number
    key: string
    name: string
    parent_id?: number | null
    enabled: boolean
    order: number
    account?: string | null
    is_cheque?: boolean
    created_at?: string | null
    updated_at?: string | null
  }
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [pmLoading, setPmLoading] = useState<boolean>(false)
  const [pmError, setPmError] = useState<string | null>(null)
  const [editingPmId, setEditingPmId] = useState<number | null>(null)
  const [draftPm, setDraftPm] = useState<Partial<PaymentMethod>>({ enabled: true, order: 100 })
  const [blockchainEntries, setBlockchainEntries] = useState<BlockchainEntry[]>([])
  const [chainStatus, setChainStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown')
  const [chainMessage, setChainMessage] = useState<string | null>(null)
  const [chainLoading, setChainLoading] = useState(false)
  const [chainEntityType, setChainEntityType] = useState<string>('')
  const [chainEntityId, setChainEntityId] = useState<string>('')
  const [entityCatalog, setEntityCatalog] = useState<Array<{ entity_type: string; entity_id: string }>>([])
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null)

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
      try {
        const allPerms = await apiGet<Permission[]>('/api/permissions')
        setPerms(allPerms)
      } catch (err) {
        console.error(err)
        warn.push('permissions قابل دریافت نیست.')
      }
      try {
        const settings = await apiGet<SystemSetting[]>('/api/admin/settings')
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
      // Payment methods
      try {
        await loadPaymentMethods()
      } catch (err) {
        console.error(err)
        warn.push('روش‌های پرداخت قابل دریافت نیست.')
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
      try {
        await refreshBlockchainEntries()
      } catch (err) {
        console.error(err)
        warn.push('دریافت وضعیت بلاک‌چین ممکن نشد.')
      }
    } catch (err) {
      console.error(err)
      setError('بارگذاری بخش تنظیمات با مشکل مواجه شد.')
    } finally {
      setWarnings(warn)
      setLoading(false)
    }
  }

  async function loadPaymentMethods() {
    setPmLoading(true)
    setPmError(null)
    try {
      const list = await apiGet<PaymentMethod[]>('/api/payment-methods')
      const ordered = (list || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      setMethods(ordered)
    } catch (err: any) {
      setPmError(err?.message || 'خطا در دریافت روش‌های پرداخت')
    } finally {
      setPmLoading(false)
    }
  }

  async function refreshBlockchainEntries(limit = 30, captureCatalog = true) {
    const response = await apiGet<{ entries?: BlockchainEntry[]; count?: number }>(
      `/api/blockchain/entries?limit=${limit}`,
    )
    const list = response?.entries ?? []
    setBlockchainEntries(list)
    setSelectedEntryId(list[0]?.id ?? null)
    if (captureCatalog) {
      const catalogMap = new Map<string, { entity_type: string; entity_id: string }>()
      list.forEach(entry => {
        const key = `${entry.entity_type}::${entry.entity_id}`
        if (!catalogMap.has(key)) {
          catalogMap.set(key, { entity_type: entry.entity_type, entity_id: entry.entity_id })
        }
      })
      setEntityCatalog(Array.from(catalogMap.values()))
    }
    if (list.length > 0) {
      setChainEntityType(list[0].entity_type)
      setChainEntityId(list[0].entity_id)
    } else {
      setChainEntityType('')
      setChainEntityId('')
    }
    setChainStatus('unknown')
    setChainMessage(null)
  }

  async function loadChainForEntity(entityType: string, entityId: string) {
    setChainEntityType(entityType)
    setChainEntityId(entityId)
    const query = `entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`
    const response = await apiGet<{ entries?: BlockchainEntry[] }>(`/api/blockchain/entries?${query}`)
    const list = response.entries ?? []
    setBlockchainEntries(list)
    setSelectedEntryId(list[0]?.id ?? null)
    setChainStatus('unknown')
    setChainMessage(null)
  }

  async function verifyChainIntegrity() {
    if (!chainEntityType || !chainEntityId) {
      setChainMessage('ابتدا یک موجودیت را انتخاب کنید.')
      setChainStatus('unknown')
      return
    }
    setChainLoading(true)
    try {
      const query = `entity_type=${encodeURIComponent(chainEntityType)}&entity_id=${encodeURIComponent(chainEntityId)}`
      const result = await apiPost<{ is_valid: boolean; message: string; entries_checked: number }>(
        `/api/blockchain/verify?${query}`,
        {},
      )
      setChainStatus(result.is_valid ? 'valid' : 'invalid')
      setChainMessage(
        result.is_valid
          ? `زنجیره معتبر است. تعداد رکورد بررسی شده: ${result.entries_checked}`
          : result.message,
      )
    } catch (err: any) {
      setChainStatus('invalid')
      setChainMessage(err?.message || 'بررسی زنجیره ناموفق بود.')
    } finally {
      setChainLoading(false)
    }
  }

  async function downloadProof() {
    if (!chainEntityType || !chainEntityId || !selectedEntryId) {
      setChainMessage('ابتدا موجودیت و رکورد را انتخاب کنید.')
      return
    }
    try {
      const query = `entity_type=${encodeURIComponent(chainEntityType)}&entity_id=${encodeURIComponent(chainEntityId)}&entry_id=${selectedEntryId}`
      const proof = await apiGet<Record<string, unknown>>(`/api/blockchain/proof?${query}`)
      const blob = new Blob([JSON.stringify(proof, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hp-proof-${chainEntityType}-${chainEntityId}-${selectedEntryId}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setChainMessage('دریافت مرکل پروف ناموفق بود.')
    }
  }

  const exportCurrentChain = () => {
    if (blockchainEntries.length === 0) {
      setChainMessage('زنجیره‌ای برای خروجی وجود ندارد.')
      return
    }
    const payload = {
      exported_at: new Date().toISOString(),
      entity_type: chainEntityType || null,
      entity_id: chainEntityId || null,
      entries: blockchainEntries,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hp-blockchain-${chainEntityType || 'all'}-${chainEntityId || 'recent'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function createPaymentMethod() {
    try {
      const payload = {
        key: draftPm.key?.trim() || '',
        name: draftPm.name?.trim() || '',
        parent_id: draftPm.parent_id ?? null,
        enabled: draftPm.enabled ?? true,
        order: typeof draftPm.order === 'number' ? draftPm.order : 100,
        account: draftPm.account ?? null,
        is_cheque: !!draftPm.is_cheque,
      }
      if (!payload.key || !payload.name) {
        alert('کلید و نام لازم است')
        return
      }
      await apiPost<PaymentMethod>('/api/payment-methods', payload)
      setDraftPm({ enabled: true, order: 100 })
      await loadPaymentMethods()
    } catch (err: any) {
      setPmError(err?.message || 'ایجاد روش پرداخت موفق نبود')
    }
  }

  async function patchPaymentMethod(id: number, changes: Partial<PaymentMethod>) {
    try {
      const payload: any = {}
      if (changes.key !== undefined) payload.key = changes.key
      if (changes.name !== undefined) payload.name = changes.name
      if (changes.parent_id !== undefined) payload.parent_id = changes.parent_id
      if (changes.enabled !== undefined) payload.enabled = changes.enabled
      if (changes.order !== undefined) payload.order = changes.order
      if (changes.account !== undefined) payload.account = changes.account
      if (changes.is_cheque !== undefined) payload.is_cheque = changes.is_cheque
      await apiPatch<PaymentMethod>(`/api/payment-methods/${id}`, payload)
      await loadPaymentMethods()
    } catch (err: any) {
      setPmError(err?.message || 'به‌روز رسانی روش پرداخت موفق نبود')
    }
  }

  async function deletePaymentMethod(id: number) {
    if (!window.confirm('این روش پرداخت حذف شود؟')) return
    try {
      await apiDelete(`/api/payment-methods/${id}`)
      await loadPaymentMethods()
    } catch (err: any) {
      setPmError(err?.message || 'حذف روش پرداخت موفق نبود')
    }
  }

  async function movePaymentMethod(id: number, direction: 'up' | 'down') {
    const idx = methods.findIndex(m => m.id === id)
    if (idx < 0) return
    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= methods.length) return
    const a = methods[idx]
    const b = methods[swapWith]
    // swap order values
    await patchPaymentMethod(a.id, { order: b.order })
    await patchPaymentMethod(b.id, { order: a.order })
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

  async function sendTestSms() {
    try {
      await apiPost('/api/sms/send', { ...smsTest })
      alert('ارسال شد')
    } catch (err) {
      console.error(err)
      setError('ارسال پیامک ناموفق بود.')
    }
  }

  async function registerUserViaSms() {
    try {
      await apiPost('/api/sms/register-user', { ...smsReg })
      alert('کاربر ایجاد و پیامک ارسال شد')
      setSmsReg({ username: '', full_name: '', mobile: '', role_id: 2 })
      await loadData()
    } catch (err) {
      console.error(err)
      setError('ثبت کاربر با پیامک ناموفق بود.')
    }
  }

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
          <p className={retroHeading}>Roles & Permissions</p>
          <h3 className="text-lg font-semibold mt-2">نقش‌ها و دسترسی‌ها</h3>
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
              <button className={retroButton} onClick={saveRolePermissions} disabled={!selectedRoleId}>ذخیره</button>
              <span className={retroMuted}>ابتدا نقش را انتخاب و دسترسی‌ها را تیک بزنید.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header>
          <p className={retroHeading}>SMS Gateway</p>
          <h3 className="text-lg font-semibold mt-2">ارسال پیامک و ثبت کاربر</h3>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${retroPanel} p-4 space-y-3`}>
            <p className={retroHeading}>ارسال تست</p>
            <input className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="شماره گیرنده" value={smsTest.to} onChange={e=>setSmsTest({...smsTest, to: e.target.value})} />
            <input className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="متن پیامک" value={smsTest.message} onChange={e=>setSmsTest({...smsTest, message: e.target.value})} />
            <input className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="نام پیکربندی (اختیاری)" value={smsTest.provider} onChange={e=>setSmsTest({...smsTest, provider: e.target.value})} />
            <button className={retroButton} onClick={sendTestSms}>ارسال</button>
          </div>
          <div className={`${retroPanel} p-4 space-y-3`}>
            <p className={retroHeading}>ثبت کاربر با پیامک</p>
            <input className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="نام کاربری" value={smsReg.username} onChange={e=>setSmsReg({...smsReg, username: e.target.value})} />
            <input className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="نام کامل" value={smsReg.full_name} onChange={e=>setSmsReg({...smsReg, full_name: e.target.value})} />
            <input className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="موبایل" value={smsReg.mobile} onChange={e=>setSmsReg({...smsReg, mobile: e.target.value})} />
            <select className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" value={smsReg.role_id} onChange={e=>setSmsReg({...smsReg, role_id: parseInt(e.target.value)})}>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className={retroButton} onClick={registerUserViaSms}>ثبت کاربر</button>
          </div>
        </div>
      </section>

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
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>Payment Methods</p>
            <h3 className="text-lg font-semibold mt-2">روش‌های پرداخت</h3>
            <p className={`text-xs ${retroMuted} mt-2`}>مدیریت کلید، نام، حساب معادل و ترتیب نمایش</p>
          </div>
          <div className="flex gap-2">
            <button className={`${retroButton}`} onClick={loadPaymentMethods}>
              بروزرسانی لیست
            </button>
          </div>
        </header>
        {pmError && (
          <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-2">{pmError}</div>
        )}
        <div className={`${retroPanel} p-4 space-y-3`}>
          <p className={retroHeading}>ایجاد روش جدید</p>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center">
            <input className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="کلید (مثلاً cash)" value={draftPm.key || ''} onChange={e=>setDraftPm({...draftPm, key: e.target.value})} />
            <input className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="نام نمایشی" value={draftPm.name || ''} onChange={e=>setDraftPm({...draftPm, name: e.target.value})} />
            <input className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="حساب معادل دفتر" value={draftPm.account || ''} onChange={e=>setDraftPm({...draftPm, account: e.target.value})} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!draftPm.is_cheque} onChange={e=>setDraftPm({...draftPm, is_cheque: e.target.checked})} />
              <span>چک</span>
            </label>
            <input type="number" className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]" placeholder="ترتیب" value={draftPm.order ?? 100} onChange={e=>setDraftPm({...draftPm, order: parseInt(e.target.value || '0')})} />
            <button className={retroButton} onClick={createPaymentMethod}>ایجاد</button>
          </div>
        </div>
        <div className={`${retroPanel} p-0 overflow-x-auto`}>
          {pmLoading ? (
            <div className="p-4 text-sm text-[#7a6b4f]">در حال بارگذاری...</div>
          ) : methods.length > 0 ? (
            <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
              <thead>
                <tr>
                  <th className={retroTableHeader}>#</th>
                  <th className={retroTableHeader}>کلید</th>
                  <th className={retroTableHeader}>نام</th>
                  <th className={retroTableHeader}>حساب</th>
                  <th className={retroTableHeader}>چک</th>
                  <th className={retroTableHeader}>فعال</th>
                  <th className={retroTableHeader}>ترتیب</th>
                  <th className={retroTableHeader}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m, idx) => (
                  <tr key={m.id} className="border-b border-[#d9cfb6]">
                    <td className="px-3 py-2 text-center">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {editingPmId === m.id ? (
                        <input className="border border-[#c5bca5] px-2 py-1 bg-white text-xs" value={draftPm.key ?? m.key} onChange={e=>setDraftPm({...draftPm, key: e.target.value})} />
                      ) : (
                        m.key
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingPmId === m.id ? (
                        <input className="border border-[#c5bca5] px-2 py-1 bg-white text-xs" value={draftPm.name ?? m.name} onChange={e=>setDraftPm({...draftPm, name: e.target.value})} />
                      ) : (
                        m.name
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingPmId === m.id ? (
                        <input className="border border-[#c5bca5] px-2 py-1 bg-white text-xs" value={draftPm.account ?? (m.account || '')} onChange={e=>setDraftPm({...draftPm, account: e.target.value})} />
                      ) : (
                        m.account || '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingPmId === m.id ? (
                        <input type="checkbox" checked={draftPm.is_cheque ?? !!m.is_cheque} onChange={e=>setDraftPm({...draftPm, is_cheque: e.target.checked})} />
                      ) : (
                        m.is_cheque ? '✓' : '✗'
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingPmId === m.id ? (
                        <input type="checkbox" checked={draftPm.enabled ?? !!m.enabled} onChange={e=>setDraftPm({...draftPm, enabled: e.target.checked})} />
                      ) : (
                        <button className="text-xs" onClick={()=>patchPaymentMethod(m.id, { enabled: !m.enabled })}>
                          <span className={`${retroBadge} ${m.enabled ? '' : 'opacity-50'}`}>{m.enabled ? 'فعال' : 'غیرفعال'}</span>
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingPmId === m.id ? (
                        <input type="number" className="border border-[#c5bca5] px-2 py-1 bg-white text-xs w-20" value={draftPm.order ?? m.order} onChange={e=>setDraftPm({...draftPm, order: parseInt(e.target.value || '0')})} />
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button title="بالا" onClick={()=>movePaymentMethod(m.id, 'up')} className="text-xs">↑</button>
                          <span>{m.order}</span>
                          <button title="پایین" onClick={()=>movePaymentMethod(m.id, 'down')} className="text-xs">↓</button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center space-x-2">
                      {editingPmId === m.id ? (
                        <>
                          <button className="text-green-600 hover:text-green-800 text-xs" onClick={()=>{ patchPaymentMethod(m.id, {
                            key: draftPm.key ?? m.key,
                            name: draftPm.name ?? m.name,
                            account: draftPm.account ?? m.account,
                            enabled: draftPm.enabled ?? m.enabled,
                            is_cheque: draftPm.is_cheque ?? m.is_cheque,
                            order: draftPm.order ?? m.order,
                          }); setEditingPmId(null); setDraftPm({ enabled: true, order: 100 }) }}>✓</button>
                          <button className="text-red-600 hover:text-red-800 text-xs" onClick={()=>{ setEditingPmId(null); setDraftPm({ enabled: true, order: 100 }) }}>✗</button>
                        </>
                      ) : (
                        <>
                          <button className="text-blue-600 hover:text-blue-800 text-xs" onClick={()=>{ setEditingPmId(m.id); setDraftPm({ key: m.key, name: m.name, account: m.account ?? '', enabled: m.enabled, is_cheque: !!m.is_cheque, order: m.order }) }}>ویرایش</button>
                          <button className="text-red-600 hover:text-red-800 text-xs" onClick={()=>deletePaymentMethod(m.id)}>حذف</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-xs text-[#7a6b4f]">روشی ثبت نشده است.</p>
          )}
        </div>
      </section>

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>Blockchain Ledger</p>
            <h3 className="text-lg font-semibold mt-2">زنجیره هش تراکنش‌ها</h3>
            <p className={`text-xs ${retroMuted} mt-2`}>
              آخرین رکوردها برای همگام‌سازی با دفتر کل و پرداخت‌ها
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={retroButton} onClick={() => refreshBlockchainEntries(50, true)}>
              بروزرسانی
            </button>
            <button className={retroButton} onClick={verifyChainIntegrity} disabled={chainLoading}>
              {chainLoading ? 'در حال بررسی...' : 'بررسی صحت'}
            </button>
            <button className={retroButton} onClick={downloadProof}>
              دانلود مرکل‌پروف
            </button>
            <button className={retroButton} onClick={exportCurrentChain}>
              خروجی JSON زنجیره
            </button>
          </div>
        </header>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span
              className={`${retroBadge} ${
                chainStatus === 'valid'
                  ? 'bg-[#e7f4e7] text-[#1c4d1c]'
                  : chainStatus === 'invalid'
                  ? 'bg-[#f9e6e6] text-[#7a1f1f]'
                  : ''
            }`}
            >
              {chainStatus === 'valid'
                ? 'زنجیره معتبر'
                : chainStatus === 'invalid'
                  ? 'زنجیره نامعتبر'
                  : 'وضعیت نامشخص'}
            </span>
            {chainMessage && <span className={retroMuted}>{chainMessage}</span>}
          </div>
          {entityCatalog.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              <select
                className="border border-[#c5bca5] bg-[#faf4de] px-2 py-1"
                value={
                  chainEntityType && chainEntityId ? `${chainEntityType}::${chainEntityId}` : ''
                }
                onChange={e => {
                  const value = e.target.value
                  if (!value) {
                    void refreshBlockchainEntries(50, true)
                    return
                  }
                  const [type, id] = value.split('::')
                  void loadChainForEntity(type, id)
                }}
              >
                <option value="">نمایش همه موجودیت‌ها</option>
                {entityCatalog.map(ent => (
                  <option key={`${ent.entity_type}::${ent.entity_id}`} value={`${ent.entity_type}::${ent.entity_id}`}>
                    {ent.entity_type} #{ent.entity_id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {blockchainEntries.length > 0 ? (
          <table className="w-full border border-[#c5bca5] bg-[#faf4de] text-sm">
            <thead>
              <tr>
                <th className={retroTableHeader}>انتخاب</th>
                <th className={retroTableHeader}>#</th>
                <th className={retroTableHeader}>موجودیت</th>
                <th className={retroTableHeader}>عملیات</th>
                <th className={retroTableHeader}>شناسه</th>
                <th className={retroTableHeader}>زمان</th>
                <th className={retroTableHeader}>هش</th>
              </tr>
            </thead>
            <tbody>
              {blockchainEntries.slice().reverse().map(entry => (
                <tr key={entry.id} className="border-b border-[#d9cfb6]">
                  <td className="px-3 py-2 text-center">
                    <input
                      type="radio"
                      checked={selectedEntryId === entry.id}
                      onChange={() => {
                        setSelectedEntryId(entry.id)
                        setChainEntityType(entry.entity_type)
                        setChainEntityId(entry.entity_id)
                      }}
                      name="blockchain-entry"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">{entry.id}</td>
                  <td className="px-3 py-2">{entry.entity_type}</td>
                  <td className="px-3 py-2">{entry.action}</td>
                  <td className="px-3 py-2">{entry.entity_id}</td>
                  <td className="px-3 py-2 text-left">
                    {entry.timestamp ? isoToJalali(entry.timestamp) : '---'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] break-all">
                    {entry.current_hash.slice(0, 24)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-[#7a6b4f]">
            رکوردی یافت نشد یا دسترسی شما محدود است.
          </p>
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

