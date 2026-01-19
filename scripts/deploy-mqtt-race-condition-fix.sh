#!/bin/bash

# Deploy MQTT Race Condition Fix to Production
# This script rebuilds the backend with the race condition fix and deploys it

set -e

echo "=========================================="
echo "Deploying MQTT Race Condition Fix"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "Step 1: Checking current node count..."
CURRENT_NODES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;" 2>/dev/null | tr -d ' ' || echo "0")
echo "Current nodes in database: $CURRENT_NODES"

echo ""
echo "Step 2: Checking for unique constraint errors in logs..."
ERROR_COUNT=$(docker compose -f docker-compose.prod.yml logs backend --tail=100 2>/dev/null | grep -c "Unique constraint failed" || echo "0")
echo "Found $ERROR_COUNT unique constraint errors in recent logs"

if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "✓ Confirmed: Race condition bug is present"
else
    echo "ℹ️  No recent errors found (may have been fixed or no traffic)"
fi

echo ""
echo "Step 3: Stopping backend container..."
docker compose -f docker-compose.prod.yml stop backend

echo ""
echo "Step 4: Rebuilding backend with race condition fix..."
echo "This may take a few minutes..."
docker compose -f docker-compose.prod.yml build --no-cache backend

echo ""
echo "Step 5: Starting backend..."
docker compose -f docker-compose.prod.yml up -d backend

echo ""
echo "Step 6: Waiting for backend to initialize (30 seconds)..."
sleep 30

echo ""
echo "Step 7: Checking backend health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✓ Backend is healthy (HTTP $HEALTH_STATUS)"
else
    echo "⚠️  Backend health check returned: HTTP $HEALTH_STATUS"
    echo "Checking logs for errors..."
    docker compose -f docker-compose.prod.yml logs backend --tail=20
fi

echo ""
echo "Step 8: Monitoring for MQTT activity..."
echo "Checking last 20 log lines for MQTT messages..."
docker compose -f docker-compose.prod.yml logs backend --tail=20 | grep -i "mqtt\|node\|message" || echo "No MQTT activity in recent logs"

echo ""
echo "Step 9: Checking for new unique constraint errors..."
sleep 10
NEW_ERROR_COUNT=$(docker compose -f docker-compose.prod.yml logs backend --tail=50 2>/dev/null | grep -c "Unique constraint failed" || echo "0")
if [ "$NEW_ERROR_COUNT" -gt 0 ]; then
    echo "❌ Still seeing unique constraint errors: $NEW_ERROR_COUNT"
    echo "Showing recent errors:"
    docker compose -f docker-compose.prod.yml logs backend --tail=50 | grep "Unique constraint"
else
    echo "✓ No unique constraint errors detected"
fi

echo ""
echo "Step 10: Checking node count..."
sleep 5
NEW_NODES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;" 2>/dev/null | tr -d ' ' || echo "0")
echo "Nodes in database: $NEW_NODES"

if [ "$NEW_NODES" -gt "$CURRENT_NODES" ]; then
    echo "✓ Node count increased! Nodes are being created."
    INCREASE=$((NEW_NODES - CURRENT_NODES))
    echo "  Added $INCREASE nodes since deployment"
else
    echo "ℹ️  Node count unchanged (may need more time or MQTT traffic)"
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "✓ Added race condition handling for concurrent node creation"
echo "✓ Added null checks to prevent crashes"
echo "✓ Backend will now handle multiple simultaneous MQTT messages correctly"
echo ""
echo "Next steps:"
echo "1. Monitor node count for 5 minutes:"
echo "   watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c \"SELECT COUNT(*) FROM nodes;\"'"
echo ""
echo "2. Watch backend logs for activity:"
echo "   docker compose -f docker-compose.prod.yml logs -f backend | grep -i 'created new node\|stored message'"
echo ""
echo "3. Check for any remaining errors:"
echo "   docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep -i error"
echo ""
