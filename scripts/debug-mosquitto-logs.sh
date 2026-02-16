#!/bin/bash
set -e

echo "=== Mosquitto Log Debugging ==="
echo "Timestamp: $(date)"
echo ""

# Find the mosquitto container name
MOSQUITTO_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep mosquitto | head -1)

if [ -z "$MOSQUITTO_CONTAINER" ]; then
    echo "ERROR: No mosquitto container found"
    exit 1
fi

echo "Container: $MOSQUITTO_CONTAINER"
echo ""

# Check container status
echo "=== Container Status ==="
docker ps -a --filter name=mosquitto --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

# Check for OOM kills
echo "=== Checking for OOM Kills ==="
OOM_COUNT=$(dmesg | grep -c "mosquitto" 2>/dev/null || echo "0")
echo "Found $OOM_COUNT mosquitto-related kernel messages"
if [ "$OOM_COUNT" -gt 0 ]; then
    echo ""
    echo "Recent OOM events:"
    dmesg | grep -i "mosquitto" | tail -10
fi
echo ""

# Check memory limit
echo "=== Memory Configuration ==="
MEMORY_LIMIT=$(docker inspect $MOSQUITTO_CONTAINER --format='{{.HostConfig.Memory}}')
if [ "$MEMORY_LIMIT" = "0" ]; then
    echo "Memory limit: UNLIMITED"
else
    MEMORY_GB=$(echo "scale=2; $MEMORY_LIMIT / 1073741824" | bc)
    echo "Memory limit: ${MEMORY_GB}GB"
fi
echo ""

# Check current memory usage
echo "=== Current Memory Usage ==="
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -1
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep mosquitto
echo ""

# Check log file status
echo "=== Log File Status ==="
docker exec $MOSQUITTO_CONTAINER ls -lah /mosquitto/log/ 2>/dev/null || echo "Cannot access log directory"
echo ""

# Check disk space
echo "=== Disk Space ==="
docker exec $MOSQUITTO_CONTAINER df -h /mosquitto/log/ 2>/dev/null || echo "Cannot check disk space"
echo ""

# Try to read last logs from file
echo "=== Last Log Entries (from file) ==="
docker exec $MOSQUITTO_CONTAINER tail -20 /mosquitto/log/mosquitto.log 2>/dev/null || echo "Cannot read log file"
echo ""

# Check docker logs
echo "=== Docker Container Logs (last 30 lines) ==="
docker logs $MOSQUITTO_CONTAINER --tail 30 2>&1
echo ""

# Check if process is running inside container
echo "=== Process Status Inside Container ==="
docker exec $MOSQUITTO_CONTAINER ps aux 2>/dev/null || echo "Cannot check processes"
echo ""

# Check mosquitto config
echo "=== Mosquitto Configuration Check ==="
docker exec $MOSQUITTO_CONTAINER cat /mosquitto/config/mosquitto.conf 2>/dev/null | grep -E "log_dest|persistence|max_" || echo "Cannot read config"
echo ""

echo "=== Diagnosis Complete ==="
echo ""
echo "Next steps based on findings:"
echo "  - If OOM kills found: Increase memory limit or reduce message queuing"
echo "  - If log file not writable: Fix permissions"
echo "  - If disk full: Clean up old data"
echo "  - If process not running: Check for startup errors"
echo ""
