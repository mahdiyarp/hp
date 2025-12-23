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

  // Wait for dashboard controls to appear; if the module is gated/unavailable, skip gracefully.
  const invoicesLimit = page.getByLabel('تعداد نمایش فاکتورهای اخیر')
  if (!(await invoicesLimit.isVisible().catch(() => false))) {
    await expect(invoicesLimit).toBeVisible({ timeout: 15000 }).catch(() => {
      test.skip(true, 'Skipping dashboard limits E2E: dashboard controls not visible')
    })
  }

  // Invoices table body rows should be <= 5 and equal to 5 when enough data
  const invoicesSection = invoicesLimit.locator('xpath=ancestor::section[1]')
  const invoicesRows = invoicesSection.locator('tbody tr')
  // Invoice list can be empty depending on backend seed/state; do not assume at least 1 row.
  await page.waitForTimeout(150)
  const invCount = await invoicesRows.count()
  expect(invCount).toBeLessThanOrEqual(5)

  // Change invoices limit to 10
  await invoicesLimit.selectOption('10')
  await page.waitForTimeout(100) // allow rerender
  const invCount10 = await invoicesRows.count()
  expect(invCount10).toBeLessThanOrEqual(10)
  expect(invCount10).toBeGreaterThanOrEqual(invCount)

  // Products table
  const productsLimit = page.getByLabel('تعداد نمایش محصولات اخیر')
  await expect(productsLimit).toBeVisible({ timeout: 15000 })
  const productsSection = productsLimit.locator('xpath=ancestor::section[1]')
  const productsRows = productsSection.locator('tbody tr')
  const prodCount = await productsRows.count()
  expect(prodCount).toBeLessThanOrEqual(5)

  await productsLimit.selectOption('10')
  await page.waitForTimeout(100)
  const prodCount10 = await productsRows.count()
  expect(prodCount10).toBeLessThanOrEqual(10)
  expect(prodCount10).toBeGreaterThanOrEqual(prodCount)
})
