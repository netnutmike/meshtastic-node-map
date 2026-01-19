#!/bin/bash

# Diagnostic script for production MQTT issues

echo "=========================================="
echo "Production MQTT Diagnostics"
echo "=========================================="
echo ""

echo "1. Backend container status:"
docker compose -f docker-compose.prod.yml ps backend
echo ""

echo "2. Mosquitto container status:"
docker compose -f docker-compose.prod.yml ps mosquitto
echo ""

echo "3. Backend logs (last 50 lines, looking for MQTT):"
docker compose -f docker-compose.prod.yml logs backend --tail=50 | grep -i mqtt
echo ""

echo "4. Backend logs (last 30 lines, all):"
docker compose -f docker-compose.prod.yml logs backend --tail=30
echo ""

echo "5. Check if backend is connected to MQTT:"
docker compose -f docker-compose.prod.yml exec backend netstat -an | grep 1883 || echo "No connection to port 1883"
echo ""

echo "6. Database node count:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"
echo ""

echo "7. Database message count:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM messages;"
echo ""

echo "8. Network configuration in database:"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT id, name, \"mqttBroker\", \"isActive\" FROM networks;"
echo ""

echo "9. Mosquitto logs (last 20 lines):"
docker compose -f docker-compose.prod.yml logs mosquitto --tail=20
echo ""

echo "10. Check backend environment variables:"
docker compose -f docker-compose.prod.yml exec backend printenv | grep -E "MQTT|DATABASE"
echo ""

echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
