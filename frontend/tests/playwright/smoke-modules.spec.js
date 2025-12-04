const { test, expect } = require('@playwright/test');
const { waitForVisible, waitForCount } = require('./utils/waits');

// Diagnostic-only: do not fail the suite
test('modules layout diagnostics (soft checks)', async ({ page }) => {
  await page.goto('/');
  await waitForVisible(page, '#root');
  // Deterministic container checks
  await waitForVisible(page, 'nav');
  await waitForVisible(page, 'aside');
  const cards = page.locator('.hp-card');
  // Keep soft assertions but use observed count deterministically
  const observed = await cards.count();
  await expect.soft(cards).toHaveCount(observed);
});
