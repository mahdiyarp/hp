#!/usr/bin/env node
// Simple CSS variable extractor for :root blocks.
// Usage: node scripts/extract-css-vars.cjs [path/to/file.css] [--json]

const fs = require('fs')
const path = require('path')

async function main() {
  const args = process.argv.slice(2)
  const target = args.find((a) => !a.startsWith('--')) || 'frontend/public/theme-override.css'
  const asJson = args.includes('--json')
  const abs = path.resolve(target)
  const content = fs.readFileSync(abs, 'utf8')
  const map = {}
  const re = /--([A-Za-z0-9_-]+)\s*:\s*([^;]+);/g
  let m
  while ((m = re.exec(content))) {
    const key = m[1].trim()
    const val = m[2].trim()
    map[key] = val
  }
  const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  if (asJson) {
    console.log(JSON.stringify(Object.fromEntries(entries), null, 2))
  } else {
    for (const [k, v] of entries) {
      console.log(`${k}: ${v}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
