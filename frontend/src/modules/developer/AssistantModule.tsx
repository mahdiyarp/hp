import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiPost } from '../../services/api'
import { retroBadge, retroButton, retroHeading, retroMuted, retroPanel } from '../../components/retroTheme'

interface AssistantReply {
  ok?: boolean
  message?: string
  data?: any
}

interface HistoryItem {
  id: string
  ts: number
  text: string
  reply: string
  payload?: any
}

const STORAGE_KEY = 'hesabpak_dev_assistant_history_v1'

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryItem[]) : []
  } catch {
    return []
  }
}

function saveHistory(items: HistoryItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-100))) } catch {}
}

export default function AssistantModule() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [text, setText] = useState('کمک')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory())
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    // probe by sending a dummy help if needed? Prefer reading enable state by attempting toggle=false
    (async () => {
      try {
        // no-op: ask backend help when assistant disabled gives instructive message
        setEnabled(null)
      } catch { setEnabled(null) }
    })()
  }, [])

  async function toggleAssistant(next: boolean) {
    setBusy(true)
    try {
      await apiPost('/api/assistant/toggle', { enabled: next })
      setEnabled(next)
    } catch (e: any) {
      alert(e?.message || 'تغییر وضعیت دستیار ناموفق بود')
    } finally { setBusy(false) }
  }

  async function send() {
    const q = text.trim()
    if (!q) return
    setBusy(true)
    try {
      const res = await apiPost<AssistantReply>('/api/assistant/query', { text: q })
      const item: HistoryItem = { id: String(Date.now()), ts: Date.now(), text: q, reply: res?.message || '', payload: res }
      const next = [...history, item]
      setHistory(next)
      saveHistory(next)
      setText('')
      setTimeout(() => inputRef.current?.focus(), 0)
    } catch (e: any) {
      const item: HistoryItem = { id: String(Date.now()), ts: Date.now(), text: q, reply: e?.message || 'خطای دستیار', payload: null }
      const next = [...history, item]
      setHistory(next)
      saveHistory(next)
    } finally { setBusy(false) }
  }

  function clearHistory() {
    if (!window.confirm('پاک کردن تاریخچه؟')) return
    setHistory([])
    saveHistory([])
  }

  const sorted = useMemo(() => [...history].sort((a,b)=> a.ts-b.ts), [history])

  return (
    <div className="space-y-4" dir="rtl">
      <section className={`${retroPanel} p-4`}> 
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={retroHeading}>دستیار توسعه‌دهنده</p>
            <p className={retroMuted}>برای استفاده، دستیار باید فعال باشد. سپس دستور متنی خود را ارسال کنید.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={retroBadge}>{enabled ? 'فعال' : 'غیرفعال'}</span>
            <button className={retroButton} disabled={busy} onClick={()=>toggleAssistant(!(enabled||false))}>
              {enabled ? 'خاموش کردن' : 'فعال‌سازی'}
            </button>
          </div>
        </div>
      </section>

      <section className={`${retroPanel} p-4 space-y-2`}>
        <label className={retroHeading}>دستور شما</label>
        <textarea ref={inputRef} className="input w-full" rows={4} value={text} onChange={e=>setText(e.target.value)} placeholder='مثلاً: "گزارش دریافتی‌های امروز" یا "فاکتور فروش برای علی با 3 لپ‌تاپ"' />
        <div className="flex items-center gap-2">
          <button className={retroButton} disabled={busy} onClick={send}>{busy? 'در حال ارسال…' : 'ارسال'}</button>
          <button className={retroButton} onClick={clearHistory}>پاک‌سازی تاریخچه</button>
        </div>
      </section>

      <section className={`${retroPanel} p-4`}>
        <p className={retroHeading}>نتایج</p>
        {sorted.length === 0 ? (
          <div className={retroMuted}>هنوز چیزی ارسال نشده است. یک دستور تایپ کنید و ارسال کنید.</div>
        ) : (
          <div className="space-y-3">
            {sorted.map(item => (
              <div key={item.id} className="border border-[var(--retro-border)] rounded-sm p-3 bg-[var(--retro-panel-bg)]">
                <div className="text-xs text-[var(--retro-muted-text)]">{new Date(item.ts).toLocaleString('fa-IR')}</div>
                <div className="mt-1"><span className={retroBadge}>درخواست</span> {item.text}</div>
                <div className="mt-2 whitespace-pre-wrap"><span className={retroBadge}>پاسخ</span> {item.reply || '—'}</div>
                {item.payload ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs">جزئیات</summary>
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(item.payload, null, 2)}</pre>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
