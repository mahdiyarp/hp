# HesabPak Docker Installation Script (PowerShell)
# Run as Administrator: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser

param(
    [switch]$ForceInstall = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    $color = @{
        "?" = "Green"
        "?" = "Red"
        "?" = "Yellow"
        "?" = "Cyan"
    }
    Write-Host "[$Status] " -ForegroundColor $color[$Status] -NoNewline
    Write-Host $Message
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Wait-Docker {
    param([int]$TimeoutSeconds = 120)
    
    $elapsed = 0
    Write-Host "`nWaiting for Docker daemon..." -NoNewline
    
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $result = docker ps 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host " ?" -ForegroundColor Green
                return $true
            }
        } catch {}
        
        Start-Sleep -Seconds 5
        $elapsed += 5
        Write-Host "." -NoNewline
    }
    
    Write-Host " ? (Timeout)" -ForegroundColor Red
    return $false
}

# Check Administrator privileges
if (-not (Test-Administrator)) {
    Write-Status "Administrator privileges required!" "?"
    Write-Host "`nPlease run PowerShell as Administrator:`n"
    Write-Host "  1. Press Win + X"
    Write-Host "  2. Select 'Windows PowerShell (Admin)'"
    Write-Host "  3. Run: $PSCommandPath`n"
    exit 1
}

Write-Host "`n"
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   HesabPak Docker Installation (PowerShell)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Git
Write-Status "Checking Git installation..." "?"
$gitExists = $null -ne (Get-Command git -ErrorAction SilentlyContinue)

if ($gitExists) {
    $gitVersion = git --version
    Write-Status "Git found: $gitVersion" "?"
} else {
    Write-Status "Git not found" "?"
    Write-Host "  Attempting to install Git..."
    
    # Try winget
    $wingetExists = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
    
    if ($wingetExists) {
        try {
            & winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements 2>$null
            Write-Status "Git installed successfully" "?"
        } catch {
            Write-Status "Automatic Git installation failed" "?"
            Write-Host "  Please install manually: https://git-scm.com/download/win`n"
        }
    } else {
        Write-Host "  Please install Git manually: https://git-scm.com/download/win`n"
    }
}

# Step 2: Check Docker
Write-Status "Checking Docker installation..." "?"
$dockerExists = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

if ($dockerExists) {
    try {
        $dockerVersion = docker --version
        Write-Status "Docker found: $dockerVersion" "?"
    } catch {
        Write-Status "Docker found but not responding" "?"
    }
} else {
    Write-Status "Docker Desktop not found" "?"
    
    if ($ForceInstall) {
        Write-Host "  Attempting automatic installation..."
        $wingetExists = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
        
        if ($wingetExists) {
            try {
                Write-Host "  Starting Docker Desktop download and installation..."
                Write-Host "  This may take several minutes. Please wait...`n"
                
                & winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements 2>$null
                
                Write-Status "Docker installation completed" "?"
                Write-Host "`n  IMPORTANT: Your computer may need to restart."
                Write-Host "  Please restart and run this script again.`n"
                exit 0
            } catch {
                Write-Status "Automatic installation failed" "?"
                Write-Host "  Please install manually: https://www.docker.com/products/docker-desktop`n"
                exit 1
            }
        }
    } else {
        Write-Host "  To automatically install Docker, run:"
        Write-Host "  PowerShell -ExecutionPolicy Bypass -File $PSCommandPath -ForceInstall`n"
        Write-Host "  Or install manually: https://www.docker.com/products/docker-desktop`n"
    }
}

# Step 3: Check Docker running
Write-Status "Checking Docker daemon..." "?"
try {
    $null = docker ps 2>$null
    Write-Status "Docker daemon is running" "?"
} catch {
    Write-Status "Docker daemon is not running" "?"
    Write-Host "  Starting Docker Desktop..."
    
    $dockerPath = "C:\Program Files\Docker\Docker\Docker.exe"
    if (Test-Path $dockerPath) {
        & $dockerPath
        
        if (-not (Wait-Docker -TimeoutSeconds 180)) {
            Write-Status "Docker failed to start within timeout" "?"
            Write-Host "  Please check Docker Desktop for errors`n"
            exit 1
        }
    } else {
        Write-Status "Docker executable not found" "?"
        exit 1
    }
}

# Step 4: Check Docker Compose
Write-Status "Checking Docker Compose..." "?"
try {
    $null = docker compose version 2>$null
    Write-Status "Docker Compose available" "?"
} catch {
    Write-Status "Docker Compose not found" "?"
    Write-Host "  Docker Compose should come with Docker Desktop v1.27.0+"
    Write-Host "  Please update Docker Desktop`n"
    exit 1
}

# Step 5: Start containers
Write-Status "Building containers..." "?"
$projectPath = Split-Path -Parent $PSCommandPath
Set-Location $projectPath

Write-Host "  This may take 5-10 minutes on first run...`n"

try {
    & docker compose up -d --build
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Container build failed" "?"
        Write-Host "  Run: docker compose logs -f"
        exit 1
    }
    Write-Status "Containers started successfully" "?"
} catch {
    Write-Status "Failed to start containers" "?"
    Write-Host "  Error: $_`n"
    exit 1
}

# Wait for services
Write-Status "Waiting for services to initialize..." "?"
Start-Sleep -Seconds 30

# Verify services
Write-Status "Verifying services..." "?"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Status "Services are running" "?"
    }
} catch {
    Write-Status "Services may still be initializing" "?"
}

# Success message
Write-Host "`n"
Write-Host "================================================" -ForegroundColor Green
Write-Host "   ? Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "HesabPak is now running!`n"

Write-Host "Access the application:" -ForegroundColor Cyan
Write-Host "  Web Interface: http://localhost:3000" -ForegroundColor Yellow
Write-Host "  API Docs:      http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""

Write-Host "Credentials:" -ForegroundColor Cyan
Write-Host "  Username: developer" -ForegroundColor Yellow
Write-Host "  Password: 09123506545" -ForegroundColor Yellow
Write-Host ""

Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  docker compose logs -f          # View logs"
Write-Host "  docker compose ps               # Service status"
Write-Host "  docker compose down             # Stop services"
Write-Host "  docker compose restart          # Restart services"
Write-Host ""

Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "See DOCKER_INSTALL_GUIDE.md for more information."
Write-Host ""
