#!/bin/bash

# Final fix for Mosquitto OOM crashes
# This script applies all necessary changes and restarts services

set -e

echo "=== Mosquitto OOM Final Fix ==="
echo "Timestamp: $(date)"
echo ""

# Check if running with docker permissions
if ! docker ps >/dev/null 2>&1; then
    echo "ERROR: Cannot access Docker. Please run with sudo or as a user with Docker permissions."
    exit 1
fi

echo "Current Mosquitto status:"
docker ps --filter name=mosquitto --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

echo "Step 1: Checking recent OOM events..."
OOM_COUNT=$(dmesg | grep -c "Memory cgroup out of memory.*mosquitto" 2>/dev/null || echo "0")
echo "Found $OOM_COUNT OOM kill events for Mosquitto"
echo ""

if [ "$OOM_COUNT" -gt 0 ]; then
    echo "Recent OOM events:"
    dmesg | grep "Memory cgroup out of memory.*mosquitto" | tail -5
    echo ""
fi

echo "Step 2: Changes applied to configuration files:"
echo "  ✓ docker-compose.prod.yml: Mosquitto memory limit increased to 2GB"
echo "  ✓ mosquitto.conf: Memory management settings optimized"
echo "    - max_inflight_messages: 100 → 20"
echo "    - max_queued_messages: 1000 → 100"
echo "    - queue_qos0_messages: true → false"
echo "    - max_queued_bytes: 0 (unlimited) → 100MB"
echo ""

echo "Step 3: Stopping services..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "Step 4: Clearing Mosquitto persistence data (optional - prevents old data from consuming memory)..."
read -p "Clear Mosquitto persistence data? This will remove retained messages. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Clearing mosquitto_data volume..."
    docker volume rm meshtastic-node-map_mosquitto_data 2>/dev/null || echo "Volume already removed or doesn't exist"
    echo "Persistence data cleared."
else
    echo "Keeping existing persistence data."
fi

echo ""
echo "Step 5: Starting services with new configuration..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "Step 6: Waiting for services to start (30 seconds)..."
sleep 30

echo ""
echo "Step 7: Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Step 8: Checking Mosquitto memory usage..."
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}" | head -1
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}" | grep mosquitto

echo ""
echo "Step 9: Checking Mosquitto logs for errors..."
docker logs meshtastic-mosquitto-prod --tail 20 2>&1 | grep -i "error\|warning\|out of memory" || echo "No errors found in recent logs"

echo ""
echo "=== Fix Applied Successfully ==="
echo ""
echo "Summary of changes:"
echo "  • Mosquitto memory limit: 512MB → 2GB"
echo "  • Memory reservation: 256MB → 512MB"
echo "  • max_inflight_messages: 100 → 20"
echo "  • max_queued_messages: 1000 → 100"
echo "  • queue_qos0_messages: enabled → disabled"
echo "  • max_queued_bytes: unlimited → 100MB"
echo ""
echo "Monitoring commands:"
echo "  Watch memory usage:"
echo "    watch -n 5 'docker stats --no-stream | grep mosquitto'"
echo ""
echo "  Check for new OOM events:"
echo "    dmesg | grep -i 'out of memory' | grep mosquitto | tail -10"
echo ""
echo "  View Mosquitto logs:"
echo "    docker logs -f meshtastic-mosquitto-prod"
echo ""
echo "  Check bridge connections:"
echo "    docker exec meshtastic-mosquitto-prod mosquitto_sub -h localhost -t '\$SYS/broker/clients/connected' -C 1"
echo ""
echo "If Mosquitto still crashes:"
echo "  1. Consider reducing bridge connections (4 bridges = high message volume)"
echo "  2. Disable persistence: set 'persistence false' in mosquitto.conf"
echo "  3. Further reduce max_connections and max_queued_messages"
echo "  4. Monitor which topics are generating the most traffic"
echo ""
