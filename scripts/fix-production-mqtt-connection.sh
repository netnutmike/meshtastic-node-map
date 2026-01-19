#!/bin/bash

# Fix production MQTT connection issues

echo "=========================================="
echo "Fixing Production MQTT Connection"
echo "=========================================="
echo ""

echo "Step 1: Checking network configuration..."
NETWORK_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM networks WHERE \"isActive\" = true;" | tr -d ' \n\r')
echo "   Active networks: $NETWORK_COUNT"

if [ "$NETWORK_COUNT" -eq "0" ]; then
    echo "✗ No active networks found!"
    echo ""
    echo "Creating default network..."
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<'EOF'
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
    "isActive" = true,
    "mqttBroker" = 'mqtt://mosquitto:1883',
    "updatedAt" = NOW();
EOF
    echo "✓ Default network created/updated"
else
    echo "✓ Active network found"
fi
echo ""

echo "Step 2: Restarting Mosquitto..."
docker compose -f docker-compose.prod.yml restart mosquitto
echo "✓ Mosquitto restarted"
echo ""

echo "Step 3: Restarting backend..."
docker compose -f docker-compose.prod.yml restart backend
echo "✓ Backend restarted"
echo ""

echo "Step 4: Waiting for services to initialize (15 seconds)..."
sleep 15
echo ""

echo "Step 5: Checking backend logs for MQTT connection..."
docker compose -f docker-compose.prod.yml logs backend --tail=30 | grep -i mqtt | tail -10
echo ""

echo "Step 6: Checking node count..."
NODE_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;" | tr -d ' \n\r')
echo "   Nodes in database: $NODE_COUNT"
echo ""

echo "=========================================="
echo "Fix Complete"
echo "=========================================="
echo ""
echo "Monitor for new nodes with:"
echo "  watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c \"SELECT COUNT(*) FROM nodes;\"'"
echo ""
echo "Check backend logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt"
