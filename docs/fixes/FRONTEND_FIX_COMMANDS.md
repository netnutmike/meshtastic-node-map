# Quick Commands: Frontend URL Fix

## Run This First
```bash
cd /path/to/meshtastic-node-mapper
./scripts/rebuild-frontend-for-domain.sh villagesmesh.com
```

## If Script Doesn't Work, Run Manually

```bash
# Load environment
source .env.prod

# Set URLs
export REACT_APP_API_URL="https://villagesmesh.com/api"
export REACT_APP_WS_URL="wss://villagesmesh.com/api"

# Rebuild
docker compose -f docker-compose.prod.yml stop frontend
docker compose -f docker-compose.prod.yml build --no-cache \
  --build-arg REACT_APP_API_URL="$REACT_APP_API_URL" \
  --build-arg REACT_APP_WS_URL="$REACT_APP_WS_URL" \
  frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

## Verify It Worked

```bash
# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend --tail=50

# Check all services
docker compose -f docker-compose.prod.yml ps

# Watch logs in real-time
docker compose -f docker-compose.prod.yml logs -f
```

## Test in Browser

1. Open: `https://villagesmesh.com`
2. Press F12 to open DevTools
3. Go to Network tab
4. Refresh page (Ctrl+Shift+R to clear cache)
5. Look for API calls - they should go to `villagesmesh.com/api`, NOT `localhost`

## If Still Broken

```bash
# Check backend is working
curl http://localhost:3001/health

# Check nginx is proxying correctly
docker compose -f docker-compose.prod.yml logs nginx --tail=50

# Restart everything if needed
docker compose -f docker-compose.prod.yml restart
```

## Expected Results

✅ No `localhost` in browser console
✅ API calls show in Network tab going to `villagesmesh.com/api`
✅ WebSocket connected (green indicator in UI)
✅ Map shows nodes
✅ Data loads on all pages
