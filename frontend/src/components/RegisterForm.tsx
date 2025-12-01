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

type OtpResponse = {
  session_id?: string
  detail?: string
}

type VerifyResponse = {
  success?: boolean
  detail?: string
}

export default function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login } = useAuth()
  const { t } = useI18n()
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function requestOTP() {
    if (!mobile || mobile.length < 10) {
      setError('ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾')
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

      const data = (await res.json()) as OtpResponse
      if (!res.ok) {
        throw new Error(data.detail || 'ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€ک')
      }

      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¹ط¢آ¾')
    } finally {
      setLoading(false)
    }
  }

  async function verifyAndRegister(e: React.FormEvent) {
    e.preventDefault()
    
    if (!otp || otp.length !== 6) {
      setError('OTP 6 ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â€‍آ¢ ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ¹ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â€‍آ¢')
      return
    }
    
    if (!username || username.length < 3) {
      setError('ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ² ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ 3 ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ')
      return
    }
    
    if (!password || password.length < 6) {
      setError('ط·آ·ط¢آ¸ط·آ¢ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¹ط·آ«أ¢â‚¬آ  ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ² ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ 6 ط·آ·ط¢آ·ط·آ¢ط¢آ­ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ')
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
      
      const data = (await res.json()) as VerifyResponse
      if (!res.ok) {
        throw new Error(data.detail || 'ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ¸ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ  ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€ک')
      }

      if (data.success) {
        // Auto-login
        await login(username, password)
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢')
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
            <h2 className="text-2xl font-semibold text-[#1f2e3b]">ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›</h2>
            <p className={`text-xs ${retroMuted}`}>
              ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¬ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â‚¬إ’ ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ OTP ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¹ط·آ¢ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط› ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â€‍آ¢ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â‚¬إ’
            </p>
          </header>

          <div>
            <label className={retroLabel}>ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط·إ’ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع†</label>
            <input
              type="tel"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              className={`${retroInput} w-full`}
              placeholder="9123456789"
              inputMode="numeric"
            />
            <p className={`mt-2 text-[10px] ${retroMuted}`}>
              ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ·ط·آ·أ¢â‚¬ط›ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ¸ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â€‍آ¢ ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ +98 ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â€‍آ¢ ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ¹ط·آ¢ط¢آ¾ ط·آ·ط¢آ·ط·آ¢ط¢آ´ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¹ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›
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
            {loading ? 'ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¹ط·آ¢ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â€‍آ¢...' : 'OTP ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¹ط·آ¢ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›'}
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
            <p className={retroHeading}>ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¹â€ک ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›</p>
            <h2 className="text-2xl font-semibold text-[#1f2e3b]">OTP ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¬ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›</h2>
            <p className={`text-xs ${retroMuted}`}>
              {mobile} ط·آ·ط¢آ¸ط·آ¢ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¹ط·آ¢ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ¹ط·آ¢ط¢آ¯ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ 6 ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â€‍آ¢ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ§ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¹ط·آ«أ¢â‚¬آ  ط·آ·ط¢آ·ط·آ¢ط¢آ¯ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¬ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â‚¬إ’
            </p>
          </header>

          <div className="space-y-4">
            <div>
              <label className={retroLabel}>OTP ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ¹ط·آ«أ¢â‚¬آ </label>
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
              <label className={retroLabel}>ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="username"
              />
            </div>

            <div>
              <label className={retroLabel}>ط·آ·ط¢آ¸ط·آ¢ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ³ ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¹ط·آ«أ¢â‚¬آ </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¢ط¢آ¢ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¢ط¢آ¢ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¢ط¢آ¢ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¢ط¢آ¢ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¢ط¢آ¢ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¢ط¢آ¢ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¢ط¢آ¢ط·آ£ط¢آ¢ط£آ¢أ¢â‚¬ع‘ط¢آ¬ط·آ¢ط¢آ¢"
              />
            </div>

            <div>
              <label className={retroLabel}>ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬أ¢â‚¬ع† ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦ (ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ®ط·آ·ط¢آ·ط·آ¹ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢)</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={`${retroInput} w-full`}
                placeholder="ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¦"
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
              {loading ? 'ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ³ط·آ·ط¢آ¸ط·آ¢ط¢آ¹ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ  ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط·â€؛ط£آ¢أ¢â€ڑآ¬أ¢â€‍آ¢ ط·آ·ط·â€؛ط·آ¸ط¢آ¾ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›...' : 'ط·آ·ط¢آ·ط·آ¢ط¢آµط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ¸ط¢آ¾ ط·آ·ط¢آ·ط·آ¢ط¢آ¨ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط› ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ± ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ¯ ط·آ·ط¢آ¹ط·آ¢ط¢آ©ط·آ·ط¢آ·ط·آ¢ط¢آ±ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›'}
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
              ط·آ·ط¢آ¸ط·آ«أ¢â‚¬آ ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ¸ط·آ¢ط¢آ¾ط·آ·ط¢آ·ط·آ¢ط¢آ³ ط·آ·ط¢آ·ط·آ¢ط¢آ¬ط·آ·ط¢آ·ط·آ¢ط¢آ§ط·آ·ط¢آ·ط·آ¢ط¢آ¦ط·آ·ط·â€؛ط·آ¥أ¢â‚¬â„¢ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›
            </button>
          </div>
        </form>
      </div>
    )
  }

  return null
}
