#!/bin/bash
# HesabPak Stop Script for Linux/Mac

echo ""
echo "Stopping HesabPak services..."
echo ""

cd "$(dirname "$0")"

docker compose down

if [ $? -eq 0 ]; then
    echo "All services stopped successfully."
else
    echo "WARNING: Some services may not have stopped cleanly"
fi

echo ""
