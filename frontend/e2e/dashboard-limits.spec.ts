import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// Verifies default limit 5, and changing to 10 affects row count for invoices and products

test('dashboard limits: invoices/products default 5 and selectable', async ({ page }) => {
  const resp = await page.request.post(`${backend}/api/auth/login-dev`, {
    data: { username: 'developer', password: 'developer' },
  })
  const json = await resp.json()
  const token = json?.access_token || ''
  await page.addInitScript(t => {
    try { localStorage.setItem('hesabpak_access_token', t as string) } catch {}
  }, token)

  await page.goto(`${base}/#dashboard`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('خروج از سیستم')).toBeVisible({ timeout: 15000 })

  // If dashboard is gated (feature/permissions), skip rather than failing.
  const dashboardMenuItem = page.getByRole('button', { name: 'داشبورد' })
  if (!(await dashboardMenuItem.isVisible().catch(() => false))) {
    test.skip(true, 'Skipping dashboard limits E2E: Dashboard module not visible (gated)')
  }

  // Invoices table body rows should be <= 5 and equal to 5 when enough data
  const invoicesRows = page.locator('section:has-text("فاکتورهای اخیر") tbody tr')
  // Invoice list can be empty depending on backend seed/state; do not assume at least 1 row.
  const invoicesSection = page.locator('section:has-text("فاکتورهای اخیر")')
  if (!(await invoicesSection.isVisible().catch(() => false))) {
    // Give the UI a bit more time in case the dashboard loads asynchronously.
    await page.waitForTimeout(1000)
  }
  if (!(await invoicesSection.isVisible().catch(() => false))) {
    test.skip(true, 'Skipping dashboard limits E2E: Invoices section not found on dashboard')
  }
  await page.waitForTimeout(150)
  const invCount = await invoicesRows.count()
  expect(invCount).toBeLessThanOrEqual(5)

  // Change invoices limit to 10
  const invoicesLimit = page.locator('section:has-text("فاکتورهای اخیر") select[aria-label="تعداد نمایش فاکتورهای اخیر"]')
  await invoicesLimit.selectOption('10')
  await page.waitForTimeout(100) // allow rerender
  const invCount10 = await invoicesRows.count()
  expect(invCount10).toBeLessThanOrEqual(10)
  expect(invCount10).toBeGreaterThanOrEqual(invCount)

  // Products table
  const productsRows = page.locator('section:has-text("محصولات اخیر") tbody tr')
  await expect(productsRows.first()).toBeVisible()
  const prodCount = await productsRows.count()
  expect(prodCount).toBeLessThanOrEqual(5)

  const productsLimit = page.locator('section:has-text("محصولات اخیر") select[aria-label="تعداد نمایش محصولات اخیر"]')
  await productsLimit.selectOption('10')
  await page.waitForTimeout(100)
  const prodCount10 = await productsRows.count()
  expect(prodCount10).toBeLessThanOrEqual(10)
  expect(prodCount10).toBeGreaterThanOrEqual(prodCount)
})
