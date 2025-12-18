// Simple lint for Nginx config security headers used in production image
// Ensures required add_header directives exist in frontend/nginx.conf
const fs = require('fs')
const path = require('path')

const file = path.resolve(__dirname, '../nginx.conf')
if (!fs.existsSync(file)) {
  console.error('[headers:config] nginx.conf not found at', file)
  process.exit(1)
}

const src = fs.readFileSync(file, 'utf8')

const required = [
  /add_header\s+Content-Security-Policy\s+/i,
  /add_header\s+Strict-Transport-Security\s+/i,
  /add_header\s+X-Content-Type-Options\s+/i,
  /add_header\s+X-Frame-Options\s+/i,
  /add_header\s+Referrer-Policy\s+/i,
]

const missing = required.filter((re) => !re.test(src))
if (missing.length > 0) {
  console.error('[headers:config] Missing required headers in nginx.conf:')
  for (const re of missing) console.error(' -', re.toString())
  process.exit(2)
}

console.log('[headers:config] OK: required security headers are present in nginx.conf')
