#!/bin/bash

# Fix Network Topology Navigation Bug
# This script rebuilds and deploys the frontend with the topology navigation fix

set -e

echo "=========================================="
echo "Fixing Network Topology Navigation Bug"
echo "=========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo "Building frontend with topology navigation fix..."
cd frontend
npm run build
cd ..

echo ""
echo "Restarting frontend container..."
docker-compose -f docker-compose.prod.yml up -d --no-deps --build frontend

echo ""
echo "Waiting for frontend to be ready..."
sleep 5

echo ""
echo "=========================================="
echo "Fix Applied Successfully!"
echo "=========================================="
echo ""
echo "The Network Topology button in the navigation bar will now:"
echo "  1. Navigate to the map page"
echo "  2. Open the topology graph overlay"
echo ""
echo "This works from all pages: Nodes, Network Insights, and About"
echo ""
echo "Please test by clicking the Network Topology icon (tree icon) from any page."
echo ""
