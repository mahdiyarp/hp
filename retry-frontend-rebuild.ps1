Param(
  [int]$IntervalSec = 60,
  [int]$MaxAttempts = 30
)

$ErrorActionPreference = 'Stop'
function Try-Rebuild {
  try {
    Write-Host "[retry] Attempting docker login (may be cached)..." -ForegroundColor Cyan
    docker login | Out-Host
  } catch { Write-Host "[retry] docker login failed or skipped: $($_.Exception.Message)" -ForegroundColor Yellow }
  try {
    Write-Host "[retry] Pre-pulling base images..." -ForegroundColor Cyan
    docker pull node:20-alpine | Out-Host
    docker pull nginx:alpine | Out-Host
  } catch { Write-Host "[retry] pull failed: $($_.Exception.Message)" -ForegroundColor Yellow }
  try {
    Write-Host "[retry] compose build+up frontend..." -ForegroundColor Cyan
    docker compose -f "F:/hp/docker-compose.yml" up -d --build frontend | Out-Host
    return $true
  } catch {
    Write-Host "[retry] compose build failed: $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

for ($i = 1; $i -le $MaxAttempts; $i++) {
  Write-Host ("[retry] Attempt {0}/{1}" -f $i, $MaxAttempts) -ForegroundColor Cyan
  if (Try-Rebuild) {
    Write-Host "[retry] Success: frontend rebuilt." -ForegroundColor Green
    exit 0
  }
  Write-Host ("[retry] Sleeping {0}s before next attempt..." -f $IntervalSec) -ForegroundColor Yellow
  Start-Sleep -Seconds $IntervalSec
}

Write-Host "[retry] Exhausted attempts without success." -ForegroundColor Red
exit 1
