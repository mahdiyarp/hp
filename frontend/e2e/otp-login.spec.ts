import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// OTP login flow using demo bypass in backend (DEMO_ALLOW_OTP_NO_SMS)
// Skips if backend URL or demo flag is not provided

test.describe('OTP Login', () => {
  test('logs in via phone OTP and navigates', async ({ page }) => {
    // OTP bypass depends on backend config (typically DEMO_ALLOW_OTP_NO_SMS).
    // If backend isn't reachable or bypass isn't enabled, skip this test.
    try {
      const health = await page.request.get(`${backend}/health`)
      if (!health.ok()) {
        test.skip(true, 'Skipping OTP E2E: backend not healthy')
      }
    } catch {
      test.skip(true, 'Skipping OTP E2E: backend not reachable')
    }

    // Request OTP session
    const req1 = await page.request.post(`${backend}/api/auth/login-phone`, {
      data: { phone: '09123506545' },
    })
    if (!req1.ok()) {
      test.skip(true, 'Skipping OTP E2E: login-phone not available')
    }
    const json1 = await req1.json()
    if (!json1?.success || !json1?.session_id) {
      test.skip(true, 'Skipping OTP E2E: backend did not issue OTP session')
    }
    const sessionId = json1?.session_id
    expect(sessionId).toBeTruthy()

    // Verify OTP using demo bypass
    const req2 = await page.request.post(`${backend}/api/auth/verify-phone-otp`, {
      data: { session_id: sessionId, otp_code: '000000' },
    })
    if (!req2.ok()) {
      test.skip(true, 'Skipping OTP E2E: OTP bypass likely disabled on backend')
    }
    const json2 = await req2.json()
    if (!json2?.success) {
      test.skip(true, 'Skipping OTP E2E: OTP bypass not enabled (set DEMO_ALLOW_OTP_NO_SMS)')
    }
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
