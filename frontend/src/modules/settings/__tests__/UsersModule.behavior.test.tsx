import React from 'react'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import UsersModule from '../UsersModule'
import { ConfirmDialogTestWrapper } from '../../../tests/ConfirmDialogTestWrapper'

// Mock API layer used by UsersModule (define inside factory to avoid hoist issues)
vi.mock('../../../services/api', () => {
  const mock = {
    apiGet: vi.fn(async (path: string) => {
      if (path === '/api/users') return []
      if (path === '/api/roles') return [{ id: 1, name: 'مدیر', description: '' }]
      if (path === '/api/permissions') return []
      if (path.startsWith('/api/admin/activity')) return []
      if (path === '/api/admin/settings') return []
      if (path === '/api/users/preferences/sms') return {}
      if (path === '/api/users/permissions') return {}
      return []
    }),
    apiPost: vi.fn(async (path: string, payload?: any) => {
      if (path === '/api/roles')
        return { id: 2, name: payload?.name ?? '', description: payload?.description ?? '' }
      if (path.startsWith('/api/roles/') && path.endsWith('/permissions')) return { ok: true }
      if (path === '/api/smsir/test-otp') return { detail: 'sent' }
      if (path === '/api/sms/test') return { detail: 'sent' }
      if (path === '/api/admin/users/invite') return { ok: true }
      return { ok: true }
    }),
    apiPatch: vi.fn(async (path: string, payload?: any) => {
      if (path.startsWith('/api/roles/')) {
        const id = Number(path.split('/').pop())
        return { id, name: payload?.name ?? '', description: payload?.description ?? '' }
      }
      if (path.startsWith('/api/users/')) {
        const id = Number(path.split('/').pop())
        return {
          id,
          username: payload?.username ?? 'user',
          email: payload?.email ?? null,
          full_name: payload?.full_name ?? null,
          role_id: payload?.role_id ?? null,
          is_active: true,
        }
      }
      return { ok: true }
    }),
    apiDelete: vi.fn(async () => ({ ok: true })),
    apiPut: vi.fn(async () => ({ ok: true })),
  }
  ;(globalThis as any).__users_api_mock = mock
  return mock
})

const alertMock = vi.fn()

beforeAll(() => {
  vi.stubGlobal('alert', alertMock)
})

beforeEach(() => {
  alertMock.mockClear()
})

const RtlWrapper = ({ children }: { children: React.ReactNode }) => (
  <ConfirmDialogTestWrapper>
    <div dir="rtl">{children}</div>
  </ConfirmDialogTestWrapper>
)

describe('UsersModule behavior', () => {
  it('creates a role and resets form', async () => {
    render(<UsersModule />, { wrapper: RtlWrapper as any })
    // Wait initial section
    await screen.findByText('نقش‌ها')
    const nameInput = screen.getByPlaceholderText('نام نقش') as HTMLInputElement
    const descInput = screen.getByPlaceholderText('توضیح') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'حسابدار' } })
    fireEvent.change(descInput, { target: { value: 'نقش مالی' } })
    fireEvent.click(screen.getByText('ایجاد نقش'))

    await waitFor(() => {
      expect((globalThis as any).__users_api_mock.apiPost).toHaveBeenCalledWith(
        '/api/roles',
        { name: 'حسابدار', description: 'نقش مالی' },
      )
    })
    // Form resets
    expect(nameInput.value).toBe('')
    expect(descInput.value).toBe('')
  })

  it('saves SMS settings by writing keys', async () => {
    render(<UsersModule />, { wrapper: RtlWrapper as any })
    await screen.findByText('پنل SMS و ناتیفیکیشن‌ها')
    vi.useFakeTimers()
    const apiKey = screen.getAllByPlaceholderText('API Key')[0] as HTMLInputElement
    const lineInput = screen.getByPlaceholderText('شماره ارسال کننده') as HTMLInputElement
    const otpTpl = screen.getByPlaceholderText('OTP Template ID (sms.ir)') as HTMLInputElement

    fireEvent.change(apiKey, { target: { value: 'KEY123' } })
    fireEvent.change(lineInput, { target: { value: '3000' } })
    fireEvent.change(otpTpl, { target: { value: '42' } })

    try {
      await act(async () => {
        vi.runAllTimers()
      })

      await Promise.resolve()
      const m = (globalThis as any).__users_api_mock
      expect(m.apiPut).toHaveBeenCalledWith('/api/admin/settings/smsir_api_key', { value: 'KEY123' })
      expect(m.apiPut).toHaveBeenCalledWith('/api/admin/settings/smsir_line_number', { value: '3000' })
      expect(m.apiPut).toHaveBeenCalledWith('/api/admin/settings/smsir_otp_template_id', { value: '42' })
      expect(m.apiPut).toHaveBeenCalledWith('/api/admin/settings/smsir_enabled', { value: 'true' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('sends test SMS via sms.ir when configured', async () => {
    render(<UsersModule />, { wrapper: RtlWrapper as any })
    await screen.findByText('پنل SMS و ناتیفیکیشن‌ها')
    const providerSelect = screen.getAllByDisplayValue('sms.ir')[0] as HTMLSelectElement
    const apiKey = screen.getAllByPlaceholderText('API Key')[0] as HTMLInputElement
    const toInput = screen.getByPlaceholderText('شماره گیرنده (مثال: 0912xxxxxxx)') as HTMLInputElement

    fireEvent.change(providerSelect, { target: { value: 'sms.ir' } })
    fireEvent.change(apiKey, { target: { value: 'KEY123' } })
    fireEvent.change(toInput, { target: { value: '09121234567' } })

    fireEvent.click(screen.getByText('ارسال OTP تستی'))

    await waitFor(() => {
      expect((globalThis as any).__users_api_mock.apiPost).toHaveBeenCalledWith(
        '/api/smsir/test-otp',
        { mobile: '09121234567', code: '123456' },
      )
    })
  })
})
