# Quick Fix Commands (Copy & Paste)

## If you just want to fix it NOW without scripts:

### 1. Pull latest code (fixes TypeScript error)
```bash
git pull
```

### 2. Stop backend
```bash
docker compose -f docker-compose.prod.yml stop backend
```

### 3. Drop and recreate database
```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d postgres <<'EOF'
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'meshtastic_mapper'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS meshtastic_mapper;
CREATE DATABASE meshtastic_mapper;
GRANT ALL PRIVILEGES ON DATABASE meshtastic_mapper TO meshtastic;
EOF
```

### 4. Apply schema
```bash
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --accept-data-loss
```

### 5. Create default network
```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<'EOF'
INSERT INTO networks (id, name, description, "mqttBroker", "mqttCredentials", region, "isActive", "createdAt", "updatedAt")
VALUES (
    'default-network',
    'Default Meshtastic Network',
    'Default network for production deployment',
    'mqtt://mosquitto:1883',
    '{"username": "meshtastic", "password": "meshtastic", "clientId": "meshtastic-node-mapper"}',
    'US',
    true,
    NOW(),
    NOW()
);
EOF
```

### 6. Start backend
```bash
docker compose -f docker-compose.prod.yml up -d backend
```

### 7. Check it worked
```bash
sleep 20
docker compose -f docker-compose.prod.yml logs backend | tail -30
```

You should see "MQTT Manager initialized successfully" or retry messages (which is fine).

### 8. Verify tables exist
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
```

You should see tables like: networks, nodes, messages, positions, telemetry, etc.

---

## Monitor MQTT
```bash
docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt
```

## Watch nodes being created
```bash
watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;"'
```
