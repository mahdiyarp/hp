[CmdletBinding()]
param(
    [Parameter(HelpMessage="Skip confirmations and proceed" )]
    [switch]$Force,

    [Parameter(HelpMessage="Force-push to origin after purge")]
    [switch]$Push,

    [Parameter(HelpMessage="Paths to purge from history (git-style paths)")]
    [string[]]$Paths = @('site/id_rsa','site/id_rsa.ppk')
)

function Confirm-Or-Exit([string]$Message) {
    if ($Force) { return }
    $ans = Read-Host "$Message (y/N)"
    if ($ans -ne 'y' -and $ans -ne 'Y') {
        Write-Host 'Aborted.' -ForegroundColor Yellow
        exit 1
    }
}

function Require-Command([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        Write-Error "Required command '$Name' not found in PATH."
        exit 1
    }
}

Write-Host '=== Git History Purge Helper ===' -ForegroundColor Cyan

Require-Command git

# Check git-filter-repo availability (help should print and return 0)
$null = git filter-repo --help 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "git filter-repo is not available. Install via: `n  python -m pip install git-filter-repo`n  # or: scoop install git-filter-repo"
    exit 1
}

# Show current repo and branch
$repoTop = git rev-parse --show-toplevel 2>$null
if (-not $repoTop) {
    Write-Error 'Not inside a git repository.'
    exit 1
}
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Repository: $repoTop" -ForegroundColor DarkGray
Write-Host "Current branch: $branch" -ForegroundColor DarkGray

# Check working tree state
$changes = git status --porcelain
if ($changes) {
    Write-Warning 'Working tree is not clean. Commit or stash changes before proceeding.'
    if (-not $Force) { exit 1 }
}

# Display targets
Write-Host 'Targets to purge from history:' -ForegroundColor Gray
$Paths | ForEach-Object { Write-Host " - $_" }
Confirm-Or-Exit 'Proceed to backup .git and purge history now?'

# Backup .git folder one level up
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path (Split-Path -Parent $repoTop) ("hp-backup-$ts.git")
Write-Host "Creating backup: $backup" -ForegroundColor Gray
Copy-Item -Recurse -Force (Join-Path $repoTop '.git') $backup

# Suppress filter-repo warning on non-bare repo
$env:GIT_FILTER_REPO_SQUELCH_WARNING = '1'

Push-Location $repoTop
try {
    foreach ($p in $Paths) {
        Write-Host "Purging path from history: $p" -ForegroundColor Yellow
        git filter-repo --force --path $p --invert-paths
        if ($LASTEXITCODE -ne 0) { throw "filter-repo failed for path $p" }
    }
}
finally {
    Pop-Location
}

# Verification hints
Write-Host 'Verifying removal (no results should appear):' -ForegroundColor Gray
foreach ($p in $Paths) {
    Write-Host " - git log --stat -- $p" -ForegroundColor DarkGray
    git log --stat -- $p | Select-Object -First 1
}

# Optional push
if ($Push -or $Force) {
    Confirm-Or-Exit 'About to force-push rewritten history to origin. Continue?'
    Write-Host 'Pushing --all and --tags with --force' -ForegroundColor Yellow
    git push origin --force --all
    git push origin --force --tags
    Write-Host 'Force-push completed.' -ForegroundColor Green
} else {
    Write-Host 'Skipped push. To push later, run:' -ForegroundColor Gray
    Write-Host '  git push origin --force --all' -ForegroundColor DarkGray
    Write-Host '  git push origin --force --tags' -ForegroundColor DarkGray
}

Write-Host 'Done. Share instructions for collaborators to re-clone or hard reset.' -ForegroundColor Green
