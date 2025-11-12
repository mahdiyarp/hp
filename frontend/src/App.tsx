import React, { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import LoginForm from './components/LoginForm'
import { retroHeading } from './components/retroTheme'
import AppShell from './components/layout/AppShell'
import { modules } from './modules'
import { getAccessToken } from './services/auth'

export type SyncRecord = {
  serverUtc: string
  serverOffsetSeconds: number
  clientUtc: string
}

export default function App() {
  const [sync, setSync] = useState<SyncRecord | null>(null)
  const [smartDateInitialized, setSmartDateInitialized] = useState(false)
  const { user, logout } = useAuth()

  async function syncTime() {
    const before = new Date()
    const resp = await fetch('/api/time/now')
    const server = await resp.json()
    const after = new Date()
    // choose client time as arrival time (after)
    const clientUtc = after.toISOString()
    const record = {
      serverUtc: server.utc,
      serverOffsetSeconds: server.server_offset_seconds,
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
        const today = data.context.current_jalali.formatted
        const todayIso = new Date().toISOString().split('T')[0]
        
        localStorage.setItem('hesabpak_selected_date', todayIso)
        localStorage.setItem('hesabpak_selected_jalali', today)
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
    if (stored) setSync(JSON.parse(stored))
    // perform an immediate sync
    syncTime()
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
      <div className="min-h-screen bg-gradient-to-br from-[#0f1a21] via-[#182631] to-[#243746] text-[#f5f1e6] flex items-center justify-center p-6">
        <div className="max-w-5xl w-full flex flex-col-reverse md:flex-row items-center justify-between gap-10">
          <div className="md:w-1/2 space-y-4 text-right">
            <p className={`${retroHeading} text-[#d7caa4]`}>HESABPAK CLASSIC CONSOLE</p>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">به سیستم جامع حساب‌پاک خوش آمدید</h1>
            <p className="text-sm text-[#c3bca5] leading-6">
              برای دسترسی به داشبورد مرکزی و ابزارهای حسابداری، ابتدا وارد شوید. این محیط بر اساس تم
              کلاسیک طراحی شده تا با سیستم‌های آرشیوی و کاربران باسابقه هماهنگ بماند.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[#d7caa4]">
              <span className="border border-[#d7caa4] px-3 py-1 uppercase tracking-[0.4em]">SYNCED TIME</span>
              <span className="border border-[#d7caa4] px-3 py-1 uppercase tracking-[0.4em]">RETRO UI MODE</span>
              <span className="border border-[#d7caa4] px-3 py-1 uppercase tracking-[0.4em]">SECURE ACCESS</span>
            </div>
          </div>
          <div className="md:w-1/2 w-full">
            <LoginForm />
          </div>
        </div>
      </div>
    )
  }

  // Show dashboard when user is logged in and smart date is initialized OR time has passed
  if (smartDateInitialized) {
    return (
      <AppShell
        modules={modules}
        sync={sync}
        user={user ? { username: user.username, role: user.role } : null}
        onLogout={logout}
      />
    )
  }

  // Show loading while initializing
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p>در حال راه‌اندازی سیستم هوشمند...</p>
        <p className="text-xs text-gray-500 mt-2">چند ثانیه صبر کنید...</p>
      </div>
    </div>
  )
}
