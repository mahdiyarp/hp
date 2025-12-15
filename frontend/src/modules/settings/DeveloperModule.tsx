import React, { useEffect, useMemo, useState } from 'react'
import type { ModuleComponentProps } from '../../components/layout/AppShell'
import { retroHeading, retroPanel, retroPanelPadded, retroButton, retroInput, retroTableHeader } from '../../components/retroTheme'
import { apiGet, apiPost, apiPatch } from '../../services/api'
import { fetchWithAuth } from '../../services/auth'
import { toPersianDigits } from '../../utils/num'

export default function DeveloperModule({ smartDate }: ModuleComponentProps) {
  const [pingResult, setPingResult] = useState<string>('')
  const [serverTime, setServerTime] = useState<string>('')
  // sms.ir settings
  const [smsir, setSmsir] = useState({ api_key: '', line_number: '', enabled: false, otp_template_id: '' })
  const [otpTest, setOtpTest] = useState({ mobile: '', code: '' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  // AI Assistant
  const [aiInput, setAiInput] = useState('')
  const [aiReply, setAiReply] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [assistantEnabled, setAssistantEnabled] = useState<boolean>(false)

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

  useEffect(() => {
    // Load sms.ir settings from admin settings store
    ;(async () => {
      try {
        const settings = await apiGet<Array<{ key: string; value: string | null }>>('/api/admin/settings')
        const getVal = (k: string) => (settings.find(s => s.key === k)?.value ?? '')
        setSmsir({
          api_key: String(getVal('smsir_api_key')),
          line_number: String(getVal('smsir_line_number')),
          otp_template_id: String(getVal('smsir_otp_template_id')),
          enabled: String(getVal('smsir_enabled')).toLowerCase() === 'true',
        })
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  useEffect(() => {
    // Try to enable dev assistant on load (non-blocking)
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/dev/assistant/toggle', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true })
        })
        const data = await res.json().catch(()=>({}))
        setAssistantEnabled(!!data.assistant_enabled)
      } catch {}
    })()
  }, [])

  async function saveSmsIr() {
    setSaving(true)
    try {
      const payloads = [
        { key: 'smsir_api_key', value: smsir.api_key },
        { key: 'smsir_line_number', value: smsir.line_number },
        { key: 'smsir_otp_template_id', value: smsir.otp_template_id },
        { key: 'smsir_enabled', value: smsir.enabled ? 'true' : 'false' },
      ]
      for (const p of payloads) {
        await apiPatch(`/api/admin/settings/${p.key}`, { value: p.value })
      }
      alert('تنظیمات پیامک (sms.ir) ذخیره شد')
    } catch (e) {
      console.error(e)
      alert('ذخیره تنظیمات پیامک ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function testOtpSend() {
    setTesting(true)
    try {
      if (!otpTest.mobile.trim() || !otpTest.code.trim()) {
        alert('لطفاً موبایل و کد را وارد کنید')
        return
      }
      const res = await apiPost('/api/smsir/test-otp', { ...otpTest })
      alert(`نتیجه ارسال: ${JSON.stringify(res)}`)
    } catch (e) {
      console.error(e)
      alert('ارسال کد با خطا مواجه شد')
    } finally {
      setTesting(false)
    }
  }

  async function askAssistant() {
    setAiLoading(true)
    setAiReply('')
    try {
      if (!aiInput.trim()) {
        setAiReply('لطفاً متن سوال را وارد کنید')
        return
      }
      const res = await fetchWithAuth('/api/dev/assistant/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: 'dev', details: aiInput })
      })
      const json = await res.json().catch(()=>({}))
      const msg = (json && (json.message || json.reply)) || ''
      const data = json && json.data ? JSON.stringify(json.data, null, 2) : ''
      setAiReply([msg, data].filter(Boolean).join('\n'))
    } catch (e) {
      setAiReply('خطا در ارتباط با دستیار هوش مصنوعی')
    } finally {
      setAiLoading(false)
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-2">
          <p className={retroHeading}>دیباگ سریع</p>
          <div className="flex gap-2">
            <button className="border px-3 py-1 text-xs" onClick={pingApi}>Ping /api/auth/me</button>
            <button className="border px-3 py-1 text-xs" onClick={fetchServerTime}>Get /api/time-sync</button>
          </div>
          <div className="text-[11px] text-[#7a6b4f]">{pingResult || '—'}</div>
          <div className="text-[11px] text-[#7a6b4f]">Server time: {serverTime || '—'}</div>
        </div>
        <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-3">
          <p className={retroHeading}>تنظیمات پیامک (sms.ir)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className={retroHeading}>API Key</label>
              <input className={`${retroInput} w-full`} value={smsir.api_key} onChange={e=>setSmsir({...smsir, api_key: e.target.value})} placeholder="کلید دسترسی" />
            </div>
            <div>
              <label className={retroHeading}>شماره ارسال (Line)</label>
              <input className={`${retroInput} w-full`} value={smsir.line_number} onChange={e=>setSmsir({...smsir, line_number: e.target.value})} placeholder="شماره خط ارسال" />
            </div>
            <div>
              <label className={retroHeading}>OTP Template ID</label>
              <input className={`${retroInput} w-full`} value={smsir.otp_template_id} onChange={e=>setSmsir({...smsir, otp_template_id: e.target.value})} placeholder="شناسه الگو OTP" />
            </div>
            <div className="flex items-end">
              <label className="text-xs text-[#7a6b4f] flex items-center gap-2"><input type="checkbox" checked={smsir.enabled} onChange={e=>setSmsir({...smsir, enabled: e.target.checked})} /> فعال‌سازی</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button className={`${retroButton}`} disabled={saving} onClick={saveSmsIr}>{saving? 'در حال ذخیره...' : 'ذخیره'}</button>
          </div>

          <div className="mt-3">
            <p className={retroHeading}>تست ارسال OTP</p>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2">
              <input className={`${retroInput}`} placeholder="شماره موبایل" value={otpTest.mobile} onChange={e=>setOtpTest({...otpTest, mobile: e.target.value})} />
              <input className={`${retroInput}`} placeholder="کد یکبارمصرف" value={otpTest.code} onChange={e=>setOtpTest({...otpTest, code: e.target.value})} />
            </div>
            <button className={`${retroButton} mt-2`} disabled={testing} onClick={testOtpSend}>{testing? 'در حال ارسال...' : 'ارسال کد تست'}</button>
          </div>
        </div>
        <div className="border border-[#bfb69f] bg-[#f6f1df] px-4 py-3 shadow-inner space-y-3">
          <p className={retroHeading}>دستیار هوش مصنوعی</p>
          <div className="space-y-2">
            <div className="text-[11px] text-[#7a6b4f]">وضعیت: {assistantEnabled ? 'فعال' : 'غیرفعال'}</div>
            <textarea className={"input w-full"} rows={4} value={aiInput} onChange={e=>setAiInput(e.target.value)} placeholder="سوال یا دستور خود را اینجا بنویسید" />
            <div className="flex gap-2">
              <button className={retroButton} disabled={aiLoading || !aiInput.trim()} onClick={askAssistant}>{aiLoading ? 'در حال پردازش…' : 'ارسال'}</button>
              <button className={retroButton} onClick={()=>{setAiInput(''); setAiReply('')}}>پاک کردن</button>
            </div>
            <div className="text-xs text-[#7a6b4f] whitespace-pre-wrap min-h-[4rem] border border-[#d7caa4] bg-[#fffaf0] p-2">{aiReply || 'پاسخ در اینجا نمایش داده می‌شود'}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
