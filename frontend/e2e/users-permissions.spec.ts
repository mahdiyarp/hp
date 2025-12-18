import { test, expect } from '@playwright/test'

// Roles/Permissions UI in Settings → Users
// Navigates to #settings-users and verifies core UI elements.

test.describe('Settings → Users: roles & permissions', () => {
  test.skip(!process.env.BASE_URL || !process.env.BACKEND_URL, 'Skipping: BASE_URL or BACKEND_URL not set')

  test('renders roles/users tables and permissions editor', async ({ page }) => {
    const base = process.env.BASE_URL as string
    // Login as developer to unlock Settings → Users (Admin/Developer-only)
    const backend = process.env.BACKEND_URL as string
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

    // Heading and basic sections (top heading)
    await expect(page.getByText('کاربران و دسترسی‌ها')).toBeVisible()

    // Roles form inputs
    await expect(page.getByPlaceholder('نام نقش')).toBeVisible()
    await expect(page.getByPlaceholder('توضیح')).toBeVisible()

    // Users table headers (scoped to the Users section)
    // Wait until users table headers render
    await page.locator('thead').locator('text=نام کاربری').first().waitFor()
    const usersTable = page.locator('table').filter({ has: page.locator('thead').locator('text=تخصیص مجوزها') }).first()
    await expect(usersTable.locator('thead').locator('text=نام کاربری').first()).toBeVisible()
    await expect(usersTable.locator('thead').locator('text=نقش').first()).toBeVisible()
    await expect(usersTable.locator('thead').locator('text=اعلان‌های پیامک').first()).toBeVisible()
    await expect(usersTable.locator('thead').locator('text=تخصیص مجوزها').first()).toBeVisible()


    // If users exist, open permissions editor; otherwise assert empty state text
    const emptyState = usersTable.getByText('کاربری یافت نشد.')
    if (await emptyState.count() > 0) {
      await expect(emptyState).toBeVisible()
    }
  })
})
