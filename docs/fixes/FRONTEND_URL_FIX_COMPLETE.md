# Frontend URL Configuration Fix

## Problem
The frontend was built with hardcoded `localhost` URLs, causing it to fail when deployed to production at `villagesmesh.com`. The browser console showed errors trying to connect to `localhost` instead of the production domain.

## Root Cause
1. Frontend build args in `docker-compose.prod.yml` defaulted to `localhost:3001`
2. API routes are served at `/api/v1/*` but frontend was trying to connect to wrong base URL
3. Frontend needs to be rebuilt with correct environment variables

## Solution

### 1. Updated docker-compose.prod.yml
Changed frontend build args to use relative paths by default:
```yaml
args:
  REACT_APP_API_URL: ${REACT_APP_API_URL:-/api/v1}  # Relative path works with any domain
  REACT_APP_WS_URL: ${REACT_APP_WS_URL:-ws://localhost:3001}
```

### 2. Updated fix-frontend-urls.sh Script
The script now:
- Uses relative path `/api/v1` for API calls (works through nginx proxy)
- Supports both HTTP and HTTPS
- Includes health checks for both frontend and backend
- Provides clear instructions for cache clearing

### 3. Nginx Configuration
The nginx proxy is correctly configured:
- `/api/*` → proxies to backend:3001
- `/socket.io/*` → proxies WebSocket connections to backend
- `/` → proxies to frontend:8080

## Deployment Steps

### On Production Server (villagesmesh.com)

1. **Make the script executable:**
   ```bash
   chmod +x scripts/fix-frontend-urls.sh
   ```

2. **Run the fix script:**
   ```bash
   # For HTTP:
   ./scripts/fix-frontend-urls.sh villagesmesh.com

   # For HTTPS:
   ./scripts/fix-frontend-urls.sh villagesmesh.com https
   ```

3. **The script will:**
   - Stop the frontend container
   - Rebuild with correct URLs
   - Start the frontend
   - Run health checks
   - Display status

4. **Clear browser cache:**
   - Chrome/Firefox: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or open in incognito/private mode to test

5. **Verify the fix:**
   ```bash
   # Check frontend is serving
   curl -I http://localhost/

   # Check API is responding
   curl http://localhost/api/v1

   # Check logs if needed
   docker compose -f docker-compose.prod.yml logs -f frontend
   docker compose -f docker-compose.prod.yml logs -f backend
   ```

## Expected Results

After running the fix:

1. **Frontend loads correctly** at `http://villagesmesh.com`
2. **API calls work** - browser console shows requests to `/api/v1/*`
3. **WebSocket connects** - real-time updates work
4. **Nodes appear on map** - data flows from backend to frontend
5. **No localhost errors** in browser console

## Verification Checklist

- [ ] Frontend loads without errors
- [ ] Browser console shows no localhost connection errors
- [ ] Network tab shows API calls to `/api/v1/*` (not localhost)
- [ ] WebSocket connection established (check Network → WS tab)
- [ ] Nodes appear on the map
- [ ] Real-time updates work (nodes update as MQTT messages arrive)
- [ ] Statistics page shows data
- [ ] MQTT Monitor shows traffic

## Troubleshooting

### Frontend shows blank page
```bash
# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend

# Verify frontend is running
docker compose -f docker-compose.prod.yml ps frontend
```

### API calls fail (404 errors)
```bash
# Check nginx is proxying correctly
docker compose -f docker-compose.prod.yml logs nginx

# Test API directly
curl http://localhost:3001/api/v1
```

### WebSocket won't connect
```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend

# Verify Socket.IO is running
curl http://localhost:3001/socket.io/
```

### Still seeing localhost in browser
- **Hard refresh:** `Ctrl+Shift+R` or `Cmd+Shift+R`
- **Clear all cache:** Browser settings → Clear browsing data
- **Try incognito mode** to verify fix works
- **Check service worker:** Browser DevTools → Application → Service Workers → Unregister

## Architecture Overview

```
Browser (villagesmesh.com)
    ↓
Nginx (port 80/443)
    ├─→ /api/v1/*     → Backend (port 3001)
    ├─→ /socket.io/*  → Backend WebSocket
    └─→ /*            → Frontend (port 8080)
```

## Environment Variables

For future deployments, set these in `.env.prod`:

```bash
# Frontend URLs (relative path recommended)
REACT_APP_API_URL=/api/v1
REACT_APP_WS_URL=wss://villagesmesh.com  # or ws:// for HTTP

# Backend configuration
FRONTEND_URL=https://villagesmesh.com  # or http://
```

## Related Files

- `docker-compose.prod.yml` - Frontend build configuration
- `config/nginx/nginx.prod.conf` - Nginx proxy configuration
- `frontend/src/services/api.ts` - Frontend API service
- `backend/src/routes/index.ts` - Backend API routes
- `scripts/fix-frontend-urls.sh` - Automated fix script

## Summary

The frontend is now configured to use relative paths for API calls, which work through the nginx reverse proxy. This approach is more flexible and works with any domain or protocol (HTTP/HTTPS) without requiring rebuilds.

Run the fix script on production, clear your browser cache, and the application should work correctly!
