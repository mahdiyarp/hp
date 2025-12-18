import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock API layer used by PeopleModule
vi.mock('../services/api', () => {
  const apiGet = vi.fn(async (url: string) => {
    if (url.startsWith('/api/persons/balances')) {
      return { balances: [] }
    }
    if (url.startsWith('/api/persons')) {
      return []
    }
    return {}
  })
  const apiPost = vi.fn(async () => ({}))
  const apiPut = vi.fn(async () => ({}))
  const apiDelete = vi.fn(async () => ({}))
  return { apiGet, apiPost, apiPut, apiDelete }
})

// Mock AuthContext to provide an Admin user
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, username: 'admin', role: 'Admin', otp_enabled: false } }),
}))

// Minimal i18n mock
vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fa', dir: 'rtl' }),
}))

import PeopleModule from '../modules/PeopleModule'

describe('Smoke: People module basic render', () => {
  it('renders heading and empty state without errors', async () => {
    const smartDate = { isoDate: '2025-12-18', jalali: '1404-09-27' }
    render(
      <PeopleModule
        smartDate={smartDate as any}
        onSmartDateChange={() => {}}
        sync={null as any}
        user={{ username: 'admin', role: 'Admin' } as any}
        onNavigate={() => {}}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText(/مدیریت طرف‌های حساب/)).toBeInTheDocument()
    })
  })
})
