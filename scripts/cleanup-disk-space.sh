#!/bin/bash

# Cleanup Disk Space Script
# Cleans up Docker, logs, and temporary files to free up disk space

set -e

echo "=========================================="
echo "Disk Space Cleanup"
echo "=========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo "Current disk usage:"
df -h / | tail -1
echo ""

echo "Docker disk usage before cleanup:"
docker system df
echo ""

echo "Cleaning up Docker..."
echo "  - Removing unused containers, networks, images"
echo "  - Removing build cache"
docker system prune -f

echo ""
echo "Truncating large log files..."
if [ -f logs/mosquitto/mosquitto.log ]; then
    LOG_SIZE=$(du -sh logs/mosquitto/mosquitto.log | cut -f1)
    echo "  - Mosquitto log: $LOG_SIZE"
    truncate -s 0 logs/mosquitto/mosquitto.log
    echo "    ✓ Cleared"
fi

if [ -d logs/backend ]; then
    find logs/backend -name "*.log" -type f -size +10M -exec sh -c 'echo "  - $(basename {}): $(du -sh {} | cut -f1)"; truncate -s 0 {}; echo "    ✓ Cleared"' \;
fi

echo ""
echo "Docker disk usage after cleanup:"
docker system df

echo ""
echo "Current disk usage:"
df -h / | tail -1

echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
echo "If you continue to see 'ENOSPC' errors:"
echo "  1. Restart your IDE/editor"
echo "  2. Clear node_modules and reinstall: rm -rf frontend/node_modules && cd frontend && npm install"
echo "  3. Check Docker Desktop settings and increase disk space allocation"
echo ""
