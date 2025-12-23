import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UsersModule from '../UsersModule'
import { ConfirmDialogTestWrapper } from '../../../tests/ConfirmDialogTestWrapper'

vi.mock('../../../services/api', async () => {
  const actual = await vi.importActual<any>('../../../services/api')
  return {
    ...actual,
    apiGet: vi.fn(async (path: string) => {
      if (path === '/api/users') return []
      if (path === '/api/roles') return [{ id: 1, name: 'Admin', description: '' }]
      if (path === '/api/permissions') return []
      if (path.startsWith('/api/admin/activity')) return []
      if (path.startsWith('/api/admin/settings')) return []
      if (path.startsWith('/api/users/preferences/sms')) return {}
      return []
    }),
    apiPost: vi.fn(async (path: string, body?: any) => {
      if (path === '/api/users') {
        return {
          id: 10,
          username: body.username,
          email: body.email ?? null,
          full_name: body.full_name ?? null,
          role_id: body.role_id ?? null,
          is_active: true,
        }
      }
      return {}
    }),
  }
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmDialogTestWrapper>
      <div dir="rtl">{children}</div>
    </ConfirmDialogTestWrapper>
  )
}

describe('UsersModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders UsersModule headings', async () => {
    render(<UsersModule />, { wrapper: Wrapper as any })
    expect(await screen.findByText(/کاربران و دسترسی‌ها/)).toBeInTheDocument()
    expect(screen.getByText(/فهرست کاربران، نقش، وضعیت و دسترسی‌ها/)).toBeInTheDocument()
  })

  it('can create a new user', async () => {
    const api = await import('../../../services/api')
    const apiPost = (api as any).apiPost as ReturnType<typeof vi.fn>

    render(<UsersModule />, { wrapper: Wrapper as any })

    const username = screen.getByPlaceholderText('نام کاربری')
    fireEvent.change(username, { target: { value: 'testuser' } })

    const createBtn = screen.getByText('ایجاد کاربر')
    fireEvent.click(createBtn)

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({ username: 'testuser' }),
      ),
    )
  })
})
