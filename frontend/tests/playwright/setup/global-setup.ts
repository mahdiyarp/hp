import { chromium, firefox, webkit, FullConfig } from '@playwright/test';
import { rmSync } from 'fs';
import path from 'path';

export default async function globalSetup(config: FullConfig) {
  // Clean Playwright output dirs to avoid stale artifacts
  try { rmSync(path.resolve(__dirname, '..', 'playwright-report'), { recursive: true, force: true }); } catch {}
  try { rmSync(path.resolve(__dirname, '..', 'test-results'), { recursive: true, force: true }); } catch {}

  // Ensure default browser channels available
  // Launch and close to pre-warm (reduces flakiness on Windows CI shells)
  for (const browserType of [chromium, firefox, webkit]) {
    try {
      const browser = await browserType.launch({ headless: true });
      await browser.close();
    } catch {}
  }
}
