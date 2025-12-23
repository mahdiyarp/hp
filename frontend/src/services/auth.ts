import { DEMO_USER, isFrontendOnlyMode, mockFetchResponse } from './mockApi'

const ACCESS_KEY = 'hesabpak_access_token'
const REFRESH_KEY = 'hesabpak_refresh_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

type LoginResult =
  | { otpRequired: true }
  | {
      otpRequired: false
      access_token: string
      refresh_token: string
    }

function apiBase() {
  try {
    const base = (import.meta as any)?.env?.VITE_BACKEND_URL
    if (typeof base === 'string' && base.length > 0) return base
  } catch {}
  return ''
}

export async function login(
  username: string,
  password: string,
  otp?: string,
): Promise<LoginResult> {
  if (isFrontendOnlyMode) {
    const demoAccess = `${DEMO_USER.username}-access`
    const demoRefresh = `${DEMO_USER.username}-refresh`
    setTokens(demoAccess, demoRefresh)
    return {
      otpRequired: false,
      access_token: demoAccess,
      refresh_token: demoRefresh,
    }
  }
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  if (otp) params.append('otp', otp)
  const res = await fetch(apiBase() + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (res.status === 428) {
    return { otpRequired: true }
  }
  if (!res.ok) {
    let message = 'Login failed'
    try {
      const err = await res.json()
      if (err?.detail) message = err.detail
    } catch (e) {
      // ignore parse errors
    }
    throw new Error(message)
  }
  const data = await res.json()
  setTokens(data.access_token, data.refresh_token)
  return {
    otpRequired: !!data.otp_required,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  }
}

export async function refreshTokens() {
  if (isFrontendOnlyMode) {
    const demoAccess = `${DEMO_USER.username}-access`
    const demoRefresh = `${DEMO_USER.username}-refresh`
    setTokens(demoAccess, demoRefresh)
    return { access_token: demoAccess, refresh_token: demoRefresh }
  }
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No refresh token')
  const res = await fetch(apiBase() + '/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })
  if (!res.ok) throw new Error('Refresh failed')
  const data = await res.json()
  setTokens(data.access_token, data.refresh_token)
  return data
}

export async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  if (isFrontendOnlyMode) {
    return mockFetchResponse(typeof input === 'string' ? input : input.toString(), init)
  }
  const access = getAccessToken()
  const refresh = getRefreshToken()
  const headers = new Headers(init?.headers || {})
  if (access) headers.set('Authorization', 'Bearer ' + access)
  try {
    try {
      window.dispatchEvent(new CustomEvent('api-start'))
    } catch {}
    const resolved =
      typeof input === 'string' && input.startsWith('/api') ? apiBase() + input : input
    const res = await fetch(resolved, { ...init, headers })
    if (res.status === 401) {
      // Only attempt refresh if we actually have a refresh token
      if (!refresh) {
        try {
          window.dispatchEvent(new CustomEvent('api-end'))
        } catch {}
        return res
      }
      try {
        await refreshTokens()
        const access2 = getAccessToken()
        const headers2 = new Headers(init?.headers || {})
        if (access2) headers2.set('Authorization', 'Bearer ' + access2)
        const res2 = await fetch(resolved, { ...init, headers: headers2 })
        try {
          window.dispatchEvent(new CustomEvent('api-end'))
        } catch {}
        return res2
      } catch (e) {
        clearTokens()
        try {
          window.dispatchEvent(new CustomEvent('api-end'))
        } catch {}
        throw e
      }
    }
    try {
      window.dispatchEvent(new CustomEvent('api-end'))
    } catch {}
    return res
  } catch (e) {
    try {
      window.dispatchEvent(new CustomEvent('api-end'))
    } catch {}
    throw e
  }
}

// ===== Mobile Login (SMS OTP) =====
export async function loginByPhoneRequest(
  phone: string,
): Promise<{ success: boolean; session_id: string; message?: string }> {
  if (isFrontendOnlyMode) {
    return { success: true, session_id: 'demo-session', message: 'کد یک‌بار مصرف برای حالت دمو است.' }
  }
  const res = await fetch(apiBase() + '/api/auth/login-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data && data.detail ? data.detail : 'درخواست ورود ناموفق'
    throw new Error(msg)
  }
  return data as { success: boolean; session_id: string; message?: string }
}

export async function verifyPhoneOtp(
  session_id: string,
  otp_code: string,
): Promise<{ success: boolean; access_token: string; token_type: string }> {
  if (isFrontendOnlyMode) {
    const demoAccess = `${DEMO_USER.username}-access`
    const demoRefresh = `${DEMO_USER.username}-refresh`
    setTokens(demoAccess, demoRefresh)
    return { success: true, access_token: demoAccess, token_type: 'bearer' }
  }
  const res = await fetch(apiBase() + '/api/auth/verify-phone-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, otp_code }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data && data.detail ? data.detail : 'تایید کد ناموفق'
    throw new Error(msg)
  }
  const access = data.access_token
  const refresh = data.refresh_token || ''
  if (access) setTokens(access, refresh)
  return data as { success: boolean; access_token: string; token_type: string }
}

export async function requestOtpSetup() {
  if (isFrontendOnlyMode) {
    return { secret: 'DEMO-SECRET', otpauth_url: 'otpauth://demo' }
  }
  const res = await fetchWithAuth('/api/auth/otp/setup', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to init OTP setup')
  return res.json()
}

export async function verifyOtp(code: string) {
  if (isFrontendOnlyMode) {
    return { success: true }
  }
  const res = await fetchWithAuth('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error('Failed to verify OTP')
  return res.json()
}

export async function disableOtp(code?: string) {
  if (isFrontendOnlyMode) {
    return { success: true }
  }
  const res = await fetchWithAuth('/api/auth/otp/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error('Failed to disable OTP')
  return res.json()
}

export default {
  login,
  refreshTokens,
  fetchWithAuth,
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  requestOtpSetup,
  verifyOtp,
  disableOtp,
  loginByPhoneRequest,
  verifyPhoneOtp,
}

export async function loginDeveloper() {
  if (isFrontendOnlyMode) {
    const demoAccess = `${DEMO_USER.username}-access`
    const demoRefresh = `${DEMO_USER.username}-refresh`
    setTokens(demoAccess, demoRefresh)
    window.dispatchEvent(new CustomEvent('auth-updated'))
    return
  }
  try {
    const res = await fetch(apiBase() + '/api/auth/login-dev', { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    const access = data.access_token
    const refresh = data.refresh_token || ''
    if (access) setTokens(access, refresh)
  } catch {
    // ignore
  }
}
