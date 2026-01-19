#!/bin/bash

# Comprehensive 502 Diagnostic Script
# This script performs deep diagnostics on the 502 Bad Gateway error

echo "=========================================="
echo "Comprehensive 502 Bad Gateway Diagnostics"
echo "=========================================="
echo ""

# Check if running from correct directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# 1. Check all container statuses
echo "1. Container Status"
echo "==================="
docker compose -f docker-compose.prod.yml ps
echo ""

# 2. Check frontend container specifically
echo "2. Frontend Container Details"
echo "=============================="
docker inspect meshtastic-frontend-prod 2>/dev/null | grep -A 10 "State\|Config" || echo "Frontend container not found"
echo ""

# 3. Check which image frontend is using
echo "3. Frontend Image Information"
echo "=============================="
docker inspect meshtastic-frontend-prod 2>/dev/null | grep -E "Image|Created" | head -5 || echo "Cannot inspect image"
echo ""

# 4. Check if frontend container is actually running
echo "4. Frontend Container Running Status"
echo "====================================="
FRONTEND_RUNNING=$(docker compose -f docker-compose.prod.yml ps frontend | grep -c "Up")
if [ "$FRONTEND_RUNNING" -eq 0 ]; then
    echo "❌ PROBLEM: Frontend container is NOT running!"
    echo ""
    echo "Frontend logs (last 100 lines):"
    docker compose -f docker-compose.prod.yml logs --tail=100 frontend
else
    echo "✓ Frontend container is running"
fi
echo ""

# 5. Check processes inside frontend
echo "5. Processes Inside Frontend Container"
echo "======================================="
docker compose -f docker-compose.prod.yml exec frontend ps aux 2>/dev/null || echo "Cannot access container (may not be running)"
echo ""

# 6. Check if nginx is running inside frontend
echo "6. Nginx Process Check"
echo "======================"
docker compose -f docker-compose.prod.yml exec frontend pgrep nginx 2>/dev/null && echo "✓ Nginx is running" || echo "❌ Nginx is NOT running"
echo ""

# 7. Check what's listening on port 8080 inside frontend
echo "7. Port 8080 Listening Status"
echo "=============================="
docker compose -f docker-compose.prod.yml exec frontend netstat -tlnp 2>/dev/null | grep 8080 || \
docker compose -f docker-compose.prod.yml exec frontend ss -tlnp 2>/dev/null | grep 8080 || \
echo "❌ Nothing listening on port 8080"
echo ""

# 8. Test HTTP from inside frontend container
echo "8. HTTP Test from Inside Frontend"
echo "=================================="
docker compose -f docker-compose.prod.yml exec frontend curl -v http://localhost:8080/ 2>&1 | head -30 || echo "❌ Curl failed"
echo ""

# 9. Check if build directory exists and has files
echo "9. Build Directory Contents"
echo "==========================="
docker compose -f docker-compose.prod.yml exec frontend ls -lah /usr/share/nginx/html 2>/dev/null | head -20 || echo "Cannot access build directory"
echo ""

# 10. Check nginx config inside frontend
echo "10. Nginx Configuration"
echo "======================="
docker compose -f docker-compose.prod.yml exec frontend cat /etc/nginx/nginx.conf 2>/dev/null | head -50 || echo "Cannot read nginx config"
echo ""

# 11. Check nginx error logs
echo "11. Nginx Error Logs"
echo "===================="
docker compose -f docker-compose.prod.yml exec frontend cat /var/log/nginx/error.log 2>/dev/null || echo "No error log or cannot read"
echo ""

# 12. Check nginx access logs
echo "12. Nginx Access Logs"
echo "====================="
docker compose -f docker-compose.prod.yml exec frontend cat /var/log/nginx/access.log 2>/dev/null | tail -20 || echo "No access log or cannot read"
echo ""

