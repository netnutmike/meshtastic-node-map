#!/bin/bash

# Fix Database Connection Pool Exhaustion
# Increases connection pool limits to handle high MQTT traffic

set -e

echo "=========================================="
echo "Fixing Database Connection Pool"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "Step 1: Stopping services..."
docker compose -f docker-compose.prod.yml stop backend postgres

echo ""
echo "Step 2: Rebuilding backend with updated connection settings..."
docker compose -f docker-compose.prod.yml build --no-cache backend

echo ""
echo "Step 3: Starting PostgreSQL with increased max_connections..."
docker compose -f docker-compose.prod.yml up -d postgres

echo ""
echo "Step 4: Waiting for PostgreSQL to be ready (30 seconds)..."
sleep 30

echo ""
echo "Step 5: Verifying PostgreSQL max_connections setting..."
MAX_CONN=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ' || echo "unknown")
echo "PostgreSQL max_connections: $MAX_CONN"

if [ "$MAX_CONN" = "200" ]; then
    echo "✓ PostgreSQL configured correctly"
else
    echo "⚠️  PostgreSQL max_connections is $MAX_CONN (expected 200)"
fi

echo ""
echo "Step 6: Starting backend with increased connection pool..."
docker compose -f docker-compose.prod.yml up -d backend

echo ""
echo "Step 7: Waiting for backend to initialize (30 seconds)..."
sleep 30

echo ""
echo "Step 8: Checking backend health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✓ Backend is healthy (HTTP $HEALTH_STATUS)"
else
    echo "⚠️  Backend health check returned: HTTP $HEALTH_STATUS"
    echo "Checking logs for errors..."
    docker compose -f docker-compose.prod.yml logs backend --tail=20
fi

echo ""
echo "Step 9: Monitoring for connection pool errors..."
sleep 10
POOL_ERRORS=$(docker compose -f docker-compose.prod.yml logs backend --tail=100 2>/dev/null | grep -c "connection pool" || echo "0")
if [ "$POOL_ERRORS" -gt 0 ]; then
    echo "⚠️  Still seeing connection pool errors: $POOL_ERRORS"
    echo "Showing recent errors:"
    docker compose -f docker-compose.prod.yml logs backend --tail=50 | grep "connection pool"
else
    echo "✓ No connection pool errors detected"
fi

echo ""
echo "Step 10: Checking node count..."
NODE_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;" 2>/dev/null | tr -d ' ' || echo "0")
echo "Nodes in database: $NODE_COUNT"

echo ""
echo "=========================================="
echo "Connection Pool Fix Complete!"
echo "=========================================="
echo ""
echo "What was changed:"
echo "✓ PostgreSQL max_connections: 100 → 200"
echo "✓ Prisma connection_limit: 20 → 100"
echo "✓ Prisma pool_timeout: 30s → 60s"
echo "✓ Backend connection pool: 10 → 50"
echo ""
echo "Next steps:"
echo "1. Monitor for connection pool errors:"
echo "   docker compose -f docker-compose.prod.yml logs -f backend | grep -i 'connection pool\\|P2024'"
echo ""
echo "2. Watch node count increase:"
echo "   watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c \"SELECT COUNT(*) FROM nodes;\"'"
echo ""
echo "3. Check backend performance:"
echo "   docker compose -f docker-compose.prod.yml logs backend --tail=50 | grep -i 'created new node'"
echo ""
