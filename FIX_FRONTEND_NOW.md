# 🎯 Fix Frontend Now - 5 Minute Guide

## Current Status

✅ **Backend**: Working perfectly
✅ **Database**: Tables created, nodes being saved
✅ **MQTT**: Messages being processed
✅ **Connection Pool**: Stable, no leaks
❌ **Frontend**: Loads but shows no data (trying to connect to localhost)

## The Problem

Your frontend is trying to connect to `http://localhost:3001` instead of `https://villagesmesh.com/api`.

This is because React environment variables are baked into the build at compile time. We need to rebuild the frontend Docker image with the correct production URLs.

## The Fix (One Command)

SSH to your production server and run:

```bash
cd /path/to/meshtastic-node-mapper
./scripts/rebuild-frontend-for-domain.sh villagesmesh.com
```

That's it! The script will:
1. Load environment from `.env.prod`
2. Stop frontend container
3. Rebuild with correct URLs (takes 2-3 minutes)
4. Start frontend container
5. Verify deployment

## What You'll See

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
This may take a few minutes...
[+] Building frontend...
[+] => [frontend] exporting to image
[+] => => writing image sha256:...

Step 4: Starting frontend...
[+] Running 1/1
 ✔ Container meshtastic-frontend-prod  Started

Step 5: Waiting for frontend to start (30 seconds)...

Step 6: Checking frontend health...
✓ Frontend is healthy (HTTP 200)

==========================================
Frontend Rebuild Complete!
==========================================

Configuration:
  Domain: villagesmesh.com
  API URL: https://villagesmesh.com/api
  WebSocket URL: wss://villagesmesh.com/api

Next steps:
1. Open your browser to: https://villagesmesh.com
2. Check browser console for any errors
3. Verify API calls are going to: https://villagesmesh.com/api
```

## Test in Browser

1. Open `https://villagesmesh.com`
2. **Clear cache**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Open DevTools (F12)
4. Check **Console** tab:
   - ✅ Should see no `localhost` errors
   - ✅ Should see API calls to `villagesmesh.com/api`
5. Check **Network** tab:
   - ✅ API calls should return 200 OK
   - ✅ All requests should go to `villagesmesh.com`
6. Check the UI:
   - ✅ Map should display nodes
   - ✅ Statistics should show data
   - ✅ Connection status should be green

## Expected Results

### Before Fix
```
Browser Console:
❌ GET http://localhost:3001/api/nodes net::ERR_CONNECTION_REFUSED
❌ WebSocket connection to 'ws://localhost:3001' failed
❌ Map shows no nodes
❌ Connection status: Disconnected (red)
```

### After Fix
```
Browser Console:
✅ GET https://villagesmesh.com/api/nodes 200 OK
✅ WebSocket connected to 'wss://villagesmesh.com/api'
✅ Map displays nodes
✅ Connection status: Connected (green)
```

## If Something Goes Wrong

### Script Fails
```bash
# Check what went wrong
docker compose -f docker-compose.prod.yml logs frontend --tail=50

# Try manual rebuild
source .env.prod
export REACT_APP_API_URL="https://villagesmesh.com/api"
export REACT_APP_WS_URL="wss://villagesmesh.com/api"
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

### Still See localhost in Browser
1. **Hard refresh**: Ctrl+Shift+R or Cmd+Shift+R
2. **Try incognito mode**: Ensures no cached files
3. **Clear all browser cache**: Settings → Clear browsing data
4. **Check build args**:
   ```bash
   docker compose -f docker-compose.prod.yml config | grep REACT_APP
   ```

### Backend Not Responding
```bash
# Check backend health
curl http://localhost:3001/health

# Check backend logs
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Restart if needed
docker compose -f docker-compose.prod.yml restart backend
```

## Time Estimate

- Script execution: **3-5 minutes**
- Browser testing: **1-2 minutes**
- **Total: 5-7 minutes**

## Success Checklist

After running the fix, verify:

- [x] Script completed without errors
- [x] Frontend container shows "healthy" status
- [x] Browser console shows no `localhost` errors
- [x] Network tab shows API calls to `villagesmesh.com/api`
- [x] WebSocket shows "Connected" (green indicator)
- [x] Map displays nodes from database
- [x] Statistics page shows data
- [x] Network insights display correctly
- [x] MQTT monitor shows traffic

## You're Done! 🎉

Once all checks pass, your production deployment is **100% complete and working**:

✅ Database initialized
✅ MQTT processing messages
✅ Nodes being created
✅ Connection pool stable
✅ Frontend displaying data

## Need More Help?

See detailed documentation:
- `DEPLOY_FRONTEND_FIX.md` - Step-by-step guide
- `FRONTEND_FIX_COMMANDS.md` - All commands
- `FRONTEND_URL_FIX.md` - Troubleshooting
- `FRONTEND_URL_DIAGRAM.md` - Visual explanation
- `PRODUCTION_FIXES_SUMMARY.md` - Complete overview

## Quick Commands Reference

```bash
# Run the fix
./scripts/rebuild-frontend-for-domain.sh villagesmesh.com

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps

# Restart if needed
docker compose -f docker-compose.prod.yml restart

# Check backend health
curl http://localhost:3001/health
```

---

**Ready?** Run the command and you'll be done in 5 minutes! 🚀
