#!/usr/bin/env node
/*
 Enforce retro theme: fail on Tailwind blue/indigo classes or #2563eb hex.
 Scans frontend/src excluding backups (.bak, .bak.bak) and dist/coverage.
*/
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', 'src')
const banned = [
  /\bblue-(500|600|700)\b/,
  /\bindigo-\d+\b/,
  /#2563eb/,
  /bg-\[#2563eb\]/,
]

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'coverage' || e.name === 'dist') continue
      walk(full)
    } else if (e.isFile()) {
      if (/\.bak(\.bak)?$/.test(e.name)) continue
      if (!/\.(ts|tsx|css|html|cjs|js)$/.test(e.name)) continue
      const content = fs.readFileSync(full, 'utf8')
      for (const re of banned) {
        if (re.test(content)) {
          console.error(`[theme-check] Forbidden pattern ${re} in ${full}`)
          process.exitCode = 1
        }
      }
    }
  }
}

walk(root)
if (process.exitCode === 1) {
  console.error('\nTheme consistency check failed. Use retro variables (var(--retro-...)).')
  process.exit(1)
} else {
  console.log('[theme-check] OK')
}
