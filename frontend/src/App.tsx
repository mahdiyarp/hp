import React, { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import LoginForm from './components/LoginForm'
import AppShell from './components/layout/AppShell'
import { FYProvider } from './context/FYContext'
import { modules } from './modules'
import { getOrgFeatures } from './services/org'
import { getAccessToken } from './services/auth'
import { parseJalaliInput } from './utils/date'

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

  async function syncTime() {
    const before = new Date()
    const resp = await fetch('/api/time/now')
    const server = (await resp.json()) as TimeNowResponse
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
      await fetch('/api/time/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_time: clientUtc }),
      })
    } catch (e) {
      // ignore
    }
  }

  async function initializeSmartDate() {
    try {
      const token = getAccessToken()
      if (!token) {
        setSmartDateInitialized(true)
        return
      }

      const resp = await fetch('/api/financial/auto-context', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (resp.ok) {
        const data = (await resp.json()) as AutoContextResponse
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
      }
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
          const epochCandidate =
            typeof legacy.epochMs === 'number'
              ? legacy.epochMs
              : typeof legacy.epoch_ms === 'number'
                ? legacy.epoch_ms
                : null
          const latencyCandidate = typeof legacy.latencyMs === 'number' ? legacy.latencyMs : null
          setSync({
            serverUtc:
              typeof legacy.serverUtc === 'string'
                ? legacy.serverUtc
                : typeof legacy.server_utc === 'string'
                  ? legacy.server_utc
                  : fallbackIso,
            serverOffsetSeconds: Number(
              legacy.serverOffsetSeconds ?? legacy.server_offset_seconds ?? 0,
            ),
            serverOffset:
              typeof legacy.serverOffset === 'string'
                ? legacy.serverOffset
                : typeof legacy.server_offset === 'string'
                  ? legacy.server_offset
                  : null,
            serverLocal:
              typeof legacy.serverLocal === 'string'
                ? legacy.serverLocal
                : typeof legacy.server_local === 'string'
                  ? legacy.server_local
                  : null,
            jalali: typeof legacy.jalali === 'string' ? legacy.jalali : null,
            epochMs: epochCandidate,
            latencyMs: latencyCandidate,
            clientUtc:
              typeof legacy.clientUtc === 'string'
                ? legacy.clientUtc
                : typeof legacy.client_utc === 'string'
                  ? legacy.client_utc
                  : fallbackIso,
          })
        }
      } catch (e) {
        console.warn('Failed to parse stored sync record', e)
      }
    }
    // perform an immediate sync
    void syncTime()
    // fetch version
    void fetch('/api/version')
      .then(async r => {
        if (!r.ok) return null
        return (await r.json()) as VersionResponse
      })
      .then(data => {
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
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] shadow-[4px_4px_0_#c35c5c] text-sm">خطا {apiError.status}: {apiError.message}</div>
        )}
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800 flex items-center justify-center p-6">
          <div className="max-w-5xl w-full flex flex-col-reverse md:flex-row items-center justify-between gap-10">
            <div className="md:w-1/2 space-y-4 text-right">
              <p className="text-sm font-mono text-indigo-700 tracking-wider">HESABPAK CLASSIC CONSOLE</p>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-900">به سیستم جامع حساب‌پاک خوش آمدید</h1>
              <p className="text-sm text-gray-700 leading-6">
                برای دسترسی به داشبورد مرکزی و ابزارهای حسابداری، ابتدا وارد شوید. این محیط بر اساس تم
                کلاسیک طراحی شده تا با سیستم‌های آرشیوی و کاربران باسابقه هماهنگ بماند.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-indigo-700">
                <span className="border border-indigo-400 px-3 py-1 uppercase tracking-[0.4em] rounded">SYNCED TIME</span>
                <span className="border border-indigo-400 px-3 py-1 uppercase tracking-[0.4em] rounded">RETRO UI MODE</span>
                <span className="border border-indigo-400 px-3 py-1 uppercase tracking-[0.4em] rounded">SECURE ACCESS</span>
              </div>
            </div>
            <div className="md:w-1/2 w-full">
              <LoginForm />
            </div>
          </div>
        </div>
        {version && <div className="fixed bottom-2 right-2 text-xs text-indigo-600 bg-white px-2 py-1 rounded shadow">v{version}</div>}
      </>
    )
  }

  // Show dashboard when user is logged in and smart date is initialized OR time has passed
  if (smartDateInitialized) {
    // Filter modules based on user's accessible modules.
    // If the logged-in user is a Developer, expose all modules (Developer
    // is considered the highest-level role). Otherwise, if `userModules`
    // is empty show the minimal starter menu to avoid overwhelming new users.
    // نمایش ثابت: همهٔ ماژول‌های تعریف‌شده در اسلایدبار
    const accessibleModules = modules
    
    return (
      <FYProvider>
        <>
          {apiError && (
            <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] shadow-[4px_4px_0_#c35c5c] text-sm">خطا {apiError.status}: {apiError.message}</div>
          )}
          <AppShell
            modules={accessibleModules.length > 0 ? accessibleModules : modules}
            sync={sync}
            user={user ? { username: user.username, role: user.role } : null}
            onLogout={logout}
            orgFeatures={orgFeatures || undefined}
          />
          {version && <div className="fixed bottom-2 right-2 text-xs text-[#f3f2e6]">v{version}</div>}
        </>
      </FYProvider>
    )
  }

  // Show loading while initializing
  return (
    <>
      <FYProvider>
        {apiError && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] shadow-[4px_4px_0_#c35c5c] text-sm">خطا {apiError.status}: {apiError.message}</div>
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
