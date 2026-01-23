#!/bin/bash
set -e

echo "=== Fixing Mosquitto OOM Crash Loop ==="
echo "Timestamp: $(date)"

# Step 1: Fix the missing network in database
echo ""
echo "Step 1: Fixing database - ensuring default network exists..."
docker exec meshtastic-postgres psql -U meshtastic -d meshtastic_mapper -c "
INSERT INTO networks (id, name, description, \"createdAt\", \"updatedAt\")
VALUES ('default-network', 'Default Meshtastic Network', 'Default network for MQTT messages', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
"

echo "✓ Database network record ensured"

# Step 2: Increase Mosquitto memory limit
echo ""
echo "Step 2: Increasing Mosquitto memory limit..."
echo "Current limit: 512MB (causing OOM crashes)"
echo "New limit: 1GB"

# Determine which compose file is in use
COMPOSE_FILE=""
if docker ps --format "{{.Names}}" | grep -q "prod"; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "ERROR: $COMPOSE_FILE not found"
    exit 1
fi

echo "Using compose file: $COMPOSE_FILE"

# Backup the file
cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

# Update mosquitto memory limit (handle both 512m and 512M)
sed -i.tmp 's/mem_limit: 512[mM]/mem_limit: 1g/g' "$COMPOSE_FILE"
sed -i.tmp 's/memory: 512[mM]/memory: 1G/g' "$COMPOSE_FILE"
rm -f "${COMPOSE_FILE}.tmp"

echo "✓ Memory limit updated in $COMPOSE_FILE"

# Step 3: Add memory limit to mosquitto config to prevent unbounded growth
echo ""
echo "Step 3: Adding Mosquitto memory management settings..."

# Check which config file exists
MOSQUITTO_CONF=""
if [ -f "config/mosquitto/mosquitto.prod.conf" ]; then
    MOSQUITTO_CONF="config/mosquitto/mosquitto.prod.conf"
elif [ -f "config/mosquitto/mosquitto.conf" ]; then
    MOSQUITTO_CONF="config/mosquitto/mosquitto.conf"
fi

if [ -n "$MOSQUITTO_CONF" ]; then
    # Add memory management if not already present
    if ! grep -q "max_queued_messages" "$MOSQUITTO_CONF"; then
        cat >> "$MOSQUITTO_CONF" << 'EOF'

# Memory management settings
max_queued_messages 1000
max_inflight_messages 20
max_queued_bytes 10485760
message_size_limit 1048576
EOF
        echo "✓ Added memory management settings to $MOSQUITTO_CONF"
    else
        echo "✓ Memory management settings already present in $MOSQUITTO_CONF"
    fi
else
    echo "⚠ No mosquitto config file found, skipping memory management settings"
fi

# Step 4: Restart services in correct order
echo ""
echo "Step 4: Restarting services..."

echo "Stopping mosquitto..."
docker-compose -f "$COMPOSE_FILE" stop mosquitto

echo "Waiting 5 seconds..."
sleep 5

echo "Starting mosquitto with new limits..."
docker-compose -f "$COMPOSE_FILE" up -d mosquitto

echo "Waiting for mosquitto to be ready..."
sleep 10

echo "Restarting backend to reconnect..."
docker-compose -f "$COMPOSE_FILE" restart backend

echo ""
echo "=== Fix Applied ==="
echo ""
echo "Monitoring for 30 seconds..."
sleep 30

echo ""
echo "=== Current Status ==="
docker-compose -f "$COMPOSE_FILE" ps
echo ""
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "=== Checking for OOM events ==="
dmesg | grep -i "mosquitto" | tail -5 || echo "No recent OOM events"

echo ""
echo "=== Backend MQTT Connection Status ==="
BACKEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep backend)
docker logs "$BACKEND_CONTAINER" --tail 20 | grep -i mqtt || echo "No recent MQTT logs"

echo ""
echo "✓ Fix complete!"
echo ""
echo "What was fixed:"
echo "1. Added missing 'default-network' record to database"
echo "2. Increased Mosquitto memory limit from 512MB to 1GB"
echo "3. Added Mosquitto memory management settings to prevent unbounded growth"
echo "4. Restarted services in correct order"
echo ""
echo "Monitor with: docker stats"
echo "Check logs: docker logs meshtastic-mosquitto-prod -f"
