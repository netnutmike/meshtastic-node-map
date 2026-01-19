#!/bin/bash

# Quick diagnostic to understand the current state

echo "=== QUICK DIAGNOSTIC ==="
echo ""

echo "1. Tables in database:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "\dt" 2>&1 | head -20
echo ""

echo "2. Migrations in container:"
docker compose -f docker-compose.prod.yml exec backend ls -la /app/prisma/migrations 2>&1 | head -10
echo ""

echo "3. Backend status:"
docker compose -f docker-compose.prod.yml ps backend
echo ""

echo "4. Recent backend logs:"
docker compose -f docker-compose.prod.yml logs --tail=20 backend 2>&1
echo ""

echo "=== END DIAGNOSTIC ==="
