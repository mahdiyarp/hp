param(
    [string]$ArtifactsRoot = "artifacts/backend"
)

Write-Host "Opening latest backend artifacts under '$ArtifactsRoot'..."

if (-not (Test-Path -Path $ArtifactsRoot)) {
    Write-Error "Artifacts root '$ArtifactsRoot' not found. Run backend tests first."
    exit 1
}

$latestRun = Get-ChildItem -Path $ArtifactsRoot -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latestRun) {
    Write-Error "No backend artifact runs found."
    exit 1
}

Write-Host "Opening: $($latestRun.FullName)"
Start-Process explorer $latestRun.FullName
