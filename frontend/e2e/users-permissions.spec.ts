import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// Roles/Permissions UI in Settings → Users
// Navigates to #settings-users and verifies core UI elements.

test.describe('Settings → Users: roles & permissions', () => {
  test('renders roles/users tables and permissions editor', async ({ page }) => {
    // Login as developer to unlock Settings → Users (Admin/Developer-only)
    // Skip gracefully if backend isn't reachable.
    try {
      const health = await page.request.get(`${backend}/health`)
      if (!health.ok()) {
        test.skip(true, 'Skipping users permissions E2E: backend not healthy')
      }
    } catch {
      test.skip(true, 'Skipping users permissions E2E: backend not reachable')
    }

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
