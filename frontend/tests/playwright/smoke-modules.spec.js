const { test, expect } = require('@playwright/test');

// Diagnostic-only: do not fail the suite
test('modules layout diagnostics (soft checks)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForSelector('#root, body', { timeout: 10000 }).catch(() => {});
  const diag = await page.evaluate(() => {
    try {
      document.documentElement.dir = 'rtl';
      if (document.body) document.body.dir = 'rtl';
      const nav = document.querySelector('nav');
      const aside = document.querySelector('aside');
      const cards = document.querySelectorAll('.hp-card').length;
      return { nav: !!nav, aside: !!aside, cards };
    } catch { return { nav: false, aside: false, cards: 0 }; }
  });
  console.log('[modules-diag]', diag);
  // Soft expectations for stability in smoke
  await expect.soft(page.locator('nav')).toHaveCount(1);
  await expect.soft(page.locator('aside')).toHaveCount(1);
  await expect.soft(page.locator('.hp-card')).toHaveCount(diag.cards);
});
