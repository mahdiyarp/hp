# Zips the newest artifacts run under artifacts/<Type>
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/zip-latest-artifacts.ps1 [-Type e2e|dev|ui-smoke|backend] [-OutDir artifacts\export]

param(
  [ValidateSet('e2e','dev','ui-smoke','backend')]
  [string]$Type = 'e2e',
  [string]$OutDir
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path "$PSScriptRoot\.."
$artifactsTypeDir = Join-Path $repoRoot ("artifacts\$Type")
if (-not (Test-Path $artifactsTypeDir)) {
  Write-Host "[Zip] No artifacts found at $artifactsTypeDir" -ForegroundColor Yellow
  exit 1
}

$latestRunDir = Get-ChildItem -Path $artifactsTypeDir -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latestRunDir) {
  Write-Host "[Zip] No run directories found under $artifactsTypeDir" -ForegroundColor Yellow
  exit 1
}

if (-not $OutDir -or $OutDir.Trim() -eq '') {
  $OutDir = Join-Path $repoRoot 'artifacts\export'
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipPath = Join-Path $OutDir ("$Type-$ts.zip")

Write-Host "[Zip] Compressing $($latestRunDir.FullName) -> $zipPath"
if (Test-Path $zipPath) { Remove-Item -Force -LiteralPath $zipPath }
Compress-Archive -Path (Join-Path $latestRunDir.FullName '*') -DestinationPath $zipPath

Write-Host "[Zip] Done: $zipPath"
