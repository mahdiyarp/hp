import React, { useEffect, useState } from 'react'
import { retroBadge } from './retroTheme'
import { apiGet } from '../services/api'

export default function StatusBar() {
  const [version, setVersion] = useState<string>('—')
  const [ok, setOk] = useState<boolean>(true)
  const [latency, setLatency] = useState<number | null>(null)

  async function poll() {
    const start = performance.now()
    try {
      const v = await apiGet<{ version: string; checked_at?: string; changelog_preview?: string }>(
        '/api/version'
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
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`${retroBadge} ${ok ? 'bg-[#2d5b2d] border-[#3e7b3e]' : 'bg-[#7a1f1f] border-[#a33c3c]'}`}>
        {ok ? 'OK' : 'ERR'}
      </span>
      <span className={`${retroBadge} bg-[#2d3b45] border-[#4b5f6f]`}>v{version}</span>
      {latency !== null && (
        <span className={`${retroBadge} bg-[#2d3b45] border-[#4b5f6f]`}>{latency}ms</span>
      )}
    </div>
  )
}
