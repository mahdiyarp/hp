@echo off
REM HesabPak Stop Script for Windows

echo.
echo Stopping HesabPak services...
echo.

cd /d "%~dp0"

docker compose down

if errorlevel 1 (
    echo WARNING: Some services may not have stopped cleanly
) else (
    echo All services stopped successfully.
)

echo.
pause
