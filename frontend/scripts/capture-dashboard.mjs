import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
const OUT_DIR = path.resolve('screenshots')
const OUT_FILE = path.join(OUT_DIR, 'dashboard.png')

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

  // Get dev token
  const resp = await page.request.post(`${BACKEND_URL}/api/auth/login-dev`, {
    data: { username: 'developer', password: 'developer' },
  })
  const json = await resp.json()
  const token = json?.access_token || ''

  // Inject token before navigation
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('hesabpak_access_token', t)
    } catch {}
  }, token)

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Ensure main dashboard rendered
  await page.waitForSelector('header .hp-container', { timeout: 5000 })

  await page.screenshot({ path: OUT_FILE, fullPage: true })
  await browser.close()
  console.log(`Saved screenshot: ${OUT_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
