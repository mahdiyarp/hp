@echo off
REM HesabPak Complete Auto-Run Script
REM Starts Backend (FastAPI) and Frontend (React)

setlocal enabledelayedexpansion

color 0a
cls

echo.
echo ================================================
echo   HesabPak - Complete Application Launcher
echo ================================================
echo.

REM Set paths
set PYTHON_PATH=C:\Users\Mahdi\AppData\Local\Programs\Python\Python311
set NODEJS_PATH=C:\Program Files\nodejs
set REPO_PATH=C:\Users\Mahdi\source\repos\mahdiyarp\hp

REM Check PostgreSQL
echo [1/4] Checking PostgreSQL service...
sc query postgresql-x64-15 >nul 2>nul
if errorlevel 1 (
    echo Starting PostgreSQL service...
    net start postgresql-x64-15 >nul 2>nul
)

echo.
echo [2/4] Starting Backend (FastAPI on port 8000)...
echo.

REM Start Backend in new window
start "HesabPak Backend" cmd /k ^
    "set PATH=%PYTHON_PATH%;%PATH% && ^
     cd /d "%REPO_PATH%\backend" && ^
     %PYTHON_PATH%\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload && ^
     pause"

REM Wait for backend to start
timeout /t 5 /nobreak

echo [3/4] Starting Frontend (React on port 3000)...
echo.

REM Start Frontend in new window
start "HesabPak Frontend" cmd /k ^
    "set PATH=%NODEJS_PATH%;%PATH% && ^
     cd /d "%REPO_PATH%\frontend" && ^
     npm install && ^
     npm run dev && ^
     pause"

REM Wait for services
timeout /t 3 /nobreak

echo.
echo ================================================
echo    ? Application Started!
echo ================================================
echo.
echo Backend:   http://localhost:8000
echo API Docs:  http://localhost:8000/docs
echo Frontend:  http://localhost:3000
echo.
echo Opening browser...
timeout /t 3 /nobreak

start http://localhost:3000

echo.
echo Press Ctrl+C in either window to stop the service
echo.
pause
