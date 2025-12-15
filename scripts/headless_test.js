const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const outLogs = [];
  const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Silence noisy 404s for optional audit endpoints during tests
  try {
    await page.route('**/api/audit/otp/batch/latest', route => {
      route.fulfill({ status: 204, contentType: 'application/json', body: '{}' })
    })
  } catch {}

  page.on('console', msg => {
    try { outLogs.push({type: msg.type(), text: msg.text()}); } catch(e){}
  });
  page.on('pageerror', err => {
    outLogs.push({type: 'pageerror', text: String(err && err.stack ? err.stack : err)});
  });

  try {
    const argUrl = process.argv[2];
    const envUrl = process.env.BASE_URL;
    const url = argUrl || envUrl || 'http://localhost:3000';
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Basic availability check: ensure root element exists
    await page.waitForSelector('#root', { timeout: 10000 });

    // Updated OTP login flow for inline mobile mode in LoginForm
    try {
      // Switch to mobile mode tab
      const mobileModeToggle = await page.waitForSelector('[data-testid="login-mobile-tab"]', { timeout: 5000 });
      await mobileModeToggle.click();

      // Fill phone number and a 6-digit code
      const phoneInput = await page.waitForSelector('input[placeholder*="0912"], input[inputmode="tel"]', { timeout: 5000 });
      await phoneInput.fill('09123506545');

      const codeInput = await page.$('input[placeholder*="123456"], input[inputmode="numeric"]');
      if (codeInput) {
        await codeInput.fill('123456');
      }

      // Submit mobile login
      const submitMobile = await page.waitForSelector('[data-testid="login-mobile-submit"]', { timeout: 5000 });
      await submitMobile.click();

      await page.waitForTimeout(2500);
      const dashboardExists = await page.$('nav, header, [data-testid="dashboard"], .dashboard');
      console.log('Dashboard visible:', !!dashboardExists);
    } catch (e) {
      console.warn('OTP mobile flow skipped:', e.message);
    }

    // reload the app after login
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });

    // wait briefly for potential runtime errors to occur
    await page.waitForTimeout(1000);

    // Smoke navigation: go to Dashboard and then Sales module to ensure routing works
    try {
      await page.evaluate(() => { window.location.hash = 'dashboard' })
      await page.waitForTimeout(1200)
      outLogs.push({ type: 'info', text: 'navigated to #dashboard' })

      await page.evaluate(() => { window.location.hash = 'sales' })
      await page.waitForTimeout(1200)
      outLogs.push({ type: 'info', text: 'navigated to #sales' })
    } catch (e) {
      outLogs.push({ type: 'error', text: 'Smoke navigation failed: ' + String(e) })
    }

    const screenshotPath = '/workspace/logs/headless_screenshot.png';
    const logPath = '/workspace/logs/headless_console.log';

    // Ensure logs dir exists
    try { fs.mkdirSync('/workspace/logs', { recursive: true }); } catch(e){}

    // Save console logs
    fs.writeFileSync(logPath, outLogs.map(l => `[${l.type}] ${l.text}`).join('\n\n'));

    // Take screenshot of full page
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log('Saved logs to', logPath);
    console.log('Saved screenshot to', screenshotPath);

  } catch (err) {
    console.error('Headless script error:', err);
  } finally {
    await browser.close();
  }
})();
