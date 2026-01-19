# Database Fix - READ THIS FIRST

## The Problem
Your backend is starting but failing with:
```
error: Failed to initialize MQTT Manager:
The table `public.networks` does not exist in the current database.
```

## The Solution (Pick ONE)

### 🚀 FASTEST FIX (30 seconds)
Run this single command on your production server:
```bash
./FIX_NOW.sh
```

This will automatically fix everything.

---

### 🔧 MANUAL FIX (if the script doesn't work)

1. **Stop the backend:**
   ```bash
   docker compose -f docker-compose.prod.yml stop backend
   ```

2. **Drop all tables:**
   ```bash
   docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic -d meshtastic_mapper <<'EOF'
   DO $$ DECLARE
       r RECORD;
   BEGIN
       FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
           EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
       END LOOP;
   END $$;
   EOF
   ```

3. **Apply the schema:**
   ```bash
   docker compose -f docker-compose.prod.yml run --rm backend npx prisma db push --accept-data-loss
   ```

4. **Create the default network:**
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

5. **Start the backend:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d backend
   ```

6. **Wait 10 seconds, then check:**
   ```bash
   docker compose -f docker-compose.prod.yml logs backend | grep -i mqtt
   ```

---

### ✅ VERIFY IT WORKED

After running the fix, you should see:
```bash
# Check tables exist
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
```

You should see tables like: `networks`, `nodes`, `messages`, `positions`, etc.

```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend | tail -20
```

You should see: `MQTT Manager initialized successfully` (NOT errors)

---

## For Future Deployments

I've updated the backend to automatically run migrations on startup. To use this:

1. **Rebuild the backend image:**
   ```bash
   docker compose -f docker-compose.prod.yml build --no-cache backend
   ```

2. **Restart:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

The backend will now automatically:
- Wait for the database
- Run migrations
- Generate Prisma client
- Start the application

You'll see this in the logs:
```
🔧 Starting Meshtastic Node Mapper Backend...
⏳ Waiting for database...
✓ Database is ready
🔄 Running database migrations...
✓ Database schema is up to date
🚀 Starting application...
```

---

## Still Having Issues?

1. **Check if migrations are in the Docker image:**
   ```bash
   docker compose -f docker-compose.prod.yml run --rm backend ls -la /app/prisma/migrations
   ```
   
   If this fails, rebuild: `docker compose -f docker-compose.prod.yml build --no-cache backend`

2. **Check database connection:**
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT version();"
   ```

3. **Run full diagnostics:**
   ```bash
   ./scripts/diagnose-prisma-migrations.sh
   ```

4. **Read the full guide:**
   ```bash
   cat docs/troubleshooting-database.md
   ```

---

## What Caused This?

Prisma's migration history got out of sync. The `_prisma_migrations` table said migrations were applied, but the actual tables were never created. This happens when:
- Migrations run but fail silently
- Database is reset but migration history isn't
- Docker image doesn't contain migration files

The fix drops everything and recreates from scratch using `db push`, which bypasses the migration history.
