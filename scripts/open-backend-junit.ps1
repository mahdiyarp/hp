param(
    [string]$ArtifactsRoot = "artifacts/backend"
)

Write-Host "Searching for latest backend junit.xml under '$ArtifactsRoot'..."

if (-not (Test-Path -Path $ArtifactsRoot)) {
    Write-Error "Artifacts root '$ArtifactsRoot' not found. Run backend tests first."
    exit 1
}

$latestRun = Get-ChildItem -Path $ArtifactsRoot -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latestRun) {
    Write-Error "No backend artifact runs found."
    exit 1
}

$junitPath = Join-Path $latestRun.FullName "junit.xml"
if (-not (Test-Path -Path $junitPath)) {
    Write-Error "JUnit XML not found at '$junitPath'. Ensure you ran with -JUnit."
    exit 2
}

Write-Host "Opening JUnit XML: $junitPath"
Start-Process $junitPath
