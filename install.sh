#!/bin/bash
# hp\a010124pp - Linux/Mac Installation Script
# Installation and setup for HesabPak Application

set -e

echo ""
echo "============================================"
echo "  HesabPak Installation (Linux/Mac)"
echo "  hp\\a010124pp"
echo "============================================"
echo ""

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed. Please install Git first."
    echo "Ubuntu/Debian: sudo apt-get install git"
    echo "macOS: brew install git"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker ps &> /dev/null; then
    echo "ERROR: Docker daemon is not running."
    echo "Please start Docker and try again."
    exit 1
fi

# Create installation directory
INSTALL_DIR="$HOME/hp"
mkdir -p "$INSTALL_DIR"

cd "$INSTALL_DIR"

# Clone or update repository
if [ -d ".git" ]; then
    echo "Updating existing repository..."
    git pull origin main
else
    echo "Cloning HesabPak repository..."
    git clone https://github.com/mahdiyarp/hp.git .
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating environment configuration..."
    cat > .env << EOF
# HesabPak Configuration
BRANCH=1
DB_USER=hesabpak
DB_PASS=secure_password_123
DB_NAME=hesabpak_db
DEVELOPER_USER=developer
DEVELOPER_PASS=09123506545
EOF
    echo ".env file created. Update it if needed."
fi

# Create startup scripts
chmod +x start.sh stop.sh 2>/dev/null || true

# Start containers
echo ""
echo "Starting HesabPak services..."
docker compose up -d --build

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start Docker containers"
    exit 1
fi

# Wait for services to start
echo ""
echo "Waiting for services to initialize (10 seconds)..."
sleep 10

# Create desktop shortcut for Linux
if command -v desktop-file-install &> /dev/null; then
    echo ""
    echo "Creating desktop shortcut..."
    cat > ~/.local/share/applications/hesabpak.desktop << EOF
[Desktop Entry]
Type=Application
Name=HesabPak
Comment=Business Management System
Exec=bash "$INSTALL_DIR/start.sh"
Icon=$INSTALL_DIR/frontend/public/favicon.ico
Terminal=false
Categories=Business;Office;
EOF
    chmod +x ~/.local/share/applications/hesabpak.desktop
    echo "Desktop shortcut created successfully!"
fi

echo ""
echo "============================================"
echo "Installation completed successfully!"
echo "============================================"
echo ""
echo "Quick Start:"
echo "  1. Open your browser and go to: http://localhost:3000"
echo "  2. API documentation: http://localhost:8000/docs"
echo "  3. Username: developer"
echo "  4. Password: 09123506545"
echo ""
echo "To start the application later, run:"
echo "  cd $INSTALL_DIR && ./start.sh"
echo ""
echo "To stop services, run:"
echo "  docker compose down"
echo ""
