import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { ModuleComponentProps, SmartDateState } from '../components/layout/AppShell'
import SmartDatePicker from '../components/SmartDatePicker'
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../services/api'
import { isoToJalali } from '../utils/num'
import { toast } from '../utils/toast'
import authService from '../services/auth'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroPanel,
  retroPanelPadded,
  retroTableHeader,
  retroMuted,
} from '../components/retroTheme'
import ModulePage from '../components/layout/ModulePage'
import {
  AutoSaveState,
  DEFAULT_AUTO_SAVE_DELAY_MS,
  describeAutoSaveState,
  scheduleAutoSaveIdleReset,
} from './settings/autoSave'
import { useConfirmDialog } from '../context/ConfirmDialogContext'

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

// user/role/permission types moved to Settings > Users module

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

function groupSettingsByCategory(settings: SystemSetting[]): Record<string, SystemSetting[]> {
  return settings.reduce((acc, setting) => {
    const cat = setting.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(setting)
    return acc
  }, {} as Record<string, SystemSetting[]>)
}

export default function SystemModule({ smartDate, onSmartDateChange, sync }: ModuleComponentProps) {
  const confirmDialog = useConfirmDialog()
  const [backups, setBackups] = useState<Backup[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  // users/roles UI moved to Settings > Users module
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)

  const showLegacyAccess = false

  // SMS state removed; migrated to Developer settings (sms.ir)

  // System Settings state
  const [allSettings, setAllSettings] = useState<SystemSetting[]>([])
  const [settingsByCategory, setSettingsByCategory] = useState<{ [key: string]: SystemSetting[] }>(
    {},
  )
  const [selectedCategory, setSelectedCategory] = useState<string>('general')
  const [sidebarSide, setSidebarSide] = useState<string>('')
  const [sidebarSideStatus, setSidebarSideStatus] = useState<AutoSaveState>('idle')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [settingAutoSave, setSettingAutoSave] = useState<Record<string, AutoSaveState>>({})
  const sidebarSideTimer = useRef<number | null>(null)
  const settingTimers = useRef<Record<string, number>>({})

  // Financial Year state
  type FinancialYear = {
    id: number
    name: string
    start_date: string
    end_date?: string | null
    is_closed: boolean
  }
  const [fYears, setFYears] = useState<FinancialYear[]>([])
  const [newFY, setNewFY] = useState<{ name: string; start_date: string; end_date?: string }>(
    () => ({ name: '', start_date: '' }),
  )
  const [savingFY, setSavingFY] = useState(false)

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
  const [entityCatalog, setEntityCatalog] = useState<
    Array<{ entity_type: string; entity_id: string }>
  >([])
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    return () => {
      if (sidebarSideTimer.current) {
        window.clearTimeout(sidebarSideTimer.current)
      }
      Object.values(settingTimers.current).forEach((timerId) => window.clearTimeout(timerId))
    }
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
        setSettingsByCategory(groupSettingsByCategory(settings))
      } catch (err) {
        console.error(err)
        warn.push('تنظیمات سیستم قابل دریافت نیست.')
      }
      // Payment methods
      try {
        // Avoid early 401: only fetch after auth token exists
        const hasToken = !!localStorage.getItem('hesabpak_access_token')
        if (hasToken) {
          const side = await apiGet<string>('/api/users/preferences/sidebar-side')
          if (side === 'left' || side === 'right') {
            setSidebarSide(side)
          }
          await loadPaymentMethods()
        }
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

  function cancelSettingEdit(key: string) {
    if (settingTimers.current[key]) {
      window.clearTimeout(settingTimers.current[key])
      delete settingTimers.current[key]
    }
    setEditingKey(null)
    setEditValue('')
    setSettingAutoSave((prev) => ({ ...prev, [key]: 'idle' }))
  }

  function updateSettingValueLocally(key: string, value: string | null) {
    setAllSettings((prev) => {
      const next = prev.map((setting) =>
        setting.key === key ? { ...setting, value } : setting,
      )
      setSettingsByCategory(groupSettingsByCategory(next))
      return next
    })
  }

  function scheduleSettingAutoSave(key: string, value: string) {
    setEditValue(value)
    setSettingAutoSave((prev) => {
      const current = prev[key]
      if (current === 'saving') return prev
      return { ...prev, [key]: 'pending' }
    })
    if (settingTimers.current[key]) {
      window.clearTimeout(settingTimers.current[key])
    }
    settingTimers.current[key] = window.setTimeout(async () => {
      setSettingAutoSave((prev) => ({ ...prev, [key]: 'saving' }))
      try {
        await apiPatch(`/api/admin/settings/${key}`, { value })
        setSettingAutoSave((prev) => ({ ...prev, [key]: 'saved' }))
        updateSettingValueLocally(key, value)
        setEditingKey((prev) => (prev === key ? null : prev))
        setEditValue('')
        window.setTimeout(() => {
          setSettingAutoSave((prev) => ({ ...prev, [key]: 'idle' }))
        }, 2000)
      } catch (err) {
        console.error(err)
        setSettingAutoSave((prev) => ({ ...prev, [key]: 'error' }))
        setError('به‌روزرسانی تنظیم موفق نبود.')
      } finally {
        if (settingTimers.current[key]) {
          window.clearTimeout(settingTimers.current[key])
          delete settingTimers.current[key]
        }
      }
    }, DEFAULT_AUTO_SAVE_DELAY_MS)
  }

  // ===== Payment Methods =====
  async function loadPaymentMethods() {
    setPmLoading(true)
    setPmError(null)
    try {
      const list = await apiGet<PaymentMethod[]>('/api/payment-methods')
      setMethods(Array.isArray(list) ? list : [])
      try {
        localStorage.setItem('hesabpak_payment_methods', JSON.stringify(list || []))
      } catch {}
    } catch (err: any) {
      setPmError('روش‌های پرداخت در دسترس نیست (API 404/خطای دسترسی). داده کش‌شده نمایش داده شد.')
      try {
        const raw = localStorage.getItem('hesabpak_payment_methods')
        if (raw) setMethods(JSON.parse(raw))
      } catch {}
    } finally {
      setPmLoading(false)
    }
  }

  async function createPaymentMethod() {
    try {
      const payload = {
        key: (draftPm.key || '').trim(),
        name: (draftPm.name || '').trim(),
        account: draftPm.account || '',
        enabled: draftPm.enabled ?? true,
        is_cheque: !!draftPm.is_cheque,
        order: draftPm.order ?? 100,
      }
      if (!payload.key || !payload.name) {
        toast.warning('کلید و نام لازم است')
        return
      }
      await apiPost('/api/payment-methods', payload)
      setDraftPm({ enabled: true, order: 100 })
      await loadPaymentMethods()
    } catch (err) {
      setPmError('ایجاد روش پرداخت ناموفق بود')
    }
  }

  async function patchPaymentMethod(id: number, patch: Partial<PaymentMethod>) {
    try {
      await apiPatch(`/api/payment-methods/${id}`, patch)
      setEditingPmId(null)
      await loadPaymentMethods()
    } catch (err) {
      setPmError('بروزرسانی روش پرداخت ناموفق بود')
    }
  }

  async function movePaymentMethod(id: number, dir: 'up' | 'down') {
    try {
      await apiPost(`/api/payment-methods/${id}/move`, { direction: dir })
      await loadPaymentMethods()
    } catch (err) {
      setPmError('جابجایی ترتیب ناموفق بود')
    }
  }

  async function deletePaymentMethod(id: number) {
    const confirmed = await confirmDialog({
      message: 'حذف روش پرداخت؟',
      confirmText: 'حذف',
      tone: 'danger',
    })
    if (!confirmed) return
    try {
      await apiDelete(`/api/payment-methods/${id}`)
      await loadPaymentMethods()
    } catch (err) {
      setPmError('حذف روش پرداخت ناموفق بود')
    }
  }

  // ===== Blockchain =====
  async function refreshBlockchainEntries(limit = 50, bust = false) {
    try {
      setChainLoading(true)
      const q = new URLSearchParams()
      q.set('limit', String(limit))
      if (bust) q.set('_', String(Date.now()))
      const items = await apiGet<BlockchainEntry[]>(`/api/blockchain/entries?${q.toString()}`)
      setBlockchainEntries(Array.isArray(items) ? items : [])
      const catalog: Array<{ entity_type: string; entity_id: string }> = [];
      (Array.isArray(items) ? items : []).forEach((e) => {
        if (e.entity_type && e.entity_id) {
          catalog.push({ entity_type: e.entity_type, entity_id: String(e.entity_id) })
        }
      })
      setEntityCatalog(catalog)
      setChainLoading(false)
    } catch (err) {
      setChainLoading(false)
      setChainMessage('بارگذاری زنجیره ناموفق بود')
    }
  }

  async function verifyChainIntegrity() {
    try {
      setChainLoading(true)
      const res = await apiGet<{ status: 'valid' | 'invalid'; message?: string }>(
        '/api/blockchain/verify',
      )
      setChainStatus(res.status || 'unknown')
      setChainMessage(res.message || null)
    } catch (err) {
      setChainStatus('unknown')
      setChainMessage('بررسی صحت ممکن نشد')
    } finally {
      setChainLoading(false)
    }
  }

  async function downloadProof() {
    try {
      const id = selectedEntryId
      if (!id) {
        toast.warning('ابتدا یک رکورد را انتخاب کنید')
        return
      }
      const res = await authService.fetchWithAuth(`/api/blockchain/entries/${id}/proof`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merkle-proof-${id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setChainMessage('دانلود پروف ناموفق بود')
    }
  }

  async function exportCurrentChain() {
    try {
      const res = await authService.fetchWithAuth('/api/blockchain/export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `blockchain-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setChainMessage('خروجی زنجیره ناموفق بود')
    }
  }

  async function loadChainForEntity(type: string, id: string) {
    try {
      setChainLoading(true)
      setChainEntityType(type)
      setChainEntityId(id)
      const items = await apiGet<BlockchainEntry[]>(`/api/blockchain/entity/${type}/${id}`)
      setBlockchainEntries(Array.isArray(items) ? items : [])
    } catch (err) {
      setChainMessage('بارگذاری موجودیت ناموفق بود')
    } finally {
      setChainLoading(false)
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
    if (!name || !startRaw) {
      toast.warning('نام و تاریخ شروع ضروری است')
      return
    }
    setSavingFY(true)
    try {
      const { parseJalaliInput } = await import('../utils/date')
      const startParsed = parseJalaliInput(startRaw)
      const endParsed = newFY.end_date ? parseJalaliInput(newFY.end_date) : null
      if (!startParsed) {
        toast.warning('فرمت تاریخ شروع نامعتبر است')
        setSavingFY(false)
        return
      }
      const payload = {
        name,
        start_date: startParsed?.iso ?? new Date(newFY.start_date).toISOString(),
        end_date: endParsed
          ? endParsed.iso
          : newFY.end_date
            ? new Date(newFY.end_date).toISOString()
            : null,
      }
      await apiPost('/api/financial-years', payload)
      await loadData()
      setNewFY({ name: '', start_date: '' })
      toast.success('سال مالی ایجاد شد')
    } catch (err) {
      console.error(err)
      toast.error('ایجاد سال مالی با خطا مواجه شد')
    } finally {
      setSavingFY(false)
    }
  }

  async function updateFY(fid: number, patch: Partial<FinancialYear>) {
    try {
      await apiPatch(`/api/financial-years/${fid}`, patch)
      await loadData()
      toast.success('سال مالی بروزرسانی شد')
    } catch (err) {
      console.error(err)
      toast.error('بروزرسانی ناموفق بود')
    }
  }

  async function deleteFY(fid: number) {
    const confirmed = await confirmDialog({
      message: 'حذف سال مالی؟',
      confirmText: 'حذف',
      tone: 'danger',
    })
    if (!confirmed) return
    try {
      await apiDelete(`/api/financial-years/${fid}`)
      await loadData()
      toast.success('سال مالی حذف شد')
    } catch (err) {
      console.error(err)
      toast.error('حذف ناموفق بود')
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
      toast.error('دانلود ناموفق بود')
    }
  }

  async function setActiveFY(fid: number) {
    try {
      const meId = Number(localStorage.getItem('hesabpak_user_id') || '0')
      await apiPatch(`/api/users/${meId}/preferences`, { active_financial_year_id: fid })
      try {
        localStorage.setItem('hesabpak_active_fy_id', String(fid))
      } catch {}
      // Notify and refresh softly
      try {
        window.dispatchEvent(new Event('hesabpak-fy-changed'))
      } catch {}
      setTimeout(() => {
        try {
          window.location.reload()
        } catch {}
      }, 100)
    } catch (err) {
      console.error(err)
      toast.error('تنظیم سال فعال ناموفق بود')
    }
  }

  const saveSidebarSide = useCallback(async (nextSide: string) => {
    if (!nextSide) {
      setSidebarSideStatus('idle')
      return
    }
    setSidebarSideStatus('saving')
    try {
      await apiPost('/api/users/preferences/sidebar-side', { side: nextSide })
      try {
        localStorage.setItem('hesabpak_sidebar_side_v1', nextSide)
      } catch (e) {}
      setSidebarSideStatus('saved')
      scheduleAutoSaveIdleReset(setSidebarSideStatus, 2000)
    } catch (err) {
      console.error(err)
      setSidebarSideStatus('error')
      setError('ذخیره تنظیم منوی کناری موفق نبود.')
    }
  }, [])

  const scheduleSidebarSideSave = useCallback(
    (nextValue: string) => {
      setSidebarSide(nextValue)
      if (sidebarSideTimer.current) {
        window.clearTimeout(sidebarSideTimer.current)
        sidebarSideTimer.current = null
      }
      if (!nextValue) {
        setSidebarSideStatus('idle')
        return
      }
      setSidebarSideStatus('pending')
      sidebarSideTimer.current = window.setTimeout(() => {
        sidebarSideTimer.current = null
        void saveSidebarSide(nextValue)
      }, DEFAULT_AUTO_SAVE_DELAY_MS)
    },
    [saveSidebarSide],
  )

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

  // user/role creation removed; now handled in Settings > Users

  // SMS utility functions removed

  async function deleteSetting(key: string) {
    const confirmed = await confirmDialog({
      message: 'آیا مطمئن هستید؟',
      confirmText: 'حذف',
      tone: 'danger',
    })
    if (!confirmed) return
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
    <ModulePage
      eyebrow="System Settings"
      title="تنظیمات سیستم"
      description={`تاریخ مرجع: ${smartDate.jalali ?? '—'} (ISO ${smartDate.isoDate ?? '—'})`}
    >
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

      {/* Roles & permissions moved to Settings > Users */}

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
                    <input
                      className="rounded p-2"
                      placeholder="نام (مثلاً 1404)"
                      value={newFY.name}
                      onChange={(e) => setNewFY({ ...newFY, name: e.target.value })}
                    />
                    <input
                      className="rounded p-2"
                      data-jdp
                      data-jdp-only-date
                      data-jdp-dir="rtl"
                      placeholder="تاریخ شروع (شمسی)"
                      value={newFY.start_date}
                      onFocus={(e) => {
                        try {
                          ;(window as any).jalaliDatepicker?.show(e.target)
                        } catch {}
                      }}
                      onChange={(e) => setNewFY({ ...newFY, start_date: e.target.value })}
                    />
                    <input
                      className="rounded p-2"
                      data-jdp
                      data-jdp-only-date
                      data-jdp-dir="rtl"
                      placeholder="تاریخ پایان (شمسی)"
                      value={newFY.end_date ?? ''}
                      onFocus={(e) => {
                        try {
                          ;(window as any).jalaliDatepicker?.show(e.target)
                        } catch {}
                      }}
                      onChange={(e) => setNewFY({ ...newFY, end_date: e.target.value })}
                    />
                    <button className={`${retroButton}`} disabled={savingFY} onClick={createFY}>
                      ایجاد سال مالی
                    </button>
                  </div>
                </div>
                <div>
                  <p className={`${retroHeading}`}>لیست و عملیات</p>
                  <div className="mt-2 space-y-2">
                    {fYears.length === 0 && <p className={retroMuted}>سال مالی ثبت نشده است.</p>}
                    {fYears.map((y) => (
                      <div
                        key={y.id}
                        className="flex items-center justify-between gap-2 border rounded p-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`${retroBadge}`}>{y.name}</span>
                          <span className={retroMuted}>
                            از {isoToJalali(y.start_date)} تا{' '}
                            {y.end_date ? isoToJalali(y.end_date) : '—'}
                          </span>
                          {y.is_closed && <span className={`${retroBadge} bg-red-800`}>بسته</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button className={`${retroButton}`} onClick={() => exportFY(y.id)}>
                            دانلود
                          </button>
                          <button className={`${retroButton}`} onClick={() => setActiveFY(y.id)}>
                            تنظیم به سال فعال
                          </button>
                          <button
                            className={`${retroButton}`}
                            onClick={() => updateFY(y.id, { is_closed: !y.is_closed })}
                          >
                            {y.is_closed ? 'بازکردن' : 'بستن'}
                          </button>
                          <button className={`${retroButton}`} onClick={() => deleteFY(y.id)}>
                            حذف
                          </button>
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
              تاریخ هوشمند فعال: {smartDate.jalali ?? 'انتخاب نشده'} |{' '}
              {smartDate.isoDate ?? 'ISO TBD'}
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
          onDateSelected={(iso, jalali) => applySmartDate({ isoDate: iso.slice(0, 10), jalali })}
        />
      </section>

      {/* Users moved to Settings > Users */}

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
              {backups.slice(0, 10).map((item) => (
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
          <p className="text-xs text-[#7a6b4f]">بکاپی یافت نشد یا دسترسی به این بخش محدود است.</p>
        )}
      </section>

      {/* SMS gateway UI moved to DeveloperModule (sms.ir) */}

      <section className={`${retroPanelPadded} space-y-4`}>
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className={retroHeading}>Payment Methods</p>
            <h3 className="text-lg font-semibold mt-2">روش‌های پرداخت</h3>
            <p className={`text-xs ${retroMuted} mt-2`}>
              مدیریت کلید، نام، حساب معادل و ترتیب نمایش
            </p>
          </div>
          <div className="flex gap-2">
            <button className={`${retroButton}`} onClick={loadPaymentMethods}>
              بروزرسانی لیست
            </button>
          </div>
        </header>
        {pmError && (
          <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-4 py-2">
            {pmError}
          </div>
        )}
        <div className={`${retroPanel} p-4 space-y-3`}>
          <p className={retroHeading}>ایجاد روش جدید</p>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center">
            <input
              className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              placeholder="کلید (مثلاً cash)"
              value={draftPm.key || ''}
              onChange={(e) => setDraftPm({ ...draftPm, key: e.target.value })}
            />
            <input
              className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              placeholder="نام نمایشی"
              value={draftPm.name || ''}
              onChange={(e) => setDraftPm({ ...draftPm, name: e.target.value })}
            />
            <input
              className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              placeholder="حساب معادل دفتر"
              value={draftPm.account || ''}
              onChange={(e) => setDraftPm({ ...draftPm, account: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!draftPm.is_cheque}
                onChange={(e) => setDraftPm({ ...draftPm, is_cheque: e.target.checked })}
              />
              <span>چک</span>
            </label>
            <input
              type="number"
              className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              placeholder="ترتیب"
              value={draftPm.order ?? 100}
              onChange={(e) => setDraftPm({ ...draftPm, order: parseInt(e.target.value || '0') })}
            />
            <button className={retroButton} onClick={createPaymentMethod}>
              ایجاد
            </button>
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
                        <input
                          aria-label="کلید روش پرداخت"
                          className="border border-[#c5bca5] px-2 py-1 bg-white text-xs"
                          value={draftPm.key ?? m.key}
                          onChange={(e) => setDraftPm({ ...draftPm, key: e.target.value })}
                        />
                      ) : (
                        m.key
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingPmId === m.id ? (
                        <input
                          aria-label="نام روش پرداخت"
                          className="border border-[#c5bca5] px-2 py-1 bg-white text-xs"
                          value={draftPm.name ?? m.name}
                          onChange={(e) => setDraftPm({ ...draftPm, name: e.target.value })}
                        />
                      ) : (
                        m.name
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingPmId === m.id ? (
                        <input
                          aria-label="حساب روش پرداخت"
                          className="border border-[#c5bca5] px-2 py-1 bg-white text-xs"
                          value={draftPm.account ?? (m.account || '')}
                          onChange={(e) => setDraftPm({ ...draftPm, account: e.target.value })}
                        />
                      ) : (
                        m.account || '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingPmId === m.id ? (
                        <input
                          aria-label="چک"
                          type="checkbox"
                          checked={draftPm.is_cheque ?? !!m.is_cheque}
                          onChange={(e) => setDraftPm({ ...draftPm, is_cheque: e.target.checked })}
                        />
                      ) : m.is_cheque ? (
                        '✓'
                      ) : (
                        '✗'
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingPmId === m.id ? (
                        <input
                          aria-label="فعال/غیرفعال"
                          type="checkbox"
                          checked={draftPm.enabled ?? !!m.enabled}
                          onChange={(e) => setDraftPm({ ...draftPm, enabled: e.target.checked })}
                        />
                      ) : (
                        <button
                          className="text-xs"
                          onClick={() => patchPaymentMethod(m.id, { enabled: !m.enabled })}
                        >
                          <span className={`${retroBadge} ${m.enabled ? '' : 'opacity-50'}`}>
                            {m.enabled ? 'فعال' : 'غیرفعال'}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingPmId === m.id ? (
                        <input
                          aria-label="ترتیب"
                          type="number"
                          className="border border-[#c5bca5] px-2 py-1 bg-white text-xs w-20"
                          value={draftPm.order ?? m.order}
                          onChange={(e) =>
                            setDraftPm({ ...draftPm, order: parseInt(e.target.value || '0') })
                          }
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="بالا"
                            onClick={() => movePaymentMethod(m.id, 'up')}
                            className="text-xs"
                          >
                            ↑
                          </button>
                          <span>{m.order}</span>
                          <button
                            title="پایین"
                            onClick={() => movePaymentMethod(m.id, 'down')}
                            className="text-xs"
                          >
                            ↓
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center space-x-2">
                      {editingPmId === m.id ? (
                        <>
                          <button
                            className="text-green-600 hover:text-green-800 text-xs"
                            onClick={() => {
                              patchPaymentMethod(m.id, {
                                key: draftPm.key ?? m.key,
                                name: draftPm.name ?? m.name,
                                account: draftPm.account ?? m.account,
                                enabled: draftPm.enabled ?? m.enabled,
                                is_cheque: draftPm.is_cheque ?? m.is_cheque,
                                order: draftPm.order ?? m.order,
                              })
                              setEditingPmId(null)
                              setDraftPm({ enabled: true, order: 100 })
                            }}
                          >
                            ✓
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800 text-xs"
                            onClick={() => {
                              setEditingPmId(null)
                              setDraftPm({ enabled: true, order: 100 })
                            }}
                          >
                            ✗
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="text-[var(--retro-heading-text)] hover:text-[var(--retro-button-bg)] text-xs"
                            onClick={() => {
                              setEditingPmId(m.id)
                              setDraftPm({
                                key: m.key,
                                name: m.name,
                                account: m.account ?? '',
                                enabled: m.enabled,
                                is_cheque: !!m.is_cheque,
                                order: m.order,
                              })
                            }}
                          >
                            ویرایش
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800 text-xs"
                            onClick={() => deletePaymentMethod(m.id)}
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
                aria-label="فیلتر موجودیت‌های زنجیره"
                className="border border-[#c5bca5] bg-[#faf4de] px-2 py-1"
                value={
                  chainEntityType && chainEntityId ? `${chainEntityType}::${chainEntityId}` : ''
                }
                onChange={(e) => {
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
                {entityCatalog.map((ent) => (
                  <option
                    key={`${ent.entity_type}::${ent.entity_id}`}
                    value={`${ent.entity_type}::${ent.entity_id}`}
                  >
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
              {blockchainEntries
                .slice()
                .reverse()
                .map((entry) => (
                  <tr key={entry.id} className="border-b border-[#d9cfb6]">
                    <td className="px-3 py-2 text-center">
                      <input
                        aria-label={`انتخاب رکورد ${entry.id}`}
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
          <p className="text-xs text-[#7a6b4f]">رکوردی یافت نشد یا دسترسی شما محدود است.</p>
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
              {activities.map((act) => (
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

      {/* Users table removed; now in Settings > Users */}

      <section className={`${retroPanelPadded} space-y-4`}>
        <header>
          <p className={retroHeading}>System Settings</p>
          <h3 className="text-lg font-semibold mt-2">تنظیمات سیستم</h3>
        </header>

        <div className="mb-4 space-y-3">
          <div className={`${retroPanel} p-3`}>
            <p className={retroHeading}>جهت منو</p>
            <p className="text-xs text-[#7a6b4f]">
              محل نمایش منوی کناری را برای این کاربر انتخاب کنید.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <select
                aria-label="جهت منو"
                className="border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de] text-sm"
                value={sidebarSide}
                onChange={(e) => scheduleSidebarSideSave(e.target.value)}
              >
                <option value="">پیشفرض (راست)</option>
                <option value="right">راست</option>
                <option value="left">چپ</option>
              </select>
              <span className="text-xs text-[#7a6b4f]">
                {describeAutoSaveState(sidebarSideStatus)}
              </span>
            </div>
          </div>

          <div>
            <p className={retroHeading}>دسته</p>
            <select
              aria-label="دسته تنظیمات"
              className="w-full border-2 border-[#c5bca5] px-3 py-2 bg-[#faf4de]"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">همه</option>
              {Object.keys(settingsByCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className={`${retroPanel} p-4`}>
            {(selectedCategory ? settingsByCategory[selectedCategory] || [] : allSettings).length >
            0 ? (
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
                  {(selectedCategory
                    ? settingsByCategory[selectedCategory] || []
                    : allSettings
                  ).map((setting) => (
                    <tr key={setting.key} className="border-b border-[#d9cfb6]">
                      <td className="px-3 py-2 font-mono text-xs">{setting.key}</td>
                      <td className="px-3 py-2">
                        {editingKey === setting.key ? (
                          <input
                            aria-label={`مقدار تنظیم ${setting.key}`}
                            type={setting.is_secret ? 'password' : 'text'}
                            className="border border-[#c5bca5] px-2 py-1 bg-white text-xs"
                            value={editValue}
                            onChange={(e) => scheduleSettingAutoSave(setting.key, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') cancelSettingEdit(setting.key)
                            }}
                          />
                        ) : (
                          <span className={setting.is_secret ? 'text-gray-400' : ''}>
                            {setting.is_secret ? '***' : setting.value || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-[#7a6b4f]">
                        {setting.description || '-'}
                      </td>
                      <td className="px-3 py-2 text-center space-y-1">
                        <div className="text-[11px] text-[#7a6b4f]">
                          {describeAutoSaveState(settingAutoSave[setting.key] ?? 'idle')}
                        </div>
                        {editingKey === setting.key ? (
                          <button
                            className="text-red-600 hover:text-red-800 text-xs"
                            onClick={() => cancelSettingEdit(setting.key)}
                          >
                            لغو
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              className="text-[var(--retro-heading-text)] hover:text-[var(--retro-button-bg)] text-xs"
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
                          </div>
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
    </ModulePage>
  )
}
