import React, { useEffect, useState } from 'react'
import { formatNumberFa, isoToJalali } from './utils/num'
import JalaliDatePicker from './components/JalaliDatePicker'
import { useAuth } from './context/AuthContext'
import LoginForm from './components/LoginForm'

type SyncRecord = {
  serverUtc: string
  serverOffsetSeconds: number
  clientUtc: string
}

export default function App() {
  const [sync, setSync] = useState<SyncRecord | null>(null)

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

  useEffect(() => {
    const stored = localStorage.getItem('hesabpak_time_sync')
    if (stored) setSync(JSON.parse(stored))
    // perform an immediate sync
    syncTime()
  }, [])

  const { user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
        <LoginForm />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <h1 className="text-3xl font-bold mb-4">حساب‌پک — فرانت‌اند</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded mb-4" onClick={syncTime}>همگام‌سازی زمان</button>
        {sync ? (
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">انتخابگر تاریخ جلالی</h2>
            <JalaliDatePicker onChange={(iso) => {
              if (iso) {
                localStorage.setItem('hesabpak_selected_date', iso)
              }
            }} />
            <div className="mt-3 text-sm">
              ذخیره‌شده (ISO UTC): {localStorage.getItem('hesabpak_selected_date') ?? '-'}
            </div>
          </div>
            <p className="mb-2">زمان سرور (ISO UTC): {sync.serverUtc}</p>
            <p className="mb-2">نمایش جلالی سرور: {isoToJalali(sync.serverUtc)}</p>
            <p className="mb-2">زمان کلاینت (ISO UTC): {sync.clientUtc}</p>
            <p className="mb-2">نمایش جلالی کلاینت: {isoToJalali(sync.clientUtc)}</p>
            <p className="text-sm text-gray-600">اختلاف ثانیه سرور از UTC: {sync.serverOffsetSeconds}</p>
          </div>
        ) : (
          <p>در حال بارگذاری همگام‌سازی زمان...</p>
        )}
      </div>
    </div>
  )
}
