# Quick Fix: Database Tables Not Created

## Your Issue
After running `init-database-prod.sh`, you're seeing:
- ✗ "relation 'nodes' does not exist"
- ✗ "relation 'networks' does not exist"
- Only 1 table (`_prisma_migrations`) exists

## Quick Fix (Choose One)

### Option 1: Automated Fix (Easiest)
```bash
./scripts/fix-database-schema.sh
```

This script will automatically:
- Check if migrations are in the Docker image
- Rebuild if needed
- Reset and reapply all migrations
- Create the default network
- Verify everything works

### Option 2: Manual Fix
```bash
# 1. Stop backend
docker compose -f docker-compose.prod.yml stop backend

# 2. Reset database and apply migrations
docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate reset --force --skip-seed

# 3. Verify tables exist
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"

# 4. Create default network
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<EOF
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

# 5. Start backend
docker compose -f docker-compose.prod.yml up -d backend

# 6. Check health
curl http://localhost:3001/health
```

### Option 3: Complete Reset (Nuclear Option)
```bash
# WARNING: This deletes all data!
docker compose -f docker-compose.prod.yml down
docker volume rm meshtastic-node-map_postgres_data
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
sleep 10
./scripts/init-database-prod.sh
```

## What Was Wrong?

The issue is that Prisma's migration history got out of sync with the actual database state. The migrations were marked as "applied" in the `_prisma_migrations` table, but the actual tables were never created.

## Changes Made

I've updated your repository with:

1. **`scripts/fix-database-schema.sh`** - New automated fix script
2. **`scripts/init-database-prod.sh`** - Updated to detect and fix this issue
3. **`scripts/diagnose-prisma-migrations.sh`** - Diagnostic tool
4. **`backend/package.json`** - Added Prisma seed configuration
5. **`docs/troubleshooting-database.md`** - Comprehensive troubleshooting guide

## Verify It's Fixed

After running the fix, verify with:

```bash
# Should show multiple tables (networks, nodes, messages, etc.)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"

# Should return 1 network
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM networks;"

# Should return HTTP 200
curl http://localhost:3001/health

# Should show "MQTT Manager initialized"
docker compose -f docker-compose.prod.yml logs backend | grep -i mqtt
```

## Next Steps

Once fixed, monitor for MQTT messages:
```bash
docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt
```

Check if nodes are being created:
```bash
watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;"'
```

## Need More Help?

See the full troubleshooting guide:
```bash
cat docs/troubleshooting-database.md
```
