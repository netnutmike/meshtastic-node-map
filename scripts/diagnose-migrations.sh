#!/bin/bash

# Diagnostic script to check Prisma migrations in production

echo "=========================================="
echo "Diagnosing Prisma Migrations"
echo "=========================================="
echo ""

echo "1. Checking if backend container is running..."
if docker compose -f docker-compose.prod.yml ps backend | grep -q "Up"; then
    echo "✓ Backend container is running"
else
    echo "✗ Backend container is not running"
    exit 1
fi
echo ""

echo "2. Checking Prisma files in container..."
echo "   Checking /app/prisma directory:"
docker compose -f docker-compose.prod.yml exec backend ls -la /app/prisma/
echo ""

echo "3. Checking migrations directory:"
docker compose -f docker-compose.prod.yml exec backend ls -la /app/prisma/migrations/ 2>/dev/null || echo "   ✗ Migrations directory not found!"
echo ""

echo "4. Checking Prisma schema:"
docker compose -f docker-compose.prod.yml exec backend cat /app/prisma/schema.prisma | head -20
echo ""

echo "5. Checking DATABASE_URL environment variable:"
docker compose -f docker-compose.prod.yml exec backend printenv | grep DATABASE_URL
echo ""

echo "6. Testing Prisma CLI:"
docker compose -f docker-compose.prod.yml exec backend npx prisma --version
echo ""

echo "7. Checking migration status:"
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status
echo ""

echo "=========================================="
echo "Diagnosis Complete"
echo "=========================================="
