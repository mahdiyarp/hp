import React, { useState } from 'react'
import { apiPost } from '../services/api'
import { setTokens } from '../services/auth.ts'
import { PApi } from '../services/papi'

export default function PApiPanel() {
  const [mobiles, setMobiles] = useState('09123506545')
  const [text, setText] = useState('سلام #name# کد شما: #code#')
  const [sender, setSender] = useState('')
  const [otpMobile, setOtpMobile] = useState('09123506545')
  const [otpCode, setOtpCode] = useState('')
  const [otpTemplate, setOtpTemplate] = useState<number | undefined>(1)
  const [status, setStatus] = useState<string | null>(null)
  const [tab, setTab] = useState<'sms'|'otp'|'lines'|'blacklist'|'reports'|'switches'|'templates'|'webhooks'>('sms')
  const [provider, setProvider] = useState<'mock'|'sms.ir'|'papi.ir'>('mock')
  const [apiKey, setApiKey] = useState('')
  const [reportDate, setReportDate] = useState<string>('')
  const [tplName, setTplName] = useState('')
  const [tplContent, setTplContent] = useState('')

  async function sendSms() {
    setStatus(null)
    try {
      const res = await PApi.sendSms({
        mobiles: mobiles.split(/[\s,]+/).filter(Boolean),
        messageText: text,
        lineNumber: sender || undefined,
      })
      setStatus(`ارسال شد: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در ارسال: ${e?.message || 'نامشخص'}`)
    }
  }

  async function startOtp() {
    setStatus(null)
    try {
      const res = await PApi.smsOtp(otpCode || '123456', otpMobile, otpTemplate)
      setStatus(`OTP پیامکی ارسال شد: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در OTP: ${e?.message || 'نامشخص'}`)
    }
  }

  async function verifyOtp() {
    setStatus(null)
    try {
      const res = await PApi.verifyOtp(otpMobile, otpCode)
      if (typeof res?.access_token === 'string') {
        setTokens(res.access_token, '')
      }
      setStatus(`تأیید شد: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در تأیید: ${e?.message || 'نامشخص'}`)
    }
  }

  async function loadLines() {
    setStatus(null)
    try {
      const res = await PApi.getLines()
      setStatus(`خطوط: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در خطوط: ${e?.message || 'نامشخص'}`)
    }
  }

  async function addBlacklist(m: string) {
    setStatus(null)
    try {
      const res = await PApi.addBlacklist(m)
      setStatus(`بلک‌لیست اضافه شد: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در بلک‌لیست: ${e?.message || 'نامشخص'}`)
    }
  }

  async function applyProvider() {
    setStatus(null)
    try {
      const res = await PApi.setProvider(provider)
      setStatus(`سوئیچ Provider: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در سوئیچ Provider: ${e?.message || 'نامشخص'}`)
    }
  }

  async function applyApiKey() {
    setStatus(null)
    try {
      const res = await PApi.setApiKey(apiKey)
      setStatus(`کلید api.ir ثبت شد`)
    } catch (e: any) {
      setStatus(`خطا در ثبت کلید: ${e?.message || 'نامشخص'}`)
    }
  }

  async function loadDailyReport() {
    setStatus(null)
    try {
      const dateIso = reportDate || new Date().toISOString().slice(0,10)
      const res = await PApi.reportDaily(dateIso)
      setStatus(`گزارش روزانه ${dateIso}: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در گزارش: ${e?.message || 'نامشخص'}`)
    }
  }

  async function listTemplates() {
    setStatus(null)
    try {
      const res = await PApi.listTemplates()
      setStatus(`قالب‌ها: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در قالب‌ها: ${e?.message || 'نامشخص'}`)
    }
  }

  async function createTemplate() {
    setStatus(null)
    try {
      const res = await PApi.createTemplate(tplName, tplContent)
      setStatus(`قالب ایجاد شد: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در ایجاد قالب: ${e?.message || 'نامشخص'}`)
    }
  }

  async function setWebhook(event: string, url: string) {
    setStatus(null)
    try {
      const res = await PApi.setWebhook(event, url)
      setStatus(`وبهوک ثبت شد: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در وبهوک: ${e?.message || 'نامشخص'}`)
    }
  }

  return (
    <div className="p-4 space-y-6 text-[#f3f2e6]">
      <div className="hp-card">
        <div className="flex gap-2 mb-3">
          {(['sms','otp','lines','blacklist','reports','switches','templates','webhooks'] as const).map(t => (
            <button key={t} className={`hp-btn ${tab===t?'':'opacity-70'}`} onClick={()=>setTab(t)}>
              {t==='sms'?'ارسال پیامک':t==='otp'?'OTP':t==='lines'?'خطوط':t==='blacklist'?'بلک‌لیست':t==='reports'?'گزارش‌ها':t==='switches'?'سوئیچ‌ها':t==='templates'?'قالب‌ها':'وبهوک‌ها'}
            </button>
          ))}
        </div>
        {tab==='sms' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="hp-input" placeholder="موبایل‌ها" value={mobiles} onChange={e=>setMobiles(e.target.value)} />
              <input className="hp-input" placeholder="خط ارسال (lineNumber)" value={sender} onChange={e=>setSender(e.target.value)} />
            </div>
            <textarea className="hp-input mt-3" rows={4} placeholder="متن شامل #var#" value={text} onChange={e=>setText(e.target.value)} />
            <div className="mt-3"><button className="hp-btn" onClick={sendSms}>ارسال</button></div>
          </>
        )}
        {tab==='otp' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="hp-input" placeholder="موبایل" value={otpMobile} onChange={e=>setOtpMobile(e.target.value)} />
              <input className="hp-input" placeholder="کد OTP" value={otpCode} onChange={e=>setOtpCode(e.target.value)} />
              <select className="hp-input" value={otpTemplate ?? 1} onChange={e=>setOtpTemplate(Number(e.target.value))}>
                <option value={1}>template 1</option>
                <option value={2}>template 2</option>
              </select>
              <div className="flex gap-2">
                <button className="hp-btn" onClick={startOtp}>ارسال کد پیامکی</button>
                <button className="hp-btn" onClick={()=>{
                  setStatus(null)
                  PApi.callOtp(otpCode || '1234', otpMobile).then(res=>{
                    setStatus(`OTP تلفنی ارسال شد: ${JSON.stringify(res)}`)
                  }).catch((e:any)=>{
                    setStatus(`خطا در OTP تلفنی: ${e?.message || 'نامشخص'}`)
                  })
                }}>OTP تلفنی</button>
                <button className="hp-btn" onClick={verifyOtp}>تأیید</button>
              </div>
            </div>
          </>
        )}
        {tab==='lines' && (
          <div className="flex gap-2">
            <button className="hp-btn" onClick={loadLines}>بارگذاری خطوط</button>
          </div>
        )}
        {tab==='blacklist' && (
          <div className="flex gap-2">
            <input className="hp-input" placeholder="موبایل برای بلک‌لیست" value={mobiles} onChange={e=>setMobiles(e.target.value)} />
            <button className="hp-btn" onClick={()=>addBlacklist(mobiles.trim())}>افزودن</button>
          </div>
        )}
        {tab==='reports' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <input className="hp-input" placeholder="تاریخ (YYYY-MM-DD)" value={reportDate} onChange={e=>setReportDate(e.target.value)} />
              <button className="hp-btn" onClick={loadDailyReport}>گزارش روزانه</button>
              <button className="hp-btn" onClick={loadLines}>بارگذاری خطوط</button>
            </div>
          </div>
        )}
        {tab==='switches' && (
          <div className="space-y-3">
            <div className="text-sm opacity-80">سوئیچ ارائه‌دهنده (api.ir / sms.ir / mock):</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <select className="hp-input" value={provider} onChange={e=>setProvider(e.target.value as any)}>
                <option value="mock">mock</option>
                <option value="sms.ir">sms.ir</option>
                <option value="papi.ir">papi.ir</option>
              </select>
              <button className="hp-btn" onClick={applyProvider}>اعمال</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center mt-3">
              <input className="hp-input" placeholder="API Key برای api.ir" value={apiKey} onChange={e=>setApiKey(e.target.value)} />
              <button className="hp-btn" onClick={applyApiKey}>ثبت کلید</button>
            </div>
            <div className="text-xs opacity-70">برای تست UI از mock استفاده کنید؛ برای اتصال واقعی کلید api.ir را ثبت کنید.</div>
          </div>
        )}
        {tab==='templates' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button className="hp-btn" onClick={listTemplates}>فهرست قالب‌ها</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="hp-input" placeholder="نام قالب" value={tplName} onChange={e=>setTplName(e.target.value)} />
              <input className="hp-input" placeholder="محتوا" value={tplContent} onChange={e=>setTplContent(e.target.value)} />
            </div>
            <div><button className="hp-btn" onClick={createTemplate}>ایجاد قالب</button></div>
          </div>
        )}
        {tab==='webhooks' && (
          <div className="space-y-3">
            <div className="text-sm opacity-80">ثبت وبهوک برای رویدادها (نمونه):</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button className="hp-btn" onClick={()=>setWebhook('sms.status','https://example.com/webhook/sms')}>وبهوک وضعیت پیام</button>
              <button className="hp-btn" onClick={()=>setWebhook('otp.verify','https://example.com/webhook/otp')}>وبهوک تأیید OTP</button>
            </div>
          </div>
        )}
      </div>
      <div className="hp-card">
        <h2 className="text-lg mb-3">ارسال پیامک (PApi)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="hp-input" placeholder="موبایل‌ها (با کاما یا فاصله)"
                 value={mobiles} onChange={e => setMobiles(e.target.value)} />
          <input className="hp-input" placeholder="خط ارسال (اختیاری)" value={sender}
                 onChange={e => setSender(e.target.value)} />
        </div>
        <textarea className="hp-input mt-3" rows={4} placeholder="متن شامل #var# مانند #name# و #code#"
                  value={text} onChange={e => setText(e.target.value)} />
        <div className="mt-3 flex gap-2">
          <button className="hp-btn" onClick={sendSms}>ارسال</button>
        </div>
      </div>

      <div className="hp-card">
        <h2 className="text-lg mb-3">ورود با OTP (PApi)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="hp-input" placeholder="موبایل" value={otpMobile}
                 onChange={e => setOtpMobile(e.target.value)} />
          <input className="hp-input" placeholder="کد OTP" value={otpCode}
                 onChange={e => setOtpCode(e.target.value)} />
          <div className="flex gap-2">
            <button className="hp-btn" onClick={startOtp}>ارسال کد</button>
            <button className="hp-btn" onClick={verifyOtp}>تأیید</button>
          </div>
        </div>
      </div>

      {status && (
        <div className="hp-card">
          <div className="text-sm">نتیجه: {status}</div>
        </div>
      )}
    </div>
  )
}
