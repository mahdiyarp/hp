const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const outLogs = [];
  const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    try { outLogs.push({type: msg.type(), text: msg.text()}); } catch(e){}
  });
  page.on('pageerror', err => {
    outLogs.push({type: 'pageerror', text: String(err && err.stack ? err.stack : err)});
  });

  try {
    const url = process.env.URL || 'http://host.docker.internal:3000';
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Try to login via API and set localStorage tokens if possible
    const username = process.env.USERNAME || 'developer';
    const password = process.env.PASSWORD || '09123506545';

    // Perform login using fetch in page context (so cookies/localStorage set same origin)
    const loginResult = await page.evaluate(async (creds) => {
      try {
        const params = new URLSearchParams();
        params.append('username', creds.username);
        params.append('password', creds.password);
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {'Content-Type':'application/x-www-form-urlencoded'},
          body: params.toString(),
        });
        const data = await res.json();
        if(res.ok && data.access_token){
          localStorage.setItem('hesabpak_access_token', data.access_token);
          localStorage.setItem('hesabpak_refresh_token', data.refresh_token || '');
          return {ok:true};
        }
        return {ok:false, status: res.status, body: data};
      } catch(e){ return {ok:false, error: String(e)} }
    }, { username, password });

    outLogs.push({type:'info', text: 'loginResult: ' + JSON.stringify(loginResult)});

    // reload the app after login
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });

    // wait briefly for potential runtime errors to occur
    await page.waitForTimeout(1000);

    // Smoke navigation: go to Dashboard and then Sales module to ensure routing works
    try {
      await page.evaluate(() => { window.location.hash = 'dashboard' })
      await page.waitForTimeout(1200)
      outLogs.push({ type: 'info', text: 'navigated to #dashboard' })

      await page.evaluate(() => { window.location.hash = 'sales' })
      await page.waitForTimeout(1200)
      outLogs.push({ type: 'info', text: 'navigated to #sales' })
    } catch (e) {
      outLogs.push({ type: 'error', text: 'Smoke navigation failed: ' + String(e) })
    }

    const screenshotPath = '/workspace/logs/headless_screenshot.png';
    const logPath = '/workspace/logs/headless_console.log';

    // Ensure logs dir exists
    try { fs.mkdirSync('/workspace/logs', { recursive: true }); } catch(e){}

    // Save console logs
    fs.writeFileSync(logPath, outLogs.map(l => `[${l.type}] ${l.text}`).join('\n\n'));

    // Take screenshot of full page
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log('Saved logs to', logPath);
    console.log('Saved screenshot to', screenshotPath);

  } catch (err) {
    console.error('Headless script error:', err);
  } finally {
    await browser.close();
  }
})();
