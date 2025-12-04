# Starts backend locally (venv python), waits for health, then runs Playwright against dev server
# Usage: powershell -ExecutionPolicy Bypass -File scripts/run-local-dev.ps1 [-KeepBackend] [-OpenReport]

param(
  [switch]$KeepBackend,
  [switch]$OpenReport,
  [int]$WaitTimeoutSec = 120,
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

# Determine python to use
$venvPy = Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe"
$python = if (Test-Path $venvPy) { $venvPy } else { 'python' }

# Prepare dev artifacts directory upfront (for backend log)
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$root = Resolve-Path "$PSScriptRoot\.."
$dest = Join-Path $root "artifacts\dev\$ts"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# Ensure backend .env exists (sqlite fallback)
$envFile = Join-Path $PSScriptRoot "..\backend\.env"
if (-not (Test-Path $envFile)) {
  $content = @(
    "DATABASE_URL=sqlite:///../hp_local.db",
    "SECRET_KEY=dev-secret-key-change-me",
    "JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60",
    "JWT_REFRESH_TOKEN_EXPIRE_DAYS=7"
  )
  $content | Out-File -FilePath $envFile -Encoding utf8
  Write-Host "[Dev] Created backend/.env (sqlite)"
}

# Install backend deps if needed
Push-Location "$PSScriptRoot\..\backend"
try {
  Write-Host "[Dev] Installing backend deps (non-fatal if satisfied)..."
  & $python -m pip install --upgrade pip | Out-Null
  if (Test-Path "requirements-dev.txt") { & $python -m pip install -r requirements-dev.txt } else { & $python -m pip install -r requirements.txt }
} finally { Pop-Location }

# Start backend in background
Write-Host "[Dev] Starting backend (uvicorn) in background..."
$backendJob = Start-Job -Name "hp-backend" -InitializationScript { Set-Location $using:PSScriptRoot } -ScriptBlock {
  Push-Location "$using:PSScriptRoot\..\backend"
  try {
    & $using:python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 *>&1 | Tee-Object -FilePath (Join-Path $using:dest 'backend.log')
  } finally { Pop-Location }
}

# Wait for health
$okApi = Wait-ForHealth "http://127.0.0.1:8000/api/health" "API" $WaitTimeoutSec
if (-not $okApi) {
  Write-Error "Backend did not become healthy."; Receive-Job $backendJob -Keep; Stop-Job $backendJob -Force; exit 1
}

# Run Playwright: dev config will start Vite webServer automatically
Push-Location "$PSScriptRoot\..\frontend"
try {
  Write-Host "[Dev] Installing frontend deps..."
  cmd /c npm ci
  if (-not $SkipBrowsersInstall) {
    Write-Host "[Dev] Installing Playwright browsers (@playwright/test)..."
    cmd /c npx @playwright/test install --with-deps
  } else {
    Write-Host "[Dev] Skipping Playwright browsers install due to -SkipBrowsersInstall"
  }

  $args = @('test', '--config', 'tests/playwright/playwright.config.js', '--reporter=list,html')
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
  Write-Host "[Dev] Running Playwright: npx @playwright/test $($args -join ' ')"
  cmd /c npx @playwright/test $args
  $pwExit = $LASTEXITCODE
  if ($Debug) { Remove-Item Env:PWDEBUG -ErrorAction SilentlyContinue }

  # Archive artifacts (frontend Playwright outputs)
  if (Test-Path "playwright-report") { Copy-Item -Recurse -Force "playwright-report" (Join-Path $dest "playwright-report") }
  if (Test-Path "test-results\playwright") { Copy-Item -Recurse -Force "test-results\playwright" (Join-Path $dest "test-results") }
} finally { Pop-Location }

if (-not $KeepBackend) {
  Write-Host "[Dev] Stopping backend job..."
  try { Stop-Job $backendJob | Out-Null } catch {}
}

Write-Host "[Dev] Done."

if ($OpenReport) {
  & "$PSScriptRoot\open-playwright-report.ps1"
}

if ($pwExit -ne $null -and $pwExit -ne 0) { exit $pwExit }
