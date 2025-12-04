# Requires: Node.js, npm, and Playwright installed (browsers will be installed by script)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/ui-smoke.ps1 [-OpenReport]

param(
  [switch]$OpenReport
)

$ErrorActionPreference = 'Stop'

Push-Location "$PSScriptRoot\..\frontend"
try {
  # Ensure dependencies present
  if (-not (Test-Path "node_modules\.bin\vite.cmd")) {
    Write-Host "[UI] Installing frontend deps (npm ci)..."
    cmd /c npm ci
  } else {
    Write-Host "[UI] Found existing node_modules; skipping npm ci."
  }

  Write-Host "[UI] Installing Playwright browsers..."
  cmd /c npx --yes @playwright/test install

  Write-Host "[UI] Running Playwright smoke tests (smoke-basic only)..."
  # Run only the stable minimal smoke spec to avoid flaky tests
  cmd /c npx --yes @playwright/test test tests/playwright/smoke-basic.spec.js --config tests/playwright/playwright.config.js --reporter=list,html
  $pwExit = $LASTEXITCODE
  
  # Archive artifacts
  $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
  $root = Resolve-Path "$PSScriptRoot\.."
  $dest = Join-Path $root "artifacts\ui-smoke\$ts"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  if (Test-Path "playwright-report") { Copy-Item -Recurse -Force "playwright-report" (Join-Path $dest "playwright-report") }
  if (Test-Path "test-results\playwright") { Copy-Item -Recurse -Force "test-results\playwright" (Join-Path $dest "test-results") }
}
finally {
  Pop-Location
}

if ($OpenReport) {
  & "$PSScriptRoot\open-playwright-report.ps1"
}

if ($pwExit -ne $null -and $pwExit -ne 0) { exit $pwExit }
