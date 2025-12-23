import { describe, it, expect, beforeEach } from 'vitest'
import { apiGet } from '../api'

vi.mock('../auth', () => {
  return {
    default: {
      fetchWithAuth: (input: any, init?: RequestInit) =>
        (globalThis as any).__api_test_fetch(input, init),
    },
  }
})

describe('api FY injection for special endpoints', () => {
  let latestPath: any

  beforeEach(() => {
    latestPath = undefined
    ;(globalThis as any).__api_test_fetch = async (input: any) => {
      latestPath = input
      return { ok: true, status: 200, json: async () => ({}) } as any
    }
    localStorage.clear()
    localStorage.setItem('hesabpak_active_fy_id', '777')
  })

  it('injects fy_id for party ledger', async () => {
    await apiGet('/api/ledger/party/123')
    expect(String(latestPath)).toContain('fy_id=777')
  })

  it('injects fy_id for product movement', async () => {
    await apiGet('/api/products/abc/movement')
    expect(String(latestPath)).toContain('fy_id=777')
  })
})
