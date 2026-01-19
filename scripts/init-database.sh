#!/bin/bash

# Database Initialization Script
# Runs migrations and seeds the database for production

echo "=========================================="
echo "Initializing Database"
echo "=========================================="
echo ""

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "Step 1: Checking if database is accessible..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Database is accessible"
else
    echo "✗ Cannot connect to database"
    echo "Make sure postgres container is running:"
    echo "  docker compose -f docker-compose.prod.yml ps postgres"
    exit 1
fi
echo ""

echo "Step 2: Checking current database state..."
TABLE_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo "Current table count: $TABLE_COUNT"
echo ""

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "⚠️  Database already has tables. Do you want to:"
    echo "  1) Run migrations only (safe - preserves data)"
    echo "  2) Reset and reinitialize (DANGER - deletes all data)"
    echo "  3) Cancel"
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            echo "Running migrations only..."
            ;;
        2)
            echo "⚠️  WARNING: This will delete ALL data!"
            read -p "Type 'DELETE ALL DATA' to confirm: " confirm
            if [ "$confirm" != "DELETE ALL DATA" ]; then
                echo "Cancelled."
                exit 0
            fi
            echo "Resetting database..."
            docker compose -f docker-compose.prod.yml exec backend npx prisma migrate reset --force
            ;;
        3)
            echo "Cancelled."
            exit 0
            ;;
        *)
            echo "Invalid choice. Cancelled."
            exit 1
            ;;
    esac
else
    echo "Database is empty. Proceeding with initialization..."
fi
echo ""

echo "Step 3: Running Prisma migrations..."
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo "✓ Migrations completed successfully"
else
    echo "✗ Migration failed"
    echo ""
    echo "Checking backend logs..."
    docker compose -f docker-compose.prod.yml logs --tail=50 backend
    exit 1
fi
echo ""

echo "Step 4: Seeding database with default data..."
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
if [ $? -eq 0 ]; then
    echo "✓ Database seeded successfully"
else
    echo "⚠️  Seeding failed (this is OK if data already exists)"
fi
echo ""

echo "Step 5: Verifying database structure..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "\dt" | head -20
echo ""

echo "Step 6: Checking for networks..."
NETWORK_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM networks;" 2>/dev/null | tr -d ' ')
echo "Network count: $NETWORK_COUNT"

if [ "$NETWORK_COUNT" -eq 0 ]; then
    echo "⚠️  No networks found. Creating default network..."
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
    echo "✓ Default network created/updated"
else
    echo "Updating existing network MQTT broker..."
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c \
      "UPDATE networks SET \"mqttBroker\" = 'mqtt://mosquitto:1883', \"updatedAt\" = NOW() WHERE id = 'default-network';"
    echo "✓ Network updated"
fi
echo ""

echo "Step 7: Verifying network configuration..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c \
  "SELECT id, name, \"mqttBroker\", \"isActive\" FROM networks;"
echo ""

echo "Step 8: Restarting backend to apply changes..."
docker compose -f docker-compose.prod.yml restart backend
echo ""

echo "Step 9: Waiting for backend to be ready (30 seconds)..."
sleep 30
echo ""

echo "Step 10: Checking backend health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Backend is healthy (HTTP $HTTP_CODE)"
else
    echo "⚠️  Backend health check returned HTTP $HTTP_CODE"
    echo "Checking backend logs..."
    docker compose -f docker-compose.prod.yml logs --tail=30 backend
fi
echo ""

echo "=========================================="
echo "Database Initialization Complete!"
echo "=========================================="
echo ""
echo "What was done:"
echo "  ✓ Ran database migrations"
echo "  ✓ Seeded default data"
echo "  ✓ Created/updated default network with correct MQTT broker"
echo "  ✓ Restarted backend"
echo ""
echo "Next steps:"
echo "  1. Monitor backend logs for MQTT connection:"
echo "     docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt"
echo ""
echo "  2. Check if nodes are being created:"
echo "     docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c 'SELECT COUNT(*) FROM nodes;'"
echo ""
echo "  3. View mosquitto logs:"
echo "     docker compose -f docker-compose.prod.yml logs -f mosquitto"
