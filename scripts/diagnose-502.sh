#!/bin/bash

echo "=== Checking Docker Compose Status ==="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Checking Nginx Container ==="
docker compose -f docker-compose.prod.yml ps nginx

echo ""
echo "=== Checking Frontend Container ==="
docker compose -f docker-compose.prod.yml ps frontend

echo ""
echo "=== Checking Backend Container ==="
docker compose -f docker-compose.prod.yml ps backend

echo ""
echo "=== Nginx Logs (last 50 lines) ==="
docker compose -f docker-compose.prod.yml logs --tail=50 nginx

echo ""
echo "=== Frontend Logs (last 30 lines) ==="
docker compose -f docker-compose.prod.yml logs --tail=30 frontend

echo ""
echo "=== Backend Logs (last 30 lines) ==="
docker compose -f docker-compose.prod.yml logs --tail=30 backend

echo ""
echo "=== Testing Frontend Connectivity from Nginx ==="
docker compose -f docker-compose.prod.yml exec nginx wget -O- http://frontend:80/ 2>&1 | head -20

echo ""
echo "=== Testing Backend Connectivity from Nginx ==="
docker compose -f docker-compose.prod.yml exec nginx wget -O- http://backend:3001/health 2>&1
