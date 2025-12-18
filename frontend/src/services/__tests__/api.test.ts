import { describe, it, expect, beforeEach } from 'vitest'
import { apiGet } from '../api'

// Wire api.ts to call our test-controlled fetchWithAuth
vi.mock('../auth', () => {
  return {
    default: {
      fetchWithAuth: (input: any, init?: RequestInit) =>
        (globalThis as any).__api_test_fetch(input, init),
    },
  }
})

describe('api service', () => {
  let latestPath: any

  beforeEach(() => {
    latestPath = undefined
    ;(globalThis as any).__api_test_fetch = async (input: any) => {
      latestPath = input
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      } as any
    }
    localStorage.clear()
  })

  it('injects fy_id for targeted endpoints', async () => {
    localStorage.setItem('hesabpak_active_fy_id', '123')
    await apiGet('/api/invoices?foo=bar')
    expect(String(latestPath)).toContain('/api/invoices?')
    expect(String(latestPath)).toContain('foo=bar')
    expect(String(latestPath)).toContain('fy_id=123')
  })

  it('dispatches api-error on failed responses with detail', async () => {
    const events: any[] = []
    window.addEventListener('api-error', (e: any) => events.push(e.detail))
    ;(globalThis as any).__api_test_fetch = async () => {
      return {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ detail: 'Specific error' }),
      } as any
    }
    let threw = false
    try {
      await apiGet('/api/invoices')
    } catch (e: any) {
      threw = true
      expect(e.message).toContain('Specific error')
    }
    expect(threw).toBe(true)
    expect(events[0]).toMatchObject({ status: 400, message: 'Specific error' })
  })
})
