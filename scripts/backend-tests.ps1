# Runs backend pytest locally using current Python (prefer .venv)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/backend-tests.ps1 [-K <expr>] [-TestsPath <path>] [-Coverage]

param(
  [string]$K,
  [string]$TestsPath = '.',
  [switch]$Coverage,
  [switch]$LastFailed,
  [switch]$FailuresFirst,
  [int]$MaxFailures,
  [switch]$JUnit
)

$ErrorActionPreference = 'Stop'

# Activate venv if present
$venvActivate = Join-Path $PSScriptRoot "..\.venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
  Write-Host "[BackendTests] Activating .venv..."
  & $venvActivate
}

Push-Location "$PSScriptRoot\..\backend"
try {
  Write-Host "[BackendTests] Installing dev requirements..."
  python -m pip install --upgrade pip
  if (Test-Path "requirements-dev.txt") {
    python -m pip install -r requirements-dev.txt
  } else {
    python -m pip install -r requirements.txt
  }

  Write-Host "[BackendTests] Running pytest (SQLite in-memory)..."
  $env:DATABASE_URL = 'sqlite:///:memory:'
  $argsList = @()
  if ($K) { $argsList += @('-k', $K) }
  if ($LastFailed) { $argsList += '--last-failed' }
  if ($FailuresFirst) { $argsList += '--failed-first' }
  if ($MaxFailures -gt 0) { $argsList += @('--maxfail', $MaxFailures) }
  if ($Coverage) {
    python -m pip install pytest-cov | Out-Null
    $argsList += @('--cov=app', '--cov-report=xml:coverage/coverage.xml', '--cov-report=term-missing')
  }
  if ($JUnit) {
    $junitDir = 'test-results'
    if (-not (Test-Path $junitDir)) { New-Item -ItemType Directory -Force -Path $junitDir | Out-Null }
    $argsList += @("--junitxml=$junitDir/pytest.xml")
  }
  $argsList += @('-q', $TestsPath)

  python -m pytest @argsList
  $pytestExit = $LASTEXITCODE

  # Archive artifacts if coverage enabled or junit exists
  $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
  $root = Resolve-Path "$PSScriptRoot\.."
  $dest = Join-Path $root "artifacts\backend\$ts"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  if (Test-Path "coverage") { Copy-Item -Recurse -Force "coverage" (Join-Path $dest "coverage") }
  if (Test-Path "test-results") { Copy-Item -Recurse -Force "test-results" (Join-Path $dest "test-results") }
} finally {
  Pop-Location
}

if ($pytestExit -ne $null -and $pytestExit -ne 0) { exit $pytestExit }
