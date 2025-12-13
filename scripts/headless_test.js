const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const outLogs = [];
  const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();

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

    // Try a minimal OTP login interaction if elements are present
    try {
      const loginButton = await page.$('button:has-text("ورود")');
      if (loginButton) await loginButton.click();

      const mobileModeToggle = await page.$('button:has-text("ورود با موبایل")');
      if (mobileModeToggle) await mobileModeToggle.click();

      const phoneInput = await page.$('input[type="tel"], input[name="mobile"], input[placeholder*="موبایل"], input[placeholder*="شماره"]');
      if (phoneInput) await phoneInput.fill('09123506545');

      const sendOtpBtn = await page.$('button:has-text("ارسال کد")') || await page.$('button:has-text("ارسال OTP")');
      if (sendOtpBtn) await sendOtpBtn.click();

      await page.waitForTimeout(1500);

      const verifyBtn = await page.$('button:has-text("تایید")') || await page.$('button:has-text("ورود")');
      if (verifyBtn) await verifyBtn.click();

      await page.waitForTimeout(2000);
      const dashboardExists = await page.$('nav, header, [data-testid="dashboard"], .dashboard');
      console.log('Dashboard visible:', !!dashboardExists);
    } catch (e) {
      console.warn('Optional OTP flow skipped:', e.message);
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
