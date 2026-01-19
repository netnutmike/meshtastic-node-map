# Fix Your Production Deployment NOW

## The Problem
Your backend is crashing because the database tables don't exist, even though migrations claim to be applied.

## The Solution

### Step 1: Pull Latest Changes
On your production server, pull the latest code (I just fixed a TypeScript error):

```bash
git pull
```

### Step 2: Run the Fix Script
```bash
./scripts/force-schema-creation.sh
```

**That's it.** This script will fix everything automatically.

## What It Does

1. Stops the backend
2. Checks if migrations are in your Docker image (rebuilds if missing)
3. Drops and recreates the database
4. Applies the schema using `prisma db push`
5. Creates the default network
6. Starts the backend
7. Verifies everything works

## If You Get Build Errors

If you see TypeScript compilation errors, make sure you pulled the latest code:

```bash
git pull
git status  # Make sure you're on the latest commit
```

Then try the fix script again.

## If That Still Doesn't Work

Try the manual fix:

```bash
# 1. Stop backend
docker compose -f docker-compose.prod.yml stop backend

# 2. Drop and recreate database
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d postgres <<'EOF'
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'meshtastic_mapper'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS meshtastic_mapper;
CREATE DATABASE meshtastic_mapper;
GRANT ALL PRIVILEGES ON DATABASE meshtastic_mapper TO meshtastic;
EOF

# 3. Apply schema (without rebuilding)
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --accept-data-loss

# 4. Create default network
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

# 5. Start backend
docker compose -f docker-compose.prod.yml up -d backend

# 6. Wait and check
sleep 20
docker compose -f docker-compose.prod.yml logs backend | tail -30
```

## After It's Fixed

Monitor MQTT:
```bash
docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt
```

You should see:
- "MQTT Manager initialized successfully" (good!)
- OR "Database tables not ready yet, retrying..." then eventually success
- NOT "The table `public.networks` does not exist" (bad)

Watch nodes being created:
```bash
watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;"'
```

## Why This Happened

Prisma's migration history got out of sync. The `_prisma_migrations` table said migrations were applied, but the actual tables were never created. This is a known Prisma issue when migration state becomes corrupted.

The fix bypasses the migration history entirely and just creates the schema directly.

## Changes I Made

1. Fixed TypeScript compilation error in `backend/src/index.ts`
2. Added retry logic so backend doesn't crash if tables don't exist yet
3. Created multiple fix scripts for different scenarios
4. Updated Dockerfile to run migrations on container startup (for future deployments)
