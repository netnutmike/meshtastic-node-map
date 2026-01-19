#!/bin/bash

# Simple script to restart nginx and verify connectivity

echo "Restarting nginx to clear any cached errors..."
docker compose -f docker-compose.prod.yml restart nginx

echo "Waiting for nginx to be ready..."
sleep 5

echo ""
echo "Testing connectivity from nginx to frontend..."
docker compose -f docker-compose.prod.yml exec nginx wget -O- http://frontend:8080/ > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Nginx can reach frontend"
else
    echo "✗ Nginx cannot reach frontend"
    echo ""
    echo "Checking if frontend is accessible..."
    docker compose -f docker-compose.prod.yml exec frontend curl -f http://localhost:8080/ > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Frontend is responding on port 8080"
        echo "✗ But nginx cannot reach it - network issue"
        echo ""
        echo "Checking network connectivity..."
        docker compose -f docker-compose.prod.yml exec nginx ping -c 3 frontend
    else
        echo "✗ Frontend is not responding"
    fi
    exit 1
fi

echo ""
echo "Testing from host..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ SUCCESS! Application is accessible (HTTP $HTTP_CODE)"
    echo ""
    echo "Access your application at: http://localhost/"
elif [ "$HTTP_CODE" = "502" ]; then
    echo "✗ Still getting 502 Bad Gateway"
    echo ""
    echo "Nginx error logs:"
    docker compose -f docker-compose.prod.yml logs --tail=30 nginx | grep -i error
    echo ""
    echo "Run full diagnostics: ./scripts/diagnose-502.sh"
else
    echo "⚠️  Got HTTP $HTTP_CODE"
fi
