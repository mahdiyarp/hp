import React, { useState } from 'react'
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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequired, setOtpRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setError(null)
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
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={onSubmit} className={`${retroPanelPadded} space-y-5`}>
        <header className="space-y-2 text-right">
          <p className={retroHeading}>hesabpak access terminal</p>
          <h2 className="text-2xl font-semibold text-[#1f2e3b]">ورود به سامانه</h2>
          <p className={`text-xs ${retroMuted}`}>
            برای ادامه، نام کاربری و رمز عبور خود را وارد کنید. در صورت فعال بودن ورود دو مرحله‌ای،
            کد تایید نیز لازم است.
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label className={retroLabel}>نام کاربری</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={`${retroInput} w-full`}
              placeholder="username"
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
        </div>

        {error && (
          <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button className={`${retroButton} w-full`} type="submit">
            ورود به سیستم
          </button>
          <p className={`text-[11px] text-center ${retroMuted}`}>
            در صورت فراموشی رمز عبور با مدیر سیستم تماس بگیرید. این نسخه از رابط کلاسیک حساب‌پاک است.
          </p>
        </div>
      </form>
    </div>
  )
}
