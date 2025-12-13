import React, { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  retroButton,
  retroHeading,
  retroInput,
  retroLabel,
  retroPanelPadded,
  retroMuted,
} from './retroTheme'

export default function LoginForm() {
  const { login } = useAuth()
  const [mode, setMode] = useState<'password' | 'mobile'>(() => {
    const saved = sessionStorage.getItem('login_mode')
    return saved === 'mobile' ? 'mobile' : 'password'
  })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequired, setOtpRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState('09123506545')
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null)
  const [mobileStep, setMobileStep] = useState<'request' | 'verify'>('request')
  const [cooldown, setCooldown] = useState<number>(0)
  const [cooldownTimer, setCooldownTimer] = useState<number | null>(null)
  const [processing, setProcessing] = useState<boolean>(false)
  const [toast, setToast] = useState<string | null>(null)
  const otpGeneratedRef = useRef<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (mode === 'password') {
        const result = await login(username, password, otpRequired ? otp : undefined)
        if (result.otpRequired) {
          setOtpRequired(true)
          setError('کد تایید دو مرحله‌ای را وارد کنید')
          return
        }
        setOtp('')
        setOtpRequired(false)
      } else {
        const { PApi } = await import('../services/papi')
        const { setTokens } = await import('../services/auth')
        if (mobileStep === 'request') {
          setProcessing(true)
          const generated = otp && otp.trim().length >= 4 ? otp.trim() : String(Math.floor(100000 + Math.random()*900000))
          otpGeneratedRef.current = generated
          await PApi.smsOtp(generated, phone.trim(), 1)
          setOtpSessionId('papi')
          setMobileStep('verify')
          sessionStorage.setItem('login_mode','mobile')
          sessionStorage.setItem('login_mobile_step','verify')
          setCooldown(120)
          if (cooldownTimer) clearInterval(cooldownTimer)
          const id = window.setInterval(() => setCooldown(prev => (prev > 0 ? prev - 1 : 0)), 1000)
          setCooldownTimer(id)
          setToast('کد ورود ارسال شد')
          setTimeout(() => setToast(null), 2000)
          setProcessing(false)
        } else {
          setProcessing(true)
          const codeToVerify = (otp && otp.trim()) || otpGeneratedRef.current || ''
          const res = await PApi.verifyOtp(phone.trim(), codeToVerify)
          if (typeof (res as any)?.access_token === 'string') {
            setTokens((res as any).access_token, (res as any).refresh_token || '')
            try { window.dispatchEvent(new Event('auth-updated')) } catch {}
            setToast('ورود موفق')
            setTimeout(() => setToast(null), 2000)
          } else {
            setError('تایید کد ناموفق')
          }
          if (cooldownTimer) { clearInterval(cooldownTimer); setCooldownTimer(null) }
          setProcessing(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق')
    }
  }

  return (
    <div className="w-full max-w-md">
        <>
          <form onSubmit={onSubmit} className={`${retroPanelPadded} space-y-5`}>
            <header className="space-y-2 text-right">
              <p className={retroHeading}>hesabpak access terminal</p>
              <h2 className="text-2xl font-semibold text-[#1f2e3b]">ورود به سامانه</h2>
              <p className={`text-xs ${retroMuted}`}>
                برای ادامه، نام کاربری و رمز عبور خود را وارد کنید. در صورت فعال بودن ورود دو مرحله‌ای،
                کد تایید نیز لازم است.
              </p>
              {mode === 'mobile' && (
                <p className={`text-[11px] ${retroMuted}`}>
                  ورود پیامکی فعال است. در حالت دمو ممکن است تایید بدون ارسال SMS انجام شود.
                </p>
              )}
            </header>
            {/* Mode Switch */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className={`${retroButton} ${mode === 'password' ? '' : '!bg-[#e5e7eb] !text-[#1f2e3b]'}`}
                onClick={() => { setMode('password'); sessionStorage.setItem('login_mode','password') }}
              >
                ورود با رمز عبور
              </button>
              <button
                type="button"
                className={`${retroButton} ${mode === 'mobile' ? '' : '!bg-[#e5e7eb] !text-[#1f2e3b]'}`}
                onClick={() => { setMode('mobile'); sessionStorage.setItem('login_mode','mobile') }}
              >
                ورود با موبایل
              </button>
            </div>

            {mode === 'password' ? (
                <>
                  <div>
                    <label className={retroLabel}>نام کاربری</label>
                    <input
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className={`${retroInput} w-full`}
                    />
                  </div>
                  <div>
                    <label className={retroLabel}>رمز عبور</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={`${retroInput} w-full`}
                      placeholder="••••••••"
                    />
                  </div>
                  {otpRequired && (
                    <div>
                      <label className={retroLabel}>کد تایید دو مرحله‌ای</label>
                      <input
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        className={`${retroInput} w-full tracking-[0.6em] text-center`}
                        placeholder="123456"
                        inputMode="numeric"
                        pattern="\\d{6}"
                        autoComplete="one-time-code"
                      />
                      <p className={`mt-2 text-[11px] ${retroMuted}`}>
                        پیامک یا اپلیکیشن احراز هویت خود را بررسی کنید و کد شش رقمی را وارد نمایید.
                      </p>
                    </div>
                  )}
                </>
            ) : (
              <div className="space-y-4">
                {mobileStep === 'request' ? (
                  <>
                    <div>
                      <label className={retroLabel}>شماره موبایل</label>
                      <input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className={`${retroInput} w-full`}
                        placeholder="0912xxxxxxx"
                        inputMode="tel"
                      />
                      <p className={`mt-2 text-[11px] ${retroMuted}`}>کد ورود برای شما پیامک خواهد شد.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className={retroLabel}>کد پیامکی</label>
                      <input
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        className={`${retroInput} w-full tracking-[0.6em] text-center`}
                        placeholder="123456"
                        inputMode="numeric"
                        pattern="\\d{4,6}"
                        autoComplete="one-time-code"
                      />
                      <p className={`mt-2 text-[11px] ${retroMuted}`}>کد ارسال‌شده به موبایل خود را وارد کنید.</p>
                      <div className="mt-3 flex items-center justify-between">
                        <button type="button" className={`${retroButton} !bg-[#374151]`} onClick={() => { setMobileStep('request'); setOtp(''); setOtpSessionId(null); if (cooldownTimer) { clearInterval(cooldownTimer); setCooldownTimer(null) } setCooldown(0) }}>
                          تغییر شماره
                        </button>
                        <button
                          type="button"
                          className={`${retroButton} ${cooldown > 0 ? '!bg-[#e5e7eb] !text-[#1f2e3b] cursor-not-allowed' : ''}`}
                          disabled={cooldown > 0}
                          onClick={async () => {
                            try {
                              setError(null)
                              const { PApi } = await import('../services/papi')
                              const generated = otp && otp.trim().length >= 4 ? otp.trim() : String(Math.floor(100000 + Math.random()*900000))
                              otpGeneratedRef.current = generated
                              await PApi.smsOtp(generated, phone.trim(), 1)
                              setOtpSessionId('papi')
                              setCooldown(120)
                              if (cooldownTimer) clearInterval(cooldownTimer)
                              const id = window.setInterval(() => setCooldown(prev => (prev > 0 ? prev - 1 : 0)), 1000)
                              setCooldownTimer(id)
                            } catch (e: any) {
                              setError(e?.message || 'ارسال مجدد ناموفق')
                            }
                          }}
                        >
                          {cooldown > 0 ? `ارسال مجدد (${cooldown}s)` : 'ارسال مجدد کد'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">
                {error}
              </div>
            )}
            {toast && (
              <div className="border-2 border-[#4caf50] bg-[#eaf7ea] text-[#1f4f1f] px-3 py-2 shadow-[3px_3px_0_#4caf50] text-sm">
                {toast}
              </div>
            )}

            <div className="space-y-3">
              {mode === 'password' ? (
                <button className={`${retroButton} w-full`} type="submit" disabled={processing}>
                  ورود به سیستم
                </button>
              ) : (
                mobileStep === 'request' ? (
                  <button className={`${retroButton} w-full`} type="submit" disabled={processing}>
                    ارسال کد ورود
                  </button>
                ) : (
                  <button className={`${retroButton} w-full`} type="button" disabled={processing} onClick={async () => {
                    try {
                      setError(null)
                      if (!otpSessionId) throw new Error('شناسه نشست OTP نامشخص است')
                      const { PApi } = await import('../services/papi')
                      const { setTokens } = await import('../services/auth')
                      // Verify first, then persist tokens, then navigate
                      setProcessing(true)
                      const res = await PApi.verifyOtp(phone.trim(), (otp && otp.trim()) || otpGeneratedRef.current || '')
                      if (typeof (res as any)?.access_token === 'string') {
                        setTokens((res as any).access_token, (res as any).refresh_token || '')
                        try { window.dispatchEvent(new Event('auth-updated')) } catch {}
                        setOtp('')
                        setOtpSessionId(null)
                        setToast('ورود موفق')
                        setTimeout(() => setToast(null), 2000)
                        window.location.href = '/'
                      } else {
                        throw new Error('تایید کد ناموفق')
                      }
                      setProcessing(false)
                    } catch (e: any) {
                      setError(e?.message || 'تایید کد ناموفق')
                      setProcessing(false)
                    }
                  }}>
                    تایید و ورود
                  </button>
                )
              )}
            </div>
          </form>

        </>
    </div>
  )
}
