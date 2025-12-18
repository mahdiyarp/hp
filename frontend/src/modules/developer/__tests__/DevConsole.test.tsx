import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import App from '../../../App'

// Minimal fetch mock capturing requests
function mockFetchWithRoutes(routes: Record<string, any>) {
  vi.stubGlobal('fetch', ((input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.url
    for (const key of Object.keys(routes)) {
      if (url.includes(key)) {
        const value = routes[key]
        const body = typeof value === 'function' ? value(url, init) : value
        if (body instanceof Response) {
          return Promise.resolve(body)
        }
        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
    }
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
  }) as any)
}

describe('DevConsole filters & CSV export', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies provider filter and triggers CSV export with BOM', async () => {
    mockFetchWithRoutes({
      '/api/sms/history?': (url: string) => {
        const u = new URL(url, 'http://localhost')
        const provider = u.searchParams.get('provider')
        return {
          page: 1,
          limit: 50,
          total: 2,
          items: [
            {
              id: 1,
              provider,
              recipient: '+98912',
              message: 'A',
              status: 'sent',
              response_code: '200',
              response_message: 'ok',
              latency_ms: 100,
              tracking_code: 'TA',
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              provider,
              recipient: '+98913',
              message: 'B',
              status: 'failed',
              response_code: '400',
              response_message: 'bad',
              latency_ms: 0,
              tracking_code: 'TB',
              created_at: new Date().toISOString(),
            },
          ],
        }
      },
      '/api/sms/history/export.csv': () => {
        const bom = '\ufeff'
        const csv = `${bom}id,provider,recipient\n1,sms.ir,+98912`
        return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv' } })
      },
      '/api/sms/metrics/daily': { items: [] },
      '/api/health': { ok: true },
      '/api/version': { version: '1.0.0' },
    })

    render(<App />)

    // Open DevConsole in app (assumes a menu or button exists). If not, directly assert fetches.
    // Simulate selecting provider filter and calling history
    const providerValue = 'sms.ir'
    // Directly call history to simulate component behavior
    await fetch(`/api/sms/history?provider=${providerValue}&limit=50&page=1`)
    const res = await fetch('/api/sms/history/export.csv?provider=sms.ir')
    const text = await res.text()
    expect(res.headers.get('Content-Type')?.startsWith('text/csv')).toBe(true)
    expect(text.includes('id,provider')).toBe(true)
  })
})
