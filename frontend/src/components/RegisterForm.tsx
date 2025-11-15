import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import {
  retroButton,
  retroHeading,
  retroInput,
  retroLabel,
  retroPanelPadded,
  retroMuted,
} from './retroTheme'

export default function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login } = useAuth()
  const { t } = useI18n()
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function requestOTP() {
    if (!mobile || mobile.length < 10) {
      setError('شماره موبایل صحیح نیست')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/auth/register-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'درخواست ناموفق بود')
      }

      const data = await res.json()
      setSessionId(data.session_id)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارسال درخواست')
    } finally {
      setLoading(false)
    }
  }

  async function verifyAndRegister(e: React.FormEvent) {
    e.preventDefault()
    
    if (!otp || otp.length !== 6) {
      setError('کد تایید باید شش رقم باشد')
      return
    }
    
    if (!username || username.length < 3) {
      setError('نام کاربری باید حداقل ۳ کاراکتر باشد')
      return
    }
    
    if (!password || password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/auth/register-mobile-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          otp_code: otp,
          username,
          password,
          full_name: fullName || username,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'ثبت‌نام ناموفق بود')
      }

      const data = await res.json()

      if (data.success) {
        // Auto-login
        await login(username, password)
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'phone') {
    return (
      <div className="w-full max-w-md">
        <div className={`${retroPanelPadded} space-y-5`}>
          <header className="space-y-2 text-right">
            <p className={retroHeading}>{t('registration', 'ثبت‌نام')}</p>
            <h2 className="text-2xl font-semibold text-[#1f2e3b]">ایجاد حساب کاربری</h2>
            <p className={`text-xs ${retroMuted}`}>
              شماره موبایل خود را وارد کنید تا کد تایید برای شما ارسال شود.
            </p>
          </header>

          <div>
            <label className={retroLabel}>شماره موبایل</label>
            <input
              type="tel"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              className={`${retroInput} w-full`}
              placeholder="9123456789"
              inputMode="numeric"
            />
            <p className={`mt-2 text-[10px] ${retroMuted}`}>
              شماره را بدون صفر ابتدایی یا با پیش‌شماره +98 وارد کنید.
            </p>
          </div>

          {error && (
            <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">
              {error}
            </div>
          )}

          <button
            className={`${retroButton} w-full`}
            onClick={requestOTP}
            disabled={loading}
            type="button"
          >
            {loading ? 'در حال ارسال...' : 'ارسال کد تایید'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <div className="w-full max-w-md">
        <form onSubmit={verifyAndRegister} className={`${retroPanelPadded} space-y-5`}>
          <header className="space-y-2 text-right">
            <p className={retroHeading}>تایید شماره</p>
            <h2 className="text-2xl font-semibold text-[#1f2e3b]">کد تایید را وارد کنید</h2>
            <p className={`text-xs ${retroMuted}`}>
              کد شش رقمی ارسال‌شده به {mobile} را وارد کنید.
            </p>
          </header>

          <div className="space-y-4">
            <div>
              <label className={retroLabel}>کد تایید</label>
              <input
                value={otp}
                onChange={e => setOtp(e.target.value.slice(0, 6))}
                className={`${retroInput} w-full tracking-[0.35em] text-center text-2xl font-bold`}
                placeholder="000000"
                inputMode="numeric"
                pattern="\d{6}"
              />
            </div>

            <div>
              <label className={retroLabel}>نام کاربری</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="نام کاربری"
              />
            </div>

            <div>
              <label className={retroLabel}>رمز عبور</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="رمز عبور"
              />
            </div>

            <div>
              <label className={retroLabel}>نام و نام خانوادگی (اختیاری)</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="نام کامل"
              />
            </div>
          </div>

          {error && (
            <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              className={`${retroButton} w-full`}
              type="submit"
              disabled={loading}
            >
              {loading ? 'در حال ایجاد حساب...' : 'ساخت حساب و ورود'}
            </button>

            <button
              className={`${retroButton} !bg-[#5b4a2f] w-full`}
              type="button"
              onClick={() => {
                setStep('phone')
                setError(null)
              }}
              disabled={loading}
            >
              بازگشت
            </button>
          </div>
        </form>
      </div>
    )
  }

  return null
}
