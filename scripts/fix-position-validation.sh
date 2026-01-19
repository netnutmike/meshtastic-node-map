#!/bin/bash

# Fix Position Validation - Deploy Backend Fix
# This script deploys the fix for position data validation errors

set -e

echo "========================================="
echo "Deploying Position Validation Fix"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "Error: docker-compose.prod.yml not found. Please run from project root."
    exit 1
fi

echo "Step 1: Rebuilding backend Docker image..."
docker compose -f docker-compose.prod.yml build backend

echo ""
echo "Step 2: Restarting backend service..."
docker compose -f docker-compose.prod.yml up -d backend

echo ""
echo "Step 3: Waiting for backend to be healthy..."
sleep 5

# Check backend health
for i in {1..12}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✓ Backend is healthy!"
        break
    fi
    if [ $i -eq 12 ]; then
        echo "✗ Backend health check failed after 60 seconds"
        echo ""
        echo "Checking backend logs:"
        docker compose -f docker-compose.prod.yml logs backend --tail=30
        exit 1
    fi
    echo "  Waiting... ($i/12)"
    sleep 5
done

echo ""
echo "========================================="
echo "✓ Position Validation Fix Deployed!"
echo "========================================="
echo ""
echo "The backend will now:"
echo "  • Skip position data with missing latitude/longitude"
echo "  • Log detailed information about skipped positions"
echo "  • Only create positions with valid coordinates"
echo ""
echo "Monitor the logs:"
echo "  docker compose -f docker-compose.prod.yml logs backend -f"
