/* Frontend test setup: ensure assets and browsers present on every run.
 * - Installs Playwright browsers if missing
 * - Syncs Yekan fonts into public/fonts
 * - Cleans and prepares test-results and tmp folders
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const testResultsDir = path.join(projectRoot, 'test-results')
const tmpDir = path.join(projectRoot, '.tmp')

function log(msg) { console.log(`[test-setup] ${msg}`) }

function ensureDirClean(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    try {
      fs.rmSync(p, { recursive: true, force: true })
    } catch (e) {
      // ignore
    }
  }
}

function syncFonts() {
  try {
    const syncScript = path.join(projectRoot, 'scripts', 'sync-fonts.cjs')
    if (fs.existsSync(syncScript)) {
      log('Syncing Yekan fonts...')
      require(syncScript)
    } else {
      log('sync-fonts.cjs not found; skipping')
    }
  } catch (e) {
    log(`font sync error: ${e.message}`)
  }
}

function installBrowsers() {
  try {
    log('Ensuring Playwright browsers...')
    execSync('npx playwright install --with-deps', { stdio: 'inherit', cwd: projectRoot })
  } catch (e) {
    log(`playwright install error: ${e.message}`)
  }
}

function main() {
  ensureDirClean(testResultsDir)
  ensureDirClean(tmpDir)
  syncFonts()
  installBrowsers()
  log('Setup complete')
}

main()
