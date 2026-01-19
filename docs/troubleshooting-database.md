# Database Troubleshooting Guide

## Problem: Tables Not Created After Migration

### Symptoms
- `init-database-prod.sh` reports "No migration found in prisma/migrations"
- Only `_prisma_migrations` table exists
- Errors like "relation 'nodes' does not exist"
- Backend logs show `PrismaClientKnownRequestError: The table 'public.networks' does not exist`

### Root Cause
This happens when:
1. Prisma's migration history is out of sync with the actual database state
2. Migrations were marked as applied but didn't actually run
3. The Docker image doesn't contain the migration files

### Solution 1: Use the Fix Script (Recommended)

Run the dedicated fix script:

```bash
./scripts/fix-database-schema.sh
```

This script will:
- Check if migrations exist in the Docker image
- Rebuild the image if needed
- Reset the database and reapply all migrations
- Create the default network
- Verify everything is working

### Solution 2: Manual Fix

If the automated script doesn't work, follow these steps:

#### Step 1: Verify Migrations in Docker Image

```bash
docker compose -f docker-compose.prod.yml run --rm backend ls -la /app/prisma/migrations
```

If this fails, rebuild the backend image:

```bash
docker compose -f docker-compose.prod.yml build --no-cache backend
```

#### Step 2: Reset Database Schema

Stop the backend first:

```bash
docker compose -f docker-compose.prod.yml stop backend
```

Reset and reapply migrations:

```bash
docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate reset --force --skip-seed
```

If that fails, use db push:

```bash
docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --force-reset --accept-data-loss
```

#### Step 3: Verify Tables

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
```

You should see tables like: `networks`, `nodes`, `messages`, `positions`, `telemetry`, etc.

#### Step 4: Create Default Network

```bash
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
) ON CONFLICT (id) DO UPDATE SET
    "mqttBroker" = 'mqtt://mosquitto:1883',
    "mqttCredentials" = '{"username": "meshtastic", "password": "meshtastic", "clientId": "meshtastic-node-mapper"}',
    "updatedAt" = NOW();
EOF
```

#### Step 5: Restart Backend

```bash
docker compose -f docker-compose.prod.yml up -d backend
```

#### Step 6: Verify Backend Health

```bash
curl http://localhost:3001/health
```

Should return HTTP 200.

### Solution 3: Complete Reset

If nothing else works, do a complete reset:

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: This deletes all data!)
docker volume rm meshtastic-node-map_postgres_data

# Rebuild images
docker compose -f docker-compose.prod.yml build --no-cache

# Start services
docker compose -f docker-compose.prod.yml up -d

# Wait for database to be ready
sleep 10

# Run initialization
./scripts/init-database-prod.sh
```

## Verification Commands

### Check Table Count
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

Should return more than 1 (not just `_prisma_migrations`).

### List All Tables
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
```

### Check Networks Table
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT * FROM networks;"
```

### Check Backend Logs
```bash
docker compose -f docker-compose.prod.yml logs backend | tail -50
```

Look for:
- ✓ "Connected to database successfully"
- ✓ "MQTT Manager initialized"
- ✗ "PrismaClientKnownRequestError"
- ✗ "does not exist in the current database"

## Prevention

To avoid this issue in the future:

1. **Always rebuild after schema changes:**
   ```bash
   docker compose -f docker-compose.prod.yml build backend
   ```

2. **Use the updated init script:**
   The updated `init-database-prod.sh` now includes checks for this issue.

3. **Verify migrations are in the image:**
   After building, check:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm backend ls -la /app/prisma/migrations
   ```

4. **Keep Prisma up to date:**
   The warning about Prisma 5.22.0 → 7.2.0 suggests updating:
   ```bash
   cd backend
   npm i --save-dev prisma@latest
   npm i @prisma/client@latest
   ```

## Related Issues

- **"No migration found"**: Migrations not in Docker image → rebuild
- **"Table does not exist"**: Migration history out of sync → reset
- **"Connection refused"**: Database not ready → wait longer
- **"Authentication failed"**: Wrong credentials in .env → check DATABASE_URL

## Diagnostic Script

For detailed diagnostics, run:

```bash
./scripts/diagnose-prisma-migrations.sh
```

This will show:
- Working directory in container
- Files in /app directory
- Prisma directory contents
- Migration folders
- Prisma client status
- Database connection
