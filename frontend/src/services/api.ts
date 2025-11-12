import authService from './auth'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

async function parseResponse<T>(res: Response): Promise<T> {
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

export async function apiRequest<T>(
  path: string,
  method: HttpMethod = 'GET',
  init?: RequestInit,
): Promise<T> {
  const response = await authService.fetchWithAuth(path, {
    ...(init || {}),
    method,
  })
  return parseResponse<T>(response)
}

export async function apiGet<T>(path: string, init?: RequestInit) {
  return apiRequest<T>(path, 'GET', init)
}

export async function apiPost<T>(path: string, body?: unknown, init?: RequestInit) {
  return apiRequest<T>(path, 'POST', {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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

