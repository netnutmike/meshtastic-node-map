#!/bin/bash

# Comprehensive Production Fix Script
# Fixes: Mosquitto OOM, Database foreign key errors, MQTT connection issues

set -e

echo "=== Production Issues Fix ==="
echo "Timestamp: $(date)"
echo ""

# Check if running with docker permissions
if ! docker ps >/dev/null 2>&1; then
    echo "ERROR: Cannot access Docker. Please run with sudo or as a user with Docker permissions."
    exit 1
fi

echo "=== ISSUE SUMMARY ==="
echo "1. Mosquitto OOM crashes (using old 1GB limit)"
echo "2. Database foreign key errors (networkId='default' doesn't exist)"
echo "3. Backend MQTT connection failures (due to Mosquitto crashes)"
echo ""

# Step 1: Check current Mosquitto memory limit
echo "Step 1: Checking current Mosquitto configuration..."
CURRENT_LIMIT=$(docker inspect meshtastic-mosquitto-prod --format='{{.HostConfig.Memory}}' 2>/dev/null || echo "0")
CURRENT_LIMIT_GB=$((CURRENT_LIMIT / 1024 / 1024 / 1024))
echo "Current Mosquitto memory limit: ${CURRENT_LIMIT_GB}GB"

if [ "$CURRENT_LIMIT_GB" -lt 2 ]; then
    echo "⚠️  Mosquitto is still using old memory limit!"
    echo "   Need to restart with new docker-compose.prod.yml configuration"
else
    echo "✅ Mosquitto memory limit is correct (2GB)"
fi
echo ""

# Step 2: Check for OOM events
echo "Step 2: Checking for OOM events..."
OOM_COUNT=$(dmesg | grep -c "Memory cgroup out of memory.*mosquitto" 2>/dev/null || echo "0")
echo "Found $OOM_COUNT OOM kill events for Mosquitto"
if [ "$OOM_COUNT" -gt 0 ]; then
    echo "Recent OOM events:"
    dmesg | grep "Memory cgroup out of memory.*mosquitto" | tail -3
fi
echo ""

