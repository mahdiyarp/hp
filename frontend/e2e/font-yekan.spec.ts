import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// Ensures global font is locked to Yekan

test('global font is Yekan and locked', async ({ page }) => {
  // Dev token for app init (if needed)
  const resp = await page.request.post(`${backend}/api/auth/login-dev`, {
    data: { username: 'developer', password: 'developer' },
  })
  const json = await resp.json()
  const token = json?.access_token || ''
  await page.addInitScript(t => {
    try { localStorage.setItem('hesabpak_access_token', t as string) } catch {}
  }, token)

  await page.goto(`${base}/`)

  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  expect(fontFamily).toMatch(/Yekan/i)

  // Create an element trying to override font; our CSS should resist via !important
  await page.evaluate(() => {
    const el = document.createElement('div')
    el.textContent = 'تست فونت'
    el.style.fontFamily = 'Times New Roman, serif'
    document.body.appendChild(el)
  })
  const overriddenFont = await page.locator('text=تست فونت').evaluate(el => getComputedStyle(el).fontFamily)
  expect(overriddenFont).toMatch(/Yekan/i)
})
