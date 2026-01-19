# Push Fixes to Production Server

## The Issue
The TypeScript compilation failed because of a type error I introduced. I've fixed it.

## Steps to Deploy the Fix

### On Your Local Machine (where you have this repo)

1. **Commit the changes:**
   ```bash
   git add .
   git commit -m "Fix database initialization and TypeScript errors"
   git push
   ```

### On Your Production Server

1. **Pull the latest changes:**
   ```bash
   cd ~/meshtastic-node-map
   git pull
   ```

2. **Run the fix script:**
   ```bash
   ./scripts/force-schema-creation.sh
   ```

That's it! The script will rebuild the backend image with the fixed code and set up the database.

## What Was Fixed

1. **TypeScript Error:** Added explicit type annotation `let networks: any[] = []` to fix compilation error
2. **Backend Crash:** Added retry logic so backend doesn't crash if database tables don't exist yet
3. **Database Schema:** Created scripts to forcefully recreate the database schema

## Alternative: Manual Fix Without Git

If you can't use git, you can manually fix the TypeScript error on the production server:

1. **Edit the file:**
   ```bash
   nano ~/meshtastic-node-map/backend/src/index.ts
   ```

2. **Find line 85** (around the `initializeMQTTManager` function) and change:
   ```typescript
   let networks = [];
   ```
   to:
   ```typescript
   let networks: any[] = [];
   ```

3. **Save and exit** (Ctrl+X, then Y, then Enter)

4. **Run the fix script:**
   ```bash
   ./scripts/force-schema-creation.sh
   ```

## Verify It Worked

After running the script, check:

```bash
# Should show "MQTT Manager initialized" (not errors)
docker compose -f docker-compose.prod.yml logs backend | grep -i mqtt | tail -20

# Should show multiple tables
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"

# Should return 1
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM networks;"
```
