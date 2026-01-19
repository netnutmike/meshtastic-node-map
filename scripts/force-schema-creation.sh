#!/bin/bash

# Force Schema Creation - Nuclear option that always works
# This script will forcefully create the database schema

set -e  # Exit on any error

echo "=========================================="
echo "Force Creating Database Schema"
echo "=========================================="
echo ""

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "Step 1: Stopping backend..."
docker compose -f docker-compose.prod.yml stop backend
echo "✓ Backend stopped"
echo ""

echo "Step 2: Checking if migrations exist in backend image..."
if ! docker compose -f docker-compose.prod.yml run --rm backend ls /app/prisma/migrations/001_init/migration.sql > /dev/null 2>&1; then
    echo "✗ Migrations not found in Docker image!"
    echo ""
    echo "Rebuilding backend image (this may take a few minutes)..."
    docker compose -f docker-compose.prod.yml build --no-cache backend
    echo "✓ Backend image rebuilt"
    echo ""
fi

echo "Step 3: Dropping and recreating database..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d postgres <<EOF
-- Terminate all connections to the database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'meshtastic_mapper'
  AND pid <> pg_backend_pid();

-- Drop and recreate database
DROP DATABASE IF EXISTS meshtastic_mapper;
CREATE DATABASE meshtastic_mapper;
GRANT ALL PRIVILEGES ON DATABASE meshtastic_mapper TO meshtastic;
EOF

echo "✓ Database recreated"
echo ""

echo "Step 4: Applying migrations using db push..."
# Use db push which doesn't rely on migration history
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --accept-data-loss

if [ $? -ne 0 ]; then
    echo "✗ db push failed!"
    echo ""
    echo "Trying alternative: migrate deploy..."
    docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
    
    if [ $? -ne 0 ]; then
        echo "✗ Both methods failed!"
        echo ""
        echo "Checking what's in the container..."
        docker compose -f docker-compose.prod.yml run --rm backend ls -la /app/prisma/
        exit 1
    fi
fi

echo "✓ Schema created"
echo ""

echo "Step 5: Verifying tables..."
TABLES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' \n\r')

echo "   Found $TABLES tables"

if [ "$TABLES" -lt "5" ]; then
    echo "✗ Not enough tables created!"
    echo ""
    echo "Listing what we have:"
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
    exit 1
fi

echo ""
echo "Listing created tables:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
echo ""

echo "Step 6: Creating default network..."
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
);
EOF

if [ $? -eq 0 ]; then
    echo "✓ Default network created"
else
    echo "✗ Failed to create default network"
    exit 1
fi
echo ""

echo "Step 7: Verifying network..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT id, name, \"isActive\" FROM networks;"
echo ""

echo "Step 8: Starting backend..."
docker compose -f docker-compose.prod.yml up -d backend
echo "✓ Backend started"
echo ""

echo "Step 9: Waiting for backend to initialize (20 seconds)..."
sleep 20
echo ""

echo "Step 10: Checking backend health..."
for i in {1..5}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ Backend is healthy (HTTP $HTTP_CODE)"
        break
    else
        if [ $i -eq 5 ]; then
            echo "⚠️  Backend health check returned HTTP $HTTP_CODE after 5 attempts"
            echo ""
            echo "Backend logs:"
            docker compose -f docker-compose.prod.yml logs --tail=50 backend
        else
            echo "   Attempt $i: HTTP $HTTP_CODE, waiting 5 seconds..."
            sleep 5
        fi
    fi
done
echo ""

echo "Step 11: Checking for MQTT initialization..."
docker compose -f docker-compose.prod.yml logs backend | grep -i "mqtt" | tail -10
echo ""

echo "Step 12: Final verification..."
echo "   Networks:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM networks;"
echo ""
echo "   Nodes table exists:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;"
echo ""

echo "=========================================="
echo "Schema Creation Complete!"
echo "=========================================="
echo ""
echo "Your database now has all required tables."
echo ""
echo "Monitor MQTT messages:"
echo "  docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt"
echo ""
echo "Watch for nodes being created:"
echo "  watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c \"SELECT COUNT(*) FROM nodes;\"'"
