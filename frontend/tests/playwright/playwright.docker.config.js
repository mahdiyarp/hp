/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './',
  timeout: 120000,
  use: {
    headless: true,
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
    navigationTimeout: 60000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: 'test-results/playwright',
  reporter: [ ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }] ],
  // No webServer here; we target the dockerized frontend on port 3000
};
