#!/bin/bash

# Debug script to check traceroute messages in the database

echo "=== Checking TRACEROUTE_APP messages in database ==="
echo ""

# Check if docker-compose is running
if ! docker-compose ps | grep -q "backend.*Up"; then
    echo "Error: Backend container is not running"
    exit 1
fi

echo "1. Counting TRACEROUTE_APP messages..."
docker-compose exec -T postgres psql -U postgres -d meshtastic_mapper -c "
SELECT COUNT(*) as total_traceroutes 
FROM messages 
WHERE type = 'TRACEROUTE_APP';
"

echo ""
echo "2. Checking recent TRACEROUTE_APP messages (last 24 hours)..."
docker-compose exec -T postgres psql -U postgres -d meshtastic_mapper -c "
SELECT 
    id,
    timestamp,
    \"fromNodeId\",
    \"toNodeId\",
    \"routingPath\",
    array_length(\"routingPath\", 1) as path_length
FROM messages 
WHERE type = 'TRACEROUTE_APP'
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 10;
"

echo ""
echo "3. Checking messages with non-empty routing paths..."
docker-compose exec -T postgres psql -U postgres -d meshtastic_mapper -c "
SELECT 
    COUNT(*) as messages_with_paths
FROM messages 
WHERE type = 'TRACEROUTE_APP'
AND array_length(\"routingPath\", 1) > 0;
"

echo ""
echo "4. Sample traceroute with path details..."
docker-compose exec -T postgres psql -U postgres -d meshtastic_mapper -c "
SELECT 
    m.id,
    m.timestamp,
    fn.\"shortName\" as from_name,
    fn.\"hexId\" as from_hex,
    tn.\"shortName\" as to_name,
    tn.\"hexId\" as to_hex,
    m.\"routingPath\",
    m.rssi,
    m.snr
FROM messages m
LEFT JOIN nodes fn ON m.\"fromNodeId\" = fn.id
LEFT JOIN nodes tn ON m.\"toNodeId\" = tn.id
WHERE m.type = 'TRACEROUTE_APP'
AND array_length(m.\"routingPath\", 1) > 0
ORDER BY m.timestamp DESC
LIMIT 5;
"

echo ""
echo "5. Testing API endpoint..."
echo "GET http://localhost:3001/api/v1/links/traceroutes"
curl -s "http://localhost:3001/api/v1/links/traceroutes?limit=5" | jq '.'

echo ""
echo "=== Debug complete ==="
