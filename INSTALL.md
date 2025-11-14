# HesabPak Installation and Setup Guide

## Quick Installation

### Windows

1. **Download and Run Installer**
   ```cmd
   # Open Command Prompt (cmd) as Administrator
   # Run this command:
   curl -O https://raw.githubusercontent.com/mahdiyarp/hp/1/install.bat && install.bat
   ```

   Or manually:
   - Clone the repo: `git clone https://github.com/mahdiyarp/hp.git`
   - Navigate to folder: `cd hp`
   - Run: `install.bat`

2. **Requirements**
   - Windows 10/11 (64-bit)
   - Git: https://git-scm.com/download/win
   - Docker Desktop: https://www.docker.com/products/docker-desktop

3. **After Installation**
   - Desktop shortcut "HesabPak.lnk" will be created
   - Or run: `start.bat` from the installation folder

### Linux/Mac

```bash
# Download and run installer
curl -O https://raw.githubusercontent.com/mahdiyarp/hp/1/install.sh && chmod +x install.sh && ./install.sh

# Or manually
git clone https://github.com/mahdiyarp/hp.git
cd hp
chmod +x install.sh && ./install.sh
```

**Requirements:**
- Docker: https://docs.docker.com/engine/install/
- Docker Compose (usually included with Docker)
- Git

## Access the Application

Once running:

- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Default Credentials**:
  - Username: `developer`
  - Password: `09123506545`

## Common Commands

### Start Services
**Windows:**
```cmd
start.bat
```

**Linux/Mac:**
```bash
./start.sh
```

### Stop Services
**Windows:**
```cmd
stop.bat
```

**Linux/Mac:**
```bash
./stop.sh
```

### View Logs
```bash
docker compose logs -f backend  # Backend logs
docker compose logs -f frontend # Frontend logs
docker compose logs -f db       # Database logs
```

### Rebuild Services
```bash
docker compose up -d --build
```

### Database Reset (Warning: Deletes all data)
```bash
docker compose down -v
docker compose up -d --build
```

## Troubleshooting

### Docker not starting
- Ensure Docker Desktop is installed and running
- On Windows, check Hyper-V is enabled
- On Linux, ensure Docker daemon is running: `sudo systemctl start docker`

### Port already in use
- Change ports in `docker-compose.yml`
- Or stop other services using ports 3000 and 8000

### Database connection error
- Ensure database container is running: `docker compose ps`
- Check logs: `docker compose logs db`

### Frontend not loading
- Check frontend container: `docker compose logs frontend`
- Ensure port 3000 is accessible

## Development

### Clone repository
```bash
git clone https://github.com/mahdiyarp/hp.git
cd hp
git checkout 1  # Use branch 1
```

### Run in development mode
```bash
docker compose -f docker-compose.yml up -d --build
```

### Backend API
- Language: Python 3.11 with FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL 15

### Frontend
- Language: TypeScript with React
- Build tool: Vite
- Styling: Tailwind CSS

## Support

For issues and questions:
- GitHub Issues: https://github.com/mahdiyarp/hp/issues
- Developer: mahdiyarp
- Contact: 09123506545

## License

See LICENSE file for details.

---

**Application ID**: hp\a010124pp
**Current Branch**: 1
**Last Updated**: 2025-11-14

