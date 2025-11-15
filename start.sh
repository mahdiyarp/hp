#!/bin/bash
# HesabPak Startup Script for Linux/Mac

cd "$(dirname "$0")"

echo ""
echo "Starting HesabPak services..."
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "ERROR: Docker is not running."
    echo "Please start Docker and try again."
    exit 1
fi

# Start containers
docker compose up -d --build

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start services"
    exit 1
fi

# Wait for services to be ready
echo ""
echo "Waiting for services to initialize..."
sleep 10

echo ""
echo "============================================"
echo "HesabPak is now running!"
echo "============================================"
echo ""
echo "Access the application:"
echo "  Web UI: http://localhost:3000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Credentials:"
echo "  Username: developer"
echo "  Password: 09123506545"
echo ""
echo "To stop services, run: docker compose down"
echo ""

# Try to open browser
if command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:3000 &
elif command -v open &> /dev/null; then
    # macOS
    open http://localhost:3000 &
fi

echo "Services are running. Press Ctrl+C to stop."
docker compose logs -f
