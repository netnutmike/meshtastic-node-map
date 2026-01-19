#!/bin/bash

# Fix Database Schema - Resolves migration sync issues
# Use this when migrations show as applied but tables don't exist

echo "=========================================="
echo "Fixing Database Schema"
echo "=========================================="
echo ""

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "Step 1: Stopping backend to prevent connection issues..."
docker compose -f docker-compose.prod.yml stop backend
echo "✓ Backend stopped"
echo ""

echo "Step 2: Checking if migrations exist in backend image..."
docker compose -f docker-compose.prod.yml run --rm backend ls -la /app/prisma/migrations
if [ $? -ne 0 ]; then
    echo "✗ Migrations not found in image!"
    echo ""
    echo "Rebuilding backend image with migrations..."
    docker compose -f docker-compose.prod.yml build --no-cache backend
    echo "✓ Backend image rebuilt"
fi
echo ""

echo "Step 3: Resetting database schema..."
echo "   This will drop all tables and recreate them from migrations."
read -p "   Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Use migrate reset to drop everything and reapply migrations
docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate reset --force --skip-seed

if [ $? -eq 0 ]; then
    echo "✓ Database schema reset and migrations applied"
else
    echo "✗ Migration reset failed"
    echo ""
    echo "Trying alternative method: db push..."
    docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --force-reset --accept-data-loss
    if [ $? -eq 0 ]; then
        echo "✓ Schema pushed successfully"
    else
        echo "✗ Schema push failed"
        exit 1
    fi
fi
echo ""

echo "Step 4: Verifying tables were created..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
echo ""

echo "Step 5: Creating default network..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<EOF
INSERT INTO networks (id, name, description, "mqttBroker", "mqttCredentials", region, "isActive", "createdAt", "updatedAt")
VALUES (
    'default-network',
    'Default Meshtastic Network',
    'Default network for production deployment',
    'mqtt://mosquitto:1883',
    '{"username": "meshtastic", "password": "meshtastic", "clientId": "meshtastic-node-mapper"}',
    'US',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    "mqttBroker" = 'mqtt://mosquitto:1883',
    "mqttCredentials" = '{"username": "meshtastic", "password": "meshtastic", "clientId": "meshtastic-node-mapper"}',
    "updatedAt" = NOW();
EOF

if [ $? -eq 0 ]; then
    echo "✓ Default network created"
else
    echo "⚠️  Failed to create default network"
fi
echo ""

echo "Step 6: Starting backend..."
docker compose -f docker-compose.prod.yml up -d backend
echo "✓ Backend started"
echo ""

echo "Step 7: Waiting for backend to initialize (20 seconds)..."
sleep 20
echo ""

echo "Step 8: Checking backend health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Backend is healthy (HTTP $HTTP_CODE)"
else
    echo "⚠️  Backend health check returned HTTP $HTTP_CODE"
    echo ""
    echo "Checking backend logs..."
    docker compose -f docker-compose.prod.yml logs --tail=30 backend
fi
echo ""

echo "Step 9: Verifying database contents..."
echo "   Networks:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM networks;"
echo ""
echo "   Nodes:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"
echo ""

echo "=========================================="
echo "Database Schema Fix Complete!"
echo "=========================================="
echo ""
echo "Your database should now have all required tables."
echo "Monitor MQTT messages with:"
echo "  docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt"
