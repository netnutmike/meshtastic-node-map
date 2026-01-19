#!/bin/bash

# Emergency Database Fix - Forces schema creation
# Use when other methods fail

set -e  # Exit on any error

echo "=========================================="
echo "Emergency Database Fix"
echo "=========================================="
echo ""

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "Step 1: Checking current database state..."
TABLES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo "   Current tables: $TABLES"
echo ""

echo "Step 2: Stopping backend to prevent interference..."
docker compose -f docker-compose.prod.yml stop backend
echo "✓ Backend stopped"
echo ""

echo "Step 3: Checking if migrations exist in container..."
docker compose -f docker-compose.prod.yml run --rm backend ls -la /app/prisma/migrations/
if [ $? -ne 0 ]; then
    echo "✗ Migrations not found! Rebuilding backend image..."
    docker compose -f docker-compose.prod.yml build --no-cache backend
    echo "✓ Backend rebuilt"
fi
echo ""

echo "Step 4: Dropping all existing tables..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<EOF
DO \$\$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
EOF
echo "✓ All tables dropped"
echo ""

echo "Step 5: Applying migrations with db push (bypasses migration history)..."
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --accept-data-loss
if [ $? -ne 0 ]; then
    echo "✗ db push failed!"
    exit 1
fi
echo "✓ Schema pushed successfully"
echo ""

echo "Step 6: Verifying tables were created..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
echo ""

TABLES_AFTER=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo "   Tables after migration: $TABLES_AFTER"

if [ "$TABLES_AFTER" -lt "5" ]; then
    echo "✗ Not enough tables created! Expected at least 5, got $TABLES_AFTER"
    echo ""
    echo "Checking for errors..."
    docker compose -f docker-compose.prod.yml logs backend --tail=50
    exit 1
fi
echo "✓ Tables created successfully"
echo ""

echo "Step 7: Creating default network..."
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
) ON CONFLICT (id) DO NOTHING;
EOF

if [ $? -eq 0 ]; then
    echo "✓ Default network created"
else
    echo "✗ Failed to create default network"
    exit 1
fi
echo ""

echo "Step 8: Verifying network exists..."
NETWORK_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM networks;" 2>/dev/null | tr -d ' ')
echo "   Networks in database: $NETWORK_COUNT"

if [ "$NETWORK_COUNT" -lt "1" ]; then
    echo "✗ No networks found!"
    exit 1
fi
echo "✓ Network verified"
echo ""

echo "Step 9: Regenerating Prisma client in container..."
docker compose -f docker-compose.prod.yml run --rm backend npx prisma generate
echo "✓ Prisma client regenerated"
echo ""

echo "Step 10: Starting backend..."
docker compose -f docker-compose.prod.yml up -d backend
echo "✓ Backend started"
echo ""

echo "Step 11: Waiting for backend to initialize (30 seconds)..."
sleep 30
echo ""

echo "Step 12: Checking backend health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Backend is healthy (HTTP $HTTP_CODE)"
else
    echo "⚠️  Backend health check returned HTTP $HTTP_CODE"
    echo ""
    echo "Checking backend logs for errors..."
    docker compose -f docker-compose.prod.yml logs --tail=50 backend
fi
echo ""

echo "Step 13: Checking for MQTT initialization..."
docker compose -f docker-compose.prod.yml logs backend | grep -i "mqtt" | tail -10
echo ""

echo "Step 14: Final verification..."
echo "   Networks:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT id, name, \"isActive\" FROM networks;"
echo ""
echo "   All tables:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
echo ""

echo "=========================================="
echo "Emergency Fix Complete!"
echo "=========================================="
echo ""
echo "If you still see errors, check:"
echo "  1. Backend logs: docker compose -f docker-compose.prod.yml logs backend"
echo "  2. Database connection: docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper"
echo "  3. Prisma client: docker compose -f docker-compose.prod.yml exec backend ls -la /app/node_modules/.prisma/client"
