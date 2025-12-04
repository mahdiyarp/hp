# Opens the latest Playwright HTML report from artifacts (dev/e2e/ui-smoke) or frontend fallback
# Usage: powershell -ExecutionPolicy Bypass -File scripts/open-playwright-report.ps1

$ErrorActionPreference = 'Stop'

function Get-LatestReportPath($base) {
  if (-not (Test-Path $base)) { return $null }
  $dirs = Get-ChildItem -Directory -Path $base | Sort-Object Name -Descending
  foreach ($d in $dirs) {
    $p = Join-Path $d.FullName 'playwright-report\index.html'
    if (Test-Path $p) { return $p }
  }
  return $null
}

$root = (Resolve-Path "$PSScriptRoot\..").Path
# Build candidate locations explicitly to avoid Join-Path argument parsing quirks in Windows PowerShell 5.1
$pathsToCheck = @(
  "$root\artifacts\dev",
  "$root\artifacts\e2e",
  "$root\artifacts\ui-smoke"
)

$report = $null
foreach ($p in $pathsToCheck) {
  $report = Get-LatestReportPath $p
  if ($report) { break }
}

if (-not $report) {
  $fallback = "$root\frontend\playwright-report\index.html"
  if (Test-Path $fallback) { $report = $fallback }
}

if ($report) {
  Write-Host "Opening: $report"
  Start-Process $report
} else {
  Write-Warning 'No Playwright HTML report found. Run a test first.'
}
