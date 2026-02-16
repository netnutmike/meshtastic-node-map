#!/bin/bash
set -e

echo "=== Mosquitto No-Logs Fix ==="
echo "Timestamp: $(date)"
echo ""

# Find the mosquitto container
MOSQUITTO_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep mosquitto | head -1)

if [ -z "$MOSQUITTO_CONTAINER" ]; then
    echo "ERROR: No mosquitto container found"
    exit 1
fi

echo "Working with container: $MOSQUITTO_CONTAINER"
echo ""

# Determine compose file
COMPOSE_FILE="docker-compose.yml"
if docker ps --format "{{.Names}}" | grep -q "prod"; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

echo "Using compose file: $COMPOSE_FILE"
echo ""

# Step 1: Check for OOM issues
echo "Step 1: Checking for OOM issues..."
OOM_COUNT=$(dmesg | grep -c "mosquitto" 2>/dev/null || echo "0")
if [ "$OOM_COUNT" -gt 0 ]; then
    echo "⚠ WARNING: Found $OOM_COUNT OOM-related kernel messages"
    echo "This indicates memory limit issues"
    
    MEMORY_LIMIT=$(docker inspect $MOSQUITTO_CONTAINER --format='{{.HostConfig.Memory}}')
    if [ "$MEMORY_LIMIT" != "0" ]; then
        MEMORY_GB=$(echo "scale=2; $MEMORY_LIMIT / 1073741824" | bc)
        echo "Current memory limit: ${MEMORY_GB}GB"
        echo "Recommendation: Increase to 2GB or higher"
    fi
else
    echo "✓ No OOM issues detected"
fi
echo ""

# Step 2: Stop the container
echo "Step 2: Stopping Mosquitto..."
docker-compose -f $COMPOSE_FILE stop mosquitto
sleep 3
echo ""

# Step 3: Check and fix log file permissions
echo "Step 3: Checking log directory..."
docker-compose -f $COMPOSE_FILE run --rm mosquitto sh -c "
    mkdir -p /mosquitto/log
    chmod 755 /mosquitto/log
    touch /mosquitto/log/mosquitto.log
    chmod 644 /mosquitto/log/mosquitto.log
    chown -R mosquitto:mosquitto /mosquitto/log
    ls -lah /mosquitto/log/
" 2>/dev/null || echo "Could not fix permissions (container might not support this)"
echo ""

# Step 4: Check disk space
echo "Step 4: Checking disk space..."
df -h . | tail -1
echo ""

# Step 5: Optionally clear old persistence data
echo "Step 5: Clear old persistence data?"
read -p "This can help if memory issues are caused by retained messages. Clear? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Backing up and clearing mosquitto data..."
    VOLUME_NAME=$(docker volume ls --format "{{.Name}}" | grep mosquitto_data | head -1)
    if [ -n "$VOLUME_NAME" ]; then
        echo "Found volume: $VOLUME_NAME"
        docker volume rm $VOLUME_NAME 2>/dev/null || echo "Volume in use or doesn't exist"
    fi
    echo "✓ Data cleared"
else
    echo "Keeping existing data"
fi
echo ""

# Step 6: Start with fresh logs
echo "Step 6: Starting Mosquitto..."
docker-compose -f $COMPOSE_FILE up -d mosquitto
echo ""

# Step 7: Wait and check
echo "Step 7: Waiting for startup (15 seconds)..."
sleep 15
echo ""

echo "Step 8: Checking status..."
docker ps --filter name=mosquitto --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

echo "Step 9: Checking new logs..."
docker logs $MOSQUITTO_CONTAINER --tail 20
echo ""

echo "Step 10: Checking log file..."
docker exec $MOSQUITTO_CONTAINER tail -10 /mosquitto/log/mosquitto.log 2>/dev/null || echo "Log file not accessible yet"
echo ""

echo "Step 11: Memory usage..."
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep mosquitto
echo ""

echo "=== Fix Complete ==="
echo ""
echo "Monitor logs with:"
echo "  docker logs -f $MOSQUITTO_CONTAINER"
echo ""
echo "Check log file:"
echo "  docker exec $MOSQUITTO_CONTAINER tail -f /mosquitto/log/mosquitto.log"
echo ""
echo "Watch memory:"
echo "  watch -n 5 'docker stats --no-stream | grep mosquitto'"
echo ""

# Step 12: Restart backend to reconnect
echo "Restarting backend to reconnect to MQTT..."
docker-compose -f $COMPOSE_FILE restart backend
echo ""
echo "✓ All services restarted"
