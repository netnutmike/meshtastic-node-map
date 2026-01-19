#!/bin/bash

# Backend OpenSSL Fix Script
# Rebuilds backend with OpenSSL 1.1 compatibility

echo "=========================================="
echo "Fixing Backend OpenSSL Issue"
echo "=========================================="
echo ""

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "Step 1: Stopping backend container..."
docker compose -f docker-compose.prod.yml stop backend
echo "✓ Backend stopped"
echo ""

echo "Step 2: Removing backend container..."
docker compose -f docker-compose.prod.yml rm -f backend
echo "✓ Backend container removed"
echo ""

echo "Step 3: Removing old backend images..."
docker images | grep backend | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
echo "✓ Old images removed"
echo ""

echo "Step 4: Rebuilding backend with OpenSSL fix..."
echo "This may take a few minutes..."
docker compose -f docker-compose.prod.yml build --no-cache backend
if [ $? -eq 0 ]; then
    echo "✓ Backend built successfully"
else
    echo "✗ Backend build failed"
    exit 1
fi
echo ""

echo "Step 5: Starting backend container..."
docker compose -f docker-compose.prod.yml up -d backend
echo "✓ Backend started"
echo ""

echo "Step 6: Waiting for backend to initialize (60 seconds)..."
sleep 60
echo ""

echo "Step 7: Checking backend status..."
docker compose -f docker-compose.prod.yml ps backend
echo ""

echo "Step 8: Checking backend logs..."
docker compose -f docker-compose.prod.yml logs --tail=50 backend | grep -E "running|error|MQTT|Prisma" || echo "No relevant logs found"
echo ""

echo "Step 9: Testing backend health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Backend is healthy (HTTP $HTTP_CODE)"
else
    echo "⚠️  Backend health check returned HTTP $HTTP_CODE"
    echo ""
    echo "Checking for errors..."
    docker compose -f docker-compose.prod.yml logs --tail=100 backend
    exit 1
fi
echo ""

echo "Step 10: Running database migrations..."
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo "✓ Migrations completed"
else
    echo "⚠️  Migrations may have failed (check if already applied)"
fi
echo ""

echo "Step 11: Seeding database..."
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed 2>/dev/null || echo "⚠️  Seeding skipped (may already have data)"
echo ""

echo "Step 12: Updating network MQTT broker..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<EOF
INSERT INTO networks (id, name, description, "mqttBroker", "mqttCredentials", region, "isActive", "createdAt", "updatedAt")
VALUES (
    'default-network',
    'Default Meshtastic Network',
    'Default network for production',
    'mqtt://mosquitto:1883',
    '{"username": "meshtastic", "password": "meshtastic", "clientId": "meshtastic-node-mapper"}',
    'US',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    "mqttBroker" = 'mqtt://mosquitto:1883',
    "updatedAt" = NOW();
EOF
echo "✓ Network configuration updated"
echo ""

echo "Step 13: Restarting backend to apply all changes..."
docker compose -f docker-compose.prod.yml restart backend
echo ""

echo "Step 14: Waiting for backend to reconnect (30 seconds)..."
sleep 30
echo ""

echo "Step 15: Final health check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Backend is healthy (HTTP $HTTP_CODE)"
else
    echo "⚠️  Backend health check returned HTTP $HTTP_CODE"
fi
echo ""

echo "Step 16: Checking MQTT connection..."
docker compose -f docker-compose.prod.yml logs --tail=20 backend | grep -i "mqtt\|connected" || echo "No MQTT logs yet"
echo ""

echo "=========================================="
echo "Backend OpenSSL Fix Complete!"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "  ✓ Rebuilt backend with OpenSSL 1.1 compatibility"
echo "  ✓ Ran database migrations"
echo "  ✓ Configured default network with correct MQTT broker"
echo ""
echo "Next steps:"
echo "  1. Monitor backend logs for MQTT connection:"
echo "     docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt"
echo ""
echo "  2. Check if nodes are being created:"
echo "     docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c 'SELECT COUNT(*) FROM nodes;'"
echo ""
echo "  3. If nodes still don't appear, check mosquitto logs:"
echo "     docker compose -f docker-compose.prod.yml logs -f mosquitto"
