# ? HesabPak - Complete Setup Package

## What I've Created For You

I've prepared **4 automated scripts** to help you install and run HesabPak without any manual steps:

### ?? Scripts Created:

| File | Purpose | Run With |
|------|---------|----------|
| **setup-docker.bat** | ? Main installer (auto-installs Docker) | Right-click ? Run as Admin |
| **setup-docker.ps1** | Alternative PowerShell installer | PowerShell (Admin) |
| **manage.bat** | Service management menu | Double-click anytime |
| **start.bat** | Quick start (after setup) | Double-click |
| **stop.bat** | Stop services | Double-click |

### ?? Guides:

| File | Content |
|------|---------|
| **DOCKER_INSTALL_GUIDE.md** | Detailed setup guide |
| **QUICK_START.md** | Fast 3-minute setup |
| **This file** | Overview |

---

## ?? How to Get Started

### **Recommended: Option 1 - Automated Batch Script**

```cmd
1. Right-click on setup-docker.bat
2. Select "Run as administrator"
3. Wait for completion
4. Browser opens automatically
```

### **Alternative: Option 2 - PowerShell**

```powershell
1. Right-click PowerShell ? Run as Admin
2. Navigate: cd C:\Users\Mahdi\source\repos\mahdiyarp\hp
3. Run: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
4. Run: .\setup-docker.ps1
```

---

## ?? Timeline

| Step | Time | What Happens |
|------|------|--------------|
| Script Start | 0s | Checks system |
| Git Install | 2-5 min | (if needed) |
| Docker Install | 5-10 min | (if needed) |
| Container Build | 10-15 min | Downloads and builds images |
| Database Init | 2-5 min | Initializes PostgreSQL |
| **Total** | **15-30 min** | ? Ready to use |

---

## ?? What You'll Have

After setup, everything runs automatically:

- ? **Backend API** (FastAPI)
- ? **Frontend** (React)
- ? **Database** (PostgreSQL)
- ? **All 29 database migrations**
- ? **Demo data loaded**

---

## ?? Access Points

Once running:

```
Web Interface:     http://localhost:3000
API Documentation: http://localhost:8000/docs
API ReDoc:        http://localhost:8000/redoc
Database Port:     localhost:5432
```

**Demo Credentials:**
```
Username: developer
Password: 09123506545
```

---

## ?? Managing Services

After setup, use `manage.bat` for easy management:

```cmd
Double-click manage.bat
? Choose from menu:
   1. Start services
   2. Stop services
   3. View logs
   4. Reset everything
   5. Open browser
   ... and more
```

---

## ?? System Requirements

| Requirement | Minimum | Recommended |
|------------|---------|------------|
| OS | Windows 10 | Windows 11 |
| RAM | 4GB free | 8GB+ |
| Disk | 10GB free | 20GB+ |
| CPU | 2 cores | 4+ cores |
| Internet | Required | For first setup |

---

## ?? Troubleshooting

### Problem: "Docker not found"
```
? Run setup-docker.bat again
? Or manually install: https://www.docker.com/products/docker-desktop
```

### Problem: "Port already in use"
```
? Run manage.bat ? Option 9 (Reset)
? Or: docker compose down && docker system prune -a
```

### Problem: "Out of memory"
```
? Open Docker Desktop Settings
? Resources ? Increase Memory to 4GB
? Increase CPU to 2 cores
```

### Problem: "Permission denied"
```
? Right-click script ? Run as Administrator
? Or use: Set-ExecutionPolicy -ExecutionPolicy Bypass
```

---

## ?? Next Steps

1. **Run setup-docker.bat** (right-click ? Run as Admin)
2. **Wait for completion** (15-30 minutes)
3. **Browser opens automatically** to http://localhost:3000
4. **Login with:** developer / 09123506545
5. **Start using HesabPak!** ??

---

## ?? Features Available

After setup, you have access to:

- ? Dashboard Module
- ? Internationalization (4 languages: FA/EN/AR/KU)
- ? User Management & Permissions
- ? Device Tracking & OTP
- ? Developer API Keys
- ? Blockchain Audit Trail
- ? Customer Groups Management
- ? ICC Shop Integration
- ? Product Management
- ? Invoice & Payment Management
- ? Ledger Entries

---

## ?? Support Resources

- **API Docs:** http://localhost:8000/docs
- **Repository:** https://github.com/mahdiyarp/hp
- **Setup Complete Info:** SETUP_COMPLETE.md
- **Docker Guide:** DOCKER_INSTALL_GUIDE.md
- **Quick Start:** QUICK_START.md

---

## ?? Choose Your Installation Method

| Method | Best For | Time |
|--------|----------|------|
| **setup-docker.bat** | Most users | 15-30 min |
| **setup-docker.ps1** | PowerShell users | 15-30 min |
| **Manual** | Advanced users | 30-60 min |

---

## ? Summary

You now have **everything needed** to:
- ? Automatically install Docker
- ? Build all services
- ? Initialize database
- ? Run HesabPak fully

**No manual installation steps needed!**

---

### ?? Ready? 

**Run `setup-docker.bat` as Administrator ? Let it complete ? Enjoy HesabPak!**

---

*Last Updated: 2025-11-21*  
*Version: 1.0.0*  
*Status: Production Ready ?*
