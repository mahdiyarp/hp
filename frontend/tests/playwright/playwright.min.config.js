/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './',
  testMatch: 'smoke-*.spec.js',
  testIgnore: ['**/*.ts'],
  workers: 1,
  timeout: 60000,
  use: {
    headless: true,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  reporter: [ ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }] ],
};
