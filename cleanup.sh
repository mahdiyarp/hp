#!/bin/bash
# -*- coding: utf-8 -*-

# HesabPak Cleanup Script
# ÇÓ˜Ñ?Ê ÊäÙ?Ý æ ÈÇÒäÔÇä? HesabPak

set -e

echo "HesabPak Cleanup"
echo "================"
echo ""
echo "This will stop and remove all containers and volumes."
echo "WARNING: This will DELETE all data in the database!"
echo ""

read -p "Are you sure? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Stopping containers..."
docker compose down -v 2>/dev/null || echo "No containers to stop"

echo "Removing orphaned volumes..."
docker volume prune -f 2>/dev/null || true

echo "Removing dangling images..."
docker image prune -f 2>/dev/null || true

echo ""
echo "Cleanup complete!"
echo "To start fresh: docker compose up -d --build"
echo ""
