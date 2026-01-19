#!/bin/bash

# Frontend 502 Fix Script
# This script completely rebuilds the frontend container with the production Dockerfile

set -e  # Exit on error

echo "=========================================="
echo "Fixing Frontend 502 Bad Gateway Error"
echo "=========================================="
echo ""

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Step 1: Stop frontend container
echo "Step 1: Stopping frontend container..."
docker compose -f docker-compose.prod.yml stop frontend
echo "✓ Frontend stopped"
echo ""

# Step 2: Remove frontend container
echo "Step 2: Removing frontend container..."
docker compose -f docker-compose.prod.yml rm -f frontend
echo "✓ Frontend container removed"
echo ""

# Step 3: Remove old frontend images
echo "Step 3: Removing old frontend images..."
docker images | grep frontend | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
echo "✓ Old images removed"
echo ""

# Step 4: Verify Dockerfile.prod exists
echo "Step 4: Verifying Dockerfile.prod..."
if [ ! -f "frontend/Dockerfile.prod" ]; then
    echo "ERROR: frontend/Dockerfile.prod not found!"
    exit 1
fi
echo "✓ Dockerfile.prod found"
echo ""

# Step 5: Build frontend with production Dockerfile
echo "Step 5: Building frontend with Dockerfile.prod (this may take a few minutes)..."
docker compose -f docker-compose.prod.yml build --no-cache frontend
echo "✓ Frontend built successfully"
echo ""

# Step 6: Start frontend container
echo "Step 6: Starting frontend container..."
docker compose -f docker-compose.prod.yml up -d frontend
echo "✓ Frontend started"
echo ""

# Step 7: Wait for container to be ready
echo "Step 7: Waiting for frontend to be ready (30 seconds)..."
sleep 30
echo ""

# Step 8: Check frontend status
echo "Step 8: Checking frontend status..."
docker compose -f docker-compose.prod.yml ps frontend
echo ""

# Step 9: Check if nginx is running inside frontend
echo "Step 9: Checking nginx process..."
docker compose -f docker-compose.prod.yml exec frontend ps aux | grep nginx || echo "WARNING: nginx not found"
echo ""

# Step 10: Test frontend from inside container
echo "Step 10: Testing frontend from inside container..."
docker compose -f docker-compose.prod.yml exec frontend curl -f http://localhost:8080/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Frontend responding on port 8080"
else
    echo "✗ Frontend NOT responding on port 8080"
    echo ""
    echo "Checking logs..."
    docker compose -f docker-compose.prod.yml logs --tail=20 frontend
    exit 1
fi
echo ""

# Step 11: Test from nginx container
echo "Step 11: Testing frontend from nginx container..."
docker compose -f docker-compose.prod.yml exec nginx wget -O- http://frontend:8080/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Nginx can reach frontend"
else
    echo "✗ Nginx CANNOT reach frontend"
    exit 1
fi
echo ""

# Step 12: Restart nginx to clear any cached errors
echo "Step 12: Restarting nginx..."
docker compose -f docker-compose.prod.yml restart nginx
echo "✓ Nginx restarted"
echo ""

# Step 13: Wait for nginx to be ready
echo "Step 13: Waiting for nginx to be ready (10 seconds)..."
sleep 10
echo ""

# Step 14: Check nginx can reach frontend
echo "Step 14: Verifying nginx can reach frontend..."
docker compose -f docker-compose.prod.yml exec nginx wget -O- http://frontend:8080/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Nginx can reach frontend"
else
    echo "✗ Nginx cannot reach frontend"
    echo "Checking network..."
    docker compose -f docker-compose.prod.yml exec nginx ping -c 2 frontend
fi
echo ""

# Step 15: Final test from host
echo "Step 15: Testing from host machine..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ SUCCESS! Application is accessible (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "502" ]; then
    echo "✗ Still getting 502 error"
    echo ""
    echo "Additional diagnostics:"
    echo "----------------------"
    docker compose -f docker-compose.prod.yml logs --tail=30 nginx
    echo ""
    echo "Run for more details: ./scripts/diagnose-502.sh"
    exit 1
else
    echo "⚠️  Got HTTP $HTTP_CODE (expected 200)"
    docker compose -f docker-compose.prod.yml logs --tail=20 nginx
fi
echo ""

echo "=========================================="
echo "✓ Frontend 502 Error Fixed!"
echo "=========================================="
echo ""
echo "Your application should now be accessible at:"
echo "  http://localhost/ (or your server's IP address)"
echo ""
echo "If you still have issues, run:"
echo "  ./scripts/diagnose-502.sh"
