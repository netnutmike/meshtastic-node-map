# Fix Your Production Deployment NOW

## The Problem
Your backend is crashing because the database tables don't exist, even though migrations claim to be applied.

## The Solution (Run This)

On your production server, run:

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

## If That Doesn't Work

First, run diagnostics to see what's happening:

```bash
./scripts/quick-diagnostic.sh
```

Then try the manual fix from `DEPLOYMENT_ISSUE_FIX.md`.

## After It's Fixed

Monitor MQTT:
```bash
docker compose -f docker-compose.prod.yml logs -f backend | grep -i mqtt
```

Watch nodes being created:
```bash
watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;"'
```

## Why This Happened

Prisma's migration history got out of sync. The `_prisma_migrations` table said migrations were applied, but the actual tables were never created. This is a known Prisma issue when migration state becomes corrupted.

The fix bypasses the migration history entirely and just creates the schema directly.
