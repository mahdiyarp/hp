const { rmSync } = require('fs');
const path = require('path');

/** @param {import('@playwright/test').FullConfig} config */
module.exports = async function globalSetup(config) {
  try { rmSync(path.resolve(__dirname, '..', 'playwright-report'), { recursive: true, force: true }); } catch {}
  try { rmSync(path.resolve(__dirname, '..', 'test-results'), { recursive: true, force: true }); } catch {}
  // Keep setup minimal and compatible with CJS; skip browser warm-up
};
