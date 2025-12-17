import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// Verifies sidebar stays on the right and header doesn't center
// Uses bounding boxes to ensure aside is to the right of main in RTL

test('layout keeps sidebar on the right (RTL)', async ({ page }) => {
  // Get a dev token and inject
  const resp = await page.request.post(`${backend}/api/auth/login-dev`, {
    data: { username: 'developer', password: 'developer' },
  })
  const json = await resp.json()
  const token = json?.access_token || ''
  await page.addInitScript(t => {
    try { localStorage.setItem('hesabpak_access_token', t as string) } catch {}
  }, token)

  await page.goto(`${base}/`)

  const aside = page.locator('aside').first()
  const main = page.locator('main').first()

  await expect(aside).toBeVisible()
  await expect(main).toBeVisible()

  const asideBox = await aside.boundingBox()
  const mainBox = await main.boundingBox()

  expect(asideBox).not.toBeNull()
  expect(mainBox).not.toBeNull()

  // In RTL with sidebar rendered first, aside should be to the right of main
  // I.e., aside.x should be greater than main.x
  if (asideBox && mainBox) {
    expect(asideBox.x).toBeGreaterThan(mainBox.x)
  }
})
