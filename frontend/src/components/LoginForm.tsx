import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import RegisterForm from './RegisterForm'
import { retroButton, retroHeading, retroInput, retroLabel, retroPanelPadded, retroMuted } from './retroTheme'

export default function LoginForm() {
  const { login, loginPhone } = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [mode, setMode] = useState<'password' | 'phone'>('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpRequired, setOtpRequired] = useState(false)
  const [phoneSession, setPhoneSession] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setError(null)
      if (mode === 'password') {
        const result: any = await login(username, password, otpRequired ? otp : undefined)
        if (result?.otpRequired) {
          setOtpRequired(true)
          setError('برای ادامه ورود، کد تأیید لازم است. لطفاً کد یکبار مصرف را وارد کنید.')
          return
        }
        setOtp('')
        setOtpRequired(false)
      } else {
        if (!otpRequired) {
          await loginPhone(phone)
          setOtpRequired(true)
          setPhoneSession('pending')
          setError('کد تأیید برای شما ارسال شد. لطفاً آن را وارد کنید.')
          return
        } else {
          await loginPhone(phone, otp, phoneSession || undefined)
          setOtp('')
          setOtpRequired(false)
          setPhoneSession(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای ناشناخته رخ داد')
    }
  }

  return (
    <div className="w-full max-w-md" dir="rtl">
      {showRegister ? (
        <>
          <RegisterForm onSuccess={() => setShowRegister(false)} />
          <div className="mt-4 text-center">
            <button className="text-sm text-[#154b5f] hover:underline" onClick={() => setShowRegister(false)} type="button">
              بازگشت به ورود
            </button>
          </div>
        </>
      ) : (
        <>
          <form onSubmit={onSubmit} className={`${retroPanelPadded} space-y-5`} aria-label="فرم ورود">
            <header className="space-y-2 text-right">
              <p className={retroHeading}>hesabpak access terminal</p>
              <h2 className="text-2xl font-semibold text-[#1f2e3b]">ورود به حساب پاک</h2>
              <p className={`text-xs ${retroMuted}`}>
                ورود با رمز عبور یا شماره موبایل و کد یکبار مصرف. اگر ورود دومرحله‌ای فعال باشد پس از رمز عبور، کد تأیید لازم است.
              </p>
            </header>

            <div className="flex gap-2 text-sm">
              <button type="button" className={`${retroButton} ${mode === 'password' ? '' : '!opacity-60'}`} onClick={() => { setMode('password'); setOtpRequired(false); setError(null); }}>
                ورود با رمز عبور
              </button>
              <button type="button" className={`${retroButton} ${mode === 'phone' ? '' : '!opacity-60'}`} onClick={() => { setMode('phone'); setOtpRequired(false); setError(null); }}>
                ورود با شماره موبایل
              </button>
            </div>

            <div className="space-y-4">
              {mode === 'password' ? (
                <>
                  <div>
                    <label className={retroLabel}>نام کاربری</label>
                    <input value={username} onChange={e => setUsername(e.target.value)} className={`${retroInput} w-full`} placeholder="username" />
                  </div>
                  <div>
                    <label className={retroLabel}>رمز عبور</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`${retroInput} w-full`} placeholder="********" />
                  </div>
                  {otpRequired && (
                    <div>
                      <label className={retroLabel}>کد تأیید یکبار مصرف</label>
                      <input value={otp} onChange={e => setOtp(e.target.value)} className={`${retroInput} w-full tracking-[0.6em] text-center`} placeholder="123456" inputMode="numeric" pattern="\d{6}" autoComplete="one-time-code" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className={retroLabel}>شماره موبایل</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} className={`${retroInput} w-full`} placeholder="09xxxxxxxxx" />
                  </div>
                  {otpRequired && (
                    <div>
                      <label className={retroLabel}>کد تأیید یکبار مصرف</label>
                      <input value={otp} onChange={e => setOtp(e.target.value)} className={`${retroInput} w-full tracking-[0.6em] text-center`} placeholder="123456" inputMode="numeric" pattern="\d{6}" />
                    </div>
                  )}
                  <p className={`text-[11px] ${retroMuted}`}>کد تأیید از طریق SMS ارسال می‌شود. اگر دریافت نکردید چند دقیقه بعد دوباره تلاش کنید.</p>
                </>
              )}
            </div>

            {error && <div className="border-2 border-[#c35c5c] bg-[#f9e6e6] text-[#5b1f1f] px-3 py-2 shadow-[3px_3px_0_#c35c5c] text-sm">{error}</div>}

            <div className="space-y-3">
              <button className={`${retroButton} w-full`} type="submit">ورود</button>
            </div>
          </form>

          <div className="mt-4 text-center space-y-2">
            <p className={`text-[11px] ${retroMuted}`}>حساب کاربری ندارید؟</p>
            <button className={`${retroButton} !bg-[#2d5b2d] w-full`} onClick={() => setShowRegister(true)} type="button">
              ساخت حساب جدید (رایگان)
            </button>
          </div>
        </>
      )}
    </div>
  )
}



