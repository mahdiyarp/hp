const path = require('path');
/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './',
  testMatch: 'smoke-*.spec.js',
  testIgnore: ['**/*.ts', '**/font-visual-check.spec.js', '**/smoke-modules.spec.js'],
  workers: 1,
  timeout: 120000,
  globalSetup: require.resolve('./setup/global-setup.js'),
  use: {
    headless: true,
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
    navigationTimeout: 60000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: 'test-results/playwright',
  reporter: [ ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }] ],
  webServer: {
    command: 'npm run dev3000',
    cwd: path.resolve(__dirname, '..', '..'),
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
  retries: 2
};
