#!/bin/bash
# Debug script for when services lock up
# Run this BEFORE restarting services to capture diagnostic information

set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEBUG_DIR="./debug-logs"
DEBUG_FILE="${DEBUG_DIR}/lockup-${TIMESTAMP}.log"

mkdir -p "${DEBUG_DIR}"

echo "=== Service Lockup Debug Report ===" | tee "${DEBUG_FILE}"
echo "Timestamp: $(date)" | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

# Container Status
echo "=== Container Status ===" | tee -a "${DEBUG_FILE}"
docker-compose ps | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

# Resource Usage
echo "=== Docker Resource Usage ===" | tee -a "${DEBUG_FILE}"
docker stats --no-stream | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

# System Resources
echo "=== System Disk Space ===" | tee -a "${DEBUG_FILE}"
df -h | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== System Memory ===" | tee -a "${DEBUG_FILE}"
free -h | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== Docker System Info ===" | tee -a "${DEBUG_FILE}"
docker system df | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

# Check for OOM kills
echo "=== Recent OOM Events ===" | tee -a "${DEBUG_FILE}"
dmesg | grep -i "out of memory" | tail -20 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

# Container Logs
echo "=== Backend Logs (last 100 lines) ===" | tee -a "${DEBUG_FILE}"
docker-compose logs backend --tail=100 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== Mosquitto Logs (last 100 lines) ===" | tee -a "${DEBUG_FILE}"
docker-compose logs mosquitto --tail=100 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== Postgres Logs (last 100 lines) ===" | tee -a "${DEBUG_FILE}"
docker-compose logs postgres --tail=100 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== Redis Logs (last 50 lines) ===" | tee -a "${DEBUG_FILE}"
docker-compose logs redis --tail=50 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== Frontend Logs (last 50 lines) ===" | tee -a "${DEBUG_FILE}"
docker-compose logs frontend --tail=50 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

# Database Diagnostics
echo "=== Database Connection Count ===" | tee -a "${DEBUG_FILE}"
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*) as active_connections FROM pg_stat_activity;" 2>&1 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== Long Running Queries ===" | tee -a "${DEBUG_FILE}"
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT pid, now() - query_start as duration, state, query FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%' ORDER BY duration DESC LIMIT 10;" 2>&1 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== Database Locks ===" | tee -a "${DEBUG_FILE}"
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT pid, locktype, relation::regclass, mode, granted FROM pg_locks WHERE NOT granted;" 2>&1 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

# MQTT Diagnostics
echo "=== MQTT Process Status ===" | tee -a "${DEBUG_FILE}"
docker-compose exec -T mosquitto sh -c "ps aux | grep mosquitto" 2>&1 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== MQTT Port Status ===" | tee -a "${DEBUG_FILE}"
docker-compose exec -T mosquitto sh -c "netstat -tlnp 2>/dev/null | grep 1883 || ss -tlnp | grep 1883" 2>&1 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

# Network Connectivity
echo "=== Network Connectivity Tests ===" | tee -a "${DEBUG_FILE}"
echo "Backend -> Postgres:" | tee -a "${DEBUG_FILE}"
docker-compose exec -T backend sh -c "nc -zv postgres 5432" 2>&1 | tee -a "${DEBUG_FILE}"
echo "Backend -> Redis:" | tee -a "${DEBUG_FILE}"
docker-compose exec -T backend sh -c "nc -zv redis 6379" 2>&1 | tee -a "${DEBUG_FILE}"
echo "Backend -> Mosquitto:" | tee -a "${DEBUG_FILE}"
docker-compose exec -T backend sh -c "nc -zv mosquitto 1883" 2>&1 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

# Check for errors in logs
echo "=== Recent Errors (all services) ===" | tee -a "${DEBUG_FILE}"
docker-compose logs --tail=500 | grep -i "error\|fatal\|exception\|panic" | tail -50 | tee -a "${DEBUG_FILE}"
echo "" | tee -a "${DEBUG_FILE}"

echo "=== Debug report saved to: ${DEBUG_FILE} ===" | tee -a "${DEBUG_FILE}"
echo ""
echo "Next steps:"
echo "1. Review the debug file: cat ${DEBUG_FILE}"
echo "2. If needed, restart services: docker-compose restart"
echo "3. Or full restart: docker-compose down && docker-compose up -d"
