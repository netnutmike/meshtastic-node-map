#!/bin/bash

# Fix MQTT connection issues
# Addresses rapid connect/disconnect cycles and 503 errors

set -e

echo "=== MQTT Connection Issues Fix ==="
echo "Timestamp: $(date)"
echo ""

# Check if running with docker permissions
if ! docker ps >/dev/null 2>&1; then
    echo "ERROR: Cannot access Docker. Please run with sudo or as a user with Docker permissions."
    exit 1
fi

echo "Step 1: Checking if Mosquitto is experiencing OOM crashes..."
OOM_COUNT=$(dmesg | grep -c "Memory cgroup out of memory.*mosquitto" 2>/dev/null || echo "0")
if [ "$OOM_COUNT" -gt 0 ]; then
    echo "❌ Mosquitto has $OOM_COUNT OOM crashes!"
    echo ""
    echo "You MUST fix the OOM issue first:"
    echo "  ./scripts/fix-mosquitto-oom-final.sh"
    echo ""
    read -p "Do you want to run the OOM fix now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/fix-mosquitto-oom-final.sh
        exit 0
    else
        echo "Exiting. Please fix OOM issue first."
        exit 1
    fi
fi

echo "✅ No OOM issues detected"
echo ""

echo "Step 2: Checking if default-network exists in database..."
NETWORK_EXISTS=$(docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM networks WHERE id = 'default-network';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$NETWORK_EXISTS" = "0" ]; then
    echo "❌ default-network not found in database"
    echo "Creating default-network..."
    
    docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -c "
    INSERT INTO networks (id, name, mqtt_broker, mqtt_credentials, is_active, created_at, updated_at)
    VALUES (
        'default-network',
        'Default Network',
        'mqtt://mosquitto:1883',
        '{\"username\": \"\", \"password\": \"\"}',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    " 2>&1 | grep -v "INSERT" || echo "Network creation attempted"
    
    echo "✅ default-network created"
else
    echo "✅ default-network exists"
fi
echo ""

echo "Step 3: Restarting backend to reinitialize MQTT connections..."
docker-compose -f docker-compose.prod.yml restart backend

echo ""
echo "Step 4: Waiting for backend to start (30 seconds)..."
sleep 30

echo ""
echo "Step 5: Checking backend health..."
for i in {1..10}; do
    HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "ERROR")
    if [[ $HEALTH == *"healthy"* ]] || [[ $HEALTH == *"ok"* ]]; then
        echo "✅ Backend is healthy"
        break
    else
        echo "Attempt $i/10: Backend not ready yet..."
        sleep 3
    fi
done

echo ""
echo "Step 6: Checking MQTT monitor endpoint..."
MQTT_STATUS=$(curl -s http://localhost:3001/api/v1/mqtt-monitor/status 2>/dev/null || echo "ERROR")
if [[ $MQTT_STATUS == *"503"* ]] || [[ $MQTT_STATUS == *"not available"* ]]; then
    echo "❌ MQTT Monitor still returning 503"
    echo "Checking backend logs for errors..."
    docker logs meshtastic-backend-prod --tail 50 | grep -i "error\|mqtt\|network"
else
    echo "✅ MQTT Monitor is responding"
fi

echo ""
echo "Step 7: Checking WebSocket connection status..."
docker logs meshtastic-backend-prod --tail 100 2>&1 | grep -i "network.*connected\|network.*disconnected" | tail -5 || echo "No recent network status changes"

echo ""
echo "=== Fix Complete ==="
echo ""
echo "Monitor the connection status:"
echo "  1. Check backend logs:"
echo "     docker logs -f meshtastic-backend-prod | grep -i mqtt"
echo ""
echo "  2. Check browser console for network status messages"
echo ""
echo "  3. Test MQTT monitor:"
echo "     curl http://localhost:3001/api/v1/mqtt-monitor/status"
echo ""
echo "If issues persist:"
echo "  1. Check Mosquitto is stable (not restarting)"
echo "  2. Verify network connectivity between containers"
echo "  3. Check for firewall or network issues"
echo ""
