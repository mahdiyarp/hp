import React, { useEffect, useState } from 'react'
import { apiGet } from '../services/api'

export default function StatusBar() {
  const [version, setVersion] = useState<string>('—')
  const [ok, setOk] = useState<boolean>(true)
  const [latency, setLatency] = useState<number | null>(null)
  const [busy, setBusy] = useState<number>(0)

  async function poll() {
    const start = performance.now()
    try {
      const v = await apiGet<{ version: string; checked_at?: string; changelog_preview?: string }>(
        '/api/version',
      )
      setVersion(v?.version || 'unknown')
      setOk(true)
    } catch {
      setOk(false)
    } finally {
      const end = performance.now()
      setLatency(Math.round(end - start))
    }
  }

  useEffect(() => {
    poll()
    const id = setInterval(poll, 5000)
    const onStart = () => setBusy((b) => b + 1)
    const onEnd = () => setBusy((b) => Math.max(0, b - 1))
    window.addEventListener('api-start', onStart as any)
    window.addEventListener('api-end', onEnd as any)
    return () => {
      clearInterval(id)
      window.removeEventListener('api-start', onStart as any)
      window.removeEventListener('api-end', onEnd as any)
    }
  }, [])

  const statusColor = ok ? 'text-[#1c5221]' : 'text-[#a33c3c]'

  return (
    <div className="space-y-1 text-xs text-[var(--retro-table-header-text)]">
      <p className={`font-semibold ${statusColor}`}>وضعیت سامانه: {ok ? 'OK' : 'ERR'}</p>
      <p className="text-[11px]">نسخه: v{version}</p>
      {latency !== null && <p className="text-[11px]">تاخیر درخواست: {latency}ms</p>}
      {busy > 0 && <p className="text-[11px]">درخواست فعال: {busy}</p>}
    </div>
  )
}
