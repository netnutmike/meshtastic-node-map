#!/bin/bash

# Fix WebSocket Connection - Rebuild Frontend with Correct WS URL
# This fixes the "Invalid namespace" error

set -e

echo "=========================================="
echo "Fixing WebSocket Connection"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "Error: docker-compose.prod.yml not found. Please run from project root."
    exit 1
fi

echo "The WebSocket URL should be: ws://villagesmesh.com"
echo "NOT: ws://villagesmesh.com/api"
echo ""

echo "Step 1: Verifying .env.prod has correct WebSocket URL..."
if grep -q "REACT_APP_WS_URL=ws://villagesmesh.com$" .env.prod; then
    echo "✓ .env.prod has correct WebSocket URL"
else
    echo "✗ .env.prod has incorrect WebSocket URL"
    echo "Updating .env.prod..."
    sed -i 's|REACT_APP_WS_URL=.*|REACT_APP_WS_URL=ws://villagesmesh.com|' .env.prod
    echo "✓ Updated .env.prod"
fi

echo ""
echo "Step 2: Rebuilding frontend with correct environment..."
docker compose -f docker-compose.prod.yml build --no-cache frontend

echo ""
echo "Step 3: Restarting frontend and nginx..."
docker compose -f docker-compose.prod.yml up -d frontend nginx

echo ""
echo "Step 4: Waiting for services to be ready..."
sleep 5

echo ""
echo "=========================================="
echo "WebSocket Fix Deployed!"
echo "=========================================="
echo ""
echo "The frontend should now connect to:"
echo "  WebSocket: ws://villagesmesh.com/socket.io/"
echo "  API: http://villagesmesh.com/api"
echo ""
echo "Clear your browser cache and refresh the page:"
echo "  Chrome/Edge: Ctrl+Shift+Delete or Cmd+Shift+Delete"
echo "  Or use hard refresh: Ctrl+F5 or Cmd+Shift+R"
echo ""
echo "Check the browser console - the 'Invalid namespace' error should be gone!"
