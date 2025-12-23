import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiDelete, apiPatch } from '../../services/api'
import {
  retroPanel,
  retroPanelPadded,
  retroHeading,
  retroBadge,
  retroButton,
  retroMuted,
} from '../../components/retroTheme'
import ModulePage from '../../components/layout/ModulePage'
import { getAccessToken } from '../../services/auth'
import { toast } from '../../utils/toast'
import { useConfirmDialog } from '../../context/ConfirmDialogContext'

type ActivityLog = {
  id: number
  created_at?: string | null
  username?: string | null
  path?: string | null
  method?: string | null
  status_code?: number | null
  detail?: string | null
}
type SettingKV = { key: string; value: string; category?: string }

type UserPartySyncApiResponse = {
  total_users: number
  mobile_users: number
  missing_mobile_users: number
  linked_users: number
  linked_parties: number
  orphan_parties_count: number
  coverage_percent: number
  unlinked_users_total: number
  orphan_parties_total: number
  sample_limit: number
  generated_at: string
  top_unlinked_users: Array<{ id: number; username?: string | null; mobile?: string | null }>
  top_orphan_parties: Array<{ id: string; name?: string | null; mobile?: string | null }>
}

interface UserPartySyncStats {
  totalUsers: number
  mobileUsers: number
  missingMobileUsers: number
  linkedUsers: number
  linkedParties: number
  orphanPartiesCount: number
  coveragePercent: number
  unlinkedUsersTotal: number
  orphanPartiesTotal: number
  sampleLimit: number
  generatedAt: string
  topUnlinkedUsers: Array<{ id: number; username: string; mobile?: string | null }>
  topOrphanParties: Array<{ id: string; name: string; mobile?: string | null }>
}

