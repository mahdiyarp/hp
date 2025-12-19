import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// Ensures header container is right-anchored (not centered) and matches main container seam

test('header container is right-anchored and matches main', async ({ page }) => {
  const resp = await page.request.post(`${backend}/api/auth/login-dev`, {
    data: { username: 'developer', password: 'developer' },
  })
  const json = await resp.json()
  const token = json?.access_token || ''
  await page.addInitScript(t => {
    try { localStorage.setItem('hesabpak_access_token', t as string) } catch {}
  }, token)

  await page.goto(`${base}/`)

  const headerContainer = page.locator('header .hp-container.hp-container-right').first()
  const mainContainer = page.locator('main .hp-container.hp-container-right').first()

  await expect(headerContainer).toBeVisible()
  await expect(mainContainer).toBeVisible()

  const hb = await headerContainer.boundingBox()
  const mb = await mainContainer.boundingBox()

  expect(hb).not.toBeNull()
  expect(mb).not.toBeNull()

  if (hb && mb) {
    const hRight = hb.x + hb.width
    const mRight = mb.x + mb.width
    // right edges should be nearly equal (<= 2px difference due to rounding)
    expect(Math.abs(hRight - mRight)).toBeLessThanOrEqual(2)
  }
})
