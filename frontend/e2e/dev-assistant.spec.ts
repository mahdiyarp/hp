import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

// Basic smoke for Developer Assistant module.
// Uses localhost defaults; skips only if backend is not reachable.

test('Developer Assistant toggles and replies', async ({ page }) => {
  // If backend is not reachable, skip gracefully (frontend-only runs).
  try {
    const health = await page.request.get(`${backend}/health`)
    if (!health.ok()) {
      test.skip(true, 'Skipping assistant E2E: backend not healthy')
    }
  } catch {
    test.skip(true, 'Skipping assistant E2E: backend not reachable')
  }

  // Dev login and inject token
  const resp = await page.request.post(`${backend}/api/auth/login-dev`, {
    data: { username: 'developer', password: 'developer' },
  })
  const json = await resp.json()
  const token = json?.access_token || ''
  await page.addInitScript(t => {
    try { localStorage.setItem('hesabpak_access_token', t as string) } catch {}
  }, token)

  await page.goto(`${base}/#dev-assistant`)
  await expect(page.getByRole('heading', { name: 'دستیار توسعه‌دهنده' })).toBeVisible()

  // Ensure enabled: if button says "فعال‌سازی", click it; otherwise it's already on
  const toggleBtn = page.getByRole('button', { name: /(فعال‌سازی|خاموش کردن)/ })
  const btnText = (await toggleBtn.textContent())?.trim() || ''
  if (/فعال‌سازی/.test(btnText)) {
    await toggleBtn.click()
  }

  // Send a simple help query
  const input = page.locator('textarea').first()
  await input.fill('کمک')
  const sendBtn = input.locator('xpath=following::button[normalize-space()="ارسال"][1]')
  await sendBtn.click()

  // Expect a reply box to appear
  await expect(page.getByText('پاسخ')).toBeVisible()
})
