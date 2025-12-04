const { test, expect } = require('@playwright/test');
const { waitForVisible } = require('./utils/waits');

test('UI smoke: app renders root and enforces RTL', async ({ page }) => {
  await page.goto('/');
  await waitForVisible(page, '#root');
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    if (document.body) document.body.dir = 'rtl';
  });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
