import { test, expect } from '@playwright/test'

// Users → Activity report: verify filters and CSV export button.

test.describe('Settings → Users: activity report & CSV export', () => {
  test.skip(!process.env.BASE_URL || !process.env.BACKEND_URL, 'Skipping: BASE_URL or BACKEND_URL not set')

  test('shows activity table headers and exports CSV', async ({ page }) => {
    const base = process.env.BASE_URL as string
    const backend = process.env.BACKEND_URL as string

    // Login as developer to unlock Settings → Users
    const res = await page.request.post(`${backend}/api/auth/login-dev`, {
      data: { mobile: '09123506545', password: '09123506545' },
    })
    const json = await res.json()
    const token = json?.access_token as string
    expect(token && token.length > 10).toBeTruthy()

    await page.goto(base)
    await page.waitForLoadState('domcontentloaded')
    await page.evaluate((t) => { localStorage.setItem('hesabpak_access_token', t as any) }, token)
    await page.reload()
    await page.evaluate(() => { window.location.hash = '#settings-users' })

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