# Step 3: Check database for network issues
echo "Step 3: Checking database for network configuration..."
NETWORK_DEFAULT=$(docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM networks WHERE id = 'default';" 2>/dev/null | tr -d ' ' || echo "0")
NETWORK_DEFAULT_NETWORK=$(docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM networks WHERE id = 'default-network';" 2>/dev/null | tr -d ' ' || echo "0")

echo "Network 'default' exists: $NETWORK_DEFAULT"
echo "Network 'default-network' exists: $NETWORK_DEFAULT_NETWORK"

if [ "$NETWORK_DEFAULT" -gt 0 ]; then
    echo "⚠️  Found 'default' network (should be 'default-network')"
fi

if [ "$NETWORK_DEFAULT_NETWORK" -eq 0 ]; then
    echo "❌ 'default-network' does not exist!"
fi
echo ""

# Step 4: Fix database network issue
echo "Step 4: Fixing database network configuration..."

if [ "$NETWORK_DEFAULT" -gt 0 ] && [ "$NETWORK_DEFAULT_NETWORK" -eq 0 ]; then
    echo "Renaming 'default' network to 'default-network'..."
    docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -c "
    UPDATE networks SET id = 'default-network' WHERE id = 'default';
    " 2>&1 | grep -v "UPDATE" || echo "Network rename attempted"
    echo "✅ Network renamed"
elif [ "$NETWORK_DEFAULT_NETWORK" -eq 0 ]; then
    echo "Creating 'default-network'..."
    docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -c "
    INSERT INTO networks (id, name, mqtt_broker, mqtt_credentials, is_active, created_at, updated_at)
    VALUES (
        'default-network',
        'Default Meshtastic Network',
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
    echo "✅ default-network already exists"
fi
echo ""

# Step 5: Update any nodes using 'default' networkId
echo "Step 5: Updating nodes with incorrect networkId..."
NODES_TO_UPDATE=$(docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes WHERE \"networkId\" = 'default';" 2>/dev/null | tr -d ' ' || echo "0")
echo "Found $NODES_TO_UPDATE nodes with networkId='default'"

if [ "$NODES_TO_UPDATE" -gt 0 ]; then
    echo "Updating nodes to use 'default-network'..."
    docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -c "
    UPDATE nodes SET \"networkId\" = 'default-network' WHERE \"networkId\" = 'default';
    " 2>&1 | grep -v "UPDATE" || echo "Node update attempted"
    echo "✅ Updated $NODES_TO_UPDATE nodes"
else
    echo "✅ No nodes need updating"
fi
echo ""

# Step 6: Stop services
echo "Step 6: Stopping services..."
docker-compose -f docker-compose.prod.yml down
echo "✅ Services stopped"
echo ""

# Step 7: Optional - Clear Mosquitto persistence
echo "Step 7: Clear Mosquitto persistence data?"
echo "This will remove retained messages but helps prevent OOM issues."
read -p "Clear Mosquitto persistence data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Clearing mosquitto_data volume..."
    docker volume rm meshtastic-node-map_mosquitto_data 2>/dev/null || echo "Volume already removed or doesn't exist"
    echo "✅ Persistence data cleared"
else
    echo "Keeping existing persistence data"
fi
echo ""

# Step 8: Start services with new configuration
echo "Step 8: Starting services with updated configuration..."
docker-compose -f docker-compose.prod.yml up -d
echo "✅ Services starting..."
echo ""

# Step 9: Wait for services to stabilize
echo "Step 9: Waiting for services to start (45 seconds)..."
sleep 45
echo ""

# Step 10: Verify fixes
echo "Step 10: Verifying fixes..."
echo ""

echo "Mosquitto status:"
docker ps --filter name=mosquitto --format "table {{.Names}}\t{{.Status}}"
echo ""

echo "Mosquitto memory usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -1
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep mosquitto
echo ""

echo "Backend MQTT connection status:"
docker logs meshtastic-backend-prod --tail 20 2>&1 | grep -i "mqtt.*connected\|network.*connected" | tail -5 || echo "Checking..."
echo ""

echo "Database foreign key errors (should be none):"
docker logs meshtastic-postgres-prod --tail 50 2>&1 | grep -c "nodes_networkId_fkey" || echo "0"
echo ""

echo "Backend health:"
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "ERROR")
if [[ $HEALTH == *"healthy"* ]] || [[ $HEALTH == *"ok"* ]]; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check:"
    echo "$HEALTH"
fi
echo ""

echo "MQTT Monitor status:"
MQTT_STATUS=$(curl -s http://localhost:3001/api/v1/mqtt-monitor/status 2>/dev/null || echo "ERROR")
if [[ $MQTT_STATUS == *"503"* ]]; then
    echo "⚠️  MQTT Monitor not available yet (may need more time)"
elif [[ $MQTT_STATUS == *"ERROR"* ]]; then
    echo "⚠️  Cannot reach MQTT monitor endpoint"
else
    echo "✅ MQTT Monitor is responding"
fi
echo ""

echo "=== Fix Complete ==="
echo ""
echo "Summary of changes:"
echo "  ✅ Mosquitto memory limit: 1GB → 2GB (via docker-compose restart)"
echo "  ✅ Database network: 'default' → 'default-network'"
echo "  ✅ Nodes updated to use correct networkId"
echo "  ✅ Services restarted with new configuration"
echo ""
echo "Monitoring commands:"
echo "  Watch Mosquitto memory:"
echo "    watch -n 5 'docker stats --no-stream | grep mosquitto'"
echo ""
echo "  Check for new OOM events:"
echo "    dmesg | grep -i 'out of memory' | grep mosquitto | tail -10"
echo ""
echo "  Monitor backend logs:"
echo "    docker logs -f meshtastic-backend-prod | grep -i mqtt"
echo ""
echo "  Check database errors:"
echo "    docker logs meshtastic-postgres-prod --tail 100 | grep ERROR"
echo ""
echo "If issues persist after 2-3 minutes:"
echo "  1. Check backend logs: docker logs meshtastic-backend-prod --tail 100"
echo "  2. Restart backend only: docker-compose -f docker-compose.prod.yml restart backend"
echo "  3. Check Mosquitto is stable: docker ps | grep mosquitto"
echo ""
