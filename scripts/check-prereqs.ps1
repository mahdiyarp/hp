# Checks local prerequisites for running dev, tests, and e2e flows
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/check-prereqs.ps1

$ErrorActionPreference = 'Stop'

function Test-Cmd($cmd, $args) {
  try {
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $cmd
    $pinfo.Arguments = $args
    $pinfo.RedirectStandardOutput = $true
    $pinfo.RedirectStandardError = $true
    $pinfo.UseShellExecute = $false
    $pinfo.CreateNoWindow = $true
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $pinfo
    $null = $p.Start()
    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    return @{ ok = ($p.ExitCode -eq 0); code = $p.ExitCode; out = $stdout.Trim(); err = $stderr.Trim() }
  } catch {
    return @{ ok = $false; code = -1; out = ''; err = $_.Exception.Message }
  }
}

$failures = @()

# Node
$node = Test-Cmd 'cmd' '/c node --version'
if ($node.ok) { Write-Host "[Check] node: $($node.out)" } else { Write-Host "[Check] node: MISSING" -ForegroundColor Yellow; $failures += 'node' }

# npm
$npm = Test-Cmd 'cmd' '/c npm --version'
if ($npm.ok) { Write-Host "[Check] npm: $($npm.out)" } else { Write-Host "[Check] npm: MISSING" -ForegroundColor Yellow; $failures += 'npm' }

# Python (prefer .venv if present)
$venvPy = Join-Path $PSScriptRoot '..\.venv\Scripts\python.exe'
if (Test-Path $venvPy) { $pyCmd = $venvPy } else { $pyCmd = 'python' }
$py = Test-Cmd $pyCmd '--version'
if ($py.ok) { Write-Host "[Check] python: $($py.out) ($pyCmd)" } else { Write-Host "[Check] python: MISSING" -ForegroundColor Yellow; $failures += 'python' }

# Docker
$docker = Test-Cmd 'cmd' '/c docker --version'
if ($docker.ok) { Write-Host "[Check] docker: $($docker.out)" } else { Write-Host "[Check] docker: MISSING" -ForegroundColor Yellow; $failures += 'docker' }

$compose = Test-Cmd 'cmd' '/c docker compose version'
if ($compose.ok) { Write-Host "[Check] docker compose: $($compose.out)" } else { Write-Host "[Check] docker compose: MISSING" -ForegroundColor Yellow; $failures += 'docker compose' }

# Playwright CLI (from frontend dev deps)
Push-Location "$PSScriptRoot/../frontend"
try {
  $pw = Test-Cmd 'cmd' '/c npx playwright --version'
  if ($pw.ok) { Write-Host "[Check] playwright: $($pw.out)" } else { Write-Host "[Check] playwright: Not installed yet (will be installed by scripts)" -ForegroundColor Yellow }
} finally { Pop-Location }

if ($failures.Count -gt 0) {
  Write-Host "\n[Check] Missing prerequisites: $($failures -join ', ')" -ForegroundColor Red
  Write-Host "Install the missing tools and re-run."
  exit 1
} else {
  Write-Host "\n[Check] All core prerequisites are available." -ForegroundColor Green
}
