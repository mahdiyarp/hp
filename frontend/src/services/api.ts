import authService from './auth'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/**
 * Date format for API:
 * - Request: Send Shamsi dates as strings (YYYY/MM/DD)
 * - Response: Server automatically converts to Jalali in API responses
 * - Compatibility: Use X-Date-Format header if needed (default: 'jalali')
 */

async function parseResponse<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText || 'Request failed'
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') {
        detail = data.detail
      } else if (data && typeof data === 'object') {
        detail = JSON.stringify(data)
      }
    } catch {
      // ignore body parse errors
    }
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

export async function apiRequest<T = any>(
  path: string,
  method: HttpMethod = 'GET',
  init?: RequestInit,
): Promise<T> {
  const response = await authService.fetchWithAuth(path, {
    ...(init || {}),
    method,
    // Default to Jalali date format in responses
    headers: {
      'X-Date-Format': 'jalali',
      ...(init?.headers || {}),
    },
  })
  return parseResponse<T>(response)
}

export async function apiGet<T = any>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, 'GET', init)
}

export async function apiPost<T = any>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
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

export async function apiPatch<T = any>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, 'PATCH', {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  })
}

export async function apiPut<T = any>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, 'PUT', {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  })
}

export async function apiDelete<T = any>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, 'DELETE', init)
}
