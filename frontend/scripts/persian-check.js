#!/usr/bin/env node
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const projectRoot = path.resolve(__dirname, '..');
const fontsDir = path.join(projectRoot, 'public', 'fonts');
const logPath = path.join(projectRoot, 'font-diagnostics.log');
const screenshotsDir = path.join(projectRoot, 'screenshots');
const autoFixCss = path.join(projectRoot, 'src', 'styles', 'persian-auto-fix.css');

function appendLog(msg) {
  try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`); } catch (e) {}
}

async function ensurePlaywright() {
  appendLog('Checking Playwright installation...');
  let ok = true;
  try {
    require.resolve('@playwright/test');
  } catch (e) {
    console.log('Installing @playwright/test...');
    appendLog('Installing @playwright/test');
    const res = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '-D', '@playwright/test'], { cwd: projectRoot, stdio: 'inherit' });
    if (res.status !== 0) ok = false;
  }
  // install browsers
  try {
    const res = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['playwright', 'install', 'chromium'], { cwd: projectRoot, stdio: 'inherit' });
    if (res.status !== 0) ok = false;
  } catch (e) { ok = false }
  return ok;
}

async function downloadIfMissing(url, dest) {
  if (fs.existsSync(dest)) {
    appendLog(`font exists: ${path.basename(dest)}`);
    return false;
  }
  appendLog(`downloading ${url} -> ${dest}`);
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    http.get(url, (res) => {
      if (res.statusCode !== 200) {
        appendLog(`font download failed: ${url} status ${res.statusCode}`);
        file.close();
        resolve(false);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); appendLog(`downloaded ${dest}`); resolve(true); });
    }).on('error', (err) => { appendLog('download err: '+err.message); resolve(false); });
  });
}

async function ensureFonts() {
  try { fs.mkdirSync(fontsDir, { recursive: true }); } catch (e) {}
  // Official Vazirmatn sources are not permitted to be redistributed automatically; try an authoritative CDN fallback.
  // We'll attempt to download from the GitHub-hosted Vazirmatn releases (raw link) as a convenience; if blocked, leave placeholders untouched.
  const urls = {
    'Vazirmatn-400.woff2': 'https://github.com/rastikerdar/vazirmatn/releases/download/v33.1/Vazirmatn-400.woff2',
    'Vazirmatn-500.woff2': 'https://github.com/rastikerdar/vazirmatn/releases/download/v33.1/Vazirmatn-500.woff2',
    'Vazirmatn-700.woff2': 'https://github.com/rastikerdar/vazirmatn/releases/download/v33.1/Vazirmatn-700.woff2'
  };
  const results = [];
  for (const [name, url] of Object.entries(urls)) {
    const dest = path.join(fontsDir, name);
    const ok = await downloadIfMissing(url, dest);
    results.push({name, ok});
  }
  return results;
}

function startDevServer() {
  appendLog('Starting frontend dev server...');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const dev = spawn(npmCmd, ['run', 'dev'], { cwd: projectRoot, stdio: ['ignore','pipe','pipe'] });
  dev.stdout.on('data', (d) => process.stdout.write('[vite] '+d.toString()));
  dev.stderr.on('data', (d) => process.stderr.write('[vite] '+d.toString()));
  return dev;
}

async function runPlaywright() {
  appendLog('Running Playwright tests...');
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const res = spawnSync(npx, ['playwright', 'test', 'frontend/tests/playwright', '--project=chromium', '--reporter=list'], { cwd: projectRoot, stdio: 'inherit' });
  return res.status === 0;
}

(async () => {
  appendLog('=== persian-check start ===');
  const pwOk = await ensurePlaywright();
  const fonts = await ensureFonts();
  appendLog('Fonts check results: '+JSON.stringify(fonts));

  const devProc = startDevServer();
  // Wait for dev server to be responsive at 127.0.0.1:5173
  const maxWait = 120000; // 2min
  const start = Date.now();
  let up = false;
  while (Date.now() - start < maxWait) {
    try {
      const r = await new Promise((res) => {
        const req = http.get({ host: '127.0.0.1', port: 5173, path: '/' }, (resp) => { res(resp.statusCode === 200); });
        req.on('error', ()=>res(false));
        req.end();
      });
      if (r) { up = true; break; }
    } catch(e){}
    await new Promise(r=>setTimeout(r, 1500));
  }

  if (!up) {
    appendLog('Dev server did not start within timeout');
    console.log('?? Persian Rendering Issue — Dev server did not start');
    process.exit(1);
  }

  const ok = await runPlaywright();

  // inspect log for fallback creation
  let fallbackCreated = false;
  try { const logs = fs.readFileSync(logPath,'utf8'); if (logs.includes('persian-auto-fix.css created') || logs.includes('fallback css created by test')) fallbackCreated = true; } catch (e) {}

  if (ok && !fallbackCreated) {
    console.log('?? Persian UI Verified — No Issues');
    appendLog('Result: OK');
    process.exit(0);
  }
  if (ok && fallbackCreated) {
    console.log('?? Fixes Applied — Run again to confirm');
    appendLog('Result: Fixes applied');
    process.exit(0);
  }
  console.log('?? Persian Rendering Issue — Requires manual check');
  appendLog('Result: Failed');
  process.exit(2);
})();
