#!/bin/bash

# Fix MQTT Connection Script
# Updates the default network to use the correct MQTT broker URL for production

echo "=========================================="
echo "Fixing MQTT Connection Configuration"
echo "=========================================="
echo ""

# Check if docker-compose.prod.yml exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "Step 1: Checking current network configuration..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c \
  "SELECT id, name, \"mqttBroker\", \"isActive\" FROM networks;"
echo ""

echo "Step 2: Updating default network MQTT broker URL..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c \
  "UPDATE networks SET \"mqttBroker\" = 'mqtt://mosquitto:1883' WHERE id = 'default-network';"

if [ $? -eq 0 ]; then
    echo "✓ Network configuration updated"
else
    echo "✗ Failed to update network configuration"
    exit 1
fi
echo ""

echo "Step 3: Verifying updated configuration..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c \
  "SELECT id, name, \"mqttBroker\", \"isActive\" FROM networks;"
echo ""

echo "Step 4: Restarting backend to apply changes..."
docker compose -f docker-compose.prod.yml restart backend
echo ""

echo "Step 5: Waiting for backend to be ready (30 seconds)..."
sleep 30
echo ""

echo "Step 6: Checking backend logs..."
docker compose -f docker-compose.prod.yml logs --tail=50 backend | grep -i "mqtt\|connected\|error" || echo "No MQTT-related logs found"
echo ""

echo "Step 7: Checking backend health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Backend is healthy (HTTP $HTTP_CODE)"
else
    echo "⚠️  Backend health check returned HTTP $HTTP_CODE"
fi
echo ""

echo "Step 8: Checking if nodes are being created..."
sleep 10
NODE_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;" | tr -d ' ')
echo "Current node count: $NODE_COUNT"
echo ""

echo "=========================================="
echo "MQTT Connection Fix Complete!"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "  - Updated MQTT broker URL from 'mqtt://localhost:1883' to 'mqtt://mosquitto:1883'"
echo "  - Restarted backend to reconnect with correct broker"
echo ""
echo "Next steps:"
echo "  1. Check if MQTT messages are being processed:"
echo "     docker compose -f docker-compose.prod.yml logs -f backend | grep MQTT"
echo ""
echo "  2. Monitor mosquitto logs for connections:"
echo "     docker compose -f docker-compose.prod.yml logs -f mosquitto"
echo ""
echo "  3. Check if nodes appear in database:"
echo "     docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c 'SELECT COUNT(*) FROM nodes;'"
echo ""
echo "If nodes still don't appear, check:"
echo "  - MQTT topic configuration (should be 'msh/#' or 'meshtastic/#')"
echo "  - MQTT broker authentication (username/password)"
echo "  - Backend logs for decoding errors"
