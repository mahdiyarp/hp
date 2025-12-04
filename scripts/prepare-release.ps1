# Prepares a local release build without pushing anything
# - Builds frontend dist
# - Optionally runs backend health checks if server is up
# Usage: powershell -ExecutionPolicy Bypass -File scripts/prepare-release.ps1

$ErrorActionPreference = 'Stop'

function Test-Url($url) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 10
    return @{ ok = $true; status = $resp.StatusCode; body = $resp.Content }
  } catch {
    return @{ ok = $false; error = $_.Exception.Message }
  }
}

# Build frontend
Push-Location "$PSScriptRoot\..\frontend"
try {
  Write-Host "[Release] Installing frontend deps..."
  cmd /c npm ci

  Write-Host "[Release] Building frontend dist..."
  cmd /c npm run build
} finally {
  Pop-Location
}

# Health checks (if backend is running locally)
$apiHealth = Test-Url "http://127.0.0.1:8000/api/health"
$assistantHealth = Test-Url "http://127.0.0.1:8000/api/assistant/health"

Write-Host "[Health] /api/health ->" ($apiHealth | ConvertTo-Json -Compress)
Write-Host "[Health] /api/assistant/health ->" ($assistantHealth | ConvertTo-Json -Compress)

Write-Host "[Done] Frontend dist built at frontend/dist. You can now run docker compose build to package frontend image that serves prebuilt dist."
