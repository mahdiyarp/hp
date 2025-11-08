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

export async function login(username: string, password: string) {
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) throw new Error('Login failed')
  const data = await res.json()
  setTokens(data.access_token, data.refresh_token)
  return data
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
  const headers = new Headers(init?.headers || {})
  if (access) headers.set('Authorization', 'Bearer ' + access)
  const res = await fetch(input, { ...init, headers })
  if (res.status === 401) {
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

export default { login, refreshTokens, fetchWithAuth, setTokens, getAccessToken, getRefreshToken, clearTokens }
