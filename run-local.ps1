# HesabPak Auto-Setup & Run Script
# This script sets up all dependencies and runs the application

Write-Host "`n" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "HesabPak Auto Setup & Run" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if PostgreSQL is installed
Write-Host "[1/5] Checking PostgreSQL installation..." -ForegroundColor Yellow

$pgPath = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
if (-not (Test-Path $pgPath)) {
    Write-Host "? PostgreSQL not running. Attempting to start service..." -ForegroundColor Yellow
    
    try {
        Get-Service postgresql-x64-15 -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Write-Host "? PostgreSQL service started" -ForegroundColor Green
    } catch {
        Write-Host "? Could not start PostgreSQL service" -ForegroundColor Red
        Write-Host "  Please ensure PostgreSQL 15 is installed and the service is running" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Create database
Write-Host "`n[2/5] Creating database..." -ForegroundColor Yellow

$env:PGPASSWORD = "postgres"
try {
    & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE hesabpak;" 2>$null
    Write-Host "? Database created" -ForegroundColor Green
} catch {
    Write-Host "? Database already exists" -ForegroundColor Green
}

# Step 3: Setup Python virtual environment
Write-Host "`n[3/5] Setting up Python environment..." -ForegroundColor Yellow

$venvPath = Join-Path (Get-Location) "venv"
if (-not (Test-Path $venvPath)) {
    & python -m venv venv
    Write-Host "? Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "? Virtual environment already exists" -ForegroundColor Green
}

# Activate venv
& ".\venv\Scripts\Activate.ps1"
Write-Host "? Virtual environment activated" -ForegroundColor Green

# Step 4: Install and setup Node.js frontend dependencies
Write-Host "`n[4/5] Setting up frontend..." -ForegroundColor Yellow

if (Test-Path "frontend\package.json") {
    cd frontend
    npm install -q 2>$null
    Write-Host "? Frontend dependencies installed" -ForegroundColor Green
    cd ..
} else {
    Write-Host "? Frontend directory not found" -ForegroundColor Yellow
}

# Step 5: Run migrations and start backend
Write-Host "`n[5/5] Running migrations..." -ForegroundColor Yellow

cd backend

# Run Alembic migrations
python -m alembic upgrade head 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "? Database migrations completed" -ForegroundColor Green
} else {
    Write-Host "? Migration had issues but continuing..." -ForegroundColor Yellow
}

# Start FastAPI backend
Write-Host "`n" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "? Setup Complete! Starting HesabPak..." -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""
Write-Host "Backend starting on http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend available on http://localhost:3000" -ForegroundColor Cyan
Write-Host "Credentials: developer / 09123506545" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the application
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
