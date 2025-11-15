import React, { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import LoginForm from './components/LoginForm'
import { retroHeading } from './components/retroTheme'
import AppShell from './components/layout/AppShell'
import { modules } from './modules'
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

export default function App() {
  const [sync, setSync] = useState<SyncRecord | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [smartDateInitialized, setSmartDateInitialized] = useState(false)
  const { user, modules: userModules, logout } = useAuth()

  async function syncTime() {
    const before = new Date()
    const resp = await fetch('/api/time/now')
    const server = await resp.json()
    const after = new Date()
    // choose client time as arrival time (after)
    const clientUtc = after.toISOString()
    const latencyMs = after.getTime() - before.getTime()
    const record = {
      serverUtc: server.utc,
      serverOffsetSeconds: Number(server.server_offset_seconds ?? 0),
      serverOffset: server.server_offset ?? null,
      serverLocal: server.server_local ?? null,
      jalali: server.jalali ?? null,
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
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (resp.ok) {
        const data = await resp.json()
        const today = data?.context?.current_jalali?.formatted
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
        const parsed = JSON.parse(stored)
        setSync({
          serverUtc: parsed.serverUtc ?? parsed.server_utc ?? new Date().toISOString(),
          serverOffsetSeconds: Number(parsed.serverOffsetSeconds ?? parsed.server_offset_seconds ?? 0),
          serverOffset: parsed.serverOffset ?? parsed.server_offset ?? null,
          serverLocal: parsed.serverLocal ?? parsed.server_local ?? null,
          jalali: parsed.jalali ?? null,
          epochMs: typeof parsed.epochMs === 'number' ? parsed.epochMs : parsed.epoch_ms ?? null,
          latencyMs: typeof parsed.latencyMs === 'number' ? parsed.latencyMs : null,
          clientUtc: parsed.clientUtc ?? parsed.client_utc ?? new Date().toISOString(),
        })
      } catch (e) {
        console.warn('Failed to parse stored sync record', e)
      }
    }
    // perform an immediate sync
    syncTime()
    // fetch version
    fetch('/api/version')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.version) setVersion(data.version)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    if (user && sync && !smartDateInitialized) {
      initializeSmartDate()
    }
  }, [user, sync, smartDateInitialized])

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
    const accessibleModules = user?.role === 'Developer'
      ? modules
      : userModules.length === 0
        ? modules.filter(mod => ['dashboard', 'icc-shop'].includes(mod.id))
        : modules.filter(mod => userModules.includes(mod.id))
    
    return (
      <>
        <AppShell
          modules={accessibleModules.length > 0 ? accessibleModules : modules}
          sync={sync}
          user={user ? { username: user.username, role: user.role } : null}
          onLogout={logout}
        />
        {version && <div className="fixed bottom-2 right-2 text-xs text-[#f3f2e6]">v{version}</div>}
      </>
    )
  }

  // Show loading while initializing
  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>در حال راه‌اندازی سیستم هوشمند...</p>
          <p className="text-xs text-gray-500 mt-2">چند ثانیه صبر کنید...</p>
        </div>
      </div>
      {version && <div className="fixed bottom-2 right-2 text-xs text-[#6b7280]">v{version}</div>}
    </>
  )
}
