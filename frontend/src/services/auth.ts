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

export async function login(username: string, password: string, otp?: string): Promise<LoginResult> {
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  if (otp) params.append('otp', otp)
  const res = await fetch('/api/auth/login', {
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
  return { otpRequired: !!data.otp_required, access_token: data.access_token, refresh_token: data.refresh_token }
}

export async function refreshTokens() {
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No refresh token')
  const res = await fetch('/api/auth/refresh', {
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
  const access = getAccessToken()
  const refresh = getRefreshToken()
  const headers = new Headers(init?.headers || {})
  if (access) headers.set('Authorization', 'Bearer ' + access)
  const res = await fetch(input, { ...init, headers })
  if (res.status === 401) {
    // Only attempt refresh if we actually have a refresh token
    if (!refresh) {
      return res
    }
    try {
      await refreshTokens()
      const access2 = getAccessToken()
      const headers2 = new Headers(init?.headers || {})
      if (access2) headers2.set('Authorization', 'Bearer ' + access2)
      return await fetch(input, { ...init, headers: headers2 })
    } catch (e) {
      clearTokens()
      throw e
    }
  }
  return res
}

// ===== Mobile Login (SMS OTP) =====
export async function loginByPhoneRequest(phone: string): Promise<{ success: boolean; session_id: string; message?: string }> {
  const res = await fetch('/api/auth/login-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data && data.detail) ? data.detail : 'درخواست ورود ناموفق'
    throw new Error(msg)
  }
  return data as { success: boolean; session_id: string; message?: string }
}

export async function verifyPhoneOtp(session_id: string, otp_code: string): Promise<{ success: boolean; access_token: string; token_type: string }> {
  const res = await fetch('/api/auth/verify-phone-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, otp_code }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data && data.detail) ? data.detail : 'تایید کد ناموفق'
    throw new Error(msg)
  }
  const access = (data as any).access_token
  const refresh = (data as any).refresh_token || ''
  if (access) setTokens(access, refresh)
  return data as { success: boolean; access_token: string; token_type: string }
}

export async function requestOtpSetup() {
  const res = await fetchWithAuth('/api/auth/otp/setup', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to init OTP setup')
  return res.json()
}

export async function verifyOtp(code: string) {
  const res = await fetchWithAuth('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error('Failed to verify OTP')
  return res.json()
}

export async function disableOtp(code?: string) {
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
