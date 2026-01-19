#!/bin/bash

# Fix Frontend URLs for Production Domain
# Rebuilds frontend with correct API URLs

set -e

DOMAIN=${1:-villagesmesh.com}
USE_HTTPS=${2:-no}

if [ "$USE_HTTPS" = "yes" ] || [ "$USE_HTTPS" = "https" ]; then
    PROTOCOL="https"
    WS_PROTOCOL="wss"
else
    PROTOCOL="http"
    WS_PROTOCOL="ws"
fi

# Use relative URLs for better flexibility (works with any domain/protocol)
API_URL="/api/v1"
WS_URL="${WS_PROTOCOL}://${DOMAIN}"

echo "=========================================="
echo "Fixing Frontend URLs"
echo "=========================================="
echo ""
echo "Domain: $DOMAIN"
echo "Protocol: $PROTOCOL"
echo "API URL: $API_URL (relative)"
echo "WebSocket URL: $WS_URL"
echo ""

echo "Step 1: Stopping frontend..."
docker compose -f docker-compose.prod.yml stop frontend

echo ""
echo "Step 2: Rebuilding frontend with correct URLs..."
REACT_APP_API_URL="$API_URL" \
REACT_APP_WS_URL="$WS_URL" \
docker compose -f docker-compose.prod.yml build --no-cache frontend

echo ""
echo "Step 3: Starting frontend..."
docker compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "Step 4: Waiting for frontend to start (20 seconds)..."
sleep 20

echo ""
echo "Step 5: Checking frontend health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✓ Frontend is healthy (HTTP $HEALTH_STATUS)"
else
    echo "⚠️  Frontend health check returned: HTTP $HEALTH_STATUS"
    echo "   Checking logs..."
    docker compose -f docker-compose.prod.yml logs --tail=20 frontend
fi

echo ""
echo "Step 6: Checking backend API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1 || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "✓ Backend API is responding (HTTP $API_STATUS)"
else
    echo "⚠️  Backend API check returned: HTTP $API_STATUS"
fi

echo ""
echo "=========================================="
echo "Frontend URLs Fixed!"
echo "=========================================="
echo ""
echo "The frontend is now configured to use:"
echo "  API URL: $API_URL (relative path)"
echo "  WebSocket URL: $WS_URL"
echo ""
echo "Access your application at:"
echo "  ${PROTOCOL}://${DOMAIN}"
echo ""
echo "IMPORTANT: Clear your browser cache!"
echo "  - Chrome/Firefox: Ctrl+Shift+R (Cmd+Shift+R on Mac)"
echo "  - Or open in incognito/private mode"
echo ""
echo "If you're using HTTPS, run:"
echo "  ./scripts/fix-frontend-urls.sh $DOMAIN https"
echo ""
