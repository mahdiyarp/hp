import React, { useState } from 'react'
import type { ModuleComponentProps } from '../../components/layout/AppShell'
import { retroHeading, retroPanelPadded } from '../../components/retroTheme'
import { apiGet } from '../../services/api'

export default function DeveloperModule({ smartDate }: ModuleComponentProps) {
  const [pingResult, setPingResult] = useState<string>('')
  const [serverTime, setServerTime] = useState<string>('')

  async function pingApi() {
    try {
      const resp = await apiGet<any>('/api/auth/me')
      setPingResult(`User: ${resp?.username || '—'} Role: ${resp?.role || '—'}`)
    } catch {
      setPingResult('Ping failed (auth required)')
    }
  }

  async function fetchServerTime() {
    try {
      const resp = await apiGet<any>('/api/time-sync')
      setServerTime(resp?.server_time || '—')
    } catch {
      setServerTime('Unavailable')
    }
  }
  return (
    <section className={`${retroPanelPadded} space-y-4`}>
      <header>
        <p className={retroHeading}>Developer Tools</p>
        <h2 className="text-2xl font-semibold mt-2">ابزارهای توسعه‌دهنده</h2>
        <p className="text-xs text-[#7a6b4f] mt-2">فقط برای نقش Developer نمایش داده می‌شود</p>
        <p className="text-[11px] text-[#7a6b4f] mt-1">تاریخ مرجع: {smartDate.jalali ?? '—'} | {smartDate.isoDate ?? '—'}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-2">
          <p className={retroHeading}>دیباگ سریع</p>
          <div className="flex gap-2">
            <button className="border px-3 py-1 text-xs" onClick={pingApi}>Ping /api/auth/me</button>
            <button className="border px-3 py-1 text-xs" onClick={fetchServerTime}>Get /api/time-sync</button>
          </div>
          <div className="text-[11px] text-[#7a6b4f]">{pingResult || '—'}</div>
          <div className="text-[11px] text-[#7a6b4f]">Server time: {serverTime || '—'}</div>
        </div>
        <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-1">
          <p className={retroHeading}>اطلاعات سیستم</p>
          <p className="text-xs text-[#7a6b4f]">می‌توان بعداً ابزارهای تست API و snapshot اضافه کرد.</p>
        </div>
      </div>
    </section>
  )
}
