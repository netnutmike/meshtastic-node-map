#!/bin/bash
# Continuous health monitoring script
# Run this in the background to monitor service health

INTERVAL=${1:-60}  # Check every 60 seconds by default
LOG_FILE="./logs/health-monitor.log"

mkdir -p ./logs

echo "Starting health monitor (checking every ${INTERVAL} seconds)..."
echo "Logs: ${LOG_FILE}"
echo "Press Ctrl+C to stop"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check container health
    UNHEALTHY=$(docker-compose ps | grep -c "unhealthy" || true)
    EXITED=$(docker-compose ps | grep -c "Exit" || true)
    
    # Check resource usage
    CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" | sed 's/%//' | awk '{s+=$1} END {print s}')
    MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" | sed 's/%//' | awk '{s+=$1} END {print s}')
    
    # Check disk space
    DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    
    # Check database connections
    DB_CONNECTIONS=$(docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "ERROR")
    
    # Log status
    STATUS="OK"
    ALERTS=""
    
    if [ "$UNHEALTHY" -gt 0 ]; then
        STATUS="WARNING"
        ALERTS="${ALERTS}Unhealthy containers: ${UNHEALTHY}. "
    fi
    
    if [ "$EXITED" -gt 0 ]; then
        STATUS="ERROR"
        ALERTS="${ALERTS}Exited containers: ${EXITED}. "
    fi
    
    if [ $(echo "$DISK_USAGE > 90" | bc) -eq 1 ]; then
        STATUS="WARNING"
        ALERTS="${ALERTS}Disk usage high: ${DISK_USAGE}%. "
    fi
    
    if [ "$DB_CONNECTIONS" != "ERROR" ] && [ "$DB_CONNECTIONS" -gt 50 ]; then
        STATUS="WARNING"
        ALERTS="${ALERTS}High DB connections: ${DB_CONNECTIONS}. "
    fi
    
    # Log entry
    LOG_ENTRY="${TIMESTAMP} | ${STATUS} | CPU: ${CPU_USAGE}% | MEM: ${MEM_USAGE}% | DISK: ${DISK_USAGE}% | DB_CONN: ${DB_CONNECTIONS}"
    
    if [ -n "$ALERTS" ]; then
        LOG_ENTRY="${LOG_ENTRY} | ALERTS: ${ALERTS}"
    fi
    
    echo "${LOG_ENTRY}" | tee -a "${LOG_FILE}"
    
    # If status is ERROR, run debug script
    if [ "$STATUS" = "ERROR" ]; then
        echo "ERROR detected! Running debug script..."
        ./scripts/debug-lockup.sh
    fi
    
    sleep "${INTERVAL}"
done
