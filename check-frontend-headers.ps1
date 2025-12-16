Param(
  [string]$Url = 'http://127.0.0.1:3000/'
)

$ErrorActionPreference = 'Stop'
try {
  $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
  $headers = $r.Headers
  $required = @('ETag','X-Content-Type-Options','Referrer-Policy','X-Frame-Options')
  $missing = @()
  foreach ($h in $required) { if (-not $headers[$h]) { $missing += $h } }
  if ($missing.Count -gt 0) {
    Write-Host ("[headers] Missing: {0}" -f ($missing -join ', ')) -ForegroundColor Red
    exit 1
  } else {
    Write-Host "[headers] OK: ETag + security headers present" -ForegroundColor Green
  }
} catch {
  Write-Host ("[headers] Request failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
  exit 1
}