export default function DevConsole() {
  const [version, setVersion] = useState<string>('')
  const [health, setHealth] = useState<string>('')
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [settings, setSettings] = useState<SettingKV[]>([])
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const [tokenInfo, setTokenInfo] = useState<{
    role?: string
    sub?: string
    exp?: number
    iat?: number
  } | null>(null)
  const [netUrl, setNetUrl] = useState('/api/version')
  const [netPing, setNetPing] = useState<{
    ms?: number
    status?: number
    ok?: boolean
    error?: string
  } | null>(null)
  // SMS Pro panel state
  const [smsProvider, setSmsProvider] = useState<'sms.ir' | 'ippanel' | 'mock'>('sms.ir')
  const [smsLine, setSmsLine] = useState('')
  const [smsApiKey, setSmsApiKey] = useState('')
  const [smsProfiles, setSmsProfiles] = useState<
    Array<{ name: string; provider: string; line: string; apiKey: string }>
  >([])
  const [newProfile, setNewProfile] = useState<{
    name: string
    provider: string
    line: string
    apiKey: string
  }>({ name: 'default', provider: 'sms.ir', line: '', apiKey: '' })
  const [smsRecipients, setSmsRecipients] = useState<string>('')
  const [smsMessage, setSmsMessage] = useState<string>('سلام! این یک تست است.')
  const [smsIrLines, setSmsIrLines] = useState<string[]>([])
  const [smsSelectedLine, setSmsSelectedLine] = useState<string>('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState<any>(null)
  const [smsHistory, setSmsHistory] = useState<any[]>([])
  const [smsPage, setSmsPage] = useState(1)
  const [smsLimit, setSmsLimit] = useState(20)
  const [smsStatusFilter, setSmsStatusFilter] = useState<string>('')
  const [smsProviderFilter, setSmsProviderFilter] = useState<string>('')
  const [smsQuery, setSmsQuery] = useState('')
  const [smsFrom, setSmsFrom] = useState('')
  const [smsTo, setSmsTo] = useState('')
  const [smsDaily, setSmsDaily] = useState<
    Array<{
      day: string
      sent: number
      failed: number
      delivered: number
      total: number
      avg_latency_ms: number
    }>
  >([])
  const confirmDialog = useConfirmDialog()
  const [userPartySyncStats, setUserPartySyncStats] = useState<UserPartySyncStats | null>(null)
  const [userPartySyncLoading, setUserPartySyncLoading] = useState(false)
  const [userPartySyncError, setUserPartySyncError] = useState<string | null>(null)
  const [userPartySampleLimit, setUserPartySampleLimit] = useState(5)
  const [userPartySyncGeneratedAt, setUserPartySyncGeneratedAt] = useState<string | null>(null)
  const userPartySampleOptions = [5, 10, 25, 50]
  const userPartyLastGenerated = userPartySyncStats?.generatedAt || userPartySyncGeneratedAt
  const userPartyUpdatedLabel = useMemo(() => {
    if (!userPartyLastGenerated) return ''
    return formatDateTime(userPartyLastGenerated)
  }, [userPartyLastGenerated])
  const userPartyCoverageProgress = userPartySyncStats ? Math.min(userPartySyncStats.coveragePercent, 100) : 0
  const userPartyCoverageGap = userPartySyncStats ? Math.max(0, 100 - userPartySyncStats.coveragePercent) : 0
  const userPartyPendingUsers = userPartySyncStats
    ? Math.max(userPartySyncStats.mobileUsers - userPartySyncStats.linkedUsers, 0)
    : 0
  const userPartyUnlinkedDisplayed = userPartySyncStats?.topUnlinkedUsers.length ?? 0
  const userPartyOrphanDisplayed = userPartySyncStats?.topOrphanParties.length ?? 0

  const loadUserPartySync = useCallback(
    async (limitOverride?: number) => {
      const effectiveLimit = typeof limitOverride === 'number' ? limitOverride : userPartySampleLimit
    setUserPartySyncLoading(true)
    setUserPartySyncError(null)
    try {
        const stats = await apiGet<UserPartySyncApiResponse>(
          `/api/admin/analytics/user-party-sync?sample_limit=${effectiveLimit}`,
        )
        setUserPartySampleLimit(stats.sample_limit ?? effectiveLimit)
        setUserPartySyncGeneratedAt(stats.generated_at || null)
        setUserPartySyncStats({
          totalUsers: stats.total_users,
          mobileUsers: stats.mobile_users,
          missingMobileUsers: stats.missing_mobile_users,
          linkedUsers: stats.linked_users,
          linkedParties: stats.linked_parties,
          orphanPartiesCount: stats.orphan_parties_count,
          coveragePercent: stats.coverage_percent,
          unlinkedUsersTotal: stats.unlinked_users_total,
          orphanPartiesTotal: stats.orphan_parties_total,
          sampleLimit: stats.sample_limit ?? effectiveLimit,
          generatedAt: stats.generated_at || new Date().toISOString(),
          topUnlinkedUsers: stats.top_unlinked_users.map((u) => ({
            id: u.id,
            username: u.username || '—',
            mobile: u.mobile,
          })),
          topOrphanParties: stats.top_orphan_parties.map((p) => ({
            id: p.id,
            name: p.name || '—',
            mobile: p.mobile,
          })),
        })
      } catch (err: any) {
        setUserPartySyncError(err?.message || 'تحلیل همگام‌سازی ممکن نشد')
      } finally {
        setUserPartySyncLoading(false)
      }
    },
    [userPartySampleLimit],
  )

  const filtered = useMemo(() => {
    if (!q) return activity
    const qq = q.toLowerCase()
    return activity.filter(
      (a) =>
        (a.detail || '').toLowerCase().includes(qq) || (a.path || '').toLowerCase().includes(qq),
    )
  }, [activity, q])

  async function reloadAll() {
    try {
      setVersion(String((await apiGet<{ version?: string }>('/api/version')).version || ''))
    } catch {}
    try {
      const t0 = performance.now()
      const h = await apiGet<string>('/health')
      const t1 = performance.now()
      setHealth(h + ` (${Math.round(t1 - t0)}ms)`)
    } catch {}
    try {
      setActivity(await apiGet<ActivityLog[]>('/api/admin/activity?limit=200'))
    } catch {}
    try {
      setSettings(await apiGet<SettingKV[]>('/api/admin/settings'))
    } catch {}
    try {
      decodeToken()
    } catch {}
    try {
      const kv = await apiGet<Array<{ key: string; value: string | null }>>('/api/admin/settings')
      const getVal = (k: string) => kv.find((s) => s.key === k)?.value ?? ''
      const prov = String(getVal('sms_provider') || getVal('smsir_provider') || 'sms.ir')
      setSmsProvider(prov === 'ippanel' ? 'ippanel' : prov === 'mock' ? 'mock' : 'sms.ir')
      setSmsLine(String(getVal('smsir_line_number') || getVal('sms_sender') || ''))
      setSmsApiKey(String(getVal('smsir_api_key') || getVal('sms_api_key') || ''))
      const profilesRaw = String(getVal('sms_profiles') || '[]')
      try {
        setSmsProfiles(JSON.parse(profilesRaw || '[]'))
      } catch {
        setSmsProfiles([])
      }
    } catch {}
    try {
      await loadSmsHistory(1, smsLimit)
    } catch {}
    try {
      const m = await apiGet<{ days: number; points: any[] }>(`/api/sms/metrics/daily?days=14`)
      setSmsDaily(
        (m.points || []).map((p: any) => ({
          day: p.day,
          sent: p.ok || 0,
          failed: p.fail || 0,
          delivered: 0,
          total: (p.ok || 0) + (p.fail || 0),
          avg_latency_ms: p.avg_latency_ms || 0,
        })),
      )
    } catch {}
    try {
      const ln = await apiGet<{ items: string[] }>(`/api/sms/lines`)
      setSmsIrLines(ln.items || [])
    } catch {}
  }
  async function loadSmsHistory(page = smsPage, limit = smsLimit) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (smsStatusFilter) params.set('status', smsStatusFilter)
    if (smsProviderFilter) params.set('provider', smsProviderFilter)
    if (smsQuery) params.set('q', smsQuery)
    if (smsFrom) params.set('from', smsFrom)
    if (smsTo) params.set('to', smsTo)
    const h = await apiGet<{ items: any[]; total: number; page: number; limit: number }>(
      `/api/sms/history?${params.toString()}`,
    )
    setSmsHistory(h.items || [])
    setSmsPage(h.page || page)
    setSmsLimit(h.limit || limit)
  }
  function decodeToken() {
    const tok = getAccessToken()
    if (!tok) {
      setTokenInfo(null)
      return
    }
    const parts = tok.split('.')
    if (parts.length !== 3) {
      setTokenInfo(null)
      return
    }
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    const base = pad === 2 ? b64 + '==' : pad === 3 ? b64 + '=' : b64
    try {
      const payload = JSON.parse(atob(base))
      setTokenInfo({
        role: payload.role || payload['x-role'],
        sub: payload.sub,
        exp: payload.exp,
        iat: payload.iat,
      })
    } catch {
      setTokenInfo(null)
    }
  }

  async function pingUrl() {
    setNetPing(null)
    const start = performance.now()
    try {
      const resp = await fetch(netUrl, { method: 'GET' })
      const end = performance.now()
      setNetPing({ ms: Math.round(end - start), status: resp.status, ok: resp.ok })
    } catch (e: any) {
      const end = performance.now()
      setNetPing({
        ms: Math.round(end - start),
        status: 0,
        ok: false,
        error: String(e?.message || e),
      })
    }
  }

  async function sendSmsPro() {
    setSmsSending(true)
    setSmsResult(null)
    try {
      const mobiles = smsRecipients
        .split(/\s|,|;/)
        .map((x) => x.trim())
        .filter(Boolean)
      if (mobiles.length === 0) throw new Error('شماره‌ای وارد نشده است')
      if (!smsMessage.trim()) throw new Error('متن پیام خالی است')
      // Persist current provider and keys for convenience
      const payloads: Array<{ k: string; v: string }> = [
        { k: 'sms_provider', v: smsProvider },
        { k: 'smsir_line_number', v: smsLine },
        { k: 'smsir_api_key', v: smsApiKey },
      ]
      for (const p of payloads) {
        await apiPatch(`/api/admin/settings/${p.k}`, { value: p.v })
      }
      // Backend generic endpoint supports single mobile per request; send sequentially
      const results: any[] = []
      for (const m of mobiles) {
        const payload: any = { to: m, message: smsMessage }
        if (smsSelectedLine) payload.lineNumber = smsSelectedLine
        const res = await apiPost('/api/sms/send', payload)
        results.push({ mobile: m, res })
      }
      setSmsResult(results)
      toast.success('ارسال انجام شد؛ نتایج در پایین قابل مشاهده است')
    } catch (e: any) {
      setSmsResult({ error: e?.message || String(e) })
      toast.error(e?.message || 'ارسال ناموفق بود')
    } finally {
      setSmsSending(false)
    }
  }

  useEffect(() => {
    void reloadAll()
  }, [])

  useEffect(() => {
    void loadUserPartySync()
  }, [loadUserPartySync])

  async function saveSetting(k: string, v: string) {
    setSaving(true)
    try {
      await apiPatch(`/api/admin/settings/${k}`, { value: v })
      await reloadAll()
    } finally {
      setSaving(false)
    }
  }

  async function addSetting() {
    if (!newKey) return
    await saveSetting(newKey, newVal)
    setNewKey('')
    setNewVal('')
  }

  async function deleteSetting(k: string) {
    const ok = await confirmDialog({
      title: 'حذف تنظیم سیستم',
      message: `کلید ${k} حذف شود؟`,
      confirmText: 'حذف',
      cancelText: 'بازگشت',
      tone: 'danger',
    })
    if (!ok) return
    setSaving(true)
    try {
      await apiDelete(`/api/admin/settings/${k}`)
      await reloadAll()
      toast.success('تنظیم حذف شد')
    } catch (err: any) {
      toast.error(err?.message || 'حذف تنظیم ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function smokeSmsOtp() {
    try {
      const res = await apiPost('/api/smsir/test-otp', { mobile: '09120000000', code: '654321' })
      toast.success('نتیجه OTP: ' + JSON.stringify(res))
    } catch (e: any) {
      toast.error('خطای OTP: ' + (e?.message || 'نامشخص'))
    }
  }

  async function smokeSmsText() {
    try {
      const res = await apiPost('/api/sms/send', {
        mobile: '09120000000',
        message: 'سلام از DevConsole',
      })
      toast.success('نتیجه متن: ' + JSON.stringify(res))
    } catch (e: any) {
      toast.error('خطای متن: ' + (e?.message || 'نامشخص'))
    }
  }

  function openModule(hash: string) {
    if (typeof window === 'undefined') return
    const finalHash = hash.startsWith('#') ? hash : `#${hash}`
    window.location.hash = finalHash
  }

  async function copyToClipboard(value?: string | null) {
    if (!value) {
      toast.error('مقدار معتبری برای کپی وجود ندارد')
      return
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      toast.success('در کلیپ‌بورد قرار گرفت')
    } catch (err: any) {
      toast.error(err?.message || 'کپی ناموفق بود')
    }
  }

  function formatDateTime(iso?: string | null) {
    if (!iso) return ''
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso))
    } catch (err) {
      try {
        return new Date(iso).toLocaleString()
      } catch {
        return iso
      }
    }
  }

  return (
    <ModulePage
      eyebrow="Developer Tools"
      title="کنسول توسعه‌دهنده"
      description="پنل کامل دیباگ، تنظیمات، لاگ‌ها و تست‌ها"
    >
      <div className="space-y-6">
        <section className={`${retroPanelPadded} space-y-4`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={retroHeading}>پایش همگام‌سازی کاربر ↔ طرف‌حساب</p>
              <p className={retroMuted}>
                دید ۳۶۰ درجه روی اینکه کدام کاربران موبایل‌دار با طرف‌حساب مالی متناظر همگام شده‌اند.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-stone-500">نمایش نمونه</label>
              <select
                className="input w-24"
                value={userPartySampleLimit}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setUserPartySampleLimit(next)
                  void loadUserPartySync(next)
                }}
              >
                {userPartySampleOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <button
                className={retroButton}
                onClick={() => void loadUserPartySync(userPartySampleLimit)}
                disabled={userPartySyncLoading}
              >
                {userPartySyncLoading ? 'در حال تحلیل…' : 'بازخوانی'}
              </button>
              {userPartySyncStats && (
                <span className={`${retroBadge} text-xs`}>پوشش {userPartySyncStats.coveragePercent}%</span>
              )}
            </div>
          </div>
          {userPartyUpdatedLabel && (
            <div className="text-xs text-right text-stone-500">
              آخرین تحلیل: {userPartyUpdatedLabel}
            </div>
          )}
          {userPartySyncError && (
            <div className={`${retroPanel} p-4 text-sm text-red-700`}>{userPartySyncError}</div>
          )}
          {!userPartySyncError && userPartySyncStats && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className={`${retroPanel} p-4 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <p className={retroHeading}>پوشش اتصال</p>
                    <span className={`${retroBadge} text-xs`}>{userPartySyncStats.coveragePercent}%</span>
                  </div>
                  <p className="text-sm">
                    {userPartySyncStats.linkedUsers} از {userPartySyncStats.mobileUsers} کاربر دارای موبایل همگام شده‌اند.
                  </p>
                  <div className="h-2 w-full rounded-full bg-black/20 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all"
                      style={{ width: `${userPartyCoverageProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-emerald-900">
                    شکاف فعلی: {userPartyCoverageGap}%
                  </p>
                </div>
                <div className={`${retroPanel} p-4 space-y-2`}>
                  <p className={retroHeading}>کیفیت داده موبایل</p>
                  <div className="text-3xl font-semibold">{userPartySyncStats.mobileUsers}</div>
                  <p className={retroMuted}>
                    از {userPartySyncStats.totalUsers} کاربر کل • {userPartySyncStats.missingMobileUsers} نفر موبایل ندارند
                  </p>
                </div>
                <div className={`${retroPanel} p-4 space-y-2`}>
                  <p className={retroHeading}>کاربران بدون طرف‌حساب</p>
                  <div className="text-3xl font-semibold text-amber-600">{userPartyPendingUsers}</div>
                  <p className={retroMuted}>
                    {userPartySyncStats.unlinkedUsersTotal} مورد در کل • {userPartyUnlinkedDisplayed} مورد نمایش داده می‌شود
                  </p>
                </div>
                <div className={`${retroPanel} p-4 space-y-2`}>
                  <p className={retroHeading}>طرف‌حساب‌های یتیم</p>
                  <div className="text-3xl font-semibold text-red-600">{userPartySyncStats.orphanPartiesCount}</div>
                  <p className={retroMuted}>
                    {userPartySyncStats.orphanPartiesTotal} طرف‌حساب با موبایل بدون کاربر همگام • {userPartyOrphanDisplayed} نمونه
                  </p>
                </div>
              </div>
              <div className={`${retroPanel} p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}>
                <div>
                  <p className={retroHeading}>اقدام سریع</p>
                  <p className={retroMuted}>همسان‌سازی را از همین‌جا شروع کنید.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={retroButton} onClick={() => openModule('#settings-users')}>
                    مدیریت کاربران
                  </button>
                  <button className={retroButton} onClick={() => openModule('#people')}>
                    لیست طرف‌حساب‌ها
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className={`${retroPanel} p-0 overflow-hidden`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
                    <div>
                      <p className={retroHeading}>کاربران فاقد طرف‌حساب</p>
                      <p className={retroMuted}>
                        نمایش {userPartyUnlinkedDisplayed} از {userPartySyncStats.unlinkedUsersTotal} مورد
                      </p>
                    </div>
                    <span className={retroBadge}>{userPartyPendingUsers}</span>
                  </div>
                  {userPartySyncStats.topUnlinkedUsers.length === 0 ? (
                    <p className={`p-4 text-sm ${retroMuted}`}>همه کاربران موبایل‌دار متصل هستند.</p>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-stone-500">
                            <th className="px-4 py-2 text-right">کاربر</th>
                            <th className="px-4 py-2 text-right">موبایل</th>
                            <th className="px-4 py-2 text-left">اقدام</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userPartySyncStats.topUnlinkedUsers.map((u) => (
                            <tr key={u.id} className="border-t border-black/10">
                              <td className="px-4 py-2 font-semibold">{u.username || '—'}</td>
                              <td className="px-4 py-2 text-stone-600">{u.mobile || '—'}</td>
                              <td className="px-4 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button className={retroButton} onClick={() => copyToClipboard(u.mobile)}>
                                    کپی موبایل
                                  </button>
                                  <button className={retroButton} onClick={() => openModule('#settings-users')}>
                                    باز کردن کاربران
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className={`${retroPanel} p-0 overflow-hidden`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
                    <div>
                      <p className={retroHeading}>طرف‌حساب‌های یتیم</p>
                      <p className={retroMuted}>
                        نمایش {userPartyOrphanDisplayed} از {userPartySyncStats.orphanPartiesTotal} مورد
                      </p>
                    </div>
                    <span className={retroBadge}>{userPartySyncStats.orphanPartiesCount}</span>
                  </div>
                  {userPartySyncStats.topOrphanParties.length === 0 ? (
                    <p className={`p-4 text-sm ${retroMuted}`}>تمام طرف‌حساب‌ها کاربر متناظر دارند.</p>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-stone-500">
                            <th className="px-4 py-2 text-right">نام</th>
                            <th className="px-4 py-2 text-right">موبایل</th>
                            <th className="px-4 py-2 text-left">اقدام</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userPartySyncStats.topOrphanParties.map((p) => (
                            <tr key={p.id} className="border-t border-black/10">
                              <td className="px-4 py-2 font-semibold">{p.name || '—'}</td>
                              <td className="px-4 py-2 text-stone-600">{p.mobile || '—'}</td>
                              <td className="px-4 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button className={retroButton} onClick={() => copyToClipboard(p.mobile)}>
                                    کپی موبایل
                                  </button>
                                  <button className={retroButton} onClick={() => openModule('#people')}>
                                    باز کردن اشخاص
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {!userPartySyncError && !userPartySyncStats && (
            <div className={`${retroPanel} p-4 text-sm ${retroMuted}`}>
              برای مشاهده آمار تازه «بازخوانی» را بزنید.
            </div>
          )}
        </section>

        <section className={`${retroPanelPadded} grid grid-cols-1 md:grid-cols-2 gap-4`}>
          <div className={`${retroPanel} p-4 space-y-2`}>
            <p className={retroHeading}>اطلاعات کاربر/توکن</p>
            <div className="text-xs">
              نقش: {tokenInfo?.role || '—'} | شناسه: {tokenInfo?.sub || '—'}
          </div>
          <div className="text-xs">
            iat: {tokenInfo?.iat || '—'} | exp: {tokenInfo?.exp || '—'}
          </div>
          <div>
            <button className={retroButton} onClick={decodeToken}>
              به‌روزرسانی
            </button>
          </div>
        </div>
        <div className={`${retroPanel} p-4 space-y-2`}>
          <p className={retroHeading}>تست شبکه (Ping URL)</p>
          <input
            className="input w-full"
            value={netUrl}
            onChange={(e) => setNetUrl(e.target.value)}
            placeholder="https://..."
          />
          <div className="flex gap-2">
            <button className={retroButton} onClick={pingUrl}>
              Ping
            </button>
            <span className={retroMuted}>
              {netPing ? `status=${netPing.status} • ${netPing.ms}ms` : '—'}
            </span>
          </div>
          {netPing?.error && <div className="text-xs text-red-700">{netPing.error}</div>}
        </div>
      </section>

      <section className={`${retroPanelPadded} space-y-3`}>
        <p className={retroHeading}>پنل حرفه‌ای SMS</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`${retroPanel} p-4 space-y-2`}>
            <label className={retroHeading}>درگاه</label>
            <select
              className="input w-full"
              value={smsProvider}
              onChange={(e) => setSmsProvider(e.target.value as any)}
            >
              <option value="sms.ir">SMS.ir</option>
              <option value="ippanel">IPPanel</option>
              <option value="mock">Mock (توسعه)</option>
            </select>
            <label className={retroHeading}>شماره خط ارسال</label>
            <input
              className="input w-full"
              value={smsLine}
              onChange={(e) => setSmsLine(e.target.value)}
              placeholder="lineNumber / sender"
            />
            <label className={retroHeading}>API Key</label>
            <input
              className="input w-full"
              value={smsApiKey}
              onChange={(e) => setSmsApiKey(e.target.value)}
              placeholder="x-api-key"
            />
            <div className="mt-2">
              <label className={retroHeading}>پروفایل‌ها</label>
              <div className="space-y-2">
                <div className="flex gap-2 items-end">
                  <input
                    className="input flex-1"
                    placeholder="نام"
                    value={newProfile.name}
                    onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                  />
                  <select
                    className="input"
                    value={newProfile.provider}
                    onChange={(e) => setNewProfile({ ...newProfile, provider: e.target.value })}
                  >
                    <option value="sms.ir">SMS.ir</option>
                    <option value="ippanel">IPPanel</option>
                    <option value="mock">Mock</option>
                  </select>
                </div>
                <input
                  className="input w-full"
                  placeholder="lineNumber"
                  value={newProfile.line}
                  onChange={(e) => setNewProfile({ ...newProfile, line: e.target.value })}
                />
                <input
                  className="input w-full"
                  placeholder="apiKey"
                  value={newProfile.apiKey}
                  onChange={(e) => setNewProfile({ ...newProfile, apiKey: e.target.value })}
                />
                <div className="flex gap-2">
                  <button
                    className={retroButton}
                    onClick={async () => {
                      const list = [
                        ...smsProfiles.filter((p) => p.name !== newProfile.name),
                        newProfile,
                      ]
                      setSmsProfiles(list)
                      await apiPatch('/api/admin/settings/sms_profiles', {
                        value: JSON.stringify(list),
                      })
                    }}
                  >
                    ذخیره پروفایل
                  </button>
                  <button
                    className={retroButton}
                    onClick={() => {
                      setSmsProvider(newProfile.provider as any)
                      setSmsLine(newProfile.line)
                      setSmsApiKey(newProfile.apiKey)
                    }}
                  >
                    انتخاب بعنوان فعال
                  </button>
                </div>
                <div className="border rounded p-2 max-h-40 overflow-auto">
                  {smsProfiles.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 py-1">
                      <span className="text-xs">
                        {p.name} — {p.provider}
                      </span>
                      <div className="flex gap-2">
                        <button
                          className={retroButton}
                          onClick={() => {
                            setNewProfile(p)
                          }}
                        >
                          ویرایش
                        </button>
                        <button
                          className={retroButton}
                          onClick={async () => {
                            const list = smsProfiles.filter((x) => x.name !== p.name)
                            setSmsProfiles(list)
                            await apiPatch('/api/admin/settings/sms_profiles', {
                              value: JSON.stringify(list),
                            })
                          }}
                        >
                          حذف
                        </button>
                        <button
                          className={retroButton}
                          onClick={() => {
                            setSmsProvider(p.provider as any)
                            setSmsLine(p.line)
                            setSmsApiKey(p.apiKey)
                          }}
                        >
                          انتخاب
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className={`${retroPanel} p-4 space-y-2`}>
            <label className={retroHeading}>گیرنده‌ها</label>
            <textarea
              className="input w-full"
              rows={5}
              value={smsRecipients}
              onChange={(e) => setSmsRecipients(e.target.value)}
              placeholder="شماره‌ها را با فاصله، کاما یا سمی‌کالن جدا کنید"
            />
            <label className={retroHeading}>انتخاب خط (sms.ir)</label>
            <select
              className="input w-full"
              value={smsSelectedLine}
              onChange={(e) => setSmsSelectedLine(e.target.value)}
            >
              <option value="">پیش‌فرض ارائه‌دهنده</option>
              {smsIrLines.map((ln) => (
                <option key={ln} value={ln}>
                  {ln}
                </option>
              ))}
            </select>
          </div>
          <div className={`${retroPanel} p-4 space-y-2`}>
            <label className={retroHeading}>متن پیام</label>
            <textarea
              className="input w-full"
              rows={5}
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
            />
            <button className={retroButton} disabled={smsSending} onClick={sendSmsPro}>
              {smsSending ? 'در حال ارسال…' : 'ارسال'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`${retroPanel} p-4 space-y-2`}>
            <label className={retroHeading}>سلامت اتصال بک‌اند</label>
            <button
              className={retroButton}
              onClick={async () => {
                const start = performance.now()
                const url = '/api/version'
                setNetUrl(url)
                try {
                  const resp = await fetch(url, { method: 'GET' })
                  setNetPing({
                    ms: Math.round(performance.now() - start),
                    status: resp.status,
                    ok: resp.ok,
                  })
                } catch (e: any) {
                  setNetPing({
                    ms: Math.round(performance.now() - start),
                    status: 0,
                    ok: false,
                    error: e?.message,
                  })
                }
              }}
            >
              Ping Backend
            </button>
            <pre className="text-xs">{netPing ? JSON.stringify(netPing, null, 2) : '—'}</pre>
          </div>
        </div>
        <div className={`${retroPanel} p-4`}>
          <p className={retroHeading}>نتایج ارسال</p>
          <pre className="text-xs whitespace-pre-wrap">
            {smsResult ? JSON.stringify(smsResult, null, 2) : '—'}
          </pre>
        </div>
        <div className={`${retroPanel} p-4`}>
          <div className="flex items-center justify-between">
            <p className={retroHeading}>تاریخچه ارسال‌ها و دلیوری</p>
            <button
              className={retroButton}
              onClick={async () => {
                try {
                  const h = await apiGet<{ items: any[] }>('/api/sms/history?limit=100')
                  setSmsHistory(h.items || [])
                } catch {}
              }}
            >
              بروزرسانی
            </button>
            <button
              className={retroButton}
              onClick={() => {
                const params = new URLSearchParams()
                if (smsStatusFilter) params.set('status', smsStatusFilter)
                if (smsProviderFilter) params.set('provider', smsProviderFilter)
                if (smsQuery) params.set('q', smsQuery)
                const url = `/api/sms/history/export.csv?${params.toString()}`
                window.open(url, '_blank')
              }}
            >
              خروجی CSV
            </button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input
              className="input"
              placeholder="جستجو"
              value={smsQuery}
              onChange={(e) => setSmsQuery(e.target.value)}
            />
            <select
              className="input"
              value={smsStatusFilter}
              onChange={(e) => setSmsStatusFilter(e.target.value)}
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="delivered">Delivered</option>
            </select>
            <select
              className="input"
              value={smsProviderFilter}
              onChange={(e) => setSmsProviderFilter(e.target.value)}
            >
              <option value="">همه ارائه‌دهنده‌ها</option>
              <option value="sms.ir">SMS.ir</option>
              <option value="ippanel">IPPanel</option>
            </select>
            <select
              className="input"
              value={smsLimit}
              onChange={async (e) => {
                const v = parseInt(e.target.value)
                setSmsLimit(v)
                await loadSmsHistory(1, v)
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <input
              type="date"
              className="input"
              value={smsFrom}
              onChange={(e) => setSmsFrom(e.target.value)}
            />
            <input
              type="date"
              className="input"
              value={smsTo}
              onChange={(e) => setSmsTo(e.target.value)}
            />
            <button className={retroButton} onClick={() => loadSmsHistory(1, smsLimit)}>
              اعمال فیلترها
            </button>
          </div>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th>زمان</th>
                  <th>وضعیت</th>
                  <th>گیرنده</th>
                  <th>متن/پاسخ</th>
                  <th>latency</th>
                </tr>
              </thead>
              <tbody>
                {smsHistory.map((e, i) => (
                  <tr key={i}>
                    <td>{e.created_at || e.ts || '-'}</td>
                    <td>{e.status || '-'}</td>
                    <td>{e.recipient || e.mobile || '-'}</td>
                    <td className="whitespace-pre-wrap">
                      {e.message
                        ? String(e.message)
                        : e.response_message
                          ? String(e.response_message)
                          : '-'}
                    </td>
                    <td>{typeof e.latency_ms === 'number' ? `${e.latency_ms}ms` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-2 mt-2">
              <button
                className={retroButton}
                onClick={() => {
                  const p = Math.max(1, smsPage - 1)
                  setSmsPage(p)
                  loadSmsHistory(p, smsLimit)
                }}
              >
                قبلی
              </button>
              <span className={retroMuted}>صفحه {smsPage}</span>
              <button
                className={retroButton}
                onClick={() => {
                  const p = smsPage + 1
                  setSmsPage(p)
                  loadSmsHistory(p, smsLimit)
                }}
              >
                بعدی
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Latency Dashboard */}
      <section className={`${retroPanelPadded} space-y-3`}>
        <p className={retroHeading}>داشبورد تاخیر SMS</p>
        {smsHistory.length ? (
          <div className={`${retroPanel} p-4`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="font-semibold">میانگین تاخیر</div>
                <div>
                  {(() => {
                    const vals = smsHistory
                      .map((x) => Number(x.latency_ms) || 0)
                      .filter((v) => v > 0)
                    const avg = vals.length
                      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
                      : 0
                    return `${avg}ms`
                  })()}
                </div>
              </div>
              <div>
                <div className="font-semibold">موفق/ناموفق</div>
                <div>
                  {(() => {
                    const ok = smsHistory.filter(
                      (x) => x.status === 'sent' || x.status === 'delivered',
                    ).length
                    const fail = smsHistory.filter((x) => x.status === 'failed').length
                    return `${ok} ✓ / ${fail} ✗`
                  })()}
                </div>
              </div>
              <div>
                <div className="font-semibold">بیشینه تاخیر</div>
                <div>
                  {(() => {
                    const vals = smsHistory
                      .map((x) => Number(x.latency_ms) || 0)
                      .filter((v) => v > 0)
                    const mx = vals.length ? Math.max(...vals) : 0
                    const sorted = [...vals].sort((a, b) => a - b)
                    const p50 = sorted.length ? sorted[Math.floor(0.5 * (sorted.length - 1))] : 0
                    const p95 = sorted.length ? sorted[Math.floor(0.95 * (sorted.length - 1))] : 0
                    return `P50 ${p50}ms • P95 ${p95}ms • Max ${mx}ms`
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={retroMuted}>داده‌ای برای نمایش موجود نیست.</div>
        )}
        {smsDaily.length ? (
          <div className={`${retroPanel} p-4`}>
            <div className="font-semibold mb-2">نمودار روزانه (موفق/ناموفق و میانگین تاخیر)</div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="date"
                className="input"
                value={smsFrom}
                onChange={(e) => setSmsFrom(e.target.value)}
              />
              <input
                type="date"
                className="input"
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
              />
              <button
                className={retroButton}
                onClick={async () => {
                  try {
                    const m = await apiGet<{ items: any[] }>(`/api/sms/metrics/daily?days=14`)
                    setSmsDaily(m.items || [])
                  } catch {}
                }}
              >
                اعمال بازهٔ تاریخ
              </button>
            </div>
            <svg
              viewBox="0 0 600 220"
              width="100%"
              height="220"
              style={{ background: '#faf4de', border: '1px solid #c5bca5' }}
            >
              {(() => {
                const padL = 40,
                  padB = 20
                const w = 560,
                  h = 180
                const maxTotal = Math.max(1, ...smsDaily.map((d) => d.total))
                const maxLatency = Math.max(1, ...smsDaily.map((d) => d.avg_latency_ms || 0))
                const stepX = w / Math.max(1, smsDaily.length - 1)
                // Bars for success/fail
                return (
                  <g transform={`translate(${padL},20)`}>
                    {smsDaily.map((d, i) => {
                      const x = i * stepX
                      const sentH = h * (d.sent / maxTotal)
                      const failH = h * (d.failed / maxTotal)
                      const ySent = h - sentH
                      const yFail = h - failH
                      const tip = `روز ${d.day}\nموفق: ${d.sent}\nناموفق: ${d.failed}\nمیانگین تاخیر: ${d.avg_latency_ms}ms`
                      return (
                        <g key={d.day}>
                          <title>{tip}</title>
                          <rect
                            x={x - 6}
                            y={ySent}
                            width={12}
                            height={sentH}
                            fill="#4caf50"
                            opacity={0.7}
                          />
                          <rect
                            x={x + 8}
                            y={yFail}
                            width={12}
                            height={failH}
                            fill="#f44336"
                            opacity={0.7}
                          />
                        </g>
                      )
                    })}
                    {/* Latency line */}
                    {smsDaily.map((d, i) => {
                      const x = i * stepX
                      const y = h - h * ((d.avg_latency_ms || 0) / maxLatency)
                      const nx = (i + 1) * stepX
                      const ny = h - h * ((smsDaily[i + 1]?.avg_latency_ms || 0) / maxLatency)
                      return i < smsDaily.length - 1 ? (
                        <line
                          key={`l${i}`}
                          x1={x}
                          y1={y}
                          x2={nx}
                          y2={ny}
                          stroke="#1f2e3b"
                          strokeWidth={2}
                        />
                      ) : null
                    })}
                    {/* Axis labels */}
                    {smsDaily.map((d, i) => (
                      <text
                        key={`t${d.day}`}
                        x={i * stepX}
                        y={h + 12}
                        fontSize={10}
                        transform={`rotate(30 ${i * stepX} ${h + 12})`}
                        fill="#7a6b4f"
                      >
                        {d.day.slice(5)}
                      </text>
                    ))}
                  </g>
                )
              })()}
            </svg>
            <div className="text-xs text-[#7a6b4f] mt-1">
              سبز: موفق | قرمز: ناموفق | خط: میانگین تاخیر
            </div>
          </div>
        ) : null}
      </section>

      <section className={`${retroPanelPadded} space-y-3`}>
        <header className="flex items-center justify-between">
          <p className={retroHeading}>تنظیمات سیستم (admin)</p>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="کلید جدید"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            <input
              className="input w-64"
              placeholder="مقدار"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
            />
            <button className={retroButton} onClick={addSetting} disabled={saving}>
              افزودن/ثبت
            </button>
            <button className={retroButton} onClick={reloadAll}>
              تازه‌سازی
            </button>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-right">
                <th className="px-2 py-1">کلید</th>
                <th className="px-2 py-1">مقدار</th>
                <th className="px-2 py-1">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.key} className="border-t">
                  <td className="px-2 py-1 font-mono">{s.key}</td>
                  <td className="px-2 py-1">
                    <input
                      className="input w-full"
                      defaultValue={s.value}
                      onBlur={(e) => saveSetting(s.key, e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      className={retroButton}
                      onClick={() => deleteSetting(s.key)}
                      disabled={saving}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${retroPanelPadded} space-y-3`}>
        <header className="flex items-center justify-between">
          <p className={retroHeading}>فعالیت‌ها و لاگ‌ها</p>
          <input
            className="input"
            placeholder="فیلتر"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </header>
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className={`${retroPanel} p-3`}>
              <div className="flex items-center justify-between">
                <div className="text-xs">{a.created_at || '—'}</div>
                <div className="text-xs">{a.username || '—'}</div>
              </div>
              <div className="text-xs mt-1">
                <span className={retroBadge}>{a.method}</span> {a.path}
              </div>
              <div className="text-xs mt-1">{a.detail}</div>
            </div>
          ))}
        </div>
      </section>
      </div>
    </ModulePage>
  )
}
