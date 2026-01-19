#!/bin/bash

# Rebuild Frontend for Custom Domain
# Updates API URLs and rebuilds frontend container

set -e

DOMAIN=${1:-villagesmesh.com}

echo "=========================================="
echo "Rebuilding Frontend for Domain: $DOMAIN"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Load .env.prod if it exists
if [ -f ".env.prod" ]; then
    echo ""
    echo "Loading environment from .env.prod..."
    set -a
    source .env.prod
    set +a
fi

echo ""
echo "Step 1: Setting environment variables..."
export REACT_APP_API_URL="https://${DOMAIN}/api"
export REACT_APP_WS_URL="wss://${DOMAIN}/api"
export FRONTEND_URL="https://${DOMAIN}"

echo "API URL: $REACT_APP_API_URL"
echo "WebSocket URL: $REACT_APP_WS_URL"

echo ""
echo "Step 2: Stopping frontend container..."
docker compose -f docker-compose.prod.yml stop frontend

echo ""
echo "Step 3: Rebuilding frontend with new URLs..."
echo "This may take a few minutes..."
docker compose -f docker-compose.prod.yml build --no-cache \
  --build-arg REACT_APP_API_URL="$REACT_APP_API_URL" \
  --build-arg REACT_APP_WS_URL="$REACT_APP_WS_URL" \
  frontend

echo ""
echo "Step 4: Starting frontend..."
docker compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "Step 5: Waiting for frontend to start (30 seconds)..."
sleep 30

echo ""
echo "Step 6: Checking frontend health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✓ Frontend is healthy (HTTP $HEALTH_STATUS)"
else
    echo "⚠️  Frontend health check returned: HTTP $HEALTH_STATUS"
    echo "Checking logs..."
    docker compose -f docker-compose.prod.yml logs frontend --tail=20
fi

echo ""
echo "Step 7: Verifying API configuration..."
echo "Checking if frontend can reach backend..."
docker compose -f docker-compose.prod.yml exec -T frontend sh -c "curl -s http://backend:3001/health" || echo "Backend not reachable from frontend"

echo ""
echo "=========================================="
echo "Frontend Rebuild Complete!"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  API URL: $REACT_APP_API_URL"
echo "  WebSocket URL: $REACT_APP_WS_URL"
echo ""
echo "Next steps:"
echo "1. Open your browser to: https://$DOMAIN"
echo "2. Check browser console for any errors"
echo "3. Verify API calls are going to: $REACT_APP_API_URL"
echo ""
echo "If you still see localhost URLs:"
echo "  - Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "  - Check browser console for the actual API URL being used"
echo ""
