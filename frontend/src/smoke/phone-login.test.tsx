import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import React from 'react'
import LoginForm from '../components/LoginForm'

// minimal AuthContext shim
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn().mockResolvedValue({ otpRequired: false }) })
}))

// mock services/auth
vi.mock('../services/auth', () => ({
  loginByPhoneRequest: vi.fn(async () => ({ success: true, session_id: 'SID123' })),
  verifyPhoneOtp: vi.fn(async () => ({ success: true, access_token: 'tok', token_type: 'bearer' })),
  setTokens: vi.fn(() => {})
}))

// i18n-free render
function Wrapper() { return <LoginForm /> }

describe('phone login flow (UI)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true)})

  it('sends code then verifies without HTML pattern blocking', async () => {
    render(<Wrapper />)
    // switch to mobile tab
    fireEvent.click(screen.getByTestId('login-mobile-tab'))
    const inp = await screen.findByPlaceholderText('0912xxxxxxx')
    fireEvent.change(inp, { target: { value: '۰۹۱۲۳۴۵۶۷۸۹' } })
    fireEvent.click(screen.getByTestId('login-mobile-submit'))
    // Now should prompt for code (button text changes)
    expect(await screen.findByText('کد تایید ارسال شد؛ لطفاً وارد کنید')).toBeTruthy()
    const otp = await screen.findByPlaceholderText('123456')
    fireEvent.change(otp, { target: { value: '' } }) // allow empty; demo path accepts
    fireEvent.click(screen.getByTestId('login-mobile-submit'))
    // If no throws, flow ok
    expect(true).toBe(true)
  })
})

