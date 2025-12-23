import authService from './auth'
import { isFrontendOnlyMode, mockApiRequest } from './mockApi'

function appendFyParam(path: string): string {
  try {
    const activeFy = localStorage.getItem('hesabpak_active_fy_id')
    const fyId = activeFy ? Number(activeFy) : null
    if (!fyId || !Number.isFinite(fyId)) return path
    const u = new URL(path, window.location.origin)
    const targets = [
      '/api/invoices',
      '/api/payments',
      '/api/reports/pnl',
      '/api/reports/person',
      '/api/persons/balances',
    ]
    const isPartyLedger = u.pathname.startsWith('/api/ledger/party/')
    const isProductMovement = /\/api\/products\/.+\/movement$/.test(u.pathname)
    if (targets.includes(u.pathname) || isPartyLedger || isProductMovement) {
      if (!u.searchParams.has('fy_id')) {
        u.searchParams.set('fy_id', String(fyId))
      }
      return u.pathname + '?' + u.searchParams.toString()
    }
    return path
  } catch {
    return path
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'

/**
 * Date format for API:
 * - Request: Send Shamsi dates as strings (YYYY/MM/DD)
 * - Response: Server automatically converts to Jalali in API responses
 * - Compatibility: Use X-Date-Format header if needed (default: 'jalali')
 */

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText || 'Request failed'
    let payload: any = null
    try {
      const data = await res.json()
      payload = data
      if (typeof data?.detail === 'string') {
        detail = data.detail
      } else if (data && typeof data === 'object') {
        detail = JSON.stringify(data)
      }
    } catch {
      // ignore body parse errors
    }
    // Broadcast a global error event for UI toast handling
    try {
      const evt = new CustomEvent('api-error', {
        detail: { status: res.status, message: detail, payload },
      })
      window.dispatchEvent(evt)
    } catch {}
    throw new Error(detail)
  }
  if (res.status === 204) {
    return null as unknown as T
  }
  try {
    return (await res.json()) as T
  } catch {
    return null as unknown as T
  }
}

function resolveApiPath(path: string): string {
  if (path.startsWith('/api')) {
    try {
      const base = (import.meta as any)?.env?.VITE_BACKEND_URL
      if (typeof base === 'string' && base.length > 0) {
        return base + path
      }
    } catch {}
  }
  return path
}

export async function apiRequest<T>(
  path: string,
  method: HttpMethod = 'GET',
  init?: RequestInit,
): Promise<T> {
  const withFy = appendFyParam(path)
  const resolvedWithFy = resolveApiPath(withFy)
  const baseInit: RequestInit = {
    ...(init || {}),
    method,
    headers: {
      'X-Date-Format': 'jalali',
      ...(init?.headers || {}),
    },
  }
  if (isFrontendOnlyMode) {
    return mockApiRequest<T>(withFy, method, baseInit)
  }
  let response = await authService.fetchWithAuth(resolvedWithFy, baseInit)
  // If forbidden and we injected fy_id, retry once without fy filter
  if (response && response.status === 403 && withFy !== path) {
    try {
      const evt = new CustomEvent('toast', {
        detail: {
          type: 'warning',
          message: 'دسترسی سال مالی محدود است؛ تلاش بدون فیلتر...',
          duration: 2500,
          position: 'br',
        },
      })
      window.dispatchEvent(evt)
    } catch {}
    const resolvedPlain = resolveApiPath(path)
    response = await authService.fetchWithAuth(resolvedPlain, baseInit)
  }
  return parseResponse<T>(response)
}

export async function apiGet<T>(path: string, init?: RequestInit) {
  return apiRequest<T>(path, 'GET', init)
}

export async function apiPost<T>(path: string, body?: unknown, init?: RequestInit) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  return apiRequest<T>(path, 'POST', {
    headers: isForm
      ? {
          ...(init?.headers || {}),
        }
      : {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
    body: body !== undefined && !isForm ? JSON.stringify(body) : (body as any),
    ...init,
  })
}

export async function apiPatch<T>(path: string, body?: unknown, init?: RequestInit) {
  return apiRequest<T>(path, 'PATCH', {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  })
}

export async function apiPut<T>(path: string, body?: unknown, init?: RequestInit) {
  return apiRequest<T>(path, 'PUT', {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  })
}

export async function apiDelete<T>(path: string, init?: RequestInit) {
  return apiRequest<T>(path, 'DELETE', init)
}
