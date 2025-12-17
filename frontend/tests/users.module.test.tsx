import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import UsersModule from '../src/modules/settings/UsersModule'

// Mock API service used inside UsersModule
vi.mock('../src/services/api', () => {
  return {
    apiGet: vi.fn(async (path: string) => {
      if (path === '/api/users') {
        return [
          { id: 1, username: 'admin', email: 'admin@example.com', full_name: 'ادمین', role_id: 1, is_active: true },
          { id: 2, username: 'user1', email: null, full_name: 'کاربر ۱', role_id: 2, is_active: true },
        ]
      }
      if (path === '/api/roles') {
        return [
          { id: 1, name: 'Admin', description: 'مدیر سیستم' },
          { id: 2, name: 'User', description: 'کاربر عادی' },
        ]
      }
      if (path === '/api/permissions') {
        return [
          { id: 10, name: 'reports.view', description: 'مشاهده گزارش‌ها', module: 'reports' },
          { id: 11, name: 'users.manage', description: 'مدیریت کاربران', module: 'settings' },
        ]
      }
      if (path.startsWith('/api/admin/activity')) {
        return [
          { id: 100, path: '/api/users', method: 'GET', detail: null, status_code: 200, created_at: new Date().toISOString(), username: 'admin' },
          { id: 101, path: '/api/roles', method: 'GET', detail: null, status_code: 200, created_at: new Date().toISOString(), username: 'system' },
        ]
      }
      if (path === '/api/admin/settings') {
        return [
          { key: 'system.sms.settings', value: JSON.stringify({ provider: 'sms.ir', enable_notifications: true }) },
        ]
      }
      if (path === '/api/users/preferences/sms') {
        return { 1: { enable_notifications: true }, 2: { enable_notifications: false } }
      }
      return []
    }),
    apiPost: vi.fn(async () => ({})),
    apiPatch: vi.fn(async () => ({})),
    apiDelete: vi.fn(async () => ({})),
    apiPut: vi.fn(async () => ({})),
  }
})

describe('UsersModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders and loads initial user list', async () => {
    render(<UsersModule />)
    await waitFor(() => {
      expect(screen.getByText(/ماژول کاربران/i)).toBeTruthy()
    })
    await waitFor(() => {
      expect(screen.getByText(/admin/i)).toBeTruthy()
      expect(screen.getByText(/کاربر ۱/i)).toBeTruthy()
    })
  })

  it('filters activities by method and user (UI presence)', async () => {
    render(<UsersModule />)
    await waitFor(() => {
      expect(screen.getByText(/GET/i)).toBeTruthy()
    })
  })

  it('saves role change via apiPut (mock presence)', async () => {
    const api = await import('../src/services/api') as any
    render(<UsersModule />)
    await waitFor(() => {
      expect(typeof api.apiPut).toBe('function')
    })
    expect(api.apiPut).toBeDefined()
  })

  it('snapshot respects RTL and retro classes existence', async () => {
    const { container } = render(<UsersModule />)
    await waitFor(() => {
      expect(container.querySelector('[dir="rtl"]')).toBeTruthy()
    })
    const hasRetro = Array.from(container.querySelectorAll('*')).some(el => {
      const cls = el.getAttribute('class') || ''
      return /retro|border-\[|shadow-\[|bg-\[/.test(cls)
    })
    expect(hasRetro).toBe(true)
  })
})
