@echo off
REM HesabPak Backend Launcher
REM Starts FastAPI on port 8000

setlocal enabledelayedexpansion

color 0a
cls

echo.
echo ================================================
echo   HesabPak - Backend Only (FastAPI)
echo ================================================
echo.

set PYTHON_PATH=C:\Users\Mahdi\AppData\Local\Programs\Python\Python311
set REPO_PATH=C:\Users\Mahdi\source\repos\mahdiyarp\hp

REM Check PostgreSQL
echo [1/2] Checking PostgreSQL...
sc query postgresql-x64-15 >nul 2>nul
if errorlevel 1 (
    echo Starting PostgreSQL service...
    net start postgresql-x64-15 >nul 2>nul
    timeout /t 3 /nobreak
)
echo ? PostgreSQL OK

echo.
echo [2/2] Starting FastAPI Backend...
echo.
echo ================================================
echo   Backend Starting...
echo ================================================
echo.
echo Access:
echo   Web API:       http://localhost:8000
echo   Swagger Docs:  http://localhost:8000/docs
echo   ReDoc:         http://localhost:8000/redoc
echo.
echo Database:
echo   Host: localhost:5432
echo   DB:   hesabpak
echo   User: postgres
echo.
echo Press Ctrl+C to stop
echo.
echo ================================================
echo.

cd /d "%REPO_PATH%\backend"
%PYTHON_PATH%\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
