# Production MQTT Troubleshooting

## Your Issue
- MQTT traffic is visible in MQTT Explorer on production
- Node count remains at 0
- Dev machine works fine with same configuration

## Quick Fix

On your production server, run:

```bash
./scripts/fix-production-mqtt-connection.sh
```

This will:
1. Check if the network configuration exists
2. Restart Mosquitto and backend
3. Verify MQTT connection
4. Check if nodes start appearing

## Diagnostics

If the quick fix doesn't work, run diagnostics:

```bash
./scripts/diagnose-production-mqtt.sh
```

This will show you:
- Container status
- Backend logs
- MQTT connection status
- Database counts
- Network configuration
- Environment variables

## Common Issues

### Issue 1: No Active Network in Database
**Symptom:** Backend starts but doesn't connect to MQTT

**Fix:**
```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<'EOF'
UPDATE networks SET "isActive" = true WHERE id = 'default-network';
EOF
docker compose -f docker-compose.prod.yml restart backend
```

### Issue 2: Backend Not Connecting to Mosquitto
**Symptom:** Backend logs show "MQTT disconnected" or no MQTT logs

**Fix:**
```bash
# Check if mosquitto is running
docker compose -f docker-compose.prod.yml ps mosquitto

# Restart both services
docker compose -f docker-compose.prod.yml restart mosquitto backend
```

### Issue 3: Wrong MQTT Broker URL
**Symptom:** Backend can't connect, shows connection errors

**Fix:**
```bash
# Check current configuration
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT \"mqttBroker\" FROM networks;"

# Should be: mqtt://mosquitto:1883
# If wrong, update it:
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<'EOF'
UPDATE networks SET "mqttBroker" = 'mqtt://mosquitto:1883' WHERE id = 'default-network';
EOF
docker compose -f docker-compose.prod.yml restart backend
```

### Issue 4: Backend Crashed or Not Running
**Symptom:** No backend logs, container not running

**Fix:**
```bash
# Check status
docker compose -f docker-compose.prod.yml ps backend

# Check logs for errors
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Restart
docker compose -f docker-compose.prod.yml up -d backend
```

## Verify It's Working

After applying fixes, verify:

```bash
# 1. Check backend is receiving MQTT messages
docker compose -f docker-compose.prod.yml logs backend --tail=20 | grep -i mqtt

# Should see: "MQTT message added" or "Updated node"

# 2. Watch node count increase
watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;"'

# 3. Check messages are being stored
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM messages;"
```

## Compare with Dev Machine

Since your dev machine works, compare:

```bash
# On dev machine:
docker compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT * FROM networks;"

# On production:
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT * FROM networks;"

# They should be identical (except timestamps)
```

## Still Not Working?

If nodes still aren't appearing after 5 minutes:

1. **Check backend logs for errors:**
   ```bash
   docker compose -f docker-compose.prod.yml logs backend | grep -i error
   ```

2. **Verify Mosquitto is receiving messages:**
   ```bash
   docker compose -f docker-compose.prod.yml logs mosquitto --tail=50
   ```

3. **Test MQTT connection manually:**
   ```bash
   docker compose -f docker-compose.prod.yml exec backend sh -c "nc -zv mosquitto 1883"
   ```

4. **Check if backend can query database:**
   ```bash
   docker compose -f docker-compose.prod.yml exec backend npx prisma db execute --stdin <<'EOF'
   SELECT COUNT(*) FROM networks;
   EOF
   ```

## Need More Help?

Share the output of:
```bash
./scripts/diagnose-production-mqtt.sh > mqtt-diagnostics.txt
```
