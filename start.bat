@echo off
setlocal ENABLEDELAYEDEXPANSION
REM ==================================================
REM HesabPak Start - Simplified (ASCII safe)
REM Args: demo | skipcheck
REM ==================================================
cd /d "%~dp0"
set MODE=normal
set SKIPCHECK=0
if /I "%~1"=="demo" set MODE=demo
if /I "%~1"=="skipcheck" set SKIPCHECK=1
if /I "%~2"=="skipcheck" set SKIPCHECK=1
echo ==== HesabPak START ====
echo Mode=%MODE%  HealthChecks=%SKIPCHECK%
echo ========================

docker ps >nul 2>nul
if errorlevel 1 (
    echo Docker not ready. Trying to start Docker Desktop...
    if exist "C:\Program Files\Docker\Docker\Docker.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker.exe"
        for /L %%I in (1,1,25) do (
            docker ps >nul 2>nul
            if not errorlevel 1 goto :docker_ok
            timeout /t 1 >nul
        )
        echo Docker failed to initialize.
        exit /b 1
    ) else (
        echo Docker Desktop not installed.
        exit /b 1
    )
)
:docker_ok
echo Docker OK.

echo Starting containers...
if /I "%MODE%"=="demo" (
    docker compose -f docker-compose.demo.yml up -d --build
) else (
    docker compose up -d --build
)
if errorlevel 1 (
    echo Compose failed. See logs.
    exit /b 1
)
docker compose ps

if %SKIPCHECK%==1 goto :skip_checks

set API_READY=0
for /L %%I in (1,1,30) do (
    powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:8000/docs -TimeoutSec 2).StatusCode -eq 200 } catch { $false }" >nul
    if !ERRORLEVEL! EQU 0 (
        set API_READY=1
        goto :api_done
    )
    timeout /t 2 >nul
)
:api_done
if !API_READY! EQU 1 (echo API OK) else (echo API NOT READY)

set FE_READY=0
for /L %%J in (1,1,30) do (
    powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:3000 -TimeoutSec 2).StatusCode -eq 200 } catch { $false }" >nul
    if !ERRORLEVEL! EQU 0 (
        set FE_READY=1
        goto :fe_done
    )
    timeout /t 2 >nul
)
:fe_done
if !FE_READY! EQU 1 (echo FRONTEND OK) else (echo FRONTEND NOT READY)
goto :after_checks

:skip_checks
echo Skipping health checks.

:after_checks
echo ========================
echo Services started.
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo Default Login: developer / 09123506545
echo ========================
start "" "http://localhost:3000" 2>nul
exit /b 0
