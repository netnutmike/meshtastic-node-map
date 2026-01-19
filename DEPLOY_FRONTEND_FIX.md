# Deploy Frontend Fix - Quick Guide

## The Problem
Frontend loads but shows no data because it's trying to connect to `localhost` instead of `villagesmesh.com`.

## The Solution
Rebuild the frontend Docker image with the correct production URLs.

## Steps to Fix (5 minutes)

### 1. SSH to Production Server
```bash
ssh user@villagesmesh.com
```

### 2. Navigate to Project Directory
```bash
cd /path/to/meshtastic-node-mapper
```

### 3. Run the Rebuild Script
```bash
./scripts/rebuild-frontend-for-domain.sh villagesmesh.com
```

The script will:
- ✓ Load environment from `.env.prod`
- ✓ Stop the frontend container
- ✓ Rebuild with correct URLs (takes 2-3 minutes)
- ✓ Start the frontend container
- ✓ Verify the deployment

### 4. Test in Browser
1. Open: `https://villagesmesh.com`
2. **Clear cache**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Open DevTools (F12)
4. Check Console tab - should see no `localhost` errors
5. Check Network tab - API calls should go to `villagesmesh.com/api`

### 5. Verify Data Loads
- Map should show nodes
- Statistics page should show data
- Network insights should display
- MQTT monitor should show traffic

## Expected Output

When the script runs successfully, you'll see:
```
==========================================
Rebuilding Frontend for Domain: villagesmesh.com
==========================================

Loading environment from .env.prod...

Step 1: Setting environment variables...
API URL: https://villagesmesh.com/api
WebSocket URL: wss://villagesmesh.com/api

Step 2: Stopping frontend container...
[+] Stopping 1/1
 ✔ Container meshtastic-frontend-prod  Stopped

Step 3: Rebuilding frontend with new URLs...
[+] Building frontend...

Step 4: Starting frontend...
[+] Running 1/1
 ✔ Container meshtastic-frontend-prod  Started

Step 5: Waiting for frontend to start (30 seconds)...

Step 6: Checking frontend health...
✓ Frontend is healthy (HTTP 200)

==========================================
Frontend Rebuild Complete!
==========================================
```

## What If It Doesn't Work?

### Check Backend is Running
```bash
docker compose -f docker-compose.prod.yml ps backend
curl http://localhost:3001/health
```

### Check Frontend Logs
```bash
docker compose -f docker-compose.prod.yml logs frontend --tail=50
```

### Check Nginx Logs
```bash
docker compose -f docker-compose.prod.yml logs nginx --tail=50
```

### Restart Everything
```bash
docker compose -f docker-compose.prod.yml restart
```

### Watch All Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

## Success Indicators

✅ Script completes without errors
✅ Frontend container shows "healthy" status
✅ Browser shows no `localhost` in console
✅ API calls in Network tab go to `villagesmesh.com/api`
✅ WebSocket shows "Connected" (green indicator)
✅ Map displays nodes from database
✅ All pages load with data

## If You Still See localhost URLs

1. **Hard refresh browser**: Ctrl+Shift+R or Cmd+Shift+R
2. **Try incognito/private mode**: Ensures no cached files
3. **Clear browser cache completely**: Settings → Clear browsing data
4. **Check build args were applied**:
   ```bash
   docker compose -f docker-compose.prod.yml config | grep REACT_APP
   ```

## Time Estimate
- Script execution: 3-5 minutes
- Browser testing: 1-2 minutes
- **Total: ~5-7 minutes**

## Need Help?

See detailed documentation:
- `FRONTEND_URL_FIX.md` - Complete troubleshooting guide
- `FRONTEND_FIX_COMMANDS.md` - All commands in one place
- `PRODUCTION_FIXES_SUMMARY.md` - Overview of all fixes applied

## After This Fix

Everything should be working:
- ✅ Database tables created
- ✅ MQTT messages being processed
- ✅ Nodes being created without errors
- ✅ Connection pool stable
- ✅ Frontend connecting to correct API
- ✅ Data displaying in UI

You're done! 🎉
