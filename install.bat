@echo off
REM hp\a010124pp - Windows Installation Script
REM Installation and setup for HesabPak Application

setlocal enabledelayedexpansion

echo.
echo ============================================
echo   HesabPak Installation (Windows)
echo   hp\a010124pp
echo ============================================
echo.

REM Check if Git is installed
where git >nul 2>nul
if errorlevel 1 (
    echo ERROR: Git is not installed. Please install Git from https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Check if Docker is installed
where docker >nul 2>nul
if errorlevel 1 (
    echo ERROR: Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    echo Installing Docker is required to run HesabPak.
    pause
    exit /b 1
)

REM Create installation directory
set INSTALL_DIR=%USERPROFILE%\hp
if not exist "%INSTALL_DIR%" (
    echo Creating installation directory: %INSTALL_DIR%
    mkdir "%INSTALL_DIR%"
) else (
    echo Installation directory already exists: %INSTALL_DIR%
)

cd /d "%INSTALL_DIR%"

REM Clone or update repository
if exist ".git" (
    echo Updating existing repository...
    git pull origin main
) else (
    echo Cloning HesabPak repository...
    git clone https://github.com/mahdiyarp/hp.git .
)

if errorlevel 1 (
    echo ERROR: Failed to clone repository
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating environment configuration...
    (
        echo # HesabPak Configuration
        echo BRANCH=1
        echo DB_USER=hesabpak
        echo DB_PASS=secure_password_123
        echo DB_NAME=hesabpak_db
        echo DEVELOPER_USER=developer
        echo DEVELOPER_PASS=09123506545
    ) > .env
    echo .env file created. Update it if needed.
)

REM Check Docker status
echo.
echo Checking Docker service...
docker ps >nul 2>nul
if errorlevel 1 (
    echo WARNING: Docker daemon is not running. Starting Docker Desktop...
    REM Attempt to start Docker Desktop
    start "" "C:\Program Files\Docker\Docker\Docker.exe"
    timeout /t 10 /nobreak
    echo Please wait for Docker to fully start...
    timeout /t 10 /nobreak
)

REM Start containers
echo.
echo Starting HesabPak services...
docker compose up -d --build

if errorlevel 1 (
    echo ERROR: Failed to start Docker containers
    echo Please check Docker installation and ensure Docker Desktop is running
    pause
    exit /b 1
)

REM Wait for services to start
echo.
echo Waiting for services to initialize (10 seconds)...
timeout /t 10 /nobreak

REM Create desktop shortcut
echo.
echo Creating desktop shortcut...
powershell -Command "& {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\HesabPak.lnk')
    $Shortcut.TargetPath = 'cmd.exe'
    $Shortcut.Arguments = '/c cd /d %INSTALL_DIR% && call start.bat'
    $Shortcut.WorkingDirectory = '%INSTALL_DIR%'
    $Shortcut.Description = 'HesabPak - Business Management System'
    $Shortcut.IconLocation = '%INSTALL_DIR%\frontend\public\favicon.ico'
    $Shortcut.Save()
    Write-Host 'Desktop shortcut created successfully!'
}"

echo.
echo ============================================
echo Installation completed successfully!
echo ============================================
echo.
echo Quick Start:
echo   1. Open your browser and go to: http://localhost:3000
echo   2. API documentation: http://localhost:8000/docs
echo   3. Username: developer
echo   4. Password: 09123506545
echo.
echo To start the application later, run:
echo   cd "%INSTALL_DIR%" ^&^& start.bat
echo.
echo To stop services, run:
echo   docker compose down
echo.
pause
