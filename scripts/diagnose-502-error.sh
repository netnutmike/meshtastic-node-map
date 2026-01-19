#!/bin/bash

# Diagnose 502 Bad Gateway Error
# This script checks why external requests are getting 502 errors

echo "=========================================="
echo "502 Bad Gateway Diagnostic"
echo "=========================================="
echo ""

echo "1. Checking if services are running..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "2. Checking backend health from host..."
curl -v http://localhost:3001/health 2>&1 | head -20

echo ""
echo "3. Checking backend health through nginx from inside..."
docker compose -f docker-compose.prod.yml exec nginx curl -v http://backend:3001/health 2>&1 | head -20

echo ""
echo "4. Checking nginx access logs (last 20 lines)..."
docker compose -f docker-compose.prod.yml logs nginx --tail=20 | grep -v "docker-entrypoint"

echo ""
echo "5. Checking nginx error logs (last 20 lines)..."
docker compose -f docker-compose.prod.yml exec nginx cat /var/log/nginx/error.log 2>/dev/null | tail -20 || echo "No error log found"

echo ""
echo "6. Testing API endpoint from host..."
curl -v http://localhost/api/v1/nodes 2>&1 | head -30

echo ""
echo "7. Checking what's listening on port 80..."
sudo netstat -tlnp | grep :80 || ss -tlnp | grep :80

echo ""
echo "8. Checking Docker network..."
docker compose -f docker-compose.prod.yml exec nginx ping -c 2 backend

echo ""
echo "9. Checking if nginx can resolve backend..."
docker compose -f docker-compose.prod.yml exec nginx nslookup backend

echo ""
echo "10. Testing from inside nginx container..."
docker compose -f docker-compose.prod.yml exec nginx curl -v http://backend:3001/api/v1/nodes 2>&1 | head -30

echo ""
echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
