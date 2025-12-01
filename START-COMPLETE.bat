@echo off
REM HesabPak Complete Setup & Run
REM ÊäÙ?ã ˜Çãá æ ÇÌÑÇ? HesabPak

setlocal enabledelayedexpansion

color 0a
cls

echo.
echo ========================================================
echo   HesabPak - Complete Setup and Launcher
echo   Ó?ÓÊã ãÇá? æ ÍÓÇÈÏÇÑ? åÓÇÈÇ˜
echo ========================================================
echo.

set PYTHON_PATH=C:\Users\Mahdi\AppData\Local\Programs\Python\Python311
set NODEJS_PATH=C:\Program Files\nodejs
set REPO_PATH=C:\Users\Mahdi\source\repos\mahdiyarp\hp
set PG_PATH=C:\Program Files\PostgreSQL\15\bin

echo [Step 1/5] Starting PostgreSQL...
sc query postgresql-x64-15 >nul 2>nul
if errorlevel 1 (
    echo Starting PostgreSQL service...
    net start postgresql-x64-15 >nul 2>nul
)
timeout /t 2 /nobreak
echo ? PostgreSQL OK
echo.

echo [Step 2/5] Starting Backend (FastAPI)...
cd /d "%REPO_PATH%\backend"
start "HesabPak Backend" cmd /k "%PYTHON_PATH%\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 5 /nobreak
echo ? Backend started on port 8000
echo.

echo [Step 3/5] Installing Frontend dependencies (npm)...
cd /d "%REPO_PATH%\frontend"
set PATH=%NODEJS_PATH%;%PATH%
start "HesabPak Frontend Install" cmd /k "npm install --legacy-peer-deps && npm run dev"
timeout /t 3 /nobreak
echo ? Frontend setup started
echo.

echo [Step 4/5] Opening browser windows...
timeout /t 5 /nobreak

echo Opening API Docs (Swagger)...
start http://localhost:8000/docs

timeout /t 1 /nobreak
echo Opening API ReDoc...
start http://localhost:8000/redoc

timeout /t 1 /nobreak
echo Opening Backend API...
start http://localhost:8000

timeout /t 1 /nobreak
echo Opening Frontend...
start http://localhost:5173

echo ? Browser windows opened
echo.

echo [Step 5/5] Setup Complete!
echo.
echo ========================================================
echo   ? HesabPak Application Started
echo ========================================================
echo.
echo ?? Access Points:
echo   Frontend:      http://localhost:5173
echo   Backend API:   http://localhost:8000
echo   Swagger Docs:  http://localhost:8000/docs
echo   ReDoc:         http://localhost:8000/redoc
echo.
echo ?? Credentials:
echo   Username: developer
echo   Password: 09123506545
echo.
echo ?? What's Running:
echo   - Backend (FastAPI) on port 8000
echo   - Frontend (React) on port 3000
echo   - Database (PostgreSQL) on port 5432
echo.
echo ?? To Stop Services:
echo   - Close the Backend window (or Ctrl+C)
echo   - Close the Frontend window (or Ctrl+C)
echo.
echo ========================================================
echo.
echo Waiting for services to be ready (30 seconds)...
timeout /t 30 /nobreak

echo.
echo All set! You can now:
echo   1. Use API at http://localhost:8000/docs
echo   2. Access Frontend at http://localhost:3000
echo   3. Login with: developer / 09123506545
echo.
pause
