Param(
  [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
Push-Location "F:/hp/frontend"
try {
  if (-not $NoBuild) {
    Write-Host "[sync] Building frontend dist..." -ForegroundColor Cyan
    cmd /c npm run build | Out-Host
  } else {
    Write-Host "[sync] Skipping build (NoBuild)" -ForegroundColor Yellow
  }
} finally {
  Pop-Location
}

Write-Host "[sync] Bringing up frontend with override mounts..." -ForegroundColor Cyan
docker compose -f "F:/hp/docker-compose.yml" -f "F:/hp/docker-compose.override.yml" up -d frontend | Out-Host

Write-Host "[sync] Verifying container health and HTTP..." -ForegroundColor Cyan
Start-Sleep -Seconds 1
docker compose -f "F:/hp/docker-compose.yml" ps frontend | Out-Host
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -UseBasicParsing -TimeoutSec 8
  Write-Host ("[sync] HTTP {0}" -f $r.StatusCode) -ForegroundColor Green
} catch {
  Write-Host ("[sync] HTTP request failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}

Write-Host "[sync] Done." -ForegroundColor Green
