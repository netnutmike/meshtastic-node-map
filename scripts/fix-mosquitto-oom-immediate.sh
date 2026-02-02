#!/bin/bash

# Immediate fix for Mosquitto OOM crashes
# This script increases memory limits and adds memory management

set -e

echo "=== Mosquitto OOM Immediate Fix ==="
echo "Timestamp: $(date)"
echo ""

# Check if running as root or with docker permissions
if ! docker ps >/dev/null 2>&1; then
    echo "ERROR: Cannot access Docker. Please run with sudo or as a user with Docker permissions."
    exit 1
fi

echo "Step 1: Stopping services..."
docker-compose down

echo ""
echo "Step 2: Backing up docker-compose.yml..."
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)

echo ""
echo "Step 3: Updating Mosquitto memory limit in docker-compose.yml..."
# Increase Mosquitto memory from 1GB to 2GB
sed -i.bak 's/mem_limit: 1g  # Mosquitto/mem_limit: 2g  # Mosquitto (increased from 1g)/' docker-compose.yml

echo ""
echo "Step 4: Adding Mosquitto memory management settings..."
# Check if mosquitto.conf has memory management settings
if ! grep -q "max_inflight_messages" config/mosquitto/mosquitto.conf 2>/dev/null; then
    echo "Adding memory management settings to mosquitto.conf..."
    cat >> config/mosquitto/mosquitto.conf << 'EOF'

# Memory Management Settings (added to prevent OOM)
max_inflight_messages 20
max_queued_messages 100
message_size_limit 268435456
queue_qos0_messages false
max_connections 100
EOF
    echo "Memory management settings added."
else
    echo "Memory management settings already present."
fi

echo ""
echo "Step 5: Checking for persistence issues..."
# Check if persistence is causing memory bloat
if grep -q "^persistence true" config/mosquitto/mosquitto.conf 2>/dev/null; then
    echo "WARNING: Persistence is enabled. This can cause memory issues."
    echo "Consider disabling persistence if not needed:"
    echo "  sed -i 's/^persistence true/persistence false/' config/mosquitto/mosquitto.conf"
fi

echo ""
echo "Step 6: Starting services..."
docker-compose up -d

echo ""
echo "Step 7: Waiting for services to start..."
sleep 10

echo ""
echo "Step 8: Checking service status..."
docker-compose ps

echo ""
echo "Step 9: Checking Mosquitto memory usage..."
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep mosquitto || echo "Mosquitto not running yet"

echo ""
echo "=== Fix Applied Successfully ==="
echo ""
echo "Mosquitto memory limit increased from 1GB to 2GB"
echo "Memory management settings added to mosquitto.conf"
echo ""
echo "Monitor Mosquitto with:"
echo "  docker stats meshtastic-mosquitto-prod"
echo ""
echo "Check for OOM events with:"
echo "  dmesg | grep -i 'out of memory' | tail -20"
echo ""
echo "If issues persist, consider:"
echo "  1. Disabling persistence: persistence false"
echo "  2. Reducing max_connections further"
echo "  3. Investigating MQTT message volume"
echo ""
