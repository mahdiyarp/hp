param(
    [string]$ArtifactsRoot = "artifacts/backend"
)

Write-Host "Searching for latest backend coverage report under '$ArtifactsRoot'..."

if (-not (Test-Path -Path $ArtifactsRoot)) {
    Write-Error "Artifacts root '$ArtifactsRoot' not found. Run backend tests with -Coverage first."
    exit 1
}

$latestRun = Get-ChildItem -Path $ArtifactsRoot -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latestRun) {
    Write-Error "No backend artifact runs found."
    exit 1
}

$coverageIndex = Join-Path $latestRun.FullName "coverage_html/index.html"
if (-not (Test-Path -Path $coverageIndex)) {
    Write-Error "Coverage HTML not found at '$coverageIndex'. Ensure you ran with -Coverage."
    exit 2
}

Write-Host "Opening coverage report: $coverageIndex"
Start-Process $coverageIndex
