# 🚀 Production Deployment - Start Here

## Current Status

Your production server at **villagesmesh.com** has been through several fixes:

1. ✅ **Database initialization** - Fixed tables not being created
2. ✅ **MQTT race condition** - Fixed unique constraint errors on node creation
3. ✅ **Connection pool exhaustion** - Fixed with transaction batching
4. ⚠️ **Frontend URL configuration** - **NEEDS TO BE APPLIED**

## What You Need to Do Now

The backend is working correctly, but the frontend is still trying to connect to `localhost` instead of your domain. This is a simple 2-minute fix.

### Quick Fix (2 minutes)

On your production server, run:

```bash
./scripts/fix-frontend-urls.sh villagesmesh.com
```

Then in your browser:
- Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- Or open in incognito mode

**That's it!** Your application should now work correctly.

## What This Does

The script will:
1. Stop the frontend container
2. Rebuild it with the correct API URL (`/api/v1`)
3. Start it back up
4. Run health checks

Takes about 2 minutes total.

## Verify It Worked

Open `http://villagesmesh.com` in your browser:

✅ Nodes appear on the map  
✅ Statistics show data  
✅ No "localhost" errors in console (press F12)  
✅ Real-time updates working  

## If You Need More Details

- **Quick guide:** `QUICK_FIX_FRONTEND.md`
- **Detailed guide:** `FRONTEND_URL_FIX_COMPLETE.md`
- **Complete deployment:** `COMPLETE_DEPLOYMENT_GUIDE.md`

## Troubleshooting

### Frontend still shows no data after fix

1. **Clear browser cache completely:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content

2. **Check browser console (F12):**
   - Should see API calls to `/api/v1/*`
   - Should NOT see "localhost" anywhere
   - WebSocket should be connected

3. **Check logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs -f frontend
   docker compose -f docker-compose.prod.yml logs -f backend
   ```

### Need to check if backend is working

```bash
# Check API
curl http://localhost/api/v1

# Check nodes in database
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"

# Check MQTT traffic
docker compose -f docker-compose.prod.yml logs mosquitto --tail=50
```

## All Fixes Applied

Here's what has been fixed in the code:

### 1. Database Initialization
- **File:** `scripts/force-schema-creation.sh`
- **What:** Forces Prisma to create all database tables
- **Status:** Script ready to run

### 2. MQTT Race Condition
- **File:** `backend/src/services/mqtt-manager.service.ts`
- **What:** Handles concurrent node creation gracefully
- **Status:** Fixed in code, deployed

### 3. Connection Pool Exhaustion
- **File:** `backend/src/services/mqtt-manager.service.ts`
- **What:** Uses transactions to batch database operations
- **Status:** Fixed in code, deployed

### 4. Frontend URLs
- **File:** `docker-compose.prod.yml`, `scripts/fix-frontend-urls.sh`
- **What:** Configures frontend to use production domain
- **Status:** Script ready to run (YOU NEED TO RUN THIS)

## Architecture Overview

```
Your Browser
    ↓
villagesmesh.com (Nginx)
    ├─→ /api/v1/*     → Backend API
    ├─→ /socket.io/*  → WebSocket (real-time updates)
    └─→ /*            → Frontend (React app)

Backend connects to:
    ├─→ PostgreSQL (database)
    ├─→ Redis (cache)
    └─→ Mosquitto (MQTT broker)
```

## Quick Commands

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker-compose.prod.yml ps

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Check database
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"
```

## Summary

**You're almost there!** The backend is working correctly and processing MQTT traffic. You just need to rebuild the frontend with the correct URLs so your browser can connect to it.

Run this command and you're done:
```bash
./scripts/fix-frontend-urls.sh villagesmesh.com
```

Then hard refresh your browser (`Ctrl+Shift+R`) and everything should work! 🎉
