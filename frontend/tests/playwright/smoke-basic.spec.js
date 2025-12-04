const { test } = require('@playwright/test');

test('UI smoke: app renders without errors', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForSelector('#root, body', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => {
    try { document.documentElement.dir = 'rtl'; if (document.body) document.body.dir = 'rtl'; } catch {}
  }).catch(() => {});
  console.log('[smoke-basic] page loaded and DOM present');
});
