import React, { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import LoginForm from './components/LoginForm'
import AppShell from './components/layout/AppShell'
import { FYProvider } from './context/FYContext'
import { modules } from './modules'
import { apiGet, apiPost } from './services/api'
import { getOrgFeatures } from './services/org'
import { getAccessToken } from './services/auth'
import { parseJalaliInput } from './utils/date'
import ThemeToggle from './components/ThemeToggle'

export type SyncRecord = {
  serverUtc: string
  serverOffsetSeconds: number
  serverOffset: string | null
  serverLocal: string | null
  jalali: string | null
  epochMs: number | null
  latencyMs: number | null
  clientUtc: string
}

type TimeNowResponse = {
  utc: string
  server_offset_seconds?: number | null
  server_offset?: string | null
  server_local?: string | null
  jalali?: string | null
  epoch_ms?: number | null
}

type VersionResponse = {
  version?: string
}

type AutoContextResponse = {
  context?: {
    current_jalali?: {
      formatted?: string
    }
  }
}

type StoredSyncRecord = Partial<SyncRecord> & {
  server_utc?: string
  server_offset_seconds?: number | null
  server_offset?: string | null
  server_local?: string | null
  epoch_ms?: number | null
  client_utc?: string
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export default function App() {
  const [sync, setSync] = useState<SyncRecord | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [smartDateInitialized, setSmartDateInitialized] = useState(false)
  const { user, modules: userModules, logout } = useAuth()
  const [apiError, setApiError] = useState<{ status: number; message: string } | null>(null)
  const [orgFeatures, setOrgFeatures] = useState<string[] | null>(null)
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning'
    message: string
    duration?: number
    position?: 'bl' | 'br' | 'tl' | 'tr'
  } | null>(null)

  async function syncTime() {
    const before = new Date()
    const server = await apiGet<TimeNowResponse>('/api/time/now')
    const after = new Date()
    // choose client time as arrival time (after)
    const clientUtc = after.toISOString()
    const latencyMs = after.getTime() - before.getTime()
    const record: SyncRecord = {
      serverUtc: typeof server.utc === 'string' ? server.utc : clientUtc,
      serverOffsetSeconds: Number(server.server_offset_seconds ?? 0),
      serverOffset: typeof server.server_offset === 'string' ? server.server_offset : null,
      serverLocal: typeof server.server_local === 'string' ? server.server_local : null,
      jalali: typeof server.jalali === 'string' ? server.jalali : null,
      epochMs: typeof server.epoch_ms === 'number' ? server.epoch_ms : null,
      latencyMs: Number.isFinite(latencyMs) ? latencyMs : null,
      clientUtc,
    }
    localStorage.setItem('hesabpak_time_sync', JSON.stringify(record))
    setSync(record)
    // optionally persist to server
    try {
      await apiPost('/api/time/sync', { client_time: clientUtc })
    } catch (e) {
      // ignore
    }
  }

  async function initializeSmartDate() {
    try {
      const data = await apiGet<AutoContextResponse>('/api/financial/auto-context')
      const today = data.context?.current_jalali?.formatted
      let todayIso = new Date().toISOString().split('T')[0]
      if (typeof today === 'string') {
        const parsed = parseJalaliInput(today)
        if (parsed?.iso) {
          todayIso = parsed.iso.slice(0, 10)
        }
      }
      localStorage.setItem('hesabpak_selected_date', todayIso)
      if (typeof today === 'string') {
        localStorage.setItem('hesabpak_selected_jalali', today)
      }
      console.log('Smart date auto-initialized:', { today, todayIso })
    } catch (error) {
      console.error('Failed to initialize smart date:', error)
    } finally {
      setSmartDateInitialized(true)
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('hesabpak_time_sync')
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored)
        if (isPlainObject(parsed)) {
          const legacy = parsed as StoredSyncRecord
          const fallbackIso = new Date().toISOString()
          const epochCandidate = typeof legacy.epoch_ms === 'number' ? legacy.epoch_ms : null
          const latencyCandidate = null
          const record: SyncRecord = {
            serverUtc: typeof legacy.server_utc === 'string' ? legacy.server_utc : fallbackIso,
            serverOffsetSeconds: Number(legacy.server_offset_seconds ?? 0),
            serverOffset: typeof legacy.server_offset === 'string' ? legacy.server_offset : null,
            serverLocal: typeof legacy.server_local === 'string' ? legacy.server_local : null,
            jalali: null,
            epochMs: epochCandidate,
            latencyMs: latencyCandidate,
            clientUtc: typeof legacy.client_utc === 'string' ? legacy.client_utc : fallbackIso,
          }
          setSync(record)
        }
      } catch (e) {
        console.warn('Failed to parse stored sync record', e)
      }
    }
    void syncTime()
    void apiGet<VersionResponse>('/api/version')
      .then((data) => {
        if (data?.version) setVersion(data.version)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent
      const d = ce.detail || {}
      if (typeof d?.message === 'string' && typeof d?.status === 'number') {
        setApiError({ status: d.status, message: d.message })
        setTimeout(() => setApiError(null), 5000)
      }
    }
    window.addEventListener('api-error', handler)
    return () => window.removeEventListener('api-error', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent
      const d = ce.detail || {}
      if (typeof d?.message === 'string') {
        const duration = Number(d?.duration) || 3000
        const position = d?.position || 'bl'
        setToast({
          type: d.type || 'info',
          message: String(d.message),
          duration,
          position,
        })
        const id = setTimeout(() => setToast(null), duration)
        return () => clearTimeout(id)
      }
    }
    window.addEventListener('toast', handler as EventListener)
    return () => window.removeEventListener('toast', handler as EventListener)
  }, [])

  useEffect(() => {
    if (user && sync && !smartDateInitialized) {
      void initializeSmartDate()
    }
  }, [user, sync, smartDateInitialized])

  useEffect(() => {
    // Load organization features once authenticated
    if (!user) return
    ;(async () => {
      try {
        const res = await getOrgFeatures()
        setOrgFeatures(res.features || [])
      } catch {
        setOrgFeatures([])
      }
    })()
  }, [user])

  // Fallback timeout - if smart date init takes too long, continue anyway
  useEffect(() => {
    if (user) {
      const timeout = setTimeout(() => {
        if (!smartDateInitialized) {
          console.log('Smart date init timeout - continuing anyway')
          setSmartDateInitialized(true)
        }
      }, 3000) // 3 second timeout

      return () => clearTimeout(timeout)
    }
  }, [user, smartDateInitialized])

  if (!user) {
    return (
      <>
        {apiError && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] shadow-[4px_4px_0_#c35c5c] text-sm">
            خطا {apiError.status}: {apiError.message}
          </div>
        )}
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800 flex items-center justify-center p-6">
          <div className="max-w-5xl w-full flex flex-col-reverse md:flex-row items-center justify-between gap-10">
            <div className="md:w-1/2 space-y-4 text-right">
              <p className="text-sm font-mono text-indigo-700 tracking-wider">
                HESABPAK CLASSIC CONSOLE
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-900">
                به سیستم جامع حساب‌پاک خوش آمدید
              </h1>
              <p className="text-sm text-gray-700 leading-6">
                برای دسترسی به داشبورد مرکزی و ابزارهای حسابداری، ابتدا وارد شوید. این محیط بر اساس
                تم کلاسیک طراحی شده تا با سیستم‌های آرشیوی و کاربران باسابقه هماهنگ بماند.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-indigo-700">
                <span className="border border-indigo-400 px-3 py-1 uppercase tracking-[0.4em] rounded">
                  SYNCED TIME
                </span>
                <span className="border border-indigo-400 px-3 py-1 uppercase tracking-[0.4em] rounded">
                  RETRO UI MODE
                </span>
                <span className="border border-indigo-400 px-3 py-1 uppercase tracking-[0.4em] rounded">
                  SECURE ACCESS
                </span>
              </div>
            </div>
            <div className="md:w-1/2 w-full">
              <LoginForm />
            </div>
          </div>
        </div>
        {version && (
          <div className="fixed bottom-2 right-2 text-xs text-indigo-600 bg-white px-2 py-1 rounded shadow">
            v{version}
          </div>
        )}
      </>
    )
  }

  // Show dashboard when user is logged in and smart date is initialized OR time has passed
  if (smartDateInitialized) {
    // گیتینگ پویا: اگر بک‌اند ماژول‌های کاربر را برگرداند، با JWT ادغام می‌کنیم.
    // در غیر این‌صورت، ماژول‌های پیش‌فرض را نشان می‌دهیم تا تجربه تم کلاسیک حفظ شود.
    // ماژول‌های قابل‌دسترس را بر اساس لیست بک‌اند (AuthContext.modules) فیلتر می‌کنیم
    // اگر بک‌اند لیست ندهد، همان ماژول‌های پیش‌فرض را نشان می‌دهیم تا تم کلاسیک حفظ شود.
    // تشخیص سریع کاربر دولوپر از روی JWT
    const isDeveloper = (() => {
      try {
        const tok = getAccessToken()
        if (!tok) return false
        const parts = tok.split('.')
        if (parts.length !== 3) return false
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const pad = b64.length % 4
        const payload = atob(pad === 2 ? b64 + '==' : pad === 3 ? b64 + '=' : b64)
        const p = JSON.parse(payload)
        const sub = String(p.sub || '')
        const role = String(p.role || p['x-role'] || '')
        return sub === '09123506545' || sub === 'developer' || role === 'Admin'
      } catch {
        return false
      }
    })()

    const accessibleModules =
      Array.isArray(userModules) && userModules.length > 0
        ? modules.map((m) => ({
            ...m,
            // اگر آی‌دی ماژول در لیست دسترسی کاربر باشد، نمایش داده شود
            // در غیر این‌صورت به‌صورت پنهان علامت بزنیم تا AppShell آن را فیلتر کند.
            hidden: isDeveloper ? false : !userModules.includes(m.id),
          }))
        : modules

    return (
      <FYProvider>
        <>
          {apiError && (
            <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] shadow-[4px_4px_0_#c35c5c] text-sm">
              خطا {apiError.status}: {apiError.message}
            </div>
          )}
          <AppShell
            modules={accessibleModules.length > 0 ? accessibleModules : modules}
            sync={sync}
            user={user ? { username: user.username, role: user.role } : null}
            onLogout={logout}
            orgFeatures={orgFeatures || undefined}
          />
          {toast && (
            <div
              className={`fixed ${toast.position === 'bl' ? 'bottom-4 left-4' : toast.position === 'br' ? 'bottom-4 right-4' : toast.position === 'tl' ? 'top-4 left-4' : 'top-4 right-4'} z-50 px-3 py-2 text-sm border-2 shadow-[4px_4px_0_#111827] ${toast.type === 'success' ? 'bg-[#d1fae5] text-[#065f46] border-[#065f46]' : toast.type === 'error' ? 'bg-[#fee2e2] text-[#7f1d1d] border-[#7f1d1d]' : toast.type === 'warning' ? 'bg-[#fef3c7] text-[#92400e] border-[#92400e]' : 'bg-[#f3f4f6] text-[#374151] border-[#374151]'}`}
            >
              {toast.message}
            </div>
          )}
          {version && (
            <div className="fixed bottom-2 right-2 text-xs text-[#f3f2e6]">v{version}</div>
          )}
        </>
      </FYProvider>
    )
  }

  // Show loading while initializing
  return (
    <>
      <FYProvider>
        {apiError && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] shadow-[4px_4px_0_#c35c5c] text-sm">
            خطا {apiError.status}: {apiError.message}
          </div>
        )}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>در حال راه‌اندازی سیستم هوشمند...</p>
            <p className="text-xs text-gray-500 mt-2">چند ثانیه صبر کنید...</p>
          </div>
        </div>
      </FYProvider>
      {version && <div className="fixed bottom-2 right-2 text-xs text-[#6b7280]">v{version}</div>}
    </>
  )
}
