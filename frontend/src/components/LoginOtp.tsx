import React, { useState } from 'react'
import { setTokens } from '../services/auth.ts'
import { PApi } from '../services/papi'

export default function LoginOtp() {
  const [mobile, setMobile] = useState('09123506545')
  const [code, setCode] = useState('123456')
  const [template, setTemplate] = useState<number>(1)
  const [status, setStatus] = useState<string | null>(null)

  async function sendSmsOtp() {
    setStatus(null)
    try {
      const res = await PApi.smsOtp(code, mobile, template)
      setStatus(`OTP پیامکی ارسال شد: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در ارسال OTP پیامکی: ${e?.message || 'نامشخص'}`)
    }
  }

  async function callOtp() {
    setStatus(null)
    try {
      const res = await PApi.callOtp(code, mobile)
      setStatus(`OTP تلفنی ارسال شد: ${JSON.stringify(res)}`)
    } catch (e: any) {
      setStatus(`خطا در ارسال OTP تلفنی: ${e?.message || 'نامشخص'}`)
    }
  }

  async function verify() {
    setStatus(null)
    try {
      const res = await PApi.verifyOtp(mobile, code)
      if (typeof res?.access_token === 'string') {
        setTokens(res.access_token, res.refresh_token || '')
        setStatus('ورود موفق')
        // هدایت حرفه‌ای به داشبورد پس از ورود موفق
        setTimeout(() => {
          try {
            // نمایش اعلان سبک قبل از هدایت
            const evt = new CustomEvent('api-error', { detail: { status: 200, message: 'ورود با OTP موفق بود' } })
            window.dispatchEvent(evt)
          } catch {}
          // انتقال به صفحه اصلی که داشبورد را نمایش می‌دهد
          window.location.href = '/'
        }, 500)
      } else {
        setStatus(`نتیجه تأیید: ${JSON.stringify(res)}`)
      }
    } catch (e: any) {
      setStatus(`خطا در تأیید: ${e?.message || 'نامشخص'}`)
    }
  }

  return (
    <div className="hp-card">
      <h2 className="text-lg mb-3">ورود با OTP (api.ir)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="hp-input" placeholder="موبایل" value={mobile} onChange={e=>setMobile(e.target.value)} />
        <input className="hp-input" placeholder="کد OTP" value={code} onChange={e=>setCode(e.target.value)} />
        <select className="hp-input" value={template} onChange={e=>setTemplate(Number(e.target.value))}>
          <option value={1}>template 1</option>
          <option value={2}>template 2</option>
        </select>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="hp-btn" onClick={sendSmsOtp}>ارسال کد پیامکی</button>
        <button className="hp-btn" onClick={callOtp}>OTP تلفنی</button>
        <button className="hp-btn" onClick={verify}>تأیید و ورود</button>
      </div>
      {status && (
        <div className="mt-3 text-sm">نتیجه: {status}</div>
      )}
    </div>
  )
}