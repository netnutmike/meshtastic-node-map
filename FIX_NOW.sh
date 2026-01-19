#!/bin/bash

# IMMEDIATE FIX for "relation 'networks' does not exist" error
# Run this script to fix your database right now

echo "=========================================="
echo "IMMEDIATE DATABASE FIX"
echo "=========================================="
echo ""
echo "This will fix the 'relation does not exist' error."
echo "It will drop all tables and recreate them."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Running emergency fix..."
echo ""

./scripts/emergency-db-fix.sh

echo ""
echo "=========================================="
echo "DONE!"
echo "=========================================="
echo ""
echo "Check if it worked:"
echo "  docker compose -f docker-compose.prod.yml logs backend | grep -i mqtt"
echo ""
echo "You should see 'MQTT Manager initialized' instead of errors."
