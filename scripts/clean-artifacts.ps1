# Cleans old artifacts to save disk space
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/clean-artifacts.ps1 [-OlderThanDays 7] [-IncludeFrontendReport] [-WhatIf]

param(
  [int]$OlderThanDays = 7,
  [switch]$IncludeFrontendReport,
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path "$PSScriptRoot\.."
$artifactsRoot = Join-Path $root 'artifacts'
$threshold = (Get-Date).AddDays(-[double]$OlderThanDays)

if (-not (Test-Path $artifactsRoot)) {
  Write-Host "[Clean] No artifacts directory found at $artifactsRoot"
} else {
  Write-Host "[Clean] Removing artifacts older than $OlderThanDays day(s) (before $threshold)"
  $deleted = 0
  Get-ChildItem -Path $artifactsRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $typeDir = $_.FullName
    Get-ChildItem -Path $typeDir -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $runDir = $_
      if ($runDir.LastWriteTime -lt $threshold) {
        if ($WhatIf) {
          Write-Host "[Clean] Would remove: $($runDir.FullName)"
        } else {
          Write-Host "[Clean] Removing: $($runDir.FullName)"
          Remove-Item -Recurse -Force -LiteralPath $runDir.FullName
        }
        $deleted++
      }
    }
  }
  Write-Host "[Clean] Done. Candidates processed: $deleted"
}

if ($IncludeFrontendReport) {
  $fr = Join-Path $root 'frontend\playwright-report'
  if (Test-Path $fr) {
    if ($WhatIf) {
      Write-Host "[Clean] Would remove: $fr"
    } else {
      Write-Host "[Clean] Removing: $fr"
      Remove-Item -Recurse -Force -LiteralPath $fr
    }
  }
}
