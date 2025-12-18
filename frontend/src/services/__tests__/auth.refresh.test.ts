import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchWithAuth, setTokens, getAccessToken, clearTokens } from '../auth'

describe('fetchWithAuth refresh flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('does not attempt refresh when no refresh token', async () => {
    setTokens('ACCESS_A', '')
    const fetchMock = vi.fn(async (input: any) => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    }))
    vi.stubGlobal('fetch', fetchMock as any)

    const res = await fetchWithAuth('/api/invoices')
    expect(res.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refreshes and retries on 401 when refresh token exists', async () => {
    setTokens('ACCESS_A', 'REFRESH_R')
    const fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : ''
      const auth = init?.headers?.get ? init.headers.get('Authorization') : init?.headers?.Authorization
      if (url.includes('/api/auth/refresh')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'ACCESS_NEW', refresh_token: 'REFRESH_NEW' }),
        } as any
      }
      if (auth === 'Bearer ACCESS_A') {
        return { ok: false, status: 401, json: async () => ({}) } as any
      }
      if (auth === 'Bearer ACCESS_NEW') {
        return { ok: true, status: 200, json: async () => ({ ok: true }) } as any
      }
      return { ok: true, status: 200, json: async () => ({}) } as any
    })
    vi.stubGlobal('fetch', fetchMock as any)

    const res = await fetchWithAuth('/api/invoices')
    expect(res.ok).toBe(true)
    expect(getAccessToken()).toBe('ACCESS_NEW')
    // Should have called: original, refresh, retry
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('clears tokens if refresh fails and throws', async () => {
    setTokens('ACCESS_A', 'REFRESH_R')
    const fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : ''
      if (url.includes('/api/auth/refresh')) {
        return { ok: false, status: 400, json: async () => ({ detail: 'refresh failed' }) } as any
      }
      return { ok: false, status: 401, json: async () => ({}) } as any
    })
    vi.stubGlobal('fetch', fetchMock as any)

    let threw = false
    try {
      await fetchWithAuth('/api/invoices')
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
    expect(getAccessToken()).toBeNull()
  })
})
