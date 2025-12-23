import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// Users → Activity report: verify filters and CSV export button.

test.describe('Settings → Users: activity report & CSV export', () => {
  test('shows activity table headers and exports CSV', async ({ page }) => {
    // Skip gracefully if backend isn't reachable (frontend-only runs).
    try {
      const health = await page.request.get(`${backend}/health`)
      if (!health.ok()) {
        test.skip(true, 'Skipping users activity E2E: backend not healthy')
      }
    } catch {
      test.skip(true, 'Skipping users activity E2E: backend not reachable')
    }

    // Login as developer to unlock Settings → Users
    const res = await page.request.post(`${backend}/api/auth/login-dev`, {
      data: { username: 'developer', password: 'developer' },
    })
    const json = await res.json()
    const token = json?.access_token as string
    expect(token && token.length > 10).toBeTruthy()

    await page.addInitScript(t => {
      try { localStorage.setItem('hesabpak_access_token', t as string) } catch {}
    }, token)
    await page.goto(`${base}/#settings-users`)

    // Headers of the activity table (verify a couple of unique ones)
    await expect(page.getByText('گزارش فعالیت کاربران')).toBeVisible()
    const activityTable = page.locator('table').filter({ has: page.locator('thead').locator('text=زمان') }).first()
    await expect(activityTable.locator('thead').locator('text=زمان').first()).toBeVisible()
    await expect(activityTable.locator('thead').locator('text=مسیر').first()).toBeVisible()

    // Filter controls presence
    await expect(page.getByPlaceholder('فیلتر کاربر')).toBeVisible()
    await expect(page.getByPlaceholder('فیلتر مسیر')).toBeVisible()
    await expect(page.getByPlaceholder('وضعیت (مثلا 200)')).toBeVisible()
    // Scope to the filter select labeled 'متد'
    const methodSelect = page.locator('select').filter({ hasText: 'متد' }).first()
    await expect(methodSelect).toBeVisible()

    // CSV export triggers a download (even if table is empty)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('خروجی CSV').click(),
    ])
    const suggested = await download.suggestedFilename()
    expect(suggested.toLowerCase().startsWith('activities_')).toBeTruthy()
  })
})
