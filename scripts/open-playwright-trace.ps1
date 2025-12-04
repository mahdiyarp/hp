# Opens the most recent Playwright trace (.zip) using trace viewer
# Searches artifacts (dev/e2e/ui-smoke) newest first, then falls back to frontend/test-results
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/open-playwright-trace.ps1

$ErrorActionPreference = 'Stop'

function Get-NewestTrace {
  param([string]$root)
  if (-not (Test-Path $root)) { return $null }
  $zips = Get-ChildItem -Path $root -Recurse -Filter *.zip -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  if ($zips -and $zips.Count -gt 0) { return $zips[0].FullName }
  return $null
}

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
$searchRoots = @(
  "$repoRoot\artifacts\dev",
  "$repoRoot\artifacts\e2e",
  "$repoRoot\artifacts\ui-smoke"
)

$candidate = $null
foreach ($r in $searchRoots) {
  # pick newest run dir under type, then search for zip
  if (-not (Test-Path $r)) { continue }
  $runDirs = Get-ChildItem -Path $r -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  foreach ($d in $runDirs) {
    $trace = Get-NewestTrace -root (Join-Path $d.FullName 'test-results')
    if ($trace) { $candidate = $trace; break }
  }
  if ($candidate) { break }
}

if (-not $candidate) {
  # fallback to frontend default locations used by different tasks
  $fallbacks = @(
    "$repoRoot\frontend\tests\playwright\test-results",
    "$repoRoot\frontend\test-results"
  )
  foreach ($fb in $fallbacks) {
    $candidate = Get-NewestTrace -root $fb
    if ($candidate) { break }
  }
}

if (-not $candidate) {
  Write-Host "[Trace] No trace .zip found in artifacts or frontend/test-results." -ForegroundColor Yellow
  exit 1
}

Write-Host "[Trace] Opening: $candidate"
Push-Location "$repoRoot\frontend"
try {
  cmd /c npx @playwright/test show-trace "$candidate"
} finally {
  Pop-Location
}
