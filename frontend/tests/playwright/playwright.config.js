const path = require('path');
/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './',
  timeout: 120000,
  use: {
    headless: true,
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
    navigationTimeout: 60000,
  },
  webServer: {
    command: 'npm run dev',
    cwd: path.resolve(__dirname, '..', '..'),
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 120000,
  }
};
