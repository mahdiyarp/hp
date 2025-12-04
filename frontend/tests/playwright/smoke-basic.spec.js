const { test } = require('@playwright/test');

test('UI smoke: basic no-op', async () => {
  // Minimal always-pass smoke to validate runner wiring
  await new Promise(r => setTimeout(r, 100));
});
