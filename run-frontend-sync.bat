@echo off
setlocal
set SCRIPT_DIR=%~dp0
PowerShell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%run-frontend-sync.ps1" %*
endlocal
