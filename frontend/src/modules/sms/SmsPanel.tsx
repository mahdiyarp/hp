import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiPatch } from '../../services/api'
import {
  retroPanel,
  retroPanelPadded,
  retroHeading,
  retroBadge,
  retroButton,
  retroMuted,
} from '../../components/retroTheme'
import ModulePage from '../../components/layout/ModulePage'

type SmsLine = string
type SmsSendResult = { mobile: string; ok?: boolean; detail?: string }

export default function SmsPanel() {
  const [provider, setProvider] = useState<'sms.ir' | 'ippanel'>('sms.ir')
  const [lines, setLines] = useState<SmsLine[]>([])
  const [selectedLine, setSelectedLine] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [recipients, setRecipients] = useState<string>('')
  const [message, setMessage] = useState<string>('سلام! این یک تست است.')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SmsSendResult[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [metrics, setMetrics] = useState<Array<{ day: string; ok: number; fail: number }>>([])

  async function loadConfig() {
    try {
      const settings =
        await apiGet<Array<{ key: string; value: string | null }>>('/api/admin/settings')
      const getVal = (k: string) => settings.find((s) => s.key === k)?.value ?? ''
      const prov = String(getVal('sms_provider') || 'sms.ir')
      setProvider(prov === 'ippanel' ? 'ippanel' : 'sms.ir')
      setApiKey(String(getVal('smsir_api_key') || getVal('sms_api_key') || ''))
    } catch {}
  }
  async function loadLines() {
    try {
      const res = await apiGet<{ items: string[] }>('/api/sms/lines')
      setLines(res.items || [])
    } catch {
      setLines([])
    }
  }
  async function loadHistory() {
    try {
      const res = await apiGet<{ items: any[] }>(`/api/sms/history?limit=100`)
      setHistory(res.items || [])
    } catch {
      setHistory([])
    }
  }
  async function loadMetrics() {
    try {
      const res = await apiGet<{
        days: number
        points: Array<{ day: string; ok: number; fail: number }>
      }>(`/api/sms/metrics/daily?days=14`)
      setMetrics(res.points || [])
    } catch {
      setMetrics([])
    }
  }

  async function persistBasic() {
    await apiPatch('/api/admin/settings/sms_provider', { value: provider })
    if (apiKey) await apiPatch('/api/admin/settings/sms_api_key', { value: apiKey })
    // lineNumber اختیاری: اگر انتخاب شده ارسال می‌شود
    if (selectedLine) await apiPatch('/api/admin/settings/sms_sender', { value: selectedLine })
  }

  async function sendMany() {
    setSending(true)
    setResults([])
    try {
      await persistBasic()
      const nums = recipients
        .split(/\s|,|;/)
        .map((x) => x.trim())
        .filter(Boolean)
      if (nums.length === 0) throw new Error('گیرنده‌ای وارد نشده است')
      if (!message.trim()) throw new Error('متن پیام خالی است')
      const out: SmsSendResult[] = []
      for (const m of nums) {
        const payload: any = { to: m, message }
        if (selectedLine) payload.lineNumber = selectedLine
        try {
          const r = await apiPost<{ detail?: string }>('/api/sms/send', payload)
          out.push({ mobile: m, ok: true, detail: r?.detail })
        } catch (e: any) {
          out.push({ mobile: m, ok: false, detail: e?.message })
        }
      }
      setResults(out)
      await loadHistory()
      await loadMetrics()
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    void (async () => {
      await loadConfig()
      await loadLines()
      await loadHistory()
      await loadMetrics()
    })()
  }, [])

  return (
    <ModulePage eyebrow="SMS Gateway" title="پنل پیامک" description="ارسال، خطوط، تاریخچه و متریک‌ها">
    <div className="space-y-6 min-h-[50vh]" dir="rtl">
      <section className={`${retroPanelPadded} grid grid-cols-1 md:grid-cols-3 gap-4`}>
        <div className={`${retroPanel} p-4 space-y-2`}>
          <p className={retroHeading}>پیکربندی</p>
          <label className={retroMuted}>درگاه</label>
          <select
            className="input w-full"
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
          >
            <option value="sms.ir">SMS.ir</option>
            <option value="ippanel">IPPanel</option>
          </select>
          <label className={retroMuted}>API Key</label>
          <input
            className="input w-full"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="x-api-key"
          />
          <label className={retroMuted}>انتخاب خط (اختیاری)</label>
          <select
            className="input w-full"
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
          >
            <option value="">پیش‌فرض ارائه‌دهنده</option>
            {lines.map((ln) => (
              <option key={ln} value={ln}>
                {ln}
              </option>
            ))}
          </select>
        </div>
        <div className={`${retroPanel} p-4 space-y-2`}>
          <p className={retroHeading}>گیرنده‌ها</p>
          <textarea
            className="input w-full"
            rows={6}
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="0912..., با فاصله یا کاما جدا کنید"
          />
        </div>
        <div className={`${retroPanel} p-4 space-y-2`}>
          <p className={retroHeading}>متن پیام</p>
          <textarea
            className="input w-full"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button className={retroButton} disabled={sending} onClick={sendMany}>
            {sending ? 'در حال ارسال…' : 'ارسال'}
          </button>
        </div>
      </section>

      <section className={`${retroPanelPadded} grid grid-cols-1 md:grid-cols-2 gap-4`}>
        <div className={`${retroPanel} p-4`}>
          <p className={retroHeading}>نتایج</p>
          <pre className="text-xs whitespace-pre-wrap">
            {results.length ? JSON.stringify(results, null, 2) : '—'}
          </pre>
        </div>
        <div className={`${retroPanel} p-4`}>
          <p className={retroHeading}>متریک روزانه</p>
          <div className="text-xs">
            {metrics.map((m) => (
              <div key={m.day} className="flex justify-between">
                <span>{m.day}</span>
                <span>
                  ok: {m.ok} • fail: {m.fail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${retroPanelPadded}`}>
        <p className={retroHeading}>تاریخچه</p>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">زمان</th>
                <th>گیرنده</th>
                <th>پیام</th>
                <th>وضعیت</th>
                <th>کد</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1 px-2">{h.ts || '—'}</td>
                  <td className="py-1 px-2">{h.to || h.recipient || '—'}</td>
                  <td className="py-1 px-2">{h.message || '—'}</td>
                  <td className="py-1 px-2">{String(h.ok ?? h.status ?? '—')}</td>
                  <td className="py-1 px-2">{h.response_code || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    </ModulePage>
  )
}
