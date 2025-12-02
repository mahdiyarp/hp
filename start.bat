@echo off
setlocal ENABLEDELAYEDEXPANSION
REM ==================================================
REM HesabPak Start - Enhanced Orchestrator
REM Args: demo | skipcheck
REM ==================================================
cd /d "%~dp0"
set MODE=normal
set SKIPCHECK=0
if /I "%~1"=="demo" set MODE=demo
if /I "%~1"=="prod" set MODE=prod
if /I "%~1"=="skipcheck" set SKIPCHECK=1
if /I "%~2"=="skipcheck" set SKIPCHECK=1

if not exist "logs" mkdir "logs"
set LOGFILE=logs\latest.log
echo.> "%LOGFILE%"
echo ==== HesabPak START ====>>"%LOGFILE%"
echo Mode=%MODE%  HealthChecks=%SKIPCHECK%>>"%LOGFILE%"
echo ========================>>"%LOGFILE%"
echo ==== HesabPak START ====
echo Mode=%MODE%  HealthChecks=%SKIPCHECK%
echo ========================

docker ps >nul 2>nul
if errorlevel 1 (
    echo Docker not ready. Trying to start Docker Desktop...>>"%LOGFILE%"
    if exist "C:\Program Files\Docker\Docker\Docker.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker.exe"
        for /L %%I in (1,1,25) do (
            docker ps >nul 2>nul
            if not errorlevel 1 goto :docker_ok
            timeout /t 1 >nul
        )
        echo Docker failed to initialize.>>"%LOGFILE%"
        exit /b 1
    ) else (
        echo Docker Desktop not installed.>>"%LOGFILE%"
        exit /b 1
    )
)
:docker_ok
echo Docker OK.>>"%LOGFILE%"
echo Docker OK.

REM ---------------------------
REM Port check temporarily disabled due to cmd parsing issues
REM ---------------------------

echo Starting containers...>>"%LOGFILE%"
echo Starting containers...
if /I "%MODE%"=="demo" (
    docker compose -f docker-compose.demo.yml up -d --build
) else if /I "%MODE%"=="prod" (
    if exist docker-compose.production.yml (
        docker compose -f docker-compose.production.yml up -d --build >>"%LOGFILE%" 2>&1
    ) else (
        echo docker-compose.production.yml not found. Falling back to default compose.>>"%LOGFILE%"
        docker compose up -d --build >>"%LOGFILE%" 2>&1
    )
) else (
    docker compose up -d --build >>"%LOGFILE%" 2>&1
)
if errorlevel 1 (
    echo Compose failed. See logs.>>"%LOGFILE%"
    exit /b 1
)
if exist docker-compose.production.yml (
    docker compose -f docker-compose.production.yml ps >>"%LOGFILE%"
) else (
    docker compose ps >>"%LOGFILE%"
)

if %SKIPCHECK%==1 goto :skip_checks

set API_READY=0
for /L %%I in (1,1,30) do (
    powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:8000/api/health -TimeoutSec 2).StatusCode -eq 200 } catch { $false }" >nul
    if !ERRORLEVEL! EQU 0 (
        set API_READY=1
        goto :api_done
    )
    timeout /t 2 >nul
)
:api_done
if !API_READY! EQU 1 (echo API OK& echo API OK>>"%LOGFILE%") else (echo API NOT READY& echo API NOT READY>>"%LOGFILE%")

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
if !FE_READY! EQU 1 (echo FRONTEND OK& echo FRONTEND OK>>"%LOGFILE%") else (echo FRONTEND NOT READY& echo FRONTEND NOT READY>>"%LOGFILE%")
goto :after_checks

:skip_checks
echo Skipping health checks.

:after_checks
echo ========================>>"%LOGFILE%"
echo Services started.>>"%LOGFILE%"
echo Frontend: http://localhost:3000>>"%LOGFILE%"
echo API Health: http://localhost:8000/api/health>>"%LOGFILE%"
echo Assistant Health: http://localhost:8000/api/assistant/health>>"%LOGFILE%"
echo ========================>>"%LOGFILE%"
echo ========================
echo Services started. (Log: %LOGFILE%)
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo API Health: http://localhost:8000/api/health
echo Assistant Health: http://localhost:8000/api/assistant/health
echo ========================
start "" "http://localhost:3000" 2>nul
exit /b 0
