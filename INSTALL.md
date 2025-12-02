# HesabPak Installation Guide v1.0.0

## Quick Start (5 minutes)

### Prerequisites
- Docker Desktop 20.10+ OR
- Python 3.11+ and Node.js 20+

---

## Option 1: Docker Production (Recommended)

### Step 1: Clone Repository
```bash
git clone https://github.com/mahdiyarp/hp.git
cd hp
```

### Step 2: Configure Environment
```bash
# Copy production environment template
cp .env.production .env

# ⚠️  CRITICAL: Edit .env and change these values:
# - DB_PASSWORD (use strong random password)
# - SECRET_KEY (generate: openssl rand -hex 32)
# - ALLOWED_ORIGINS (add your domain)
```

### Step 3: Start Production Stack
```bash
# Build and start all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### Step 4: Initialize Database
```bash
# Run migrations
docker-compose -f docker-compose.production.yml exec backend alembic upgrade head

# Create admin user
docker-compose -f docker-compose.production.yml exec backend python -c "from app.db import get_db; from app.models import User; from app.security import get_password_hash; db=next(get_db()); u=User(username='admin',hashed_password=get_password_hash('admin123'),is_active=True); db.add(u); db.commit(); print('Admin created')"
```

### Step 5: Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Default Login**: admin / admin123 (change immediately!)

---

## Option 2: Windows Portable (No Docker Required)

### Step 1: Download Release
Download latest release from: https://github.com/mahdiyarp/hp/releases

### Step 2: Extract and Run
```cmd
# Extract hesabpak-v1.0.0-windows-portable.zip
# Double-click start.bat
```

Application opens automatically at http://localhost:3000

### Step 3: Stop Application
```cmd
# Double-click stop.bat or close terminal window
```

---

## Option 3: Manual Installation (Development)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build
npm run preview
```

---

## Post-Installation Configuration

### 1. Enable HTTPS (Production Only)

#### Option A: Let's Encrypt (Automated)
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to Docker volume
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./infra/nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./infra/nginx/certs/

# Generate dhparam (one-time, takes 5-10 minutes)
openssl dhparam -out ./infra/nginx/dhparam.pem 2048

# Uncomment HTTPS lines in infra/nginx/nginx.conf
# Restart nginx
docker-compose -f docker-compose.production.yml restart nginx
```

#### Option B: Self-Signed Certificate (Testing)
```bash
mkdir -p ./infra/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./infra/nginx/certs/privkey.pem \
  -out ./infra/nginx/certs/fullchain.pem \
  -subj "/CN=localhost"
```

### 2. Configure Automated Backups

Backups run automatically at 2 AM daily with 30-day retention.

#### Enable Backup Encryption (Recommended)
```bash
# Generate encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Add to .env.production
BACKUP_ENCRYPTION_KEY=<your-generated-key>

# Restart backup scheduler
docker-compose -f docker-compose.production.yml restart backup_scheduler
```

#### Manual Backup
```bash
docker-compose -f docker-compose.production.yml exec backend python scripts/backup_scheduler.py
```

#### Restore from Backup
```bash
# List backups
ls -lh backups/

# Restore (replace with your backup filename)
gunzip -c backups/hesabpak_backup_20251202_020000.sql.gz | \
docker-compose -f docker-compose.production.yml exec -T db psql -U postgres -d hesabpak
```

### 3. Email and SMS Configuration (Optional)

Edit `backend/.env.production`:

```bash
# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@hesabpak.local

# SMS (Kavenegar example)
SMS_PROVIDER=kavenegar
SMS_API_KEY=your-api-key
SMS_SENDER=10008663
```

Restart backend:
```bash
docker-compose -f docker-compose.production.yml restart backend
```

---

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

### Database Connection Failed
```bash
# Check if database is running
docker-compose -f docker-compose.production.yml ps

# View database logs
docker-compose -f docker-compose.production.yml logs db

# Verify DATABASE_URL in .env.production
cat backend/.env.production | grep DATABASE_URL
```

### Frontend Can't Reach Backend (CORS Errors)
```bash
# Check ALLOWED_ORIGINS includes your domain
cat backend/.env.production | grep ALLOWED_ORIGINS

# Should include: http://localhost:3000,https://yourdomain.com

# Restart backend after changes
docker-compose -f docker-compose.production.yml restart backend
```

### Port Already in Use
```bash
# Change ports in .env.production
BACKEND_PORT=8001
FRONTEND_PORT=3001

# Recreate containers
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

### Permission Denied (Linux)
```bash
sudo chown -R $USER:$USER ./
chmod +x backend/entrypoint.sh
chmod +x backend/scripts/*.py
```

### Docker Build Fails
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f docker-compose.production.yml build --no-cache
```

### SSL Certificate Issues
```bash
# Verify certificate files exist
ls -la infra/nginx/certs/

# Check nginx logs
docker-compose -f docker-compose.production.yml logs nginx

# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

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

---

## Upgrade Instructions

### Docker Production
```bash
# Pull latest changes
git pull origin main

# Stop services
docker-compose -f docker-compose.production.yml down

# Rebuild images
docker-compose -f docker-compose.production.yml build --no-cache

# Start services
docker-compose -f docker-compose.production.yml up -d

# Run migrations
docker-compose -f docker-compose.production.yml exec backend alembic upgrade head
```

### Manual Installation
```bash
# Pull latest changes
git pull origin main

# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head

# Frontend
cd ../frontend
npm install
npm run build
```

---

## Performance Optimization

### PostgreSQL Tuning (for production)
Already configured in `docker-compose.production.yml`:
- `shared_buffers=256MB`
- `effective_cache_size=1GB`
- `work_mem=4MB`

For high-traffic deployments, adjust in docker-compose file.

### Redis Cache
Configured with:
- AOF persistence
- 256MB max memory
- LRU eviction policy

### Nginx Rate Limiting
- API endpoints: 10 req/s (burst 20)
- General traffic: 50 req/s (burst 100)

---

## Security Checklist

- [ ] Changed `SECRET_KEY` in `.env.production`
- [ ] Changed `DB_PASSWORD` to strong random password
- [ ] Updated `ALLOWED_ORIGINS` with production domain
- [ ] Enabled HTTPS with valid certificate
- [ ] Generated and set `BACKUP_ENCRYPTION_KEY`
- [ ] Changed default admin password
- [ ] Configured firewall rules (ports 80, 443 only)
- [ ] Enabled automated backups
- [ ] Set up monitoring/logging

---

## Support

- **Documentation**: https://github.com/mahdiyarp/hp/wiki
- **Issues**: https://github.com/mahdiyarp/hp/issues
- **Version**: 1.0.0
- **Release Date**: December 2, 2025

