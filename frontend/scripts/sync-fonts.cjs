/* Synchronize Yekan font files into frontend/public/fonts if missing.
   Sources checked (in order):
   - hp/frontend/public/fonts
   - .githubhp/frontend/public/fonts
   - hp/frontend/dist/fonts
*/

const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const targetDir = path.join(projectRoot, 'public', 'fonts')
const candidates = [
  path.resolve(projectRoot, '..', 'hp', 'frontend', 'public', 'fonts'),
  path.resolve(projectRoot, '..', '.githubhp', 'frontend', 'public', 'fonts'),
  path.resolve(projectRoot, '..', 'hp', 'frontend', 'dist', 'fonts'),
]

const yekanFiles = ['Yekan.woff2', 'Yekan.woff', 'Yekan.ttf']

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function copyIfExists(srcDir, dstDir, filename) {
  const src = path.join(srcDir, filename)
  const dst = path.join(dstDir, filename)
  if (fs.existsSync(src)) {
    try {
      fs.copyFileSync(src, dst)
      console.log(`[fonts] Copied ${filename} from ${srcDir}`)
      return true
    } catch (e) {
      console.warn(`[fonts] Failed to copy ${filename} from ${srcDir}:`, e.message)
    }
  }
  return false
}

function hasAnyYekan(dstDir) {
  return yekanFiles.some(f => fs.existsSync(path.join(dstDir, f)))
}

function syncFonts() {
  ensureDir(targetDir)
  if (hasAnyYekan(targetDir)) {
    console.log('[fonts] Yekan already present in public/fonts — skipping sync')
    return
  }
  for (const cand of candidates) {
    if (!fs.existsSync(cand)) continue
    let copied = false
    for (const f of yekanFiles) {
      copied = copyIfExists(cand, targetDir, f) || copied
    }
    if (copied) {
      console.log(`[fonts] Synced Yekan from ${cand}`)
      return
    }
  }
  console.warn('[fonts] WARNING: Yekan not found in any candidate source. Place Yekan.woff2 in frontend/public/fonts.')
}

syncFonts()
