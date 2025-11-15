@echo off
REM HesabPak Startup Script for Windows

cd /d "%~dp0"

echo.
echo Starting HesabPak services...
echo.

REM Check if Docker is running
docker ps >nul 2>nul
if errorlevel 1 (
    echo WARNING: Docker is not running. Attempting to start Docker Desktop...
    REM Try to start Docker Desktop
    if exist "C:\Program Files\Docker\Docker\Docker.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker.exe"
        echo Waiting for Docker to start...
        timeout /t 15 /nobreak
    ) else (
        echo ERROR: Docker Desktop not found. Please install Docker from https://www.docker.com/products/docker-desktop
        pause
        exit /b 1
    )
)

REM Start containers
docker compose up -d --build
if errorlevel 1 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)

REM Wait for services to be ready
echo.
echo Waiting for services to initialize...
timeout /t 10 /nobreak

echo.
echo ============================================
echo HesabPak is now running!
echo ============================================
echo.
echo Access the application:
echo   Web UI: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.
echo Credentials:
echo   Username: developer
echo   Password: 09123506545
echo.
echo To stop services, run: docker compose down
echo.

REM Open browser
echo Opening web interface in your default browser...
timeout /t 2 /nobreak
start http://localhost:3000

echo.
echo Keep this window open to maintain services.
echo Close this window to stop the application.
pause
