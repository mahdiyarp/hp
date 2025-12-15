import React, { useEffect, useState } from 'react'
import { setTokens } from '../services/auth'
import { PApi } from '../services/papi'
import {
  retroBadge,
  retroButton,
  retroHeading,
  retroInput,
  retroMuted,
  retroPanel,
  retroPanelPadded,
  retroSurface,
} from '../components/retroTheme'

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
  const [statusInfo, setStatusInfo] = useState<any | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const loadStatus = async () => {
    setStatusLoading(true)
    setStatusError(null)
    try {
      const res = await PApi.status()
      setStatusInfo(res)
    } catch (e: any) {
      setStatusError(e?.message || 'وضعیت api.ir در دسترس نیست')
    } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

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
      await PApi.setApiKey(apiKey)
      setStatus('کلید api.ir ثبت شد')
    } catch (e: any) {
      setStatus(`خطا در ثبت کلید: ${e?.message || 'نامشخص'}`)
    }
  }

  async function loadDailyReport() {
    setStatus(null)
    try {
      const dateIso = reportDate || new Date().toISOString().slice(0, 10)
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

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'sms', label: 'ارسال پیامک' },
    { id: 'otp', label: 'OTP' },
    { id: 'lines', label: 'خطوط' },
    { id: 'blacklist', label: 'بلک‌لیست' },
    { id: 'reports', label: 'گزارش‌ها' },
    { id: 'switches', label: 'سوئیچ‌ها' },
    { id: 'templates', label: 'قالب‌ها' },
    { id: 'webhooks', label: 'وبهوک‌ها' },
  ]

  return (
    <div className={`${retroSurface} p-4 space-y-6`}>
      <div className={`${retroPanelPadded} space-y-4`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className={`${retroMuted} text-[13px]`}>وضعیت api.ir / PApi</p>
            <h3 className={`${retroHeading} text-sm`}>پیش‌نیازهای OTP و پیامک</h3>
          </div>
          <button className={retroButton} onClick={() => void loadStatus()} disabled={statusLoading}>
            {statusLoading ? 'در حال بروزرسانی…' : 'بروزرسانی وضعیت'}
          </button>
        </div>
        {statusError && <p className="text-sm text-red-700">{statusError}</p>}
        {statusInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className={`${retroPanel} p-3 space-y-2`}>
              <p className={retroMuted}>Provider</p>
              <p className="font-semibold">{statusInfo.provider || 'papi.ir'}</p>
              {!statusInfo.has_api_key && <p className="text-xs text-amber-700">کلید api.ir تنظیم نشده است.</p>}
            </div>
            <div className={`${retroPanel} p-3 space-y-2`}>
              <p className={retroMuted}>Base Path</p>
              <p className="font-semibold">{statusInfo.base_path || 'پیش‌فرض /api/sw1'}</p>
              <p className="text-xs">خط ارسال: {statusInfo.sender || 'تعریف نشده'}</p>
            </div>
            <div className={`${retroPanel} p-3 space-y-2`}>
              <p className={retroMuted}>نشست‌های OTP فعال</p>
              <p className="font-semibold">{statusInfo.active_otp_sessions ?? 0}</p>
              {!statusInfo.has_sender && <p className="text-xs text-amber-700">شماره فرستنده خالی است.</p>}
            </div>
          </div>
        )}
        {!statusInfo && !statusError && (
          <div className={`${retroBadge} w-fit`}>در حال آماده‌سازی وضعیت…</div>
        )}
      </div>

      <div className={`${retroPanelPadded} space-y-4`}>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`${retroButton} ${tab === t.id ? '' : 'opacity-70'}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'sms' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className={retroInput} placeholder="موبایل‌ها" value={mobiles} onChange={(e) => setMobiles(e.target.value)} />
              <input
                className={retroInput}
                placeholder="خط ارسال (lineNumber)"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
              />
            </div>
            <textarea
              className={`${retroInput} mt-1 min-h-[120px]`}
              placeholder="متن شامل #var#"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex gap-2">
              <button className={retroButton} onClick={sendSms}>
                ارسال
              </button>
            </div>
          </div>
        )}

        {tab === 'otp' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className={retroInput} placeholder="موبایل" value={otpMobile} onChange={(e) => setOtpMobile(e.target.value)} />
              <input className={retroInput} placeholder="کد OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
              <select className={retroInput} value={otpTemplate ?? 1} onChange={(e) => setOtpTemplate(Number(e.target.value))}>
                <option value={1}>template 1</option>
                <option value={2}>template 2</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={retroButton} onClick={startOtp}>
                ارسال کد پیامکی
              </button>
              <button
                className={retroButton}
                onClick={() => {
                  setStatus(null)
                  PApi.callOtp(otpCode || '1234', otpMobile)
                    .then((res) => {
                      setStatus(`OTP تلفنی ارسال شد: ${JSON.stringify(res)}`)
                    })
                    .catch((e: any) => {
                      setStatus(`خطا در OTP تلفنی: ${e?.message || 'نامشخص'}`)
                    })
                }}
              >
                OTP تلفنی
              </button>
              <button className={retroButton} onClick={verifyOtp}>
                تأیید
              </button>
            </div>
          </div>
        )}

        {tab === 'lines' && (
          <div className="flex gap-2">
            <button className={retroButton} onClick={loadLines}>
              بارگذاری خطوط
            </button>
          </div>
        )}

        {tab === 'blacklist' && (
          <div className="flex flex-col md:flex-row gap-2">
            <input
              className={retroInput}
              placeholder="موبایل برای بلک‌لیست"
              value={mobiles}
              onChange={(e) => setMobiles(e.target.value)}
            />
            <button className={retroButton} onClick={() => addBlacklist(mobiles.trim())}>
              افزودن
            </button>
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <input
                className={retroInput}
                placeholder="تاریخ (YYYY-MM-DD)"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
              <button className={retroButton} onClick={loadDailyReport}>
                گزارش روزانه
              </button>
              <button className={retroButton} onClick={loadLines}>
                بارگذاری خطوط
              </button>
            </div>
          </div>
        )}

        {tab === 'switches' && (
          <div className="space-y-3">
            <div className={`${retroMuted} text-sm`}>سوئیچ ارائه‌دهنده (api.ir / sms.ir / mock):</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <select className={retroInput} value={provider} onChange={(e) => setProvider(e.target.value as any)}>
                <option value="mock">mock</option>
                <option value="sms.ir">sms.ir</option>
                <option value="papi.ir">papi.ir</option>
              </select>
              <button className={retroButton} onClick={applyProvider}>
                اعمال
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center mt-2">
              <input
                className={retroInput}
                placeholder="API Key برای api.ir"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button className={retroButton} onClick={applyApiKey}>
                ثبت کلید
              </button>
            </div>
            <div className={`${retroMuted} text-xs`}>
              برای تست UI از mock استفاده کنید؛ برای اتصال واقعی کلید api.ir را ثبت کنید.
            </div>
          </div>
        )}

        {tab === 'templates' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button className={retroButton} onClick={listTemplates}>
                فهرست قالب‌ها
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className={retroInput} placeholder="نام قالب" value={tplName} onChange={(e) => setTplName(e.target.value)} />
              <input
                className={retroInput}
                placeholder="محتوا"
                value={tplContent}
                onChange={(e) => setTplContent(e.target.value)}
              />
            </div>
            <div>
              <button className={retroButton} onClick={createTemplate}>
                ایجاد قالب
              </button>
            </div>
          </div>
        )}

        {tab === 'webhooks' && (
          <div className="space-y-3">
            <div className={`${retroMuted} text-sm`}>ثبت وبهوک برای رویدادها (نمونه):</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button className={retroButton} onClick={() => setWebhook('sms.status', 'https://example.com/webhook/sms')}>
                وبهوک وضعیت پیام
              </button>
              <button className={retroButton} onClick={() => setWebhook('otp.verify', 'https://example.com/webhook/otp')}>
                وبهوک تأیید OTP
              </button>
            </div>
          </div>
        )}
      </div>

      {status && (
        <div className={`${retroPanelPadded} space-y-2`}>
          <div className={`${retroHeading} text-sm`}>نتیجه</div>
          <div className="text-sm leading-6 whitespace-pre-wrap break-words">{status}</div>
        </div>
      )}
    </div>
  )
}
