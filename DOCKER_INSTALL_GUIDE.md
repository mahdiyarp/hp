# ?? HesabPak Installation Guide for Windows

## Quick Start (3 Steps)

### Step 1: Run Automated Setup
1. **Open PowerShell as Administrator**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Run this command:**
   ```powershell
   cd C:\Users\Mahdi\source\repos\mahdiyarp\hp
   .\setup-docker.bat
   ```

3. **Wait for installation to complete** (5-15 minutes on first run)

---

## What This Script Does

? Checks if Git is installed (installs if missing)  
? Checks if Docker Desktop is installed (installs if missing)  
? Starts Docker service  
? Downloads and builds Docker containers  
? Initializes database and services  
? Opens HesabPak in your browser  

---

## Requirements

| Item | Requirement | Status |
|------|-----------|--------|
| Windows | 10 or 11 | ? You have it |
| RAM | At least 4GB free | Check Task Manager |
| Disk | 10GB free space | Check C: drive |
| Internet | Good connection | Needed for downloads |
| Administrator Access | Required | You need it |

---

## System Requirements Check

Before running the script, verify:

```powershell
# Check RAM
Get-ComputerInfo | Select-Object CsTotalPhysicalMemory

# Check disk space
Get-Volume C | Select-Object SizeRemaining

# Check Windows version
[System.Environment]::OSVersion
```

---

## If Script Fails

### ? "Docker is not installed"

**Solution:**
1. Download Docker Desktop manually:
   https://www.docker.com/products/docker-desktop

2. Run the installer and complete setup

3. Restart your computer

4. Run `setup-docker.bat` again

---

### ? "Docker failed to start"

**Check:**
1. Is Docker Desktop running? (Look in taskbar)
2. Do you have 4GB+ RAM free?
3. Do you have 10GB+ disk space free?

**Fix:**
```powershell
# Stop all containers
docker compose down

# Clean up unused images
docker system prune -a

# Restart Docker Desktop manually
```

---

### ? "Container build failed"

**Solution:**
```powershell
# Remove everything and start fresh
docker compose down
docker system prune -a
docker volume prune

# Run setup again
.\setup-docker.bat
```

---

## Manual Installation (If Automated Fails)

### Step 1: Install Git
```
1. Visit: https://git-scm.com/download/win
2. Download and run installer
3. Use default options
4. Restart PowerShell
```

### Step 2: Install Docker Desktop
```
1. Visit: https://www.docker.com/products/docker-desktop
2. Download Windows version
3. Run installer
4. Enable "WSL 2" when prompted
5. Complete installation
6. Restart your computer
```

### Step 3: Start Services
```powershell
cd C:\Users\Mahdi\source\repos\mahdiyarp\hp
docker compose up -d --build
```

### Step 4: Check Status
```powershell
docker compose ps
```

### Step 5: Open Browser
```
http://localhost:3000
```

---

## After Installation

### Access Points

| Service | URL | Notes |
|---------|-----|-------|
| Web App | http://localhost:3000 | Main interface |
| API Docs | http://localhost:8000/docs | Swagger UI |
| API ReDoc | http://localhost:8000/redoc | Alternative docs |
| Database | localhost:5432 | PostgreSQL |

### Credentials

```
Username: developer
Password: 09123506545
```

### Useful Commands

```powershell
# View logs
docker compose logs -f backend

# Stop services
docker compose down

# Restart services
docker compose restart

# View status
docker compose ps

# Access database
docker exec -it hp-db-1 psql -U postgres -d hesabpak

# View all logs
docker compose logs -f
```

---

## Troubleshooting

### Port Already in Use

If you get "port 3000 or 8000 already in use":

```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace XXXX with PID)
taskkill /PID XXXX /F
```

### Docker Volume Issues

```powershell
# Remove all volumes and start fresh
docker compose down -v
docker compose up -d --build
```

### Memory Issues

If Docker keeps crashing:

1. Open Docker Desktop Settings
2. Go to Resources
3. Increase Memory to 4GB minimum
4. Increase CPU to 2 cores minimum
5. Restart Docker

---

## Next Steps After Installation

1. ? Open http://localhost:3000
2. ? Login with developer / 09123506545
3. ? Explore the dashboard
4. ? Check API docs at http://localhost:8000/docs
5. ? Create your first account

---

## Support

If you encounter issues:

1. Check Docker Desktop is running (look in taskbar)
2. Check internet connection
3. Check available disk space (10GB+)
4. Check available RAM (4GB+ free)
5. View logs: `docker compose logs -f`

---

## Files Created

```
setup-docker.bat          ? Main installation script
start.bat                 ? Start services
stop.bat                  ? Stop services
docker-compose.yml        ? Container configuration
backend/.env              ? Backend configuration
frontend/.env             ? Frontend configuration (if needed)
```

---

**Ready? Run `setup-docker.bat` as Administrator! ??**

