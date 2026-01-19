# Fix 502 Bad Gateway Errors

## Current Issue

Browser shows 502 errors when accessing:
- `http://villagesmesh.com/api/v1/nodes` → 502 Bad Gateway
- `ws://villagesmesh.com/socket.io/` → WebSocket connection failed

## What We Know

✅ **Working:**
- Backend is healthy: `curl http://localhost:3001/health` works
- Nginx can reach backend internally: `docker exec nginx curl http://backend:3001/health` works
- Static pages load: `http://villagesmesh.com` shows the frontend
- Port 80 is open and accessible

❌ **Not Working:**
- API requests from browser get 502 errors
- WebSocket connections fail
- Nginx logs show NO incoming requests for `/api/` paths

## Root Cause

The issue is that **nginx is not receiving external API requests** even though it can serve static pages. This suggests:

1. **Possible cause**: Nginx is proxying to frontend for ALL requests, and frontend container cannot reach backend
2. **Possible cause**: There's a routing issue where `/api/` requests aren't reaching nginx
3. **Possible cause**: Frontend is making requests to wrong URL

## Diagnostic Steps

Run this on the production server:

```bash
# 1. Check if nginx receives API requests from localhost
curl -v http://localhost/api/v1/nodes

# 2. Check nginx access logs for /api/ requests
docker compose -f docker-compose.prod.yml logs nginx | grep "/api/"

# 3. Check if frontend container can reach backend
docker compose -f docker-compose.prod.yml exec frontend curl http://backend:3001/health

# 4. Check what the browser is actually requesting
# Open browser dev tools → Network tab → try to load nodes page
# Look at the actual URL being requested

# 5. Test from external machine
curl -v http://villagesmesh.com/api/v1/nodes
```

## Likely Issue: Frontend Container Proxy

Looking at the nginx config, requests to `/` are proxied to the `frontend` container. If the browser is making API requests, they might be going through the frontend container which then cannot reach the backend.

## Solution 1: Check Frontend Build

The frontend might be built with the wrong API URL. Check what URL the frontend is using:

```bash
# Check the built frontend files
docker compose -f docker-compose.prod.yml exec frontend grep -r "REACT_APP_API_URL" /usr/share/nginx/html/ || echo "Not found in static files"

# Check the frontend environment
docker compose -f docker-compose.prod.yml exec frontend env | grep REACT_APP
```

## Solution 2: Rebuild Frontend with Correct URLs

The frontend needs to be rebuilt with the correct API URL:

```bash
# Run the rebuild script
./scripts/rebuild-frontend-for-domain.sh

# Then restart
docker compose -f docker-compose.prod.yml restart frontend nginx
```

## Solution 3: Check Network Configuration

Verify all containers are on the same network:

```bash
# Check networks
docker compose -f docker-compose.prod.yml exec frontend ping -c 2 backend
docker compose -f docker-compose.prod.yml exec nginx ping -c 2 backend
```

## Expected Behavior

After fixing:
- `curl http://localhost/api/v1/nodes` should return JSON data
- Browser requests to `/api/v1/nodes` should return JSON data
- WebSocket connections should establish successfully
- Nginx logs should show incoming `/api/` requests

## Quick Test

From the production server, run:

```bash
# This should return JSON with nodes data
curl http://localhost/api/v1/nodes

# If this works but browser doesn't, it's a frontend build issue
# If this fails, it's an nginx configuration issue
```
