import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock API layer to avoid network during App bootstrap
vi.mock('../services/api', () => {
  const apiGet = vi.fn(async (url: string) => {
    if (url.startsWith('/api/time/now')) {
      return { utc: new Date().toISOString(), server_offset_seconds: 0, epoch_ms: Date.now() }
    }
    if (url.startsWith('/api/financial/auto-context')) {
      return { context: { current_jalali: { formatted: '1404-01-01' } } }
    }
    if (url.startsWith('/api/version')) {
      return { version: 'test' }
    }
    // UsersModule fetches; return empty collections
    if (url.startsWith('/api/users')) return []
    if (url.startsWith('/api/roles')) return []
    if (url.startsWith('/api/permissions')) return []
    if (url.startsWith('/api/admin/activity')) return []
    if (url.startsWith('/api/admin/settings')) return []
    return {}
  })
  const apiPost = vi.fn(async () => ({}))
  const apiPatch = vi.fn(async () => ({}))
  const apiPut = vi.fn(async () => ({}))
  const apiDelete = vi.fn(async () => ({}))
  return { apiGet, apiPost, apiPatch, apiPut, apiDelete }
})

// Mock org features fetch
vi.mock('../services/org', () => ({ getOrgFeatures: async () => ({ features: [] }) }))

// Mock i18n context used by AppShell
vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'fa', dir: 'rtl' }),
}))

// Mock auth context to indicate we are logged in as Admin
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'admin', role: 'Admin', otp_enabled: false },
    modules: ['settings-users'],
    permissions: [],
    logout: vi.fn(),
    setUser: vi.fn(),
    login: vi.fn(),
    loginPhone: vi.fn(),
  }),
}))

// Ensure the modules list contains our target and is visible
vi.mock('../modules', async (orig) => {
  const actual = await (orig as any)()
  // keep other modules but ensure settings-users exists and is not hidden
  const list = Array.isArray(actual.modules) ? actual.modules : []
  const hasUsers = list.some((m: any) => m.id === 'settings-users')
  const usersModule = hasUsers
    ? list.find((m: any) => m.id === 'settings-users')
    : { id: 'settings-users', label: 'کاربران', description: '', component: (await import('../modules/settings/UsersModule')).default }
  const normalized = [{ ...usersModule, hidden: false }, ...list.filter((m: any) => m.id !== 'settings-users')]
  return { modules: normalized }
})

import App from '../App'

describe('Smoke: navigation to #settings-users', () => {
  it('renders Users module when hash is set', async () => {
    window.location.hash = '#settings-users'
    render(<App />)
    await waitFor(() => {
      // UsersModule top heading
      expect(screen.getByText(/کاربران و دسترسی‌ها/)).toBeInTheDocument()
    })
  })
})
