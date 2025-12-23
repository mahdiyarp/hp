import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { loginByPhoneRequest, verifyPhoneOtp, setTokens } from '../services/auth'
import { normalizeIranMobile } from '../utils/phone'
import RegisterForm from './RegisterForm'
import {
  retroButton,
  retroHeading,
  retroInput,
  retroLabel,
  retroPanelPadded,
  retroMuted,
} from './retroTheme'
import Alert from './Alert'

export default function LoginForm() {
  const { login } = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequired, setOtpRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'password' | 'mobile'>('password')
  const [phone, setPhone] = useState('')
  const [processing, setProcessing] = useState(false)
  const [awaitingOtp, setAwaitingOtp] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (mode === 'password') {
      try {
        const result = await login(username, password, otpRequired ? otp : undefined)
        if (result.otpRequired) {
          setOtpRequired(true)
          setError('کد تایید دو مرحله‌ای را وارد کنید')
          return
        }
        setOtp('')
        setOtpRequired(false)
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('ورود ناموفق')
        }
      }
    } else {
      try {
        setProcessing(true)
        const normalized = normalizeIranMobile(phone)
        if (!normalized) {
          throw new Error('شماره موبایل نامعتبر است')
        }
        if (!awaitingOtp || !sessionId) {
          const r = await loginByPhoneRequest(normalized)
          setSessionId(r.session_id)
          setAwaitingOtp(true)
          setError('کد تایید ارسال شد؛ لطفاً وارد کنید')
        } else {
          const v = await verifyPhoneOtp(sessionId, (otp || '').trim() || '000000')
          if (v && (v as any).access_token) {
            setTokens((v as any).access_token, (v as any).refresh_token || '')
            try {
              window.dispatchEvent(new Event('auth-updated'))
            } catch {}
            try {
              window.location.href = '/'
            } catch {}
          } else {
            throw new Error('تایید کد ناموفق')
          }
        }
      } catch (err: any) {
        setError(err?.message || 'ورود با موبایل ناموفق')
      } finally {
        setProcessing(false)
      }
    }
  }

  return (
    <div className="w-full max-w-md">
      {showRegister ? (
        <>
          <RegisterForm onSuccess={() => setShowRegister(false)} />
          <div className="mt-4 text-center">
            <button
              className="text-sm text-[#154b5f] hover:underline"
              onClick={() => setShowRegister(false)}
              type="button"
            >
              پہلے سے صارف ہیں؟ یہاں ورود کریں
            </button>
          </div>
        </>
      ) : (
        <>
          <form noValidate onSubmit={onSubmit} className={`${retroPanelPadded} space-y-5`}>
            <header className="space-y-2 text-right">
              <p className={retroHeading}>hesabpak access terminal</p>
              <h2 className="text-2xl font-semibold text-[#1f2e3b]">ورود به سامانه</h2>
              <p className={`text-xs ${retroMuted}`}>
                برای ادامه، نام کاربری و رمز عبور خود را وارد کنید. در صورت فعال بودن ورود دو
                مرحله‌ای، کد تایید نیز لازم است.
              </p>
            </header>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  data-testid="login-password-tab"
                  type="button"
                  className={`${retroButton} flex-1 ${mode === 'password' ? '' : '!bg-[#374151]'}`}
                  onClick={() => setMode('password')}
                >
                  ورود با رمز
                </button>
                <button
                  data-testid="login-mobile-tab"
                  type="button"
                  className={`${retroButton} flex-1 ${mode === 'mobile' ? '' : '!bg-[#374151]'}`}
                  onClick={() => setMode('mobile')}
                >
                  ورود با موبایل
                </button>
              </div>
              <div>
                {mode === 'password' ? (
                  <>
                    <label className={retroLabel}>نام کاربری</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`${retroInput} w-full`}
                      placeholder="username"
                    />
                  </>
                ) : (
                  <>
                    <label className={retroLabel}>شماره موبایل</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`${retroInput} w-full`}
                      placeholder="0912xxxxxxx"
                      inputMode="tel"
                      dir="ltr"
                    />
                  </>
                )}
              </div>
              <div>
                {mode === 'password' ? (
                  <>
                    <label className={retroLabel}>رمز عبور</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${retroInput} w-full`}
                      placeholder="••••••••"
                    />
                  </>
                ) : (
                  <>
                    <label className={retroLabel}>کد تایید</label>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className={`${retroInput} w-full tracking-[0.6em] text-center`}
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      disabled={!awaitingOtp}
                    />
                  </>
                )}
              </div>
              {otpRequired && mode === 'password' && (
                <div>
                  <label className={retroLabel}>کد تایید دو مرحله‌ای</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={`${retroInput} w-full tracking-[0.6em] text-center`}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  <p className={`mt-2 text-[11px] ${retroMuted}`}>
                    پیامک یا اپلیکیشن احراز هویت خود را بررسی کنید و کد شش رقمی را وارد نمایید.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {mode === 'password' ? (
                <button
                  data-testid="login-password-submit"
                  className={`${retroButton} w-full`}
                  type="submit"
                >
                  ورود به سیستم
                </button>
              ) : (
                <button
                  data-testid="login-mobile-submit"
                  className={`${retroButton} w-full`}
                  type="submit"
                  disabled={processing || !phone}
                >
                  {awaitingOtp ? 'تایید و ورود' : 'ارسال کد'}
                </button>
              )}
            </div>
          </form>
          {/* بخش ثبت‌نام حذف شد طبق درخواست؛ تمرکز روی ورود */}
        </>
      )}
    </div>
  )
}
