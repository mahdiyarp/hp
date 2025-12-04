# Runs Playwright smoke non-interactively with preview server
$ErrorActionPreference = 'SilentlyContinue'
# Kill common dev server ports and node/vite processes
$ports = @(5173,3000,4173)
foreach ($p in $ports) {
  $conns = Get-NetTCPConnection -State Listen -LocalPort $p
  if ($conns) {
    $procIds = $conns | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique
    foreach ($procId in $procIds) { Stop-Process -Id $procId -Force }
  }
}
Get-Process | Where-Object { $_.ProcessName -match 'node|vite' } | ForEach-Object { Stop-Process -Id $_.Id -Force }

Push-Location "$PSScriptRoot\.."
# Ensure browsers installed via @playwright/test
npx @playwright/test install --with-deps | Out-Null
# Run smoke with CI flag and explicit config
$env:CI = "true"
$env:PLAYWRIGHT_BROWSERS_PATH = '0'
npx @playwright/test test --config tests/playwright/playwright.config.js --reporter=list,html
Pop-Location
