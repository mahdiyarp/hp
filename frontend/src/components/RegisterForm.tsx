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
      setError('شماره موبائل درست نیست')
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
        throw new Error(data.detail || 'درخواست ناموفق')
      }
      
      const data = await res.json()
      setSessionId(data.session_id)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خرابی در درخواست')
    } finally {
      setLoading(false)
    }
  }

  async function verifyAndRegister(e: React.FormEvent) {
    e.preventDefault()
    
    if (!otp || otp.length !== 6) {
      setError('OTP 6 ہندسے ہونا چاہیے')
      return
    }
    
    if (!username || username.length < 3) {
      setError('صارف نام کم از کم 3 حروف ہو')
      return
    }
    
    if (!password || password.length < 6) {
      setError('پاس ورڈ کم از کم 6 حروف ہو')
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
        throw new Error(data.detail || 'رجسٹریشن ناموفق')
      }
      
      const data = await res.json()
      
      if (data.success) {
        // Auto-login
        await login(username, password)
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خرابی')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'phone') {
    return (
      <div className="w-full max-w-md">
        <div className={`${retroPanelPadded} space-y-5`}>
          <header className="space-y-2 text-right">
            <p className={retroHeading}>{t('registration')}</p>
            <h2 className="text-2xl font-semibold text-[#1f2e3b]">صارف بنائیں</h2>
            <p className={`text-xs ${retroMuted}`}>
              شماره موبائل درج کریں۔ ہم OTP بھیجیں گے۔
            </p>
          </header>

          <div>
            <label className={retroLabel}>شماره موبائل</label>
            <input
              type="tel"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              className={`${retroInput} w-full`}
              placeholder="9123456789"
              inputMode="numeric"
            />
            <p className={`mt-2 text-[10px] ${retroMuted}`}>
              بغیر صفر کے یا +98 کے ساتھ شروع کریں
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
            {loading ? 'بھیجا جا رہا ہے...' : 'OTP بھیجیں'}
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
            <p className={retroHeading}>تصدیق کریں</p>
            <h2 className="text-2xl font-semibold text-[#1f2e3b]">OTP درج کریں</h2>
            <p className={`text-xs ${retroMuted}`}>
              {mobile} پر بھیجا گیا 6 ہندسے کا کوڈ درج کریں۔
            </p>
          </header>

          <div className="space-y-4">
            <div>
              <label className={retroLabel}>OTP کوڈ</label>
              <input
                value={otp}
                onChange={e => setOtp(e.target.value.slice(0, 6))}
                className={`${retroInput} w-full tracking-[0.6em] text-center text-2xl font-bold`}
                placeholder="000000"
                inputMode="numeric"
                pattern="\d{6}"
              />
            </div>

            <div>
              <label className={retroLabel}>صارف نام</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="username"
              />
            </div>

            <div>
              <label className={retroLabel}>پاس ورڈ</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className={retroLabel}>مکمل نام (اختیاری)</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="نام"
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
              {loading ? 'رجسٹر ہو رہے ہیں...' : 'صارف بنائیں اور ورود کریں'}
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
              واپس جائیں
            </button>
          </div>
        </form>
      </div>
    )
  }

  return null
}
