// Simple Playwright check to assert the Audit Status Card is visible
const { chromium } = require('playwright')

async function run() {
  const baseUrl = process.argv[2] || 'http://localhost:3000'
  const browser = await chromium.launch()
  const page = await browser.newPage()
  console.log(`Navigating to ${baseUrl}`)
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 })
  // Attempt minimal login flow if needed
  try {
    const loginButton = await page.$('button:has-text("ورود")')
    if (loginButton) await loginButton.click()
    const mobileModeToggle = await page.$('button:has-text("ورود با موبایل")')
    if (mobileModeToggle) await mobileModeToggle.click()
    const phoneInput = await page.$('input[type="tel"], input[name="mobile"], input[placeholder*="موبایل"], input[placeholder*="شماره"]')
    if (phoneInput) await phoneInput.fill('09123506545')
    const sendOtpBtn = await page.$('button:has-text("ارسال کد")') || await page.$('button:has-text("ارسال OTP")')
    if (sendOtpBtn) await sendOtpBtn.click()
    await page.waitForTimeout(1500)
    const verifyBtn = await page.$('button:has-text("تایید")') || await page.$('button:has-text("ورود")')
    if (verifyBtn) await verifyBtn.click()
    await page.waitForTimeout(2000)
  } catch {}
  // If batch is not present, trigger build and wait
  try {
    await page.click('text=ساخت Batch', { timeout: 3000 })
    await page.waitForTimeout(1500)
  } catch {}
  // Wait for merkle root text to appear
  try {
    await page.waitForSelector('text=مرکل‌روت', { timeout: 10000 })
  } catch {}
  // wait up to 10s for audit card text to appear
  let visible = false
  try {
    await page.waitForSelector('text=وضعیت ممیزی زنجیره', { timeout: 10000 })
    visible = true
  } catch {
    const text = await page.textContent('body').catch(()=> '')
    visible = /وضعیت ممیزی زنجیره/.test(text || '')
  }
  console.log(`Audit card visible: ${visible}`)
  // capture screenshot
  await page.screenshot({ path: '/workspace/logs/audit_card.png', fullPage: true }).catch(()=>{})
  await browser.close()
  if (!visible) {
    process.exitCode = 1
  }
}

run().catch(err => { console.error(err); process.exitCode = 1 })
