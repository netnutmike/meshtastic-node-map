#!/bin/bash

# Production Database Initialization Script
# Initializes database schema and seeds data for production deployment

echo "=========================================="
echo "Initializing Production Database"
echo "=========================================="
echo ""

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "Step 1: Checking database connection..."
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U meshtastic -d meshtastic_mapper
if [ $? -eq 0 ]; then
    echo "✓ Database is ready"
else
    echo "✗ Database is not ready"
    echo "Please ensure PostgreSQL container is running:"
    echo "  docker compose -f docker-compose.prod.yml up -d postgres"
    exit 1
fi
echo ""

echo "Step 2: Checking current database tables..."
TABLES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo "   Found $TABLES tables in database"
echo ""

echo "Step 3: Checking if migrations directory exists in container..."
docker compose -f docker-compose.prod.yml exec backend ls -la /app/prisma/migrations 2>/dev/null
if [ $? -ne 0 ]; then
    echo "✗ Migrations directory not found in container!"
    echo "This indicates a Docker build issue. Rebuilding backend image..."
    docker compose -f docker-compose.prod.yml build --no-cache backend
    docker compose -f docker-compose.prod.yml up -d backend
    sleep 10
fi
echo ""

echo "Step 4: Running Prisma migrations..."
# First, try to deploy migrations
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -ne 0 ] || [ "$TABLES" -eq "1" ]; then
    echo "⚠️  Migration deploy had issues or no tables created"
    echo ""
    echo "Step 4a: Resetting migration state and pushing schema..."
    # Drop all tables and recreate from schema
    docker compose -f docker-compose.prod.yml exec backend npx prisma migrate reset --force --skip-seed
    if [ $? -eq 0 ]; then
        echo "✓ Schema reset and migrations applied successfully"
    else
        echo "✗ Migration reset failed, trying db push..."
        docker compose -f docker-compose.prod.yml exec backend npx prisma db push --force-reset --accept-data-loss
        if [ $? -eq 0 ]; then
            echo "✓ Schema pushed successfully"
        else
            echo "✗ Schema push failed"
            exit 1
        fi
    fi
else
    echo "✓ Migrations completed successfully"
fi
echo ""

echo "Step 5: Verifying tables were created..."
TABLES_AFTER=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo "   Now have $TABLES_AFTER tables in database"

if [ "$TABLES_AFTER" -gt "0" ]; then
    echo "✓ Tables created successfully"
else
    echo "✗ No tables found after migration"
    exit 1
fi
echo ""

echo "Step 6: Listing created tables..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
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
) ON CONFLICT (id) DO UPDATE SET
    "mqttBroker" = 'mqtt://mosquitto:1883',
    "mqttCredentials" = '{"username": "meshtastic", "password": "meshtastic", "clientId": "meshtastic-node-mapper"}',
    "updatedAt" = NOW();
EOF

if [ $? -eq 0 ]; then
    echo "✓ Default network created/updated"
else
    echo "⚠️  Failed to create default network"
fi
echo ""

echo "Step 8: Verifying network configuration..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT id, name, \"mqttBroker\", \"isActive\" FROM networks;"
echo ""

echo "Step 9: Seeding database (if needed)..."
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Database seeded"
else
    echo "⚠️  Seeding skipped (may already have data or no seed script)"
fi
echo ""

echo "Step 10: Restarting backend to apply changes..."
docker compose -f docker-compose.prod.yml restart backend
echo "✓ Backend restarted"
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
    docker compose -f docker-compose.prod.yml logs --tail=30 backend
fi
echo ""

echo "Step 13: Verifying MQTT connection..."
docker compose -f docker-compose.prod.yml logs --tail=20 backend | grep -i "mqtt\|connected" || echo "⚠️  No MQTT connection logs found yet"
echo ""

echo "Step 14: Checking database statistics..."
echo "   Networks:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM networks;"
echo ""
echo "   Nodes:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"
echo ""
echo "   Messages:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM messages;"
echo ""

echo "=========================================="
echo "Database Initialization Complete!"
echo "=========================================="
echo ""
echo "What was done:"
echo "  ✓ Ran Prisma migrations to create database schema"
echo "  ✓ Created default network with MQTT configuration"
echo "  ✓ Restarted backend to connect to database"
echo ""
echo "Next steps:"
echo "  1. Monitor backend logs for MQTT messages:"
echo "     docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt"
echo ""
echo "  2. Check if nodes are being created from MQTT:"
echo "     watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c \"SELECT COUNT(*) FROM nodes;\"'"
echo ""
echo "  3. Access the application:"
echo "     http://localhost (or your configured domain)"
