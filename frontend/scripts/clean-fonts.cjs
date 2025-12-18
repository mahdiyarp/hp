// Cleanup obviously corrupted WOFF2 placeholders that trigger OTS errors
// Removes tiny IranYekan/Vazirmatn .woff2 files and keeps valid Yekan fonts in place.
const fs = require('fs')
const path = require('path')

const fontsDir = path.resolve(__dirname, '../public/fonts')
if (!fs.existsSync(fontsDir)) {
  console.error('[clean-fonts] Fonts directory not found:', fontsDir)
  process.exit(1)
}

const files = fs.readdirSync(fontsDir)
let removed = 0
let skipped = 0
for (const f of files) {
  const p = path.join(fontsDir, f)
  const stat = fs.statSync(p)
  const isWoff2 = f.toLowerCase().endsWith('.woff2')
  const looksInvalidFamily = /^(IranYekan|Vazirmatn)/i.test(f)
  // Heuristic: tiny woff2 files (< 10 KB) are placeholders/corrupt
  if (isWoff2 && looksInvalidFamily && stat.size < 10_000) {
    try {
      fs.rmSync(p)
      console.log('[clean-fonts] removed', f, stat.size, 'bytes')
      removed++
    } catch (e) {
      console.warn('[clean-fonts] failed to remove', f, e?.message)
      skipped++
    }
  }
}

// Sanity check: ensure Yekan exists
const yekanCandidates = ['Yekan.woff2', 'Yekan.woff', 'Yekan.ttf']
const hasYekan = yekanCandidates.some((name) => fs.existsSync(path.join(fontsDir, name)))
if (!hasYekan) {
  console.error('[clean-fonts] Missing Yekan fonts — please add Yekan.woff2/Yekan.woff/Yekan.ttf into public/fonts')
  process.exit(2)
}

console.log(`[clean-fonts] Done. Removed ${removed} invalid font files. Skipped ${skipped}.`)
