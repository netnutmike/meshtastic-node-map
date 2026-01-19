#!/bin/bash

# Frontend Diagnostic Script
# This script helps diagnose why the frontend container is not responding

echo "=========================================="
echo "Frontend Container Diagnostics"
echo "=========================================="
echo ""

# Check if frontend container is running
echo "1. Checking frontend container status..."
docker compose -f docker-compose.prod.yml ps frontend
echo ""

# Check frontend container logs
echo "2. Frontend container logs (last 50 lines)..."
docker compose -f docker-compose.prod.yml logs --tail=50 frontend
echo ""

# Check what processes are running inside frontend
echo "3. Processes running inside frontend container..."
docker compose -f docker-compose.prod.yml exec frontend ps aux 2>/dev/null || echo "Container not running or not accessible"
echo ""

# Check if nginx is listening on port 8080 inside frontend
echo "4. Checking if port 8080 is listening inside frontend..."
docker compose -f docker-compose.prod.yml exec frontend netstat -tlnp 2>/dev/null || \
docker compose -f docker-compose.prod.yml exec frontend ss -tlnp 2>/dev/null || \
echo "Cannot check ports (container may not be running)"
echo ""

# Check frontend container network
echo "5. Frontend container network info..."
docker compose -f docker-compose.prod.yml exec frontend ip addr 2>/dev/null || echo "Cannot get network info"
echo ""

# Try to curl from inside frontend container
echo "6. Testing HTTP from inside frontend container..."
docker compose -f docker-compose.prod.yml exec frontend curl -v http://localhost:8080/ 2>&1 | head -20 || echo "Curl failed"
echo ""

# Check which Dockerfile is being used
echo "7. Checking frontend image details..."
docker inspect meshtastic-frontend-prod 2>/dev/null | grep -A 5 "Cmd\|Entrypoint" || echo "Container not found"
echo ""

# Check if build directory exists
echo "8. Checking if build directory exists in container..."
docker compose -f docker-compose.prod.yml exec frontend ls -la /usr/share/nginx/html 2>/dev/null || echo "Cannot access container filesystem"
echo ""

# Check nginx config inside container
echo "9. Checking nginx configuration inside container..."
docker compose -f docker-compose.prod.yml exec frontend cat /etc/nginx/nginx.conf 2>/dev/null | head -30 || echo "Cannot read nginx config"
echo ""

# Check nginx error logs
echo "10. Nginx error logs inside frontend container..."
docker compose -f docker-compose.prod.yml exec frontend cat /var/log/nginx/error.log 2>/dev/null || echo "Cannot read error log"
echo ""

echo "=========================================="
echo "Diagnostic complete!"
echo "=========================================="
echo ""
echo "NEXT STEPS:"
echo "1. If container is not running: Check logs for crash/exit reason"
echo "2. If nginx is not listening on 8080: Check nginx config and startup"
echo "3. If build directory is empty: Rebuild with --no-cache"
echo "4. If using wrong Dockerfile: Remove image and rebuild"
echo ""
echo "To completely rebuild frontend:"
echo "  docker compose -f docker-compose.prod.yml stop frontend"
echo "  docker compose -f docker-compose.prod.yml rm -f frontend"
echo "  docker rmi meshtastic-frontend-prod 2>/dev/null"
echo "  docker compose -f docker-compose.prod.yml build --no-cache frontend"
echo "  docker compose -f docker-compose.prod.yml up -d frontend"