# 13. Test from nginx container to frontend
echo "13. Connection Test from Nginx to Frontend"
echo "==========================================="
docker compose -f docker-compose.prod.yml exec nginx wget -O- http://frontend:8080/ 2>&1 | head -20 || echo "❌ Cannot connect from nginx to frontend"
echo ""

# 14. Check nginx container logs
echo "14. Nginx Container Logs"
echo "========================"
docker compose -f docker-compose.prod.yml logs --tail=50 nginx
echo ""

# 15. Check docker network
echo "15. Docker Network Information"
echo "==============================="
docker network inspect meshtastic-node-map_meshtastic-network 2>/dev/null | grep -A 5 "frontend\|nginx" || echo "Cannot inspect network"
echo ""

# 16. Check which Dockerfile was used
echo "16. Dockerfile Detection"
echo "========================"
docker compose -f docker-compose.prod.yml exec frontend test -f /usr/share/nginx/html/index.html && echo "✓ Using production Dockerfile (nginx serving static files)" || echo "❌ NOT using production Dockerfile (no static files found)"
echo ""

# 17. Check if react-scripts is present (indicates dev mode)
echo "17. Development Mode Detection"
echo "==============================="
docker compose -f docker-compose.prod.yml exec frontend test -d /app/node_modules/react-scripts && echo "❌ PROBLEM: react-scripts found - using DEV mode!" || echo "✓ No react-scripts - production mode"
echo ""

# 18. Check frontend healthcheck status
echo "18. Frontend Healthcheck Status"
echo "================================"
docker inspect meshtastic-frontend-prod 2>/dev/null | grep -A 10 "Health" || echo "No healthcheck info"
echo ""

echo "=========================================="
echo "Diagnostic Complete!"
echo "=========================================="
echo ""
echo "ANALYSIS:"
echo "---------"

# Analyze the results
FRONTEND_RUNNING=$(docker compose -f docker-compose.prod.yml ps frontend 2>/dev/null | grep -c "Up")
NGINX_RUNNING=$(docker compose -f docker-compose.prod.yml exec frontend pgrep nginx 2>/dev/null | wc -l)
HAS_BUILD=$(docker compose -f docker-compose.prod.yml exec frontend test -f /usr/share/nginx/html/index.html 2>/dev/null && echo "yes" || echo "no")
HAS_REACT_SCRIPTS=$(docker compose -f docker-compose.prod.yml exec frontend test -d /app/node_modules/react-scripts 2>/dev/null && echo "yes" || echo "no")

if [ "$FRONTEND_RUNNING" -eq 0 ]; then
    echo "❌ ISSUE: Frontend container is not running"
    echo "   ACTION: Check frontend logs above for crash/exit reason"
    echo "   FIX: Run ./scripts/fix-frontend-502.sh"
elif [ "$HAS_REACT_SCRIPTS" = "yes" ]; then
    echo "❌ ISSUE: Frontend is using DEVELOPMENT Dockerfile"
    echo "   ACTION: Frontend needs to be rebuilt with Dockerfile.prod"
    echo "   FIX: Run ./scripts/fix-frontend-502.sh"
elif [ "$NGINX_RUNNING" -eq 0 ]; then
    echo "❌ ISSUE: Nginx is not running inside frontend container"
    echo "   ACTION: Check nginx error logs above"
    echo "   FIX: Run ./scripts/fix-frontend-502.sh"
elif [ "$HAS_BUILD" = "no" ]; then
    echo "❌ ISSUE: Build directory is missing or empty"
    echo "   ACTION: React build may have failed"
    echo "   FIX: Run ./scripts/fix-frontend-502.sh"
else
    echo "⚠️  Frontend appears to be configured correctly"
    echo "   Check nginx logs (section 14) for connection errors"
    echo "   Check network connectivity (section 13)"
fi

echo ""
echo "RECOMMENDED ACTIONS:"
echo "-------------------"
echo "1. Run: ./scripts/fix-frontend-502.sh"
echo "2. If that doesn't work, check the specific error messages above"
echo "3. Share this diagnostic output for further help"
