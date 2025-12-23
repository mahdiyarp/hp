import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// Ensures header container is right-anchored (not centered) and matches main container seam

test('header container is right-anchored and matches main', async ({ page }) => {
  // Keep viewport deterministic to avoid layout differences across workers/CI
  await page.setViewportSize({ width: 1280, height: 720 })

  const resp = await page.request.post(`${backend}/api/auth/login-dev`, {
    data: { username: 'developer', password: 'developer' },
  })
  const json = await resp.json()
  const token = json?.access_token || ''
  await page.addInitScript(t => {
    try { localStorage.setItem('hesabpak_access_token', t as string) } catch {}
  }, token)

  await page.goto(`${base}/`)

  // Wait for the app to finish bootstrapping (prevents measuring while "در حال راه‌اندازی سیستم..." is shown)
  await expect(page.locator('button:has-text("خروج از سیستم")')).toBeVisible({ timeout: 15_000 })
  await page.waitForLoadState('networkidle')

  const headerContainer = page.locator('header .hp-container.hp-container-right').first()
  const mainContainer = page.locator('main .hp-container.hp-container-right').first()

  await expect(headerContainer).toBeVisible()
  await expect(mainContainer).toBeVisible()

  await expect
    .poll(
      async () => {
        const hb = await headerContainer.boundingBox()
        const mb = await mainContainer.boundingBox()
        if (!hb || !mb) return null
        const hRight = hb.x + hb.width
        const mRight = mb.x + mb.width
        return Math.abs(hRight - mRight)
      },
      { timeout: 5_000 },
    )
    .toBeLessThanOrEqual(2)
})
