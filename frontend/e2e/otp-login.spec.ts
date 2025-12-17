import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// OTP login flow using demo bypass in backend (DEMO_ALLOW_OTP_NO_SMS)
// Skips if backend URL or demo flag is not provided

test.describe('OTP Login', () => {
  test.skip(!process.env.BACKEND_URL || !process.env.DEMO_ALLOW_OTP_NO_SMS, 'Skipping OTP E2E: BACKEND_URL or DEMO_ALLOW_OTP_NO_SMS not set')

  test('logs in via phone OTP and navigates', async ({ page }) => {
    // Request OTP session
    const req1 = await page.request.post(`${backend}/api/auth/login-phone`, {
      data: { phone: '09123506545' },
    })
    const json1 = await req1.json()
    expect(json1?.success).toBeTruthy()
    const sessionId = json1?.session_id
    expect(sessionId).toBeTruthy()

    // Verify OTP using demo bypass
    const req2 = await page.request.post(`${backend}/api/auth/verify-phone-otp`, {
      data: { session_id: sessionId, otp_code: '000000' },
    })
    const json2 = await req2.json()
    expect(json2?.success).toBeTruthy()
    const token = json2?.access_token || ''
    expect(token.length).toBeGreaterThan(10)

    // Inject token and navigate
    await page.addInitScript(t => {
      try { localStorage.setItem('hesabpak_access_token', t as string) } catch {}
    }, token)
    await page.goto(`${base}/#settings-users`)
    await expect(page.getByText('کاربران و دسترسی‌ها')).toBeVisible()
  })
})
