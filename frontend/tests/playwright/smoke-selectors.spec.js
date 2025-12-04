const { test, expect } = require('@playwright/test');
const { waitForVisible } = require('./utils/waits');

test('UI smoke: header/footer selectors present', async ({ page }) => {
  await page.goto('/');
  await waitForVisible(page, '#root');
  const header = page.locator('header');
  const footer = page.locator('footer');
  await expect.soft(header).toHaveCount(1);
  await expect.soft(footer).toHaveCount(1);
});
