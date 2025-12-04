# Runs end-to-end UI smoke against dockerized stack locally (no push)
# Steps:
# 1) Build frontend dist (skip with -NoBuild)
# 2) docker compose up -d [--build]
# 3) Wait for backend and frontend health
# 4) Run Playwright with docker config (baseURL http://127.0.0.1:3000)
# 5) Optionally tear down containers with -Down switch
# Usage: powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 [-Down] [-OpenReport] [-NoBuild]

param(
  [switch]$Down,
  [switch]$OpenReport,
  [switch]$NoBuild,
  [int]$WaitTimeoutSec = 120,
  [int]$ApiWaitSec,
  [int]$UiWaitSec,
  [switch]$Headed,
  [string]$Project,
  [switch]$SkipBrowsersInstall,
  [string]$Grep,
  [string]$GrepInvert,
  [int]$Retries,
  [switch]$Debug,
  [string]$Trace,
  [int]$Workers,
  [int]$MaxFailures,
  [string]$Shard
)

$ErrorActionPreference = 'Stop'

function Test-Url($url) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
    return @{ ok = $true; status = $resp.StatusCode; body = $resp.Content }
  } catch {
    return @{ ok = $false; error = $_.Exception.Message }
  }
}

function Wait-ForHealth($url, $name, $timeoutSec) {
  $deadline = [DateTime]::UtcNow.AddSeconds($timeoutSec)
  while ([DateTime]::UtcNow -lt $deadline) {
    $r = Test-Url $url
    if ($r.ok) { Write-Host "[$name] Healthy ($($r.status))"; return $true }
    Start-Sleep -Seconds 2
  }
  Write-Host "[$name] Timed out waiting for health at $url"
  return $false
}

# Prepare artifact destination early (so we can store logs on failures)
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$root = Resolve-Path "$PSScriptRoot\.."
$dest = Join-Path $root "artifacts\e2e\$ts"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

if (-not $NoBuild) {
  # 1) Build frontend dist
  Push-Location "$PSScriptRoot\..\frontend"
  try {
    Write-Host "[E2E] Installing frontend deps..."
    cmd /c npm ci
    Write-Host "[E2E] Building frontend dist..."
    cmd /c npm run build
  } finally {
    Pop-Location
  }
} else {
  Write-Host "[E2E] Skipping frontend build due to -NoBuild"
}

# 2) docker compose up
Write-Host "[E2E] Starting docker compose (detached) ..."
if ($NoBuild) { cmd /c docker compose up -d } else { cmd /c docker compose up -d --build }

# 3) Wait for health (allow per-service overrides)
$apiTimeout = if ($PSBoundParameters.ContainsKey('ApiWaitSec')) { $ApiWaitSec } else { $WaitTimeoutSec }
$uiTimeout  = if ($PSBoundParameters.ContainsKey('UiWaitSec'))  { $UiWaitSec }  else { $WaitTimeoutSec }

$okApi = Wait-ForHealth "http://127.0.0.1:8000/api/health" "API" $apiTimeout
$okUi  = Wait-ForHealth "http://127.0.0.1:3000" "Frontend" $uiTimeout

if (-not ($okApi -and $okUi)) {
  Write-Host "[E2E] Services not healthy; collecting docker logs before exit..." -ForegroundColor Yellow
  try {
    $services = @('db','redis','backend','frontend','person_sync_consumer')
    $logsDir = Join-Path $dest 'docker-logs'
    New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
    cmd /c docker compose ps > (Join-Path $logsDir 'compose-ps.txt') 2>&1
    foreach ($s in $services) {
      cmd /c docker compose logs $s > (Join-Path $logsDir ("$s.log")) 2>&1
    }
  } catch {
    Write-Host "[E2E] Failed to collect docker logs: $($_.Exception.Message)" -ForegroundColor Yellow
  }
  if ($Down) {
    Write-Host "[E2E] Bringing docker compose down..."
    cmd /c docker compose down
  }
  Write-Error "Services not healthy; aborting Playwright run. Logs saved to $dest"
  exit 1
}

# 4) Run Playwright with docker config
Push-Location "$PSScriptRoot\..\frontend"
try {
  if (-not $SkipBrowsersInstall) {
    Write-Host "[E2E] Installing Playwright browsers (@playwright/test)..."
    cmd /c npx @playwright/test install --with-deps
  } else {
    Write-Host "[E2E] Skipping Playwright browsers install due to -SkipBrowsersInstall"
  }

  $args = @('test', 'tests/playwright', '-c', 'tests/playwright/playwright.docker.config.js', '--reporter=list,html')
  if ($Headed) { $args += '--headed' }
  if ($Project -and $Project.Trim() -ne '') { $args += @('--project', $Project) }
  if ($Retries -gt 0) { $args += @('--retries', $Retries) }
  if ($Grep -and $Grep.Trim() -ne '') { $args += @('--grep', $Grep) }
  if ($GrepInvert -and $GrepInvert.Trim() -ne '') { $args += @('--grep-invert', $GrepInvert) }
  if ($Trace -and $Trace.Trim() -ne '') { $args += @('--trace', $Trace) }
  if ($Workers -gt 0) { $args += @('--workers', $Workers) }
  if ($MaxFailures -gt 0) { $args += @('--max-failures', $MaxFailures) }
  if ($Shard -and $Shard.Trim() -ne '') { $args += @('--shard', $Shard) }
  if ($Debug) { $env:PWDEBUG = '1' }
  $env:PLAYWRIGHT_BROWSERS_PATH = '0'
  Write-Host "[E2E] Running Playwright: npx @playwright/test $($args -join ' ')"
  cmd /c npx @playwright/test $args
  $pwExit = $LASTEXITCODE
  if ($Debug) { Remove-Item Env:PWDEBUG -ErrorAction SilentlyContinue }
  
  # Archive artifacts
  if (Test-Path "playwright-report") { Copy-Item -Recurse -Force "playwright-report" (Join-Path $dest "playwright-report") }
  if (Test-Path "test-results\playwright") { Copy-Item -Recurse -Force "test-results\playwright" (Join-Path $dest "test-results") }
} finally {
  Pop-Location
}

# 5) Optional teardown
if ($Down) {
  Write-Host "[E2E] Bringing docker compose down..."
  cmd /c docker compose down
}

# Collect docker logs and ps regardless of -Down
try {
  $services = @('db','redis','backend','frontend','person_sync_consumer')
  $logsDir = Join-Path $dest 'docker-logs'
  New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
  cmd /c docker compose ps > (Join-Path $logsDir 'compose-ps.txt') 2>&1
  foreach ($s in $services) {
    cmd /c docker compose logs $s > (Join-Path $logsDir ("$s.log")) 2>&1
  }
} catch {
  Write-Host "[E2E] Failed to collect docker logs: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "[E2E] Done."

if ($OpenReport) {
  & "$PSScriptRoot\open-playwright-report.ps1"
}

if ($pwExit -ne $null -and $pwExit -ne 0) {
  exit $pwExit
}
