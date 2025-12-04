import { Page, Locator, expect } from '@playwright/test'

export async function waitForVisible(page: Page, selector: string, timeout = 5000) {
  const loc = page.locator(selector)
  await expect(loc).toBeVisible({ timeout })
  return loc
}

export async function waitForCount(locator: Locator, count: number, timeout = 5000) {
  await expect(locator).toHaveCount(count, { timeout })
}

export async function waitForText(page: Page, selector: string, text: string, timeout = 5000) {
  const loc = page.locator(selector)
  await expect(loc).toContainText(text, { timeout })
  return loc
}
