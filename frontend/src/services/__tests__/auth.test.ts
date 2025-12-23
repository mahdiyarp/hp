import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  login,
  verifyPhoneOtp,
  loginDeveloper,
  getAccessToken,
  clearTokens,
} from '../auth'

describe('auth service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('returns otpRequired on 428 login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 428,
      json: async () => ({ detail: 'OTP required' }),
    })) as any)

    const res = await login('u', 'p')
    expect(res).toEqual({ otpRequired: true })
  })

  it('sets tokens on verifyPhoneOtp success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, access_token: 'A', refresh_token: 'R', token_type: 'bearer' }),
    })) as any)

    const res = await verifyPhoneOtp('sid', '123456')
    expect(res.success).toBe(true)
    expect(getAccessToken()).toBe('A')
  })

  it('loginDeveloper stores tokens when backend responds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: 'DEV_A', refresh_token: 'DEV_R' }),
    })) as any)

    await loginDeveloper()
    expect(getAccessToken()).toBe('DEV_A')
    clearTokens()
    expect(getAccessToken()).toBeNull()
  })
})
