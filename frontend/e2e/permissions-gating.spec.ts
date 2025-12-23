import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'

// This test fakes backend endpoints to isolate permission-based gating.
// User role: User (no bypass). Features include 'reports'. Modules include 'reports'.
// Permissions: empty → Reports should be hidden.

test('permissions gating hides Reports without reports:view', async ({ page }) => {
  // Fake token and API endpoints
  await page.addInitScript(() => {
    try { localStorage.setItem('hesabpak_access_token', 'fake.token.payload') } catch {}
  })

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, username: 'user1', role: 'User', otp_enabled: false }),
    })
  })
  await page.route('**/api/current-user/modules', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(['dashboard', 'reports']),
    })
  })
  await page.route('**/api/current-user/permissions', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/org/features', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ features: ['reports'] }),
    })
  })
  await page.route('**/api/reports/pnl**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })

  await page.goto(base)
  await page.waitForLoadState('domcontentloaded')

  // Sidebar should NOT show Reports label
  await expect(page.getByText('گزارش‌ها و تحلیل‌ها')).toHaveCount(0)
})
