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

REM Resolve repo path relative to this script
set REPO_PATH=%~dp0
set REPO_PATH=%REPO_PATH:~0,-1%

REM Prefer venv Python if available
set PYTHON_EXE=
if exist "%REPO_PATH%\venv\Scripts\python.exe" set PYTHON_EXE="%REPO_PATH%\venv\Scripts\python.exe"
if "%PYTHON_EXE%"=="" set PYTHON_EXE=python

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
%PYTHON_EXE% -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
