#!/bin/bash
set -e

echo "=== Mosquitto Persistence Cleanup ==="
echo "Timestamp: $(date)"
echo ""

# Determine compose file
COMPOSE_FILE="docker-compose.yml"
if docker ps --format "{{.Names}}" | grep -q "prod"; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

echo "Using compose file: $COMPOSE_FILE"
echo ""

# Step 1: Check current state
echo "Step 1: Current Mosquitto status..."
docker ps -a --filter name=mosquitto --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

# Step 2: Check memory usage
echo "Step 2: Current memory usage..."
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -1
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep mosquitto || echo "Container not running"
echo ""

# Step 3: Check OOM events
echo "Step 3: Checking for OOM kills..."
OOM_COUNT=$(dmesg | grep -c "mosquitto" 2>/dev/null || echo "0")
echo "Found $OOM_COUNT mosquitto-related kernel messages"
if [ "$OOM_COUNT" -gt 0 ]; then
    echo "Most recent:"
    dmesg | grep -i "mosquitto" | tail -3
fi
echo ""

# Step 4: Stop services
echo "Step 4: Stopping services..."
docker-compose -f $COMPOSE_FILE stop mosquitto backend
sleep 3
echo "✓ Services stopped"
echo ""

# Step 5: Check persistence data size
echo "Step 5: Checking persistence data size..."
VOLUME_NAME=$(docker volume ls --format "{{.Name}}" | grep mosquitto_data | head -1)
if [ -n "$VOLUME_NAME" ]; then
    echo "Found volume: $VOLUME_NAME"
    
    # Try to inspect the volume size
    docker run --rm -v $VOLUME_NAME:/data alpine du -sh /data 2>/dev/null || echo "Could not check size"
    
    echo ""
    echo "⚠ WARNING: This will DELETE all retained messages and persistence data"
    echo "This includes:"
    echo "  - All queued messages from bridge connections"
    echo "  - All retained messages"
    echo "  - Client session data"
    echo ""
    read -p "Delete persistence data? (yes/no): " -r
    
    if [[ $REPLY == "yes" ]]; then
        echo ""
        echo "Removing volume: $VOLUME_NAME"
        docker volume rm $VOLUME_NAME 2>/dev/null && echo "✓ Volume removed" || echo "⚠ Could not remove volume (might not exist)"
    else
        echo "Keeping persistence data"
    fi
else
    echo "No mosquitto_data volume found"
fi
echo ""

# Step 6: Clear log files
echo "Step 6: Clearing old log files..."
LOG_VOLUME=$(docker volume ls --format "{{.Name}}" | grep mosquitto_log | head -1)
if [ -n "$LOG_VOLUME" ]; then
    echo "Found log volume: $LOG_VOLUME"
    docker run --rm -v $LOG_VOLUME:/logs alpine sh -c "rm -f /logs/*.log && echo 'Logs cleared'" 2>/dev/null || echo "Could not clear logs"
else
    echo "No mosquitto_log volume found"
fi
echo ""

# Step 7: Verify memory limit in compose file
echo "Step 7: Checking memory limit in $COMPOSE_FILE..."
MEMORY_LIMIT=$(grep -A 20 "mosquitto:" $COMPOSE_FILE | grep -E "mem_limit|memory:" | head -1 | awk '{print $2}')
echo "Current limit: $MEMORY_LIMIT"

if [[ "$MEMORY_LIMIT" =~ ^[0-9]+[mM]$ ]]; then
    LIMIT_MB=$(echo $MEMORY_LIMIT | sed 's/[mM]//')
    if [ "$LIMIT_MB" -lt 2000 ]; then
        echo "⚠ WARNING: Memory limit is less than 2GB"
        echo "Recommendation: Increase to at least 2GB"
        echo ""
        read -p "Update memory limit to 2GB? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Backup
            cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
            
            # Update memory limits
            sed -i.tmp 's/mem_limit: [0-9]*[mMgG]/mem_limit: 2g/g' "$COMPOSE_FILE"
            sed -i.tmp 's/memory: [0-9]*[mMgG]/memory: 2G/g' "$COMPOSE_FILE"
            rm -f "${COMPOSE_FILE}.tmp"
            
            echo "✓ Memory limit updated to 2GB"
        fi
    else
        echo "✓ Memory limit is adequate"
    fi
fi
echo ""

# Step 8: Start services
echo "Step 8: Starting services with clean state..."
docker-compose -f $COMPOSE_FILE up -d mosquitto
echo ""

echo "Waiting 15 seconds for Mosquitto to start..."
sleep 15
echo ""

# Step 9: Check status
echo "Step 9: Checking new status..."
docker ps --filter name=mosquitto --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

# Step 10: Check logs
echo "Step 10: Checking startup logs..."
MOSQUITTO_CONTAINER=$(docker ps --format "{{.Names}}" | grep mosquitto | head -1)
docker logs $MOSQUITTO_CONTAINER --tail 20
echo ""

# Step 11: Check memory
echo "Step 11: New memory usage..."
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep mosquitto
echo ""

# Step 12: Start backend
echo "Step 12: Starting backend..."
docker-compose -f $COMPOSE_FILE up -d backend
echo ""

echo "Waiting 10 seconds for backend to connect..."
sleep 10
echo ""

# Step 13: Verify backend connection
echo "Step 13: Checking backend MQTT connection..."
BACKEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep backend | head -1)
docker logs $BACKEND_CONTAINER --tail 20 | grep -i mqtt || echo "No MQTT logs yet"
echo ""

echo "=== Cleanup Complete ==="
echo ""
echo "What was done:"
echo "  ✓ Stopped services"
echo "  ✓ Cleared persistence data (if confirmed)"
echo "  ✓ Cleared log files"
echo "  ✓ Updated memory limit (if needed)"
echo "  ✓ Restarted with clean state"
echo ""
echo "Monitor with:"
echo "  watch -n 5 'docker stats --no-stream | grep mosquitto'"
echo ""
echo "Check for new OOM events:"
echo "  dmesg | grep -i mosquitto | tail -10"
echo ""
echo "View logs:"
echo "  docker logs -f $MOSQUITTO_CONTAINER"
echo ""
