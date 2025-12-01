@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
REM ==================================================
REM HesabPak - Stop Script
REM Usage:
REM   stop.bat       -> stop containers
REM   stop.bat full  -> stop + remove volumes + orphans
REM ==================================================

cd /d "%~dp0"

set MODE=normal
if /I "%1"=="full" set MODE=full

echo ==================================================
echo   توقف سرویس‌ها (حالت: %MODE%)
echo ==================================================
echo.

REM Check if anything is running
docker compose ps -q >nul 2>nul
if errorlevel 1 (
    echo [!] Docker یا compose در دسترس نیست.
    exit /b 1
)
for /f %%X in ('docker compose ps -q') do set FOUND=1
if not defined FOUND (
    echo [i] کانتینر فعالی برای توقف یافت نشد.
    goto :END
)

if /I "%MODE%"=="full" (
    echo [>] اجرای: docker compose down -v --remove-orphans
    docker compose down -v --remove-orphans
) else (
    echo [>] اجرای: docker compose down
    docker compose down
)

if errorlevel 1 (
    echo [!] هشدار: برخی سرویس‌ها شاید کامل متوقف نشده باشند.
) else (
    echo [+] همه سرویس‌ها با موفقیت متوقف شدند.
)

:END
echo.
echo [i] وضعیت فعلی:
docker ps --format "table {{.Names}}\t{{.Status}}" | find /I "hesabpak" >nul || echo   (هیچ کانتینر مرتبط فعال نیست)
echo.
pause

