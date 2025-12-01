@echo off
REM HesabPak - Docker Automated Installation for Windows
REM This script will install Docker Desktop and all requirements automatically

setlocal enabledelayedexpansion

echo.
echo ================================================
echo   HesabPak - Docker Auto-Installer
echo   Windows 10/11 Setup
echo ================================================
echo.

REM Check if running as Administrator
net session >nul 2>nul
if %errorLevel% neq 0 (
    echo.
    echo ERROR: This script requires Administrator privileges!
    echo.
    echo Please:
    echo   1. Right-click on this file (setup-docker.bat)
    echo   2. Select "Run as administrator"
    echo   3. Click "Yes" when prompted
    echo.
    pause
    exit /b 1
)

echo [Step 1] Checking Windows version...
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j
if "%VERSION%" == "10.0" (
    echo ? Windows 10/11 detected
) else (
    echo WARNING: This script is optimized for Windows 10/11
)

echo.
echo [Step 2] Checking for Git installation...
where git >nul 2>nul
if %errorLevel% equ 0 (
    echo ? Git is already installed
    git --version
) else (
    echo Installing Git...
    echo.
    
    REM Try using winget first
    winget --version >nul 2>nul
    if %errorLevel% equ 0 (
        winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
        if !errorLevel! equ 0 (
            echo ? Git installed successfully
        ) else (
            echo WARNING: Automatic Git installation failed
            echo Please install Git manually from: https://git-scm.com/download/win
        )
    ) else (
        echo.
        echo Please install Git manually:
        echo   https://git-scm.com/download/win
        echo.
        echo After installing Git, run this script again.
        pause
        exit /b 1
    )
)

echo.
echo [Step 3] Checking for Docker Desktop...
docker --version >nul 2>nul
if %errorLevel% equ 0 (
    echo ? Docker Desktop is already installed
    docker --version
) else (
    echo Docker Desktop not found. Installing...
    echo.
    
    REM Try using winget
    winget --version >nul 2>nul
    if %errorLevel% equ 0 (
        echo Downloading and installing Docker Desktop...
        echo Please wait - this may take several minutes...
        echo.
        
        winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements
        
        if !errorLevel! equ 0 (
            echo.
            echo ? Docker Desktop installation completed
            echo.
            echo IMPORTANT: Your computer may need to restart.
            echo Please restart your computer now for changes to take effect.
            echo.
            echo After restart, run this script again to continue setup.
            echo.
            pause
            exit /b 0
        ) else (
            echo.
            echo WARNING: Automatic installation via winget failed
            echo Trying alternative installation method...
            echo.
        )
    )
    
    REM Alternative: Direct download
    echo.
    echo Manual Installation Required
    echo ==============================
    echo.
    echo Please download Docker Desktop manually:
    echo   https://www.docker.com/products/docker-desktop
    echo.
    echo Installation steps:
    echo   1. Run the installer from the link above
    echo   2. Follow the installation wizard
    echo   3. When asked, enable "WSL 2" (Windows Subsystem for Linux)
    echo   4. Complete the installation and restart your computer
    echo   5. Run this script again
    echo.
    
    REM Try to open download page
    echo Opening Docker website...
    timeout /t 2 /nobreak
    start https://www.docker.com/products/docker-desktop
    
    pause
    exit /b 1
)

echo.
echo [Step 4] Starting Docker service...
docker ps >nul 2>nul
if %errorLevel% neq 0 (
    echo Starting Docker Desktop...
    if exist "C:\Program Files\Docker\Docker\Docker.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker.exe"
        echo.
        echo Waiting for Docker to start (this may take 2-3 minutes)...
        
        REM Wait up to 2 minutes for Docker to be ready
        set "wait_count=0"
        :wait_docker
        timeout /t 5 /nobreak
        docker ps >nul 2>nul
        if %errorLevel% neq 0 (
            set /a wait_count+=1
            if !wait_count! lss 24 (
                goto wait_docker
            ) else (
                echo.
                echo ERROR: Docker failed to start after 2 minutes
                echo.
                echo Please:
                echo   1. Check if Docker Desktop is running
                echo   2. Check system resources (RAM, disk space)
                echo   3. Try restarting Docker Desktop manually
                echo.
                pause
                exit /b 1
            )
        )
    ) else (
        echo ERROR: Docker installation not found
        pause
        exit /b 1
    )
)

echo ? Docker is running

echo.
echo [Step 5] Verifying Docker Compose...
docker compose version >nul 2>nul
if %errorLevel% neq 0 (
    echo ERROR: Docker Compose not found
    echo Docker Compose should be included with Docker Desktop v1.27.0 or higher
    echo Please ensure Docker Desktop is fully updated
    pause
    exit /b 1
)
echo ? Docker Compose is available

echo.
echo [Step 6] Building and starting HesabPak...
cd /d "%~dp0"

echo Building containers (this may take 5-10 minutes)...
docker compose up -d --build

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Failed to build containers
    echo.
    echo Troubleshooting:
    echo   1. Make sure Docker Desktop is running
    echo   2. Check available disk space (at least 10GB free)
    echo   3. Check available RAM (at least 4GB free)
    echo   4. Try: docker compose down && docker system prune -a
    echo.
    pause
    exit /b 1
)

echo.
echo Waiting for services to initialize (30 seconds)...
timeout /t 30 /nobreak

echo.
echo ================================================
echo   ? Setup Complete!
echo ================================================
echo.
echo HesabPak is now running!
echo.
echo Access the application:
echo   Web Interface: http://localhost:3000
echo   API Docs:      http://localhost:8000/docs
echo.
echo Credentials:
echo   Username: developer
echo   Password: 09123506545
echo.
echo ================================================
echo.
echo Opening your browser...
timeout /t 2 /nobreak
start http://localhost:3000

echo.
echo Management Commands:
echo   - View logs:     docker compose logs -f
echo   - Stop services: docker compose down
echo   - Restart:       docker compose restart
echo   - Status:        docker compose ps
echo.
echo For more information, check SETUP_COMPLETE.md
echo.
pause
