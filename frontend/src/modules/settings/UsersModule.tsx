import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { SkeletonText, SkeletonBlock } from '../../components/Skeleton'
import ModulePage from '../../components/layout/ModulePage'
import '../../styles/retro-forms.css'
import { formatNumberFa } from '../../utils/num'
import { toast } from '../../utils/toast'
import { useConfirmDialog } from '../../context/ConfirmDialogContext'
import {
  AutoSaveState,
  DEFAULT_AUTO_SAVE_DELAY_MS,
  describeAutoSaveState,
  scheduleAutoSaveIdleReset,
} from './autoSave'

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

interface OrgFeatureInfo {
  nft_count: number
  features: string[]
  invoices?: boolean
  payments?: boolean
  products?: boolean
  persons?: boolean
  reports?: boolean
  settings?: boolean
  user?: { id: number; username: string }
}

type OrgFeatureFlagKey = 'invoices' | 'payments' | 'products' | 'persons' | 'reports' | 'settings'

interface UserNftAsset {
  token_id: string
  chain?: string
  contract_address?: string | null
  metadata?: Record<string, any> | null
  is_active?: boolean
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

const AUTO_SAVE_DELAY_MS = DEFAULT_AUTO_SAVE_DELAY_MS

type UserStatusFilter = 'all' | 'active' | 'inactive'

const USER_FILTER_STORAGE_KEY = 'hp_users_filters_v1'
const USER_PAGE_SIZE_KEY = 'hp_users_page_size'

function readUserFilters(): { status?: UserStatusFilter; role?: number } {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(USER_FILTER_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const status = parsed?.status
    const role = parsed?.role
    return {
      status: status === 'active' || status === 'inactive' || status === 'all' ? status : undefined,
      role: typeof role === 'number' ? role : undefined,
    }
  } catch {
    return {}
  }
}

function readUserPageSize(): number {
  if (typeof window === 'undefined') return 10
  try {
    const raw = localStorage.getItem(USER_PAGE_SIZE_KEY)
    const allowed = [10, 20, 50]
    const val = raw ? Number(raw) : 10
    return allowed.includes(val) ? val : 10
  } catch {
    return 10
  }
}

const STATUS_FILTERS: Array<{ key: UserStatusFilter; label: string }> = [
  { key: 'all', label: 'همه کاربران' },
  { key: 'active', label: 'فقط فعال' },
  { key: 'inactive', label: 'غیرفعال' },
]

const ORG_FEATURE_FLAGS: Array<{ key: OrgFeatureFlagKey; label: string; helper: string }> = [
  { key: 'invoices', label: 'فاکتورها', helper: 'حسابداری فروش' },
  { key: 'payments', label: 'پرداخت‌ها', helper: 'دریافت و پرداخت' },
  { key: 'products', label: 'کالا و خدمات', helper: 'کاتالوگ و قیمت' },
  { key: 'persons', label: 'مشتری/تأمین‌کننده', helper: 'دفترچه ارتباطات' },
  { key: 'reports', label: 'گزارش‌ها', helper: 'سنجش عملکرد' },
  { key: 'settings', label: 'تنظیمات', helper: 'پیکربندی سازمان' },
]

export default function UsersModule(): JSX.Element {
  const [users, setUsers] = useState<User[]>([])
  const [userSortKey, setUserSortKey] = useState<
    'id' | 'username' | 'full_name' | 'email' | 'role_id' | 'is_active'
  >('id')
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('asc')
  const [userPage, setUserPage] = useState(1)
  const [userPageSize, setUserPageSize] = useState<number>(() => readUserPageSize())
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>(() => {
    const { status } = readUserFilters()
    return status ?? 'all'
  })
  const [userRoleFilter, setUserRoleFilter] = useState<number | 'all'>(() => {
    const { role } = readUserFilters()
    return typeof role === 'number' ? role : 'all'
  })
  const [roles, setRoles] = useState<Role[]>([])
  const [roleForm, setRoleForm] = useState<{ id?: number; name: string; description: string }>({
    name: '',
    description: '',
  })
  const [userForm, setUserForm] = useState<{
    id?: number
    username: string
    full_name?: string
    email?: string
    role_id?: number | null
  }>({ username: '', full_name: '', email: '', role_id: null })
  const [perms, setPerms] = useState<Permission[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [activityFilter, setActivityFilter] = useState<{
    user?: string
    method?: string
    status?: string
    path?: string
  }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userPerms, setUserPerms] = useState<Record<number, Record<number, boolean>>>({})
  const [orgFeatures, setOrgFeatures] = useState<OrgFeatureInfo | null>(null)
  const [userNfts, setUserNfts] = useState<UserNftAsset[]>([])
  const [orgFeaturesError, setOrgFeaturesError] = useState<string | null>(null)
  const [userNftsError, setUserNftsError] = useState<string | null>(null)
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
  const [userPermAutoSave, setUserPermAutoSave] = useState<Record<number, AutoSaveState>>({})
  const [smsSettingsStatus, setSmsSettingsStatus] = useState<AutoSaveState>('idle')
  const usersRef = useRef(users)
  const userPermsRef = useRef(userPerms)
  const smsSettingsRef = useRef(smsSettings)
  const permSaveTimers = useRef<Record<number, number>>({})
  const smsSettingsTimer = useRef<number | null>(null)
  const confirmDialog = useConfirmDialog()

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    userPermsRef.current = userPerms
  }, [userPerms])

  useEffect(() => {
    smsSettingsRef.current = smsSettings
  }, [smsSettings])

  useEffect(() => {
    usersRef.current = users
  }, [users])

  useEffect(() => {
    return () => {
      Object.values(permSaveTimers.current).forEach((timerId) => window.clearTimeout(timerId))
      if (smsSettingsTimer.current) window.clearTimeout(smsSettingsTimer.current)
    }
  }, [])

  const scheduleUserPermAutoSave = useCallback((userId: number) => {
    if (!userId) return
    setUserPermAutoSave((prev) => ({ ...prev, [userId]: 'pending' }))
    if (permSaveTimers.current[userId]) {
      window.clearTimeout(permSaveTimers.current[userId])
    }
    permSaveTimers.current[userId] = window.setTimeout(() => {
      void saveUserPerms(userId)
    }, AUTO_SAVE_DELAY_MS)
  }, [])

  const scheduleSmsSettingsSave = useCallback(() => {
    setSmsSettingsStatus((prev) => (prev === 'saving' ? prev : 'pending'))
    if (smsSettingsTimer.current) {
      window.clearTimeout(smsSettingsTimer.current)
    }
    smsSettingsTimer.current = window.setTimeout(() => {
      void saveSmsSettings()
    }, AUTO_SAVE_DELAY_MS)
  }, [])

  const updateUserPermSelection = useCallback(
    (userId: number, permId: number, checked: boolean) => {
      setUserPerms((prev) => ({
        ...prev,
        [userId]: { ...(prev[userId] ?? {}), [permId]: checked },
      }))
      scheduleUserPermAutoSave(userId)
    },
    [scheduleUserPermAutoSave],
  )

  const updateSmsSettings = useCallback(
    (updater: (prev: SmsSettingsPayload) => SmsSettingsPayload) => {
      setSmsSettings((prev) => updater({ ...prev }))
      scheduleSmsSettingsSave()
    },
    [scheduleSmsSettingsSave],
  )

  useEffect(() => {
    try {
      localStorage.setItem(USER_PAGE_SIZE_KEY, String(userPageSize))
    } catch {}
  }, [userPageSize])

  useEffect(() => {
    try {
      localStorage.setItem(
        USER_FILTER_STORAGE_KEY,
        JSON.stringify({
          status: userStatusFilter,
          role: userRoleFilter === 'all' ? null : userRoleFilter,
        }),
      )
    } catch {}
  }, [userStatusFilter, userRoleFilter])

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
              setSmsSettings((prev) => ({ ...prev, ...parsed }))
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
        if (up && typeof up === 'object')
          setUserPerms(up as Record<number, Record<number, boolean>>)
      } catch (e) {}
      try {
        const a = await apiGet<ActivityLog[]>('/api/admin/activity?limit=200')
        setActivities(a)
      } catch (e) {}
      try {
        setOrgFeaturesError(null)
        const org = await apiGet<OrgFeatureInfo>('/api/org/features')
        setOrgFeatures(org)
      } catch (e) {
        setOrgFeatures(null)
        setOrgFeaturesError('دریافت ویژگی‌های NFT سازمان ناموفق بود. لطفاً لاگ‌های بک‌اند را بررسی کنید.')
      }
      try {
        setUserNftsError(null)
        const nftItems = await apiGet<UserNftAsset[]>('/api/users/me/nfts')
        setUserNfts(Array.isArray(nftItems) ? nftItems : [])
      } catch (e) {
        setUserNfts([])
        setUserNftsError('دریافت دارایی‌های NFT کاربر ناموفق بود. لطفاً لاگ‌های بک‌اند را بررسی کنید.')
      }
    } catch (e) {
      setError('بارگذاری ماژول کاربران با مشکل مواجه شد')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    return users.filter((u) => {
      if (userStatusFilter === 'active' && !u.is_active) return false
      if (userStatusFilter === 'inactive' && u.is_active) return false
      if (userRoleFilter !== 'all' && u.role_id !== userRoleFilter) return false
      if (term) {
        const haystack = `${u.username} ${u.full_name ?? ''} ${u.email ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [users, userStatusFilter, userRoleFilter, userSearch])

  const userRoleCounts = useMemo(() => {
    const counts = new Map<number, number>()
    users.forEach((u) => {
      if (typeof u.role_id === 'number') {
        counts.set(u.role_id, (counts.get(u.role_id) ?? 0) + 1)
      }
    })
    return counts
  }, [users])

  const userStats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.is_active).length
    const inactive = total - active
    const withoutRole = users.filter((u) => !u.role_id).length
    return { total, active, inactive, withoutRole }
  }, [users])

  const smsOptInCount = useMemo(() => {
    return Object.values(userSms).filter((pref) => pref?.enable_notifications).length
  }, [userSms])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredUsers.length / userPageSize) || 1)
    if (userPage > maxPage) setUserPage(maxPage)
  }, [filteredUsers.length, userPageSize, userPage])

  const handleStatusFilterChange = (status: UserStatusFilter) => {
    setUserStatusFilter(status)
    setUserPage(1)
  }

  const handleRoleFilterChange = (roleId: number | 'all') => {
    setUserRoleFilter(roleId)
    setUserPage(1)
  }

  const handleUserSearch = (value: string) => {
    setUserSearch(value)
    setUserPage(1)
  }

  const resetUserFilters = () => {
    setUserStatusFilter('all')
    setUserRoleFilter('all')
    setUserSearch('')
    setUserPage(1)
  }

  const hasUserFilters =
    userStatusFilter !== 'all' || userRoleFilter !== 'all' || userSearch.trim().length > 0

  const filterPillClass = (active: boolean) =>
    `px-3 py-1 text-[10px] uppercase tracking-[0.25em] border border-[var(--retro-border)] rounded-full transition ${
      active
        ? 'bg-[var(--retro-button-bg)] text-[var(--retro-button-text)] shadow-[3px_3px_0_var(--retro-button-border)]'
        : 'bg-[var(--retro-panel-bg)] text-[var(--retro-heading-text)]'
    }`

  const summaryCards = [
    { key: 'total', label: 'کل کاربران', value: userStats.total, helper: 'ثبت‌شده' },
    { key: 'active', label: 'فعال', value: userStats.active, helper: 'دارای دسترسی' },
    { key: 'inactive', label: 'غیرفعال', value: userStats.inactive, helper: 'در انتظار فعال‌سازی' },
    { key: 'sms', label: 'SMS فعال', value: smsOptInCount, helper: 'اعلان‌های شخصی' },
  ]

  const filteredActivities = useMemo(() => {
    const f = activityFilter
    return activities.filter(
      (a) =>
        (!f.user || (a.username ?? '').toLowerCase().includes(f.user.toLowerCase())) &&
        (!f.method || a.method.toLowerCase() === f.method.toLowerCase()) &&
        (!f.status || String(a.status_code) === String(f.status)) &&
        (!f.path || a.path.toLowerCase().includes(f.path.toLowerCase())),
    )
  }, [activities, activityFilter])

  const pagedActivities = useMemo(() => {
    const start = (activityPage - 1) * activityPageSize
    return filteredActivities.slice(start, start + activityPageSize)
  }, [filteredActivities, activityPage, activityPageSize])

  function exportActivitiesCsv() {
    const rows = [
      ['time', 'user', 'path', 'method', 'status', 'detail'],
      ...filteredActivities.map((a) => [
        a.created_at,
        a.username ?? 'سیستم',
        a.path,
        a.method,
        String(a.status_code),
        (a.detail ?? '').replace(/\n/g, ' '),
      ]),
    ]
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activities_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function createOrUpdateRole() {
    const payload = { name: roleForm.name.trim(), description: roleForm.description?.trim() ?? '' }
    if (!payload.name) {
      toast.warning('نام نقش الزامی است')
      return
    }
    try {
      if (roleForm.id) {
        const updated = await apiPatch<Role>(`/api/roles/${roleForm.id}`, payload)
        setRoles((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))
        toast.success('نقش بروزرسانی شد')
      } else {
        const created = await apiPost<Role>('/api/roles', payload)
        setRoles((rs) => [created, ...rs])
        toast.success('نقش ایجاد شد')
      }
      setRoleForm({ name: '', description: '' })
    } catch (e) {
      toast.error('ثبت نقش ناموفق بود')
    }
  }

  async function deleteRole(role: Role) {
    const ok = await confirmDialog({
      title: 'حذف نقش',
      message: `نقش «${role.name}» حذف شود؟`,
      confirmText: 'حذف نقش',
      cancelText: 'بازگشت',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await apiDelete(`/api/roles/${role.id}`)
      setRoles((rs) => rs.filter((r) => r.id !== role.id))
      toast.success('نقش حذف شد')
    } catch (e) {
      toast.error('حذف نقش ناموفق بود')
    }
  }

  async function createOrUpdateUser() {
    const payload: any = {
      username: (userForm.username ?? '').trim(),
      full_name: (userForm.full_name ?? '').trim() || null,
      email: (userForm.email ?? '').trim() || null,
      role_id: userForm.role_id ?? null,
    }
    if (!payload.username) {
      toast.warning('نام کاربری الزامی است')
      return
    }
    try {
      if (userForm.id) {
        const updated = await apiPatch<User>(`/api/users/${userForm.id}`, payload)
        setUsers((us) => us.map((u) => (u.id === updated.id ? updated : u)))
        toast.success('کاربر بروزرسانی شد')
      } else {
        const created = await apiPost<User>('/api/users', payload)
        setUsers((us) => [created, ...us])
        toast.success('کاربر ایجاد شد')
      }
      setUserForm({ username: '', full_name: '', email: '', role_id: null })
    } catch (e) {
      toast.error('ثبت کاربر ناموفق بود')
    }
  }

  async function saveUserRole(userId: number, roleId: number | null) {
    try {
      await apiPatch(`/api/users/${userId}`, { role_id: roleId })
      setUsers((us) => us.map((u) => (u.id === userId ? { ...u, role_id: roleId } : u)))
      toast.success('نقش کاربر بروزرسانی شد')
    } catch (e) {
      toast.error('ذخیره نقش ناموفق بود')
    }
  }

  async function saveUserPerms(userId: number) {
    if (permSaveTimers.current[userId]) {
      window.clearTimeout(permSaveTimers.current[userId])
      delete permSaveTimers.current[userId]
    }
    setUserPermAutoSave((prev) => ({ ...prev, [userId]: 'saving' }))
    try {
      const targetUser = usersRef.current.find((u) => u.id === userId)
      if (targetUser && targetUser.role_id) {
        const selected = userPermsRef.current[userId] || {}
        const permIds = Object.entries(selected)
          .filter(([, v]) => !!v)
          .map(([k]) => Number(k))
        await apiPost(`/api/roles/${targetUser.role_id}/permissions`, permIds)
        setUserPermAutoSave((prev) => ({ ...prev, [userId]: 'saved' }))
        window.setTimeout(() => {
          setUserPermAutoSave((prev) => ({ ...prev, [userId]: 'idle' }))
        }, 2000)
      } else {
        setUserPermAutoSave((prev) => ({ ...prev, [userId]: 'error' }))
      }
    } catch (e) {
      setUserPermAutoSave((prev) => ({ ...prev, [userId]: 'error' }))
      toast.error('ثبت مجوزها ناموفق بود')
    }
  }

  async function saveSmsSettings() {
    if (smsSettingsTimer.current) {
      window.clearTimeout(smsSettingsTimer.current)
      smsSettingsTimer.current = null
    }
    setSmsSettingsStatus('saving')
    try {
      const current = smsSettingsRef.current
      const kv: Record<string, string> = {}
      if (current.api_key) kv['smsir_api_key'] = String(current.api_key)
      if (current.sender) kv['smsir_line_number'] = String(current.sender)
      if ((current as any).otp_template_id)
        kv['smsir_otp_template_id'] = String((current as any).otp_template_id)
      kv['smsir_enabled'] = String((current.provider ?? '').toLowerCase() === 'sms.ir')
      for (const [key, value] of Object.entries(kv)) {
        await apiPut(`/api/admin/settings/${key}`, { value })
      }
      setSmsSettingsStatus('saved')
      scheduleAutoSaveIdleReset(setSmsSettingsStatus)
    } catch (e) {
      setSmsSettingsStatus('error')
    }
  }

  async function sendTestSms() {
    setSavingSms(true)
    try {
      if (
        (smsSettings.provider ?? '').toLowerCase() === 'sms.ir' &&
        (smsSettings.api_key || '').length > 0
      ) {
        const res = await apiPost<any>('/api/smsir/test-otp', { mobile: testSmsTo, code: '123456' })
        const msg = res?.detail ? 'ارسال OTP (sms.ir) انجام شد' : 'ارسال OTP انجام شد'
        toast.success(msg)
      } else {
        // برای درگاه‌های عمومی یا زمانی که sms.ir تنظیم نشده، از تست عمومی استفاده کن
        const res = await apiPost<{ sent?: boolean; detail?: string }>('/api/sms/test', {
          mobile: testSmsTo,
          message: testSmsText,
        })
        toast.success(res?.detail || 'پیام تستی ارسال شد')
      }
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'ارسال پیام تستی ناموفق بود.'
      toast.error(msg)
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
      const fallback = res?.detail || (res?.sent ? 'پیام ارسال شد' : 'ارسال ناموفق بود')
      if (res?.sent === false) {
        toast.error(fallback)
      } else {
        toast.success(fallback)
      }
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'ارسال عمومی پیامک ناموفق بود.'
      toast.error(msg)
    } finally {
      setSavingSms(false)
    }
  }

  function saveUserSms(userId: number) {
    setSavingUserSmsId(userId)
    // Backend does not currently expose per-user SMS prefs update endpoint; no-op for now
    setSavingUserSmsId(null)
  }

  return (
    <ModulePage eyebrow="Access Control" title="کاربران" description="مدیریت کاربران، نقش‌ها، مجوزها و گزارش فعالیت">
    <div className={`${retroPanelPadded} space-y-6 min-h-[50vh]`}>
      <div className="space-y-1">
        <p className={`${retroHeading} text-[#1f2e3b]`}>کاربران و دسترسی‌ها</p>
        <p className={`${retroMuted}`}>مدیریت کاربران، نقش‌ها، مجوزها و اعلان‌های پیامکی</p>
        {error ? <div className={`${retroBadge} mt-2`}>خطا: {error}</div> : null}
        {loading && (
          <div className="mt-2 space-y-3">
            <SkeletonText lines={2} />
            <SkeletonBlock height={80} />
          </div>
        )}
      </div>

      {/* تأیید هویت و پروفایل عمومی */}
      <section className={`${retroPanel} space-y-3`}>
        <div className="space-y-1">
          <p className={`${retroHeading} text-[#1f2e3b]`}>تأیید هویت و پروفایل عمومی</p>
          <p className={`${retroMuted}`}>
            سه‌مرحله‌ای: موبایل → هویت ملی (Shahkar3) → توانمندسازی کسب‌وکار
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* مرحله ۱: موبایل (OTP) - از قبل در سیستم موجود است */}
          <div className="space-y-2">
            <p className={retroBadge}>مرحله ۱: موبایل (OTP)</p>
            <p className={`${retroMuted}`}>ورود/ثبت‌نام با OTP؛ برای دمو فعال است.</p>
          </div>
          {/* مرحله ۲: هویت ملی (Shahkar3) */}
          <div className="space-y-2">
            <p className={retroBadge}>مرحله ۲: هویت ملی</p>
            <div className="grid grid-cols-1 gap-2">
              <input
                className="input w-full"
                placeholder="شماره موبایل (09xxxxxxxxx)"
                id="verify_mobile"
              />
              <input className="input w-full" placeholder="کد ملی" id="verify_national_id" />
              <button
                className={retroButton}
                onClick={async () => {
                  try {
                    const mobile =
                      (
                        document.getElementById('verify_mobile') as HTMLInputElement
                      )?.value?.trim() || ''
                    const nid =
                      (
                        document.getElementById('verify_national_id') as HTMLInputElement
                      )?.value?.trim() || ''
                    if (!mobile || !nid) {
                      toast.warning('موبایل و کد ملی الزامی است')
                      return
                    }
                    await apiPost('/api/papi/proxy/api/sw1/shahkar3', { mobile, national_id: nid })
                    toast.success('درخواست Shahkar3 ارسال شد')
                  } catch (e: any) {
                    toast.error(e?.message || 'ارسال ناموفق بود')
                  }
                }}
              >
                ارسال Shahkar3
              </button>
            </div>
          </div>
          {/* مرحله ۳: توانمندسازی کسب‌وکار */}
          <div className="space-y-2">
            <p className={retroBadge}>مرحله ۳: کسب‌وکار و مالی</p>
            <div className="grid grid-cols-1 gap-2">
              <input className="input w-full" placeholder="شناسه کسب‌وکار/مجوز" id="biz_license" />
              <button
                className={retroButton}
                onClick={async () => {
                  try {
                    const lic =
                      (document.getElementById('biz_license') as HTMLInputElement)?.value?.trim() ||
                      ''
                    if (!lic) {
                      toast.warning('شناسه/مجوز الزامی است')
                      return
                    }
                    await apiPost('/api/papi/proxy/api/sw1/VideoMatch', { license: lic })
                    await apiPost('/api/papi/proxy/api/sw1/License', { license: lic })
                    toast.success('درخواست‌های مرحله ۳ ارسال شد')
                  } catch (e: any) {
                    toast.error(e?.message || 'ارسال ناموفق بود')
                  }
                }}
              >
                ارسال VideoMatch/License
              </button>
            </div>
          </div>
        </div>
        <p className={`${retroMuted}`}>
          نکته: برای کار با این سرویس‌ها لازم است API Key در «تنظیمات سیستم → PApi/SApi» ذخیره شده
          باشد.
        </p>
      </section>
      <section className={`${retroPanel} space-y-3`}>
        <div className="space-y-1">
          <p className={`${retroHeading} text-[#1f2e3b]`}>نقش‌ها</p>
          <p className={`${retroMuted}`}>مدیریت، جست‌وجو و ویرایش نقش‌ها</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className="input w-full"
            placeholder="نام نقش"
            value={roleForm.name}
            onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="input w-full"
            placeholder="توضیح"
            value={roleForm.description}
            onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-2">
            <button className={retroButton} onClick={createOrUpdateRole}>
              {roleForm.id ? 'ویرایش نقش' : 'ایجاد نقش'}
            </button>
            {roleForm.id ? (
              <button
                className={retroButton}
                onClick={() => setRoleForm({ name: '', description: '' })}
              >
                انصراف
              </button>
            ) : null}
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
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.description}</td>
                <td className="whitespace-nowrap">
                  <button
                    className={retroButton}
                    onClick={() =>
                      setRoleForm({ id: r.id, name: r.name, description: r.description })
                    }
                  >
                    ویرایش
                  </button>
                  <button className={retroButton} onClick={() => deleteRole(r)}>
                    حذف
                  </button>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {summaryCards.map((card) => (
            <div key={card.key} className={`${retroPanel} p-4 space-y-1`}>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--retro-muted-text)]">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-[#1f2e3b]">
                {formatNumberFa(card.value)}
              </p>
              <p className={`${retroMuted} text-xs`}>{card.helper}</p>
            </div>
          ))}
        </div>
        {true ? (
          <div className={`${retroPanel} p-4 space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={`${retroHeading} text-base text-[var(--retro-table-header-text)]`}>
                  ویژگی‌های فعال NFT
                </p>
                <p className={`${retroMuted} text-xs`}>
                  این لیست بر اساس دارایی‌های NFT سازمان ساخته می‌شود.
                </p>
              </div>
              <span className={retroBadge}>
                NFT فعال · {formatNumberFa(orgFeatures?.nft_count ?? 0)}
              </span>
            </div>
            {orgFeaturesError ? <p className={`${retroMuted} text-xs`}>{orgFeaturesError}</p> : null}
            <div className="flex flex-wrap gap-2">
              {(orgFeatures?.features ?? []).map((feature) => (
                <span
                  key={feature}
                  className="text-xs px-3 py-1 rounded-full border border-[var(--retro-border)] bg-[var(--retro-panel-bg)]"
                >
                  {feature}
                </span>
              ))}
              {(!orgFeatures?.features || orgFeatures.features.length === 0) && (
                <span className={retroMuted}>هیچ ویژگی فعالی گزارش نشده است.</span>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {ORG_FEATURE_FLAGS.map((flag) => {
                const enabled = !!orgFeatures?.[flag.key]
                return (
                  <div
                    key={flag.key}
                    className={`${
                      enabled
                        ? 'bg-[var(--retro-button-bg)] text-[var(--retro-button-text)] border-[var(--retro-button-border)]'
                        : 'bg-[var(--retro-panel-bg)] text-[var(--retro-muted-text)] border-[var(--retro-border)]'
                    } border rounded-md px-3 py-2 flex flex-col gap-1 transition`}
                  >
                    <span className="text-sm font-semibold">{flag.label}</span>
                    <span className="text-[11px]">{flag.helper}</span>
                    <span className="text-[10px] uppercase tracking-[0.3em]">
                      {enabled ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
        {true ? (
          <div className={`${retroPanel} p-4 space-y-2`}>
            <div className="flex items-center justify-between">
              <p className={`${retroHeading} text-base text-[var(--retro-table-header-text)]`}>
                دارایی‌های NFT شما
              </p>
              <span className={`${retroBadge}`}>توکن · {formatNumberFa(userNfts.length)}</span>
            </div>
            {userNftsError ? <p className={`${retroMuted} text-xs`}>{userNftsError}</p> : null}
            {userNfts.length === 0 ? (
              <p className={retroMuted}>هیچ دارایی NFT برای این کاربر ثبت نشده است.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className={retroTableHeader}>
                    <th>توکن</th>
                    <th>زنجیره</th>
                    <th>قرارداد</th>
                    <th>وضعیت</th>
                    <th>ویژگی‌ها</th>
                  </tr>
                </thead>
                <tbody>
                  {userNfts.map((asset) => {
                    const featureList = Array.isArray(asset.metadata?.features)
                      ? asset.metadata?.features
                      : []
                    return (
                      <tr key={asset.token_id}>
                        <td className="font-mono text-[11px]">{asset.token_id}</td>
                        <td>{asset.chain ?? '—'}</td>
                        <td className="font-mono text-[11px]">{asset.contract_address ?? '—'}</td>
                        <td>{asset.is_active ? 'فعال' : 'غیرفعال'}</td>
                        <td>
                          {featureList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {featureList.map((f: string) => (
                                <span key={f} className="px-2 py-0.5 border rounded-full text-[10px]">
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className={retroMuted}>بدون ویژگی</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={filterPillClass(userStatusFilter === option.key)}
                onClick={() => handleStatusFilterChange(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={filterPillClass(userRoleFilter === 'all')}
              onClick={() => handleRoleFilterChange('all')}
            >
              همه نقش‌ها · {formatNumberFa(userStats.total)}
            </button>
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                className={filterPillClass(userRoleFilter === role.id)}
                onClick={() => handleRoleFilterChange(role.id)}
              >
                {role.name} · {formatNumberFa(userRoleCounts.get(role.id) ?? 0)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="retro-input-label" htmlFor="user_search">
            جستجو
            <input
              id="user_search"
              className="input w-full"
              placeholder="نام، ایمیل یا موبایل"
              value={userSearch}
              onChange={(e) => handleUserSearch(e.target.value)}
            />
          </label>
          <div className={`${retroPanel} p-3 flex items-center justify-between text-xs text-[var(--retro-muted-text)]`}>
            <span>نتیجه</span>
            <span>{formatNumberFa(filteredUsers.length)} کاربر</span>
          </div>
          <button
            className={`${retroButton} ${hasUserFilters ? '' : 'opacity-40 cursor-not-allowed'}`}
            onClick={resetUserFilters}
            disabled={!hasUserFilters}
          >
            حذف فیلترها
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            className="input w-full"
            placeholder="نام کاربری"
            value={userForm.username}
            onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
          />
          <input
            className="input w-full"
            placeholder="نام کامل"
            value={userForm.full_name ?? ''}
            onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
          />
          <input
            className="input w-full"
            placeholder="ایمیل"
            value={userForm.email ?? ''}
            onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
          />
          <label className="retro-input-label" htmlFor="user_role">
            نقش کاربر
            <select
              id="user_role"
              className="input w-full"
              value={userForm.role_id ?? ''}
              onChange={(e) =>
                setUserForm((f) => ({
                  ...f,
                  role_id: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            >
              <option value="">بدون نقش</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button className={retroButton} onClick={createOrUpdateUser}>
              {userForm.id ? 'ویرایش کاربر' : 'ایجاد کاربر'}
            </button>
            {userForm.id ? (
              <button
                className={retroButton}
                onClick={() =>
                  setUserForm({ username: '', full_name: '', email: '', role_id: null })
                }
              >
                انصراف
              </button>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-2">
          <label className="retro-input-label" htmlFor="invite_email">
            ایمیل دعوت
            <input
              id="invite_email"
              className="input w-full"
              placeholder="invite@example.com"
              onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
              value={userForm.email ?? ''}
            />
          </label>
          <label className="retro-input-label" htmlFor="invite_mobile">
            موبایل دعوت
            <input
              id="invite_mobile"
              className="input w-full"
              placeholder="0912xxxxxxx"
              onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
              value={userForm.username}
            />
          </label>
          <label className="retro-input-label" htmlFor="invite_role">
            نقش دعوت
            <select
              id="invite_role"
              className="input w-full"
              value={userForm.role_id ?? ''}
              onChange={(e) =>
                setUserForm((f) => ({
                  ...f,
                  role_id: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            >
              <option value="">انتخاب نقش</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 items-end md:col-span-2">
            <button
              className={retroButton}
              onClick={async () => {
                try {
                  const payload: any = {
                    email: (userForm.email ?? '').trim() || undefined,
                    mobile: (userForm.username ?? '').trim() || undefined,
                    role_id: userForm.role_id ?? undefined,
                  }
                  await apiPost('/api/admin/users/invite', payload)
                  toast.success('دعوت ارسال شد')
                } catch (e) {
                  toast.error('ارسال دعوت ناموفق بود')
                }
              }}
            >
              ارسال دعوت
            </button>
            <button
              className={retroButton}
              onClick={() => setUserForm({ username: '', full_name: '', email: '', role_id: null })}
            >
              پاک کردن
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className={retroTableHeader}>
              <th>
                <button
                  className="underline"
                  onClick={() => {
                    setUserSortKey('id')
                    setUserSortDir((d) =>
                      userSortKey === 'id' ? (d === 'asc' ? 'desc' : 'asc') : 'asc',
                    )
                  }}
                >
                  ID
                </button>
              </th>
              <th>
                <button
                  className="underline"
                  onClick={() => {
                    setUserSortKey('username')
                    setUserSortDir((d) =>
                      userSortKey === 'username' ? (d === 'asc' ? 'desc' : 'asc') : 'asc',
                    )
                  }}
                >
                  نام کاربری
                </button>
              </th>
              <th>
                <button
                  className="underline"
                  onClick={() => {
                    setUserSortKey('full_name')
                    setUserSortDir((d) =>
                      userSortKey === 'full_name' ? (d === 'asc' ? 'desc' : 'asc') : 'asc',
                    )
                  }}
                >
                  نام کامل
                </button>
              </th>
              <th>
                <button
                  className="underline"
                  onClick={() => {
                    setUserSortKey('email')
                    setUserSortDir((d) =>
                      userSortKey === 'email' ? (d === 'asc' ? 'desc' : 'asc') : 'asc',
                    )
                  }}
                >
                  ایمیل
                </button>
              </th>
              <th>
                <button
                  className="underline"
                  onClick={() => {
                    setUserSortKey('role_id')
                    setUserSortDir((d) =>
                      userSortKey === 'role_id' ? (d === 'asc' ? 'desc' : 'asc') : 'asc',
                    )
                  }}
                >
                  نقش
                </button>
              </th>
              <th>
                <button
                  className="underline"
                  onClick={() => {
                    setUserSortKey('is_active')
                    setUserSortDir((d) =>
                      userSortKey === 'is_active' ? (d === 'asc' ? 'desc' : 'asc') : 'asc',
                    )
                  }}
                >
                  وضعیت
                </button>
              </th>
              <th>اعلان‌های پیامک</th>
              <th>تخصیص مجوزها</th>
              <th>وضعیت ذخیره</th>
              <th>ویرایش</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const dataset = filteredUsers
              const sorted = [...dataset].sort((a, b) => {
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
              if (view.length === 0) {
                return (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-[#7a6b4f]">
                      {hasUserFilters
                        ? 'کاربری مطابق فیلترهای فعلی یافت نشد.'
                        : 'کاربری برای نمایش وجود ندارد.'}
                    </td>
                  </tr>
                )
              }
              return view.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="input w-full"
                      aria-label={`نقش کاربر ${u.username}`}
                      value={u.role_id ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value)
                        void saveUserRole(u.id, val)
                      }}
                    >
                      <option value="">بدون نقش</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{u.is_active ? 'فعال' : 'غیرفعال'}</td>
                  <td>
                    {(() => {
                      const pref = userSms[u.id] ?? {
                        enable_notifications: true,
                        notifications: {
                          invoice_finalize: true,
                          payment_received: true,
                          cheque_due_reminder: true,
                          fiscal_year_close: false,
                        },
                        schedule: { daily_reminder_hour: 9, timezone: 'Asia/Tehran' },
                      }
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-2">
                            <input
                              className="retro-checkbox"
                              type="checkbox"
                              aria-label={`فعالسازی اعلان‌ها برای ${u.username}`}
                              checked={!!pref.enable_notifications}
                              onChange={(e) =>
                                setUserSms((s) => ({
                                  ...s,
                                  [u.id]: { ...pref, enable_notifications: e.target.checked },
                                }))
                              }
                            />
                            <span>فعال</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              className="retro-checkbox"
                              type="checkbox"
                              aria-label={`اعلان فاکتور برای ${u.username}`}
                              checked={!!pref.notifications?.invoice_finalize}
                              onChange={(e) =>
                                setUserSms((s) => ({
                                  ...s,
                                  [u.id]: {
                                    ...pref,
                                    notifications: {
                                      ...pref.notifications,
                                      invoice_finalize: e.target.checked,
                                    },
                                  },
                                }))
                              }
                            />
                            <span>فاکتور</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              className="retro-checkbox"
                              type="checkbox"
                              aria-label={`اعلان پرداخت برای ${u.username}`}
                              checked={!!pref.notifications?.payment_received}
                              onChange={(e) =>
                                setUserSms((s) => ({
                                  ...s,
                                  [u.id]: {
                                    ...pref,
                                    notifications: {
                                      ...pref.notifications,
                                      payment_received: e.target.checked,
                                    },
                                  },
                                }))
                              }
                            />
                            <span>پرداخت</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              className="retro-checkbox"
                              type="checkbox"
                              aria-label={`یادآور چک برای ${u.username}`}
                              checked={!!pref.notifications?.cheque_due_reminder}
                              onChange={(e) =>
                                setUserSms((s) => ({
                                  ...s,
                                  [u.id]: {
                                    ...pref,
                                    notifications: {
                                      ...pref.notifications,
                                      cheque_due_reminder: e.target.checked,
                                    },
                                  },
                                }))
                              }
                            />
                            <span>چک</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              className="retro-checkbox"
                              type="checkbox"
                              aria-label={`هشدار بستن سال مالی برای ${u.username}`}
                              checked={!!pref.notifications?.fiscal_year_close}
                              onChange={(e) =>
                                setUserSms((s) => ({
                                  ...s,
                                  [u.id]: {
                                    ...pref,
                                    notifications: {
                                      ...pref.notifications,
                                      fiscal_year_close: e.target.checked,
                                    },
                                  },
                                }))
                              }
                            />
                            <span>سال مالی</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label
                              className="retro-control-inline-label flex flex-col gap-1"
                              htmlFor={`user_sms_hour_${u.id}`}
                            >
                              ساعت ارسال
                              <input
                                id={`user_sms_hour_${u.id}`}
                                className="input"
                                type="number"
                                min={0}
                                max={23}
                                placeholder="0-23"
                                value={pref.schedule?.daily_reminder_hour ?? 9}
                                onChange={(e) =>
                                  setUserSms((s) => ({
                                    ...s,
                                    [u.id]: {
                                      ...pref,
                                      schedule: {
                                        ...pref.schedule,
                                        daily_reminder_hour: Number(e.target.value),
                                      },
                                    },
                                  }))
                                }
                              />
                            </label>
                            <label
                              className="retro-control-inline-label flex flex-col gap-1"
                              htmlFor={`user_sms_timezone_${u.id}`}
                            >
                              منطقه زمانی
                              <input
                                id={`user_sms_timezone_${u.id}`}
                                className="input"
                                placeholder="Asia/Tehran"
                                value={pref.schedule?.timezone ?? 'Asia/Tehran'}
                                onChange={(e) =>
                                  setUserSms((s) => ({
                                    ...s,
                                    [u.id]: {
                                      ...pref,
                                      schedule: { ...pref.schedule, timezone: e.target.value },
                                    },
                                  }))
                                }
                              />
                            </label>
                          </div>
                          {/* ذخیره SMS کاربر فعلاً غیرفعال است چون اندپوینت نوشتن در بک‌اند وجود ندارد */}
                        </div>
                      )
                    })()}
                  </td>
                  <td>
                    <details className="rounded-sm border border-[#d7caa4] p-2">
                      <summary className="cursor-pointer text-sm">مشاهده/ویرایش مجوزها</summary>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((p) => {
                          const current = !!userPerms[u.id]?.[p.id]
                          return (
                            <label key={p.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={current}
                                onChange={(e) =>
                                  updateUserPermSelection(u.id, p.id, e.target.checked)
                                }
                              />
                              {p.name}
                            </label>
                          )
                        })}
                      </div>
                    </details>
                  </td>
                  <td>
                    <span className="text-xs text-[#6b5c3b]">
                      {describeAutoSaveState(userPermAutoSave[u.id] ?? 'idle')}
                    </span>
                  </td>
                  <td>
                    <button
                      className={retroButton}
                      onClick={() =>
                        setUserForm({
                          id: u.id,
                          username: u.username,
                          full_name: u.full_name ?? '',
                          email: u.email ?? '',
                          role_id: u.role_id,
                        })
                      }
                    >
                      ویرایش
                    </button>
                  </td>
                </tr>
              ))
            })()}
          </tbody>
        </table>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm">صفحه {userPage}</div>
          <div className="flex items-center gap-2">
            <label className="text-sm flex items-center gap-2" htmlFor="user_page_size">
              تعداد در صفحه
              <select
                id="user_page_size"
                className="input"
                value={userPageSize}
                onChange={(e) => {
                  setUserPageSize(Number(e.target.value))
                  setUserPage(1)
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button className={retroButton} onClick={() => setUserPage((p) => Math.max(1, p - 1))}>
              قبلی
            </button>
            <button className={retroButton} onClick={() => setUserPage((p) => p + 1)}>
              بعدی
            </button>
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
            {perms.map((p) => (
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
          <input
            className="input w-full"
            placeholder="فیلتر کاربر"
            value={activityFilter.user ?? ''}
            onChange={(e) => setActivityFilter((f) => ({ ...f, user: e.target.value }))}
          />
          <input
            className="input w-full"
            placeholder="فیلتر مسیر"
            value={activityFilter.path ?? ''}
            onChange={(e) => setActivityFilter((f) => ({ ...f, path: e.target.value }))}
          />
          <label className="retro-input-label" htmlFor="activity_method_filter">
            متد
            <select
              id="activity_method_filter"
              className="input w-full"
              value={activityFilter.method ?? ''}
              onChange={(e) =>
                setActivityFilter((f) => ({ ...f, method: e.target.value || undefined }))
              }
            >
              <option value="">همه متدها</option>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
          </label>
          <input
            className="input w-full"
            placeholder="وضعیت (مثلا 200)"
            value={activityFilter.status ?? ''}
            onChange={(e) => setActivityFilter((f) => ({ ...f, status: e.target.value }))}
          />
          <div className="flex items-center justify-end">
            <button className={retroButton} onClick={exportActivitiesCsv}>
              خروجی CSV
            </button>
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
            {pagedActivities.map((a) => (
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
            <label className="text-sm flex items-center gap-2" htmlFor="activity_page_size">
              نمایش
              <select
                id="activity_page_size"
                className="input"
                value={activityPageSize}
                onChange={(e) => {
                  setActivityPageSize(Number(e.target.value))
                  setActivityPage(1)
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={retroButton}
              disabled={activityPage === 1}
              onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
            >
              قبلی
            </button>
            <span className={retroMuted}>صفحه {activityPage}</span>
            <button
              className={retroButton}
              disabled={activityPage * activityPageSize >= filteredActivities.length}
              onClick={() => setActivityPage((p) => p + 1)}
            >
              بعدی
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className={retroButton} onClick={() => window.print()}>
              پرینت
            </button>
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
              <label className="retro-input-label" htmlFor="sms_provider_primary">
                درگاه پیامک
                <select
                  id="sms_provider_primary"
                  className="input w-full"
                  value={smsSettings.provider}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({ ...s, provider: e.target.value }))
                  }
                >
                  <option value="sms.ir">sms.ir</option>
                  <option value="ippanel">IPPanel</option>
                </select>
              </label>
              <input
                className="input w-full"
                placeholder="API Key"
                value={smsSettings.api_key ?? ''}
                onChange={(e) =>
                  updateSmsSettings((s) => ({ ...s, api_key: e.target.value }))
                }
              />
              <input
                className="input w-full"
                placeholder="شماره ارسال کننده"
                value={smsSettings.sender ?? ''}
                onChange={(e) =>
                  updateSmsSettings((s) => ({ ...s, sender: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <p className={retroBadge}>اعلان‌ها</p>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  className="retro-checkbox"
                  type="checkbox"
                  checked={!!smsSettings.enable_notifications}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({ ...s, enable_notifications: e.target.checked }))
                  }
                />
                فعال‌سازی اعلان‌ها
              </label>
              <label className="flex items-center gap-2">
                <input
                  className="retro-checkbox"
                  type="checkbox"
                  checked={!!smsSettings.notifications?.invoice_finalize}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({
                      ...s,
                      notifications: { ...s.notifications, invoice_finalize: e.target.checked },
                    }))
                  }
                />
                اعلان نهایی‌سازی فاکتور
              </label>
              <label className="flex items-center gap-2">
                <input
                  className="retro-checkbox"
                  type="checkbox"
                  checked={!!smsSettings.notifications?.payment_received}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({
                      ...s,
                      notifications: { ...s.notifications, payment_received: e.target.checked },
                    }))
                  }
                />
                اعلان دریافت پرداخت
              </label>
              <label className="flex items-center gap-2">
                <input
                  className="retro-checkbox"
                  type="checkbox"
                  checked={!!smsSettings.notifications?.cheque_due_reminder}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({
                      ...s,
                      notifications: { ...s.notifications, cheque_due_reminder: e.target.checked },
                    }))
                  }
                />
                یادآور سررسید چک
              </label>
              <label className="flex items-center gap-2">
                <input
                  className="retro-checkbox"
                  type="checkbox"
                  checked={!!smsSettings.notifications?.fiscal_year_close}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({
                      ...s,
                      notifications: { ...s.notifications, fiscal_year_close: e.target.checked },
                    }))
                  }
                />
                اعلان بستن سال مالی
              </label>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className={retroBadge}>زمان‌بندی یادآورها</p>
            <div className="mt-2 space-y-2">
              <label className="retro-input-label" htmlFor="sms_daily_hour">
                ساعت یادآور روزانه
                <input
                  id="sms_daily_hour"
                  className="input w-full"
                  type="number"
                  min={0}
                  max={23}
                  value={smsSettings.schedule?.daily_reminder_hour ?? 9}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({
                      ...s,
                      schedule: { ...s.schedule, daily_reminder_hour: Number(e.target.value) },
                    }))
                  }
                  placeholder="مثال: 9"
                />
              </label>
              <label className="retro-input-label" htmlFor="sms_timezone">
                منطقه زمانی
                <input
                  id="sms_timezone"
                  className="input w-full"
                  placeholder="مثال: Asia/Tehran"
                  value={smsSettings.schedule?.timezone ?? 'Asia/Tehran'}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({
                      ...s,
                      schedule: { ...s.schedule, timezone: e.target.value },
                    }))
                  }
                />
              </label>
            </div>
          </div>
          <div>
            <p className={retroBadge}>ارسال تست (SMS.ir)</p>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="retro-input-label" htmlFor="sms_test_provider">
                  انتخاب درگاه تستی
                  <select
                    id="sms_test_provider"
                    className="input w-full"
                    value={smsSettings.provider ?? ''}
                    onChange={(e) =>
                      updateSmsSettings((s) => ({ ...s, provider: e.target.value }))
                    }
                  >
                    <option value="">انتخاب درگاه…</option>
                    <option value="sms.ir">SMS.ir</option>
                    <option value="mock">Mock (توسعه)</option>
                  </select>
                </label>
                <input
                  className="input w-full"
                  placeholder="شماره خط ارسال (line_number)"
                  value={smsSettings.sender ?? ''}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({ ...s, sender: e.target.value }))
                  }
                />
                <input
                  className="input w-full"
                  placeholder="API Key"
                  value={smsSettings.api_key ?? ''}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({ ...s, api_key: e.target.value }))
                  }
                />
                <input
                  className="input w-full"
                  placeholder="Secret Key"
                  value={(smsSettings as any).secret_key ?? ''}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({ ...s, secret_key: e.target.value }))
                  }
                />
                <input
                  className="input w-full"
                  placeholder="OTP Template ID (sms.ir)"
                  value={(smsSettings as any).otp_template_id ?? ''}
                  onChange={(e) =>
                    updateSmsSettings((s) => ({ ...s, otp_template_id: e.target.value }))
                  }
                />
              </div>
              <label className="retro-input-label" htmlFor="sms_test_message">
                متن پیام تستی
                <textarea
                  id="sms_test_message"
                  className="input w-full"
                  rows={3}
                  placeholder="متن پیام برای ارسال"
                  value={testSmsText}
                  onChange={(e) => setTestSmsText(e.target.value)}
                />
              </label>
              <input
                className="input w-full"
                placeholder="شماره گیرنده (مثال: 0912xxxxxxx)"
                value={testSmsTo}
                onChange={(e) => setTestSmsTo(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-[#6b5c3b]">
                  {describeAutoSaveState(smsSettingsStatus)}
                </span>
                <div className="flex gap-2">
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
        </div>
      </section>
    </div>
    </ModulePage>
  )
}
