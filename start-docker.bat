@echo off
REM HesabPak Docker Launcher for Windows
REM »—‰«„Âùò‰‰œÂ ŒÊœò«— HesabPak »—«? Docker

setlocal enabledelayedexpansion
color 0a
cls

echo.
echo ========================================================
echo   HesabPak - Docker Launcher
echo   ”?” „ „«·? Ê Õ”«»œ«—?
echo ========================================================
echo.

REM »——”? Docker
echo [1/5] Checking Docker...
docker --version >nul 2>nul
if errorlevel 1 (
    echo ERROR: Docker not found or not installed
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo ? Docker found
echo.

REM »——”? docker-compose
echo [2/5] Checking docker-compose...
docker-compose --version >nul 2>nul
if errorlevel 1 (
    echo Trying: docker compose
    docker compose version >nul 2>nul
    if errorlevel 1 (
        echo ERROR: docker-compose or docker compose not found
        pause
        exit /b 1
    )
    set COMPOSE=docker compose
    echo ? Using: docker compose
) else (
    set COMPOSE=docker-compose
    echo ? Using: docker-compose
)
echo.

REM »«·« ¬Ê—œ‰ ò«‰ ?‰—Â«
echo [3/5] Building and starting containers...
echo This may take 2-5 minutes on first run...
echo.
cd /d "C:\Users\Mahdi\source\repos\mahdiyarp\hp"
%COMPOSE% up -d --build
if errorlevel 1 (
    echo ERROR: Failed to start services
    %COMPOSE% logs --tail=20
    pause
    exit /b 1
)
echo.
echo ? Containers started
echo.

REM Ê÷⁄?  ò«‰ ?‰—Â«
echo [4/5] Service status:
%COMPOSE% ps
echo.

REM „‰ Ÿ— »«‘?œ
echo [5/5] Waiting for services to be ready (30 seconds)...
timeout /t 30 /nobreak
echo.

REM Œ·«’Â
echo ========================================================
echo   ? HesabPak is Running
echo ========================================================
echo.
echo ?? Access Points:
echo   Frontend:     http://localhost:3000
echo   Backend API:  http://localhost:8000
echo   Swagger Docs: http://localhost:8000/docs
echo   ReDoc:        http://localhost:8000/redoc
echo.
echo ?? Credentials:
echo   Username: developer
echo   Password: 09123506545
echo.
echo ?? Management Commands:
echo   View logs:    %COMPOSE% logs -f
echo   Stop:         %COMPOSE% down
echo   Status:       %COMPOSE% ps
echo.
echo ========================================================
echo.

REM »«“ ò—œ‰ „—Ê—ê—Â«
echo Opening browser windows...
timeout /t 2 /nobreak
start http://localhost:3000
timeout /t 1 /nobreak
start http://localhost:8000/docs
timeout /t 1 /nobreak
start http://localhost:8000/redoc

echo.
echo All windows opened! Services are running.
echo.
echo To stop services, run:
echo   %COMPOSE% down
echo.
pause
