import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:8080'

test('navigates to Settings → Users via hash', async ({ page }) => {
  await page.goto(`${base}/#settings-users`)
  await expect(page.getByText('کاربران و دسترسی‌ها')).toBeVisible()
})
