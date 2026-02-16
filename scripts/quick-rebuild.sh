#!/bin/bash
set -e

echo "=== Quick Rebuild and Restart ==="
echo "Timestamp: $(date)"
echo ""

COMPOSE_FILE="docker-compose.prod.yml"

# Pull latest code
echo "1. Pulling latest code..."
git pull
echo ""

# Stop services
echo "2. Stopping services..."
docker-compose -f $COMPOSE_FILE down
echo ""

# Rebuild images
echo "3. Rebuilding images (this takes a few minutes)..."
docker-compose -f $COMPOSE_FILE build --no-cache
echo ""

# Start services
echo "4. Starting services..."
docker-compose -f $COMPOSE_FILE up -d
echo ""

# Wait for startup
echo "5. Waiting 30 seconds for services to start..."
sleep 30
echo ""

# Show status
echo "6. Service status:"
docker-compose -f $COMPOSE_FILE ps
echo ""

echo "✓ Rebuild complete!"
echo ""
echo "View logs: docker-compose -f $COMPOSE_FILE logs -f"
