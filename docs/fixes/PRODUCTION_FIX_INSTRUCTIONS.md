# Production Server Fix Instructions

## Current Situation
The Docker build is failing with a TypeScript compilation error on line 85 of `backend/src/index.ts`.

## Quick Fix (Choose One Method)

### Method 1: Use Git (Recommended)

**On your local machine:**
```bash
git add .
git commit -m "Fix database initialization and TypeScript errors"
git push
```

**On your production server:**
```bash
cd ~/meshtastic-node-map
git pull
./scripts/force-schema-creation.sh
```

### Method 2: Apply Fix Script (If Git Doesn't Work)

**On your production server:**
```bash
cd ~/meshtastic-node-map
./scripts/apply-typescript-fix.sh
./scripts/force-schema-creation.sh
```

### Method 3: Manual Edit (If Scripts Don't Work)

**On your production server:**

1. Edit the file:
   ```bash
   nano ~/meshtastic-node-map/backend/src/index.ts
   ```

2. Find line 85 (use Ctrl+_ then type 85 and press Enter)

3. Change this line:
   ```typescript
   let networks = [];
   ```
   
   To this:
   ```typescript
   let networks: any[] = [];
   ```

4. Save and exit (Ctrl+X, then Y, then Enter)

5. Run the fix:
   ```bash
   ./scripts/force-schema-creation.sh
   ```

## What the Fix Does

1. **Fixes TypeScript Error:** Adds explicit type annotation to satisfy TypeScript compiler
2. **Rebuilds Backend:** Creates a new Docker image with the fixed code
3. **Recreates Database:** Drops and recreates the database with proper schema
4. **Creates Default Network:** Inserts the default network configuration
5. **Starts Backend:** Launches the backend and verifies it works

## Expected Output

After running `force-schema-creation.sh`, you should see:

```
✓ Backend stopped
✓ Backend image rebuilt
✓ Database recreated
✓ Schema created
✓ Default network created
✓ Backend started
✓ Backend is healthy (HTTP 200)
```

## Verify It Worked

```bash
# Check backend logs - should see "MQTT Manager initialized"
docker compose -f docker-compose.prod.yml logs backend | grep -i mqtt | tail -20

# Check tables exist
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"

# Check network exists
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT * FROM networks;"

# Check backend health
curl http://localhost:3001/health
```

## If It Still Fails

1. **Check the error message:**
   ```bash
   docker compose -f docker-compose.prod.yml logs backend --tail=50
   ```

2. **Run diagnostics:**
   ```bash
   ./scripts/quick-diagnostic.sh
   ```

3. **Try complete reset:**
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker volume rm meshtastic-node-map_postgres_data
   docker compose -f docker-compose.prod.yml build --no-cache
   docker compose -f docker-compose.prod.yml up -d
   sleep 10
   ./scripts/force-schema-creation.sh
   ```

## Need Help?

See the detailed troubleshooting guide:
```bash
cat docs/troubleshooting-database.md
```

Or check the deployment fix guide:
```bash
cat DEPLOYMENT_ISSUE_FIX.md
```
