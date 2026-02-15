#!/bin/bash

# Diagnose MQTT connection issues
# This script checks all aspects of MQTT connectivity

set -e

echo "=== MQTT Connection Diagnostic ==="
echo "Timestamp: $(date)"
echo ""

# Check if running with docker permissions
if ! docker ps >/dev/null 2>&1; then
    echo "ERROR: Cannot access Docker. Please run with sudo or as a user with Docker permissions."
    exit 1
fi

echo "Step 1: Checking Mosquitto container status..."
MOSQUITTO_STATUS=$(docker ps --filter name=mosquitto --format "{{.Status}}")
echo "Mosquitto status: $MOSQUITTO_STATUS"

if [[ $MOSQUITTO_STATUS == *"second"* ]] || [[ $MOSQUITTO_STATUS == *"minute"* ]]; then
    echo "⚠️  WARNING: Mosquitto recently restarted!"
fi
echo ""

echo "Step 2: Checking Mosquitto memory usage..."
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}" | head -1
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}" | grep mosquitto
echo ""

echo "Step 3: Checking for recent OOM events..."
OOM_COUNT=$(dmesg | grep -c "Memory cgroup out of memory.*mosquitto" 2>/dev/null || echo "0")
if [ "$OOM_COUNT" -gt 0 ]; then
    echo "❌ Found $OOM_COUNT OOM kill events!"
    echo "Recent OOM events:"
    dmesg | grep "Memory cgroup out of memory.*mosquitto" | tail -3
    echo ""
    echo "ACTION REQUIRED: Run ./scripts/fix-mosquitto-oom-final.sh"
else
    echo "✅ No OOM events found"
fi
echo ""

echo "Step 4: Testing Mosquitto connectivity from host..."
timeout 5 mosquitto_pub -h localhost -p 1883 -t test/connection -m "test" 2>&1 && echo "✅ Can publish to Mosquitto" || echo "❌ Cannot publish to Mosquitto"
echo ""

echo "Step 5: Testing Mosquitto connectivity from backend container..."
docker exec meshtastic-backend-prod sh -c "nc -zv mosquitto 1883" 2>&1 | grep -q "open" && echo "✅ Backend can reach Mosquitto" || echo "❌ Backend cannot reach Mosquitto"
echo ""

echo "Step 6: Checking Mosquitto logs for errors..."
echo "Last 20 lines of Mosquitto logs:"
docker logs meshtastic-mosquitto-prod --tail 20 2>&1 | grep -v "chown: /mosquitto/config" || echo "No recent logs"
echo ""

echo "Step 7: Checking backend MQTT connection logs..."
echo "Recent backend MQTT connection events:"
docker logs meshtastic-backend-prod --tail 100 2>&1 | grep -i "mqtt\|network.*connected\|network.*disconnected" | tail -10 || echo "No MQTT connection logs found"
echo ""

echo "Step 8: Checking active MQTT connections..."
docker exec meshtastic-mosquitto-prod sh -c "mosquitto_sub -h localhost -t '\$SYS/broker/clients/connected' -C 1 -W 2" 2>/dev/null || echo "Cannot query Mosquitto system topics"
echo ""

echo "Step 9: Checking Mosquitto bridge connections..."
echo "Bridge connection status:"
docker exec meshtastic-mosquitto-prod sh -c "mosquitto_sub -h localhost -t '\$SYS/broker/connection/#' -C 10 -W 2" 2>/dev/null || echo "Cannot query bridge status"
echo ""

echo "Step 10: Checking backend health endpoint..."
BACKEND_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "ERROR")
if [[ $BACKEND_HEALTH == *"healthy"* ]] || [[ $BACKEND_HEALTH == *"ok"* ]]; then
    echo "✅ Backend is healthy"
    echo "$BACKEND_HEALTH"
else
    echo "❌ Backend health check failed"
    echo "$BACKEND_HEALTH"
fi
echo ""

echo "Step 11: Checking MQTT monitor endpoint..."
MQTT_MONITOR=$(curl -s http://localhost:3001/api/v1/mqtt-monitor/status 2>/dev/null || echo "ERROR")
if [[ $MQTT_MONITOR == *"503"* ]] || [[ $MQTT_MONITOR == *"not available"* ]]; then
    echo "❌ MQTT Monitor service not available (503 error)"
    echo "$MQTT_MONITOR"
elif [[ $MQTT_MONITOR == *"ERROR"* ]]; then
    echo "❌ Cannot reach MQTT monitor endpoint"
else
    echo "✅ MQTT Monitor is responding"
    echo "$MQTT_MONITOR" | head -5
fi
echo ""

echo "Step 12: Checking database for default-network..."
NETWORK_CHECK=$(docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -t -c "SELECT id, name FROM networks WHERE id = 'default-network';" 2>/dev/null || echo "ERROR")
if [[ $NETWORK_CHECK == *"default-network"* ]]; then
    echo "✅ default-network exists in database"
    echo "$NETWORK_CHECK"
else
    echo "❌ default-network NOT found in database"
    echo "This may cause connection issues"
fi
echo ""

echo "=== Diagnostic Summary ==="
echo ""

# Determine primary issue
if [ "$OOM_COUNT" -gt 0 ]; then
    echo "🔴 PRIMARY ISSUE: Mosquitto OOM crashes"
    echo "   Solution: Run ./scripts/fix-mosquitto-oom-final.sh"
elif [[ $MOSQUITTO_STATUS == *"second"* ]] || [[ $MOSQUITTO_STATUS == *"minute"* ]]; then
    echo "🟡 PRIMARY ISSUE: Mosquitto recently restarted"
    echo "   This may cause temporary connection issues"
    echo "   Wait 30 seconds and check again"
elif [[ $MQTT_MONITOR == *"503"* ]]; then
    echo "🟡 PRIMARY ISSUE: MQTT Monitor service not initialized"
    echo "   This may be due to backend startup issues"
    echo "   Solution: Restart backend container"
    echo "   docker-compose -f docker-compose.prod.yml restart backend"
elif [[ $NETWORK_CHECK != *"default-network"* ]]; then
    echo "🟡 PRIMARY ISSUE: default-network missing from database"
    echo "   Solution: Add default network to database"
else
    echo "✅ No obvious issues detected"
    echo "   If problems persist, check:"
    echo "   - Backend logs: docker logs -f meshtastic-backend-prod"
    echo "   - Mosquitto logs: docker logs -f meshtastic-mosquitto-prod"
    echo "   - Network connectivity between containers"
fi

echo ""
echo "=== End of Diagnostic ==="
