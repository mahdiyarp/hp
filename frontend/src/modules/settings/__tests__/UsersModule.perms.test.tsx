import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import UsersModule from '../UsersModule'
import { ConfirmDialogTestWrapper } from '../../../tests/ConfirmDialogTestWrapper'

const RtlWrapper = ({ children }: { children: React.ReactNode }) => (
  <ConfirmDialogTestWrapper>
    <div dir="rtl">{children}</div>
  </ConfirmDialogTestWrapper>
)

vi.mock('../../../services/api', () => {
  const mock = {
    apiGet: vi.fn(async (path: string) => {
      if (path === '/api/users') return [{ id: 7, username: 'ali', email: null, full_name: null, role_id: 1, is_active: true }]
      if (path === '/api/roles') return [{ id: 1, name: 'مدیر', description: '' }]
      if (path === '/api/permissions') return [
        { id: 10, name: 'permA', description: '', module: 'core' },
        { id: 11, name: 'permB', description: '', module: 'core' },
      ]
      if (path.startsWith('/api/admin/activity')) return []
      if (path === '/api/admin/settings') return []
      if (path === '/api/users/preferences/sms') return {}
      if (path === '/api/users/permissions') return {}
      return []
    }),
    apiPost: vi.fn(async (path: string, payload?: any) => ({ ok: true })),
    apiPatch: vi.fn(async (path: string, payload?: any) => ({ ok: true })),
    apiDelete: vi.fn(async () => ({ ok: true })),
    apiPut: vi.fn(async () => ({ ok: true })),
  }
  ;(globalThis as any).__users_api_mock_perms = mock
  return mock
})

describe('UsersModule permission save to role', () => {
  it('collects checked perms and posts to role endpoint', async () => {
    render(<UsersModule />, { wrapper: RtlWrapper as any })
    await screen.findByRole('heading', { name: 'کاربران' })
    await screen.findByText('ali')
    vi.useFakeTimers()
    try {
      // Expand permission editor for the user row
      const row = screen.getByText('ali').closest('tr') as HTMLTableRowElement
      const permsCell = row.querySelectorAll('td')[7] // column index for permission editor
      const details = within(permsCell).getByText('مشاهده/ویرایش مجوزها')
      fireEvent.click(details)

      // Toggle both permissions
      const permA = screen.getByLabelText('permA')
      const permB = screen.getByLabelText('permB')
      fireEvent.click(permA)
      fireEvent.click(permB)

      await act(async () => {
        vi.runAllTimers()
      })

      await Promise.resolve()
      expect((globalThis as any).__users_api_mock_perms.apiPost).toHaveBeenCalledWith(
        '/api/roles/1/permissions',
        [10, 11],
      )
    } finally {
      vi.useRealTimers()
    }
  })
})
