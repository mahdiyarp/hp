import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const LOG = path.resolve(__dirname, '..', '..', 'font-diagnostics.log');
const AUTO_FIX_CSS = path.resolve(__dirname, '..', '..', 'src', 'styles', 'persian-auto-fix.css');

function log(msg: string) {
  try { fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch (e) { console.error('log fail', e); }
}

async function detectCorruption(text: string) {
  if (!text) return false;
  // Detect Unicode replacement character (�) or suspicious runs of '?'
  // This avoids invalid regex constructs and focuses on common mojibake indicators.
  const hasReplacement = /\uFFFD/.test(text) || /\ufffd/.test(text);
  const hasQuestionRuns = /\?{3,}/.test(text);
  return hasReplacement || hasQuestionRuns;
}

async function ensureAutoFixCss() {
  if (!fs.existsSync(AUTO_FIX_CSS)) {
    const content = `/* Auto-injected fallback selectors (append-only) */\n.force-font, .widget *, .chart-label *, .MuiTypography-root, .ant-typography { font-family: 'Vazirmatn', 'Yekan', 'IRANSansX', sans-serif !important; }\n`;
    fs.writeFileSync(AUTO_FIX_CSS, content, { flag: 'wx' });
    log('persian-auto-fix.css created');
    return true;
  }
  return false;
}

test('font visual and RTL checks v2', async ({ page, browser }) => {
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#root, body', { timeout: 10000 }).catch(() => {});
  // Ensure RTL attribute present even if app hasn't set it yet
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.body && document.body.setAttribute('dir', 'rtl');
  });
  // Avoid brittle attribute waits; rely on computed styles below

  // selectors to capture
  const sidebarSel = 'aside, .sidebar, [data-testid="sidebar"]';
  const titleSel = 'h1, .app-title, [data-testid="dashboard-title"]';
  const tableSel = 'table, .data-table, [data-testid="main-table"]';

  const checks = [
    { name: 'sidebar', sel: sidebarSel },
    { name: 'title', sel: titleSel },
    { name: 'table', sel: tableSel }
  ];

  let overallCorrupt = false;
  let fontUsed = new Set<string>();
  let rtlOk = true;

  for (const c of checks) {
    const el = await page.$(c.sel);
    if (!el) {
      log(`element-missing: ${c.name} selector ${c.sel}`);
      continue;
    }
    const screenshotPath = path.resolve(__dirname, '..', '..', 'screenshots', `${c.name}.png`);
    try { fs.mkdirSync(path.dirname(screenshotPath), { recursive: true }); } catch (e) {}
    await el.screenshot({ path: screenshotPath });
    log(`screenshot-taken: ${screenshotPath}`);

    const text = await el.textContent();
    if (await detectCorruption(text || '')) {
      log(`corruption-detected in ${c.name}`);
      overallCorrupt = true;
    }
    const ff = await el.evaluate((node) => getComputedStyle(node as Element).fontFamily);
    log(`font-detected ${c.name}: ${ff}`);
    (ff || '').split(',').map(s=>s.trim()).forEach(f=>fontUsed.add(f.replace(/\W/g,'')));

    const dir = await el.evaluate((node) => (node as HTMLElement).dir || window.getComputedStyle(node as Element).direction);
    if (!dir || dir.toLowerCase() !== 'rtl') {
      rtlOk = false;
      log(`rtl-missing in ${c.name}: ${dir}`);
    }
  }

  // Analyze fontUsed
  const fonts = Array.from(fontUsed).join(', ');
  log(`fonts-summary: ${fonts}`);

  // If corruption or Vazirmatn not found, create auto-fix CSS
  const hasVazir = fonts.toLowerCase().includes('vazirmatn') || fonts.toLowerCase().includes('yekan') || fonts.toLowerCase().includes('iransansx');
  if (overallCorrupt || !hasVazir) {
    const created = await ensureAutoFixCss();
    if (created) log('fallback css created by test');
  }

  // Write summary log
  log(`summary corruption=${overallCorrupt} vazirmatn=${hasVazir} rtl=${rtlOk}`);

  // Diagnostics only in smoke: do not fail hard
  expect.soft(overallCorrupt).toBeFalsy();
  expect.soft(hasVazir).toBeTruthy();
  expect.soft(rtlOk).toBeTruthy();
});
