#!/bin/bash

# Diagnose 502 Bad Gateway Issue
# This script checks why external API requests are failing

echo "=========================================="
echo "502 Bad Gateway Diagnostic"
echo "=========================================="
echo ""

echo "1. Checking if services are running..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "2. Testing backend health from host..."
curl -v http://localhost:3001/health 2>&1 | head -20

echo ""
echo "3. Testing backend health through nginx from inside container..."
docker compose -f docker-compose.prod.yml exec nginx curl -v http://backend:3001/health 2>&1 | head -20

echo ""
echo "4. Testing API endpoint from host..."
curl -v http://localhost/api/v1/nodes 2>&1 | head -30

echo ""
echo "5. Checking nginx access logs (last 20 lines)..."
docker compose -f docker-compose.prod.yml logs nginx --tail=20 | grep -v "docker-entrypoint"

echo ""
echo "6. Checking nginx error logs (last 20 lines)..."
docker compose -f docker-compose.prod.yml exec nginx cat /var/log/nginx/error.log 2>/dev/null | tail -20 || echo "No error log found"

echo ""
echo "7. Checking what's listening on port 80..."
sudo netstat -tlnp | grep :80 || ss -tlnp | grep :80

echo ""
echo "8. Testing if nginx is receiving requests on port 80..."
echo "Making a test request to http://localhost/api/v1/nodes..."
curl -v http://localhost/api/v1/nodes 2>&1 | head -30

echo ""
echo "9. Checking nginx configuration syntax..."
docker compose -f docker-compose.prod.yml exec nginx nginx -t

echo ""
echo "10. Checking backend logs for incoming requests..."
echo "Looking for recent API requests in backend logs..."
docker compose -f docker-compose.prod.yml logs backend --tail=50 | grep -E "(GET|POST|PUT|DELETE)" | tail -10

echo ""
echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
echo ""
echo "Key things to check:"
echo "1. Are there any nginx access log entries for /api/ requests?"
echo "2. Does curl to localhost:80/api/v1/nodes work from the server?"
echo "3. Are there any nginx error log entries?"
echo "4. Is nginx actually listening on port 80?"
