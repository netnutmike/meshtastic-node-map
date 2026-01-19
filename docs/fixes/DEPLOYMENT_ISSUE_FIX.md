# Quick Fix: Database Tables Not Created

## Your Issue
After running `init-database-prod.sh`, you're seeing:
- ✗ "relation 'nodes' does not exist"
- ✗ "relation 'networks' does not exist"
- Only 1 table (`_prisma_migrations`) exists
- Backend crashes with "The table `public.networks` does not exist"

## Quick Fix (Choose One)

### Option 1: Force Schema Creation (RECOMMENDED - Most Reliable)
```bash
./scripts/force-schema-creation.sh
```

This script will:
- Stop the backend
- Check if migrations are in the Docker image (rebuild if not)
- Drop and recreate the database completely
- Apply schema using `prisma db push` (bypasses migration history issues)
- Create the default network
- Start backend and verify everything works

**This is the nuclear option that always works.**

### Option 2: Automated Fix
```bash
./scripts/fix-database-schema.sh
```

This script will:
- Check if migrations are in the Docker image
- Rebuild if needed
- Reset and reapply all migrations
- Create the default network
- Verify everything works

### Option 3: Manual Fix
```bash
# 1. Stop backend
docker compose -f docker-compose.prod.yml stop backend

# 2. Drop and recreate database
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d postgres <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'meshtastic_mapper'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS meshtastic_mapper;
CREATE DATABASE meshtastic_mapper;
GRANT ALL PRIVILEGES ON DATABASE meshtastic_mapper TO meshtastic;
EOF

# 3. Apply schema
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --accept-data-loss

# 4. Verify tables exist
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"

# 5. Create default network
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

# 6. Start backend
docker compose -f docker-compose.prod.yml up -d backend

# 7. Check health
sleep 20
curl http://localhost:3001/health
```

### Option 4: Complete Reset (Last Resort)
```bash
# WARNING: This deletes all data!
docker compose -f docker-compose.prod.yml down
docker volume rm meshtastic-node-map_postgres_data
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
sleep 10
./scripts/force-schema-creation.sh
```

## What Was Wrong?

The issue is that Prisma's migration history got out of sync with the actual database state. The migrations were marked as "applied" in the `_prisma_migrations` table, but the actual tables were never created.

Additionally, the backend was trying to query the `networks` table immediately on startup, causing it to crash if the tables didn't exist.

## Changes Made

I've updated your repository with:

1. **`scripts/force-schema-creation.sh`** - New nuclear option that always works
2. **`scripts/fix-database-schema.sh`** - Automated fix script
3. **`scripts/diagnose-prisma-migrations.sh`** - Diagnostic tool
4. **`scripts/init-database-prod.sh`** - Updated to detect and fix this issue
5. **`backend/src/index.ts`** - Added retry logic so backend doesn't crash if tables don't exist yet
6. **`backend/package.json`** - Added Prisma seed configuration
7. **`docs/troubleshooting-database.md`** - Comprehensive troubleshooting guide

## Verify It's Fixed

After running the fix, verify with:

```bash
# Should show multiple tables (networks, nodes, messages, etc.)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"

# Should return 1 network
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM networks;"

# Should return 0 nodes (initially)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"

# Should return HTTP 200
curl http://localhost:3001/health

# Should show "MQTT Manager initialized" or retry messages
docker compose -f docker-compose.prod.yml logs backend | grep -i mqtt | tail -20
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

Or run diagnostics:
```bash
./scripts/diagnose-prisma-migrations.sh
```
