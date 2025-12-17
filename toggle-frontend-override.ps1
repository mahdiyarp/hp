Param(
  [ValidateSet('enable','disable','status')]
  [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
$root = "F:/hp"
$override = Join-Path $root 'docker-compose.override.yml'
$disabled = Join-Path $root 'docker-compose.override.yml.disabled'

function Show-Status {
  if (Test-Path $override) {
    Write-Host "[override] ENABLED (file: docker-compose.override.yml)" -ForegroundColor Green
  } elseif (Test-Path $disabled) {
    Write-Host "[override] DISABLED (file: docker-compose.override.yml.disabled)" -ForegroundColor Yellow
  } else {
    Write-Host "[override] NOT FOUND" -ForegroundColor Red
  }
}

switch ($Action) {
  'enable' {
    if (Test-Path $disabled) { Move-Item -Force $disabled $override }
    Show-Status
    Write-Host "[compose] Restarting frontend with override enabled..." -ForegroundColor Cyan
    docker compose -f "$root/docker-compose.yml" -f "$root/docker-compose.override.yml" up -d frontend | Out-Host
  }
  'disable' {
    if (Test-Path $override) { Move-Item -Force $override $disabled }
    Show-Status
    Write-Host "[compose] Restarting frontend WITHOUT override..." -ForegroundColor Cyan
    docker compose -f "$root/docker-compose.yml" up -d frontend | Out-Host
  }
  default {
    Show-Status
  }
}
