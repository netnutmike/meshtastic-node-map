#!/bin/bash

# Diagnostic script to check Prisma migrations in production container

echo "=========================================="
echo "Diagnosing Prisma Migrations"
echo "=========================================="
echo ""

echo "Step 1: Checking if backend container is running..."
if ! docker compose -f docker-compose.prod.yml ps backend | grep -q "Up"; then
    echo "✗ Backend container is not running"
    echo "Starting backend container..."
    docker compose -f docker-compose.prod.yml up -d backend
    sleep 5
fi
echo "✓ Backend container is running"
echo ""

echo "Step 2: Checking working directory in container..."
docker compose -f docker-compose.prod.yml exec backend pwd
echo ""

echo "Step 3: Listing files in /app directory..."
docker compose -f docker-compose.prod.yml exec backend ls -la /app
echo ""

echo "Step 4: Checking if prisma directory exists..."
docker compose -f docker-compose.prod.yml exec backend ls -la /app/prisma
echo ""

echo "Step 5: Checking if migrations directory exists..."
docker compose -f docker-compose.prod.yml exec backend ls -la /app/prisma/migrations
echo ""

echo "Step 6: Listing migration folders..."
docker compose -f docker-compose.prod.yml exec backend find /app/prisma/migrations -type d
echo ""

echo "Step 7: Checking Prisma client generation..."
docker compose -f docker-compose.prod.yml exec backend ls -la /app/node_modules/.prisma/client 2>/dev/null || echo "⚠️  Prisma client not found"
echo ""

echo "Step 8: Testing Prisma CLI..."
docker compose -f docker-compose.prod.yml exec backend npx prisma --version
echo ""

echo "Step 9: Checking DATABASE_URL environment variable..."
docker compose -f docker-compose.prod.yml exec backend printenv | grep DATABASE_URL
echo ""

echo "Step 10: Testing database connection from container..."
docker compose -f docker-compose.prod.yml exec backend npx prisma db execute --stdin <<EOF
SELECT version();
EOF
echo ""

echo "=========================================="
echo "Diagnosis Complete"
echo "=========================================="
