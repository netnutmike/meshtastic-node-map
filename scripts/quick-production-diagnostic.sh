#!/bin/bash

# Quick Production Diagnostic
# Run this first to see all issues before applying fixes

echo "=== Quick Production Diagnostic ==="
echo "Timestamp: $(date)"
echo ""

echo "1. Mosquitto Memory Limit:"
CURRENT_LIMIT=$(docker inspect meshtastic-mosquitto-prod --format='{{.HostConfig.Memory}}' 2>/dev/null || echo "0")
CURRENT_LIMIT_MB=$((CURRENT_LIMIT / 1024 / 1024))
echo "   Current: ${CURRENT_LIMIT_MB}MB"
echo "   Expected: 2048MB (2GB)"
if [ "$CURRENT_LIMIT_MB" -lt 2048 ]; then
    echo "   ❌ ISSUE: Using old memory limit"
else
    echo "   ✅ OK"
fi
echo ""

echo "2. Mosquitto Status:"
docker ps --filter name=mosquitto --format "   Status: {{.Status}}"
docker stats --no-stream --format "   Memory: {{.MemUsage}} ({{.MemPerc}})" | grep mosquitto
echo ""

echo "3. OOM Events:"
OOM_COUNT=$(dmesg | grep -c "Memory cgroup out of memory.*mosquitto" 2>/dev/null || echo "0")
echo "   Total OOM kills: $OOM_COUNT"
if [ "$OOM_COUNT" -gt 0 ]; then
    echo "   ❌ ISSUE: Mosquitto has been killed $OOM_COUNT times"
    echo "   Last OOM event:"
    dmesg | grep "Memory cgroup out of memory.*mosquitto" | tail -1 | sed 's/^/   /'
else
    echo "   ✅ OK"
fi
echo ""

echo "4. Database Networks:"
echo "   Checking for 'default' network:"
NETWORK_DEFAULT=$(docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -t -c "SELECT id, name FROM networks WHERE id = 'default';" 2>/dev/null || echo "ERROR")
if [[ $NETWORK_DEFAULT == *"default"* ]]; then
    echo "   ❌ ISSUE: Found 'default' network (should be 'default-network')"
    echo "   $NETWORK_DEFAULT" | sed 's/^/   /'
else
    echo "   ✅ OK: No 'default' network found"
fi

echo ""
echo "   Checking for 'default-network':"
NETWORK_DEFAULT_NETWORK=$(docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -t -c "SELECT id, name FROM networks WHERE id = 'default-network';" 2>/dev/null || echo "ERROR")
if [[ $NETWORK_DEFAULT_NETWORK == *"default-network"* ]]; then
    echo "   ✅ OK: 'default-network' exists"
    echo "   $NETWORK_DEFAULT_NETWORK" | sed 's/^/   /'
else
    echo "   ❌ ISSUE: 'default-network' does not exist"
fi
echo ""

echo "5. Nodes with Wrong NetworkId:"
NODES_COUNT=$(docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes WHERE \"networkId\" = 'default';" 2>/dev/null | tr -d ' ' || echo "0")
echo "   Nodes with networkId='default': $NODES_COUNT"
if [ "$NODES_COUNT" -gt 0 ]; then
    echo "   ❌ ISSUE: $NODES_COUNT nodes need networkId updated"
else
    echo "   ✅ OK"
fi
echo ""

echo "6. Recent Database Foreign Key Errors:"
FK_ERRORS=$(docker logs meshtastic-postgres-prod --tail 100 2>&1 | grep -c "nodes_networkId_fkey" || echo "0")
echo "   Foreign key errors in last 100 log lines: $FK_ERRORS"
if [ "$FK_ERRORS" -gt 0 ]; then
    echo "   ❌ ISSUE: Database foreign key constraint violations"
    echo "   Sample error:"
    docker logs meshtastic-postgres-prod --tail 100 2>&1 | grep "nodes_networkId_fkey" | head -1 | sed 's/^/   /'
else
    echo "   ✅ OK"
fi
echo ""

echo "7. Backend MQTT Connection:"
MQTT_ERRORS=$(docker logs meshtastic-backend-prod --tail 50 2>&1 | grep -c "ECONNREFUSED.*1883" || echo "0")
echo "   MQTT connection errors in last 50 log lines: $MQTT_ERRORS"
if [ "$MQTT_ERRORS" -gt 0 ]; then
    echo "   ❌ ISSUE: Backend cannot connect to Mosquitto"
else
    echo "   ✅ OK"
fi
echo ""

echo "8. Backend Health:"
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "ERROR")
if [[ $HEALTH == *"healthy"* ]] || [[ $HEALTH == *"ok"* ]]; then
    echo "   ✅ OK: Backend is healthy"
else
    echo "   ⚠️  Backend health check failed or not responding"
fi
echo ""

echo "=== SUMMARY ==="
echo ""
if [ "$CURRENT_LIMIT_MB" -lt 2048 ] || [ "$OOM_COUNT" -gt 0 ]; then
    echo "🔴 CRITICAL: Mosquitto OOM issue"
    echo "   Action: Run ./scripts/fix-production-issues.sh"
fi

if [[ $NETWORK_DEFAULT == *"default"* ]] || [[ $NETWORK_DEFAULT_NETWORK != *"default-network"* ]] || [ "$NODES_COUNT" -gt 0 ]; then
    echo "🔴 CRITICAL: Database network configuration issue"
    echo "   Action: Run ./scripts/fix-production-issues.sh"
fi

if [ "$FK_ERRORS" -gt 0 ] || [ "$MQTT_ERRORS" -gt 0 ]; then
    echo "🟡 WARNING: Connection and database errors"
    echo "   Action: Run ./scripts/fix-production-issues.sh"
fi

echo ""
echo "To fix all issues, run:"
echo "  ./scripts/fix-production-issues.sh"
echo ""
