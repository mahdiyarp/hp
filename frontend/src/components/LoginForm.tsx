import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
        retroButton,
        retroHeading,
        retroInput,
        retroLabel,
        retroPanelPadded,
        retroMuted,
} from './retroTheme'
import { getPublicStatus, startOtp, verifyOtp } from '../services/papi'
import { setTokens } from '../services/auth'

export default function LoginForm() {
        const { login } = useAuth()
        const [username, setUsername] = useState('')
        const [password, setPassword] = useState('')
        const [otp, setOtp] = useState('')
        const [otpRequired, setOtpRequired] = useState(false)
        const [error, setError] = useState<string | null>(null)
    const [mode, setMode] = useState<'password'|'mobile'>('password')
    const [phone, setPhone] = useState('')
    const [processing, setProcessing] = useState(false)
    const [otpRequested, setOtpRequested] = useState(false)
    const [otpMobile, setOtpMobile] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [papiStatus, setPapiStatus] = useState<any | null>(null)
    const [papiStatusError, setPapiStatusError] = useState<string | null>(null)
    const [papiStatusLoading, setPapiStatusLoading] = useState(false)
    const [otpLockUntil, setOtpLockUntil] = useState<Date | null>(null)
    const [otpLockReason, setOtpLockReason] = useState<string | null>(null)
    const [otpRemainingAttempts, setOtpRemainingAttempts] = useState<number | null>(null)
    const [, setLockTicker] = useState(0)
    const mobileReady = papiStatus ? papiStatus.ready_for_otp === true : !papiStatusError
    const lockActive = otpLockUntil ? (otpLockUntil.getTime() - Date.now()) > 0 : false
    const lockRemainingMs = otpLockUntil ? Math.max(0, otpLockUntil.getTime() - Date.now()) : 0
    const lockRemainingMinutes = lockRemainingMs > 0 ? Math.ceil(lockRemainingMs / (1000 * 60)) : 0
    const lockReasonLabel = otpLockReason === 'otp_rate' ? 'به دلیل محدودیت ارسال کد' : 'به دلیل تلاش ناموفق'

    const loadPapiStatus = async () => {
        setPapiStatusLoading(true)
        setPapiStatusError(null)
        try {
            const res = await getPublicStatus()
            setPapiStatus(res)
        } catch (err: any) {
            setPapiStatusError(err?.message || 'وضعیت api.ir نامشخص است')
        } finally {
            setPapiStatusLoading(false)
        }
    }

    useEffect(() => {
        void loadPapiStatus()
    }, [])

    useEffect(() => {
        if (mode !== 'mobile') {
            setOtpRequested(false)
            setStatusMessage(null)
            setOtp('')
            setOtpMobile(null)
            setOtpLockUntil(null)
            setOtpLockReason(null)
            setOtpRemainingAttempts(null)
        }
    }, [mode])

    useEffect(() => {
        if (otpRequested && otpMobile && phone.trim() !== otpMobile) {
            setOtpRequested(false)
            setStatusMessage(null)
            setOtp('')
            setOtpMobile(null)
            setOtpLockUntil(null)
            setOtpLockReason(null)
            setOtpRemainingAttempts(null)
        }
    }, [phone, otpMobile, otpRequested])

    useEffect(() => {
        if (!otpLockUntil) return
        const id = window.setInterval(() => setLockTicker((v) => v + 1), 1000)
        return () => window.clearInterval(id)
    }, [otpLockUntil])

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
                                const normalizedPhone = phone.trim()
                                if (!/^0\d{10}$/.test(normalizedPhone)) {
                                        setError('شماره موبایل نامعتبر است')
                                        return
                                }
                                if (!mobileReady) {
                                        setError('پیش‌نیازهای api.ir برای ورود با موبایل آماده نیست')
                                        return
                                }
                                setStatusMessage(null)
                                setProcessing(true)
                                if (!otpRequested) {
                                        await startOtp(normalizedPhone)
                                        setOtpRequested(true)
                                        setOtpMobile(normalizedPhone)
                                        setOtpLockUntil(null)
                                        setOtpLockReason(null)
                                        setOtpRemainingAttempts(null)
                                        setStatusMessage('کد تایید ارسال شد؛ لطفاً کد شش رقمی را وارد کنید')
                                } else {
                                        const trimmedOtp = otp.trim()
                                        if (!/^\d{4,6}$/.test(trimmedOtp)) {
                                                setError('کد تایید را به‌صورت ۴ تا ۶ رقم وارد کنید')
                                                return
                                        }
                                        const res = await verifyOtp(normalizedPhone, trimmedOtp)
                                        if (typeof (res as any)?.access_token === 'string') {
                                                setTokens((res as any).access_token, (res as any).refresh_token || '')
                                                setOtpLockUntil(null)
                                                setOtpLockReason(null)
                                                setOtpRemainingAttempts(null)
                                                try { window.dispatchEvent(new Event('auth-updated')) } catch {}
                                                try { window.location.href = '/' } catch {}
                                        } else {
                                                throw new Error('تایید کد ناموفق')
                                        }
                                }
                        } catch (err:any) {
                                const meta = (err as any)?.meta
                                setStatusMessage(null)
                                setError(err?.message || 'ورود با موبایل ناموفق')
                                if (meta?.locked_until) {
                                        try { setOtpLockUntil(new Date(meta.locked_until)) } catch {}
                                        if (meta?.lock_reason) setOtpLockReason(meta.lock_reason)
                                }
                                if (typeof meta?.remaining_attempts === 'number') {
                                        setOtpRemainingAttempts(meta.remaining_attempts)
                                }
                                if (typeof meta?.retry_after_seconds === 'number' && meta.retry_after_seconds > 0) {
                                        const retryMs = meta.retry_after_seconds * 1000
                                        setOtpLockUntil(new Date(Date.now() + retryMs))
                                        setOtpLockReason(meta?.lock_reason || 'otp_rate')
                                }
                        } finally {
                                setProcessing(false)
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
                                                                                         <div className="flex gap-2">
                                                                                                 <button data-testid="login-password-tab" type="button" className={`${retroButton} flex-1 ${mode==='password'?'':'!bg-[#374151]'}`} onClick={() => setMode('password')}>ورود با رمز</button>
                                                                                                 <button data-testid="login-mobile-tab" type="button" className={`${retroButton} flex-1 ${mode==='mobile'?'':'!bg-[#374151]'}`} onClick={() => setMode('mobile')}>ورود با موبایل</button>
                                                                                         </div>
                                <div className="flex flex-col gap-1 text-right">
                                        <div className="flex items-center justify-between text-xs">
                                                <p className={retroMuted}>
                                                        وضعیت پیامک/OTP: {papiStatus ? (papiStatus.ready_for_otp ? 'آماده' : 'نیاز به تنظیم کلید یا خط') : (papiStatusLoading ? 'در حال بررسی' : 'نامشخص')}
                                                        {typeof papiStatus?.provider === 'string' ? ` • ${papiStatus.provider}` : ''}
                                                </p>
                                                <button
                                                        type="button"
                                                        className={`${retroButton} !px-3 !py-1 text-[11px]`}
                                                        onClick={() => void loadPapiStatus()}
                                                        disabled={papiStatusLoading}
                                                >
                                                        {papiStatusLoading ? '...' : 'بروزرسانی'}
                                                </button>
                                        </div>
                                        {papiStatusError && <p className="text-[11px] text-red-700">{papiStatusError}</p>}
                                        {!papiStatusError && papiStatus && !papiStatus.ready_for_otp &&
            (
                                                <p className="text-[11px] text-amber-700">
                                                        برای ورود با موبایل، کلید api.ir و خط ارسال باید در تنظیمات فعال باشد.
                                                </p>
                                        )}
                                        {!papiStatusError && papiStatus && !mobileReady && (
                                                <p className="text-[11px] text-red-700">
                                                        ورود با موبایل تا آماده شدن پیش‌نیازهای api.ir غیرفعال است.
                                                </p>
                                        )}
                                        {lockActive && (
                                                <p className="text-[11px] text-red-700">
                                                        ورود با موبایل موقتاً مسدود است ({lockReasonLabel})؛ حدود {Math.max(1, lockRemainingMinutes)} دقیقه دیگر مجدداً تلاش کنید.
                                                </p>
                                        )}
                                        {!lockActive && typeof otpRemainingAttempts === 'number' && otpRemainingAttempts >= 0 && otpRemainingAttempts < 5 && (
                                                <p className="text-[11px] text-amber-700">
                                                        تلاش‌های باقی‌مانده: {otpRemainingAttempts}
                                                </p>
                                        )}
                                </div>
                                <div>
                                        {mode==='password' ? (
                                                <>
                                                        <label className={retroLabel}>نام کاربری</label>
                                                        <input value={username} onChange={e => setUsername(e.target.value)} className={`${retroInput} w-full`} placeholder="username" />
                                                </>
                                        ) : (
                                                <>
                                                        <label className={retroLabel}>شماره موبایل</label>
                                                        <input value={phone} onChange={e => setPhone(e.target.value)} className={`${retroInput} w-full`} placeholder="0912xxxxxxx" inputMode="tel" />
                                                </>
                                        )}
                                </div>
                                <div>
                                        {mode==='password' ? (
                                                <>
                                                        <label className={retroLabel}>رمز عبور</label>
                                                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`${retroInput} w-full`} placeholder="••••••••" />
                                                </>
                                        ) : (
                                                <>
                                                        <label className={retroLabel}>کد تایید</label>
                                                        <input value={otp} onChange={e => setOtp(e.target.value)} className={`${retroInput} w-full tracking-[0.6em] text-center`} placeholder="123456" inputMode="numeric" pattern="\d{6}" autoComplete="one-time-code" />
                                                </>
                                        )}
                                </div>
                                {otpRequired && mode==='password' && (
                                        <div>
                                                <label className={retroLabel}>کد تایید دو مرحله‌ای</label>
                                                <input
                                                        value={otp}
                                                        onChange={e => setOtp(e.target.value)}
                                                        className={`${retroInput} w-full tracking-[0.6em] text-center`}
                                                        placeholder="123456"
                                                        inputMode="numeric"
                                                        pattern="\d{6}"
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
                                {statusMessage && !error && (
                                        <div className="border-2 border-[#4f8a4f] bg-[#e7f6e7] text-[#1f4d1f] px-3 py-2 shadow-[3px_3px_0_#4f8a4f] text-sm">
                                                {statusMessage}
                                        </div>
                                )}

                                <div className="space-y-3">
                                        {mode==='password' ? (
                                                <button data-testid="login-password-submit" className={`${retroButton} w-full`} type="submit">ورود به سیستم</button>
                                        ) : (
                                                <button
                                                        data-testid="login-mobile-submit"
                                                        className={`${retroButton} w-full`}
                                                        type="submit"
                                                        disabled={processing || !phone || !mobileReady || lockActive}
                                                >
                                                        {otpRequested ? 'تایید کد و ورود' : 'دریافت کد و ورود'}
                                                </button>
                                        )}
                                </div>
                        </form>
                </div>
        )
}
