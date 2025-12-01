@echo off
REM HesabPak Frontend Launcher
REM Starts React Development Server on port 3000

setlocal enabledelayedexpansion

color 0a
cls

echo.
echo ================================================
echo   HesabPak - Frontend Only (React + Vite)
echo ================================================
echo.

set NODEJS_PATH=C:\Program Files\nodejs
set REPO_PATH=C:\Users\Mahdi\source\repos\mahdiyarp\hp
set REPO_ROOT=%~dp0
set FRONTEND_DIR=%REPO_ROOT%frontend

REM Default backend URL (change if needed)
set VITE_BACKEND_URL=http://127.0.0.1:8000

echo [1/3] Checking Node.js...
set PATH=%NODEJS_PATH%;%PATH%
node --version >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js not found
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ? Node.js OK

echo.
echo [2/3] Installing dependencies (npm install)...
cd /d "%REPO_PATH%\frontend"
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo ? Dependencies installed

echo.
echo [3/3] Starting development server...
echo.
echo ================================================
echo   Frontend Starting...
echo ================================================
echo.
echo Access:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000 (must be running)
echo.
echo Credentials:
echo   Username: developer
echo   Password: 09123506545
echo.
echo Press Ctrl+C to stop
echo.
echo ================================================
echo.

echo Starting frontend dev server in %FRONTEND_DIR%
echo VITE_BACKEND_URL=%VITE_BACKEND_URL%
cd /d "%FRONTEND_DIR%"

echo Running: set VITE_BACKEND_URL=%VITE_BACKEND_URL% && npm run dev
set VITE_BACKEND_URL=%VITE_BACKEND_URL%&& npm run dev

pause
