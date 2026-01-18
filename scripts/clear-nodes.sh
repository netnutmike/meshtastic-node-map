#!/bin/bash

# Script to clear all nodes from the Meshtastic Node Mapper database
# This will delete all nodes and their associated data (positions, telemetry, messages, neighbors)

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo ""
echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                                                                ║${NC}"
echo -e "${RED}║              CLEAR NODE DATABASE - WARNING                     ║${NC}"
echo -e "${RED}║                                                                ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}This script will permanently delete:${NC}"
echo "  • All nodes from the database"
echo "  • All position history for those nodes"
echo "  • All telemetry readings for those nodes"
echo "  • All messages sent/received by those nodes"
echo "  • All neighbor relationships"
echo ""
echo -e "${RED}⚠️  THIS ACTION IS IRREVERSIBLE ⚠️${NC}"
echo ""
echo "The database will be completely cleared and nodes will be"
echo "repopulated from the MQTT stream as new messages arrive."
echo ""

# Check if Docker Compose is running
if ! docker-compose ps | grep -q "meshtastic-postgres.*Up"; then
    echo -e "${RED}Error: PostgreSQL container is not running.${NC}"
    echo "Please start the application with: docker-compose up -d"
    exit 1
fi

# First confirmation
read -p "Do you want to continue? (yes/no): " confirm1
if [ "$confirm1" != "yes" ]; then
    echo -e "${GREEN}Operation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Getting current database statistics...${NC}"

# Get current counts
NODE_COUNT=$(docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;" | tr -d ' ')
POSITION_COUNT=$(docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM positions;" | tr -d ' ')
TELEMETRY_COUNT=$(docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM telemetry_readings;" | tr -d ' ')
MESSAGE_COUNT=$(docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM messages;" | tr -d ' ')
NEIGHBOR_COUNT=$(docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM node_neighbors;" | tr -d ' ')

echo ""
echo "Current database contents:"
echo "  • Nodes: $NODE_COUNT"
echo "  • Positions: $POSITION_COUNT"
echo "  • Telemetry readings: $TELEMETRY_COUNT"
echo "  • Messages: $MESSAGE_COUNT"
echo "  • Neighbor relationships: $NEIGHBOR_COUNT"
echo ""

# Second confirmation with exact count
read -p "Are you sure you want to delete all $NODE_COUNT nodes and their data? (yes/no): " confirm2
if [ "$confirm2" != "yes" ]; then
    echo -e "${GREEN}Operation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Final confirmation required.${NC}"
echo -e "${RED}Type 'DELETE ALL NODES' (in capital letters) to proceed:${NC}"
read -p "> " confirm3

if [ "$confirm3" != "DELETE ALL NODES" ]; then
    echo -e "${GREEN}Operation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Clearing database...${NC}"

# Execute the deletion in the correct order (respecting foreign key constraints)
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper <<EOF
BEGIN;

-- Delete in order to respect foreign key constraints
DELETE FROM node_neighbors;
DELETE FROM messages;
DELETE FROM telemetry_readings;
DELETE FROM positions;
DELETE FROM nodes;

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Database cleared successfully!${NC}"
    echo ""
    echo "All nodes and associated data have been deleted."
    echo "New nodes will be created automatically as MQTT messages arrive."
    echo ""
    echo "To verify the database is empty, run:"
    echo "  docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c 'SELECT COUNT(*) FROM nodes;'"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Error clearing database.${NC}"
    echo "Please check the error messages above."
    exit 1
fi
