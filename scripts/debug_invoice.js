const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`[pageerror] ${err}`);
  });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="username"]', 'demo');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("ورود به سیستم")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.goto('http://localhost:3000/#sales', { waitUntil: 'networkidle' });
    const buttonSelector = 'text=صدور فاکتور فروش';
    await page.waitForSelector(buttonSelector, { timeout: 60000 });
    await page.click(buttonSelector);
    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('Playwright script error:', err);
  } finally {
    await page.close();
    await browser.close();
  }
})();
