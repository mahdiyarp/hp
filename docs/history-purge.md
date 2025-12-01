Git History Purge — Secrets Removal Plan

This document outlines a safe, step-by-step procedure to purge sensitive keys (e.g., `site/id_rsa*`) from the repository history using `git filter-repo`. Coordinate with your team before force-pushing.

Prerequisites
- Confirm keys are rotated and no longer in use.
- Ensure all collaborators pause active work and are aware of the force-push window.
- Install `git-filter-repo` (preferred over `filter-branch`).

Install `git-filter-repo` (PowerShell)
```powershell
python -m pip install git-filter-repo
# Or use Scoop if available
# scoop install git-filter-repo
# Verify
git filter-repo --help | Out-String | Select-Object -First 1
```

Targets to Remove
- `site/id_rsa`
- `site/id_rsa.ppk`

Create a Safety Backup
```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "../hp-backup-$ts.git"
Copy-Item -Recurse -Force .git $backup
```

Run filter-repo to Remove Files
```powershell
# From repo root
$env:GIT_FILTER_REPO_SQUELCH_WARNING = "1"
# Remove specified paths across entire history (explicit calls recommended)
git filter-repo --force --path site/id_rsa --invert-paths
git filter-repo --force --path site/id_rsa.ppk --invert-paths
```

Verify Removal
```powershell
git log --stat -- site/id_rsa
git log --stat -- site/id_rsa.ppk
Test-Path site/id_rsa; Test-Path site/id_rsa.ppk
```

Rewrite Remote (Force Push)
```powershell
git remote -v
git push origin --force --all
git push origin --force --tags
```

Post-Purge Actions
- Notify collaborators that history was rewritten; advise re-clone or `git fetch --all` + `git reset --hard origin/<branch>`.
- Rotate any derived tokens/keys if applicable.
- Enable GitHub secret scanning if not active.

Optional: Protect Future Commits
```gitignore
site/id_rsa*
```

Rollback Plan
- Restore from `.git` backup created earlier: replace the `.git` folder with the backup.
- Alternatively, recover from remote refs or another trusted clone.

Notes
- `git filter-repo` is irreversible without backups; double-check paths.
- Always rotate secrets before purging history.
