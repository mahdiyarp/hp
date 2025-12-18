import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock API calls used by SalesModule
vi.mock('../services/api', () => {
  const apiGet = vi.fn(async (url: string) => {
    if (url.startsWith('/api/invoices')) {
      return []
    }
    if (url.startsWith('/api/payments')) {
      return { items: [] }
    }
    return {}
  })
  const apiPost = vi.fn(async () => ({}))
  const apiPut = vi.fn(async () => ({}))
  const apiDelete = vi.fn(async () => ({}))
  return { apiGet, apiPost, apiPut, apiDelete }
})

// Mock AuthContext for permissions
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, username: 'admin', role: 'Admin' } }),
}))

// Minimal i18n
vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fa', dir: 'rtl' }),
}))

import SalesModule from '../modules/SalesModule'

describe('Smoke: Sales module basic render', () => {
  it('renders headings and empty lists', async () => {
    const smartDate = { isoDate: '2025-12-18', jalali: '1404-09-27' }
    render(
      <SalesModule
        smartDate={smartDate as any}
        onSmartDateChange={() => {}}
        sync={null as any}
        user={{ username: 'admin', role: 'Admin' } as any}
        onNavigate={() => {}}
      />,
    )
    await waitFor(() => {
      // Expect Persian headings or section labels to exist
      const hasAnyHeading = !!document.body.querySelector('h2, h3')
      expect(hasAnyHeading).toBe(true)
    })
  })
})
