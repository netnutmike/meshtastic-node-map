# WebSocket "Invalid Namespace" Fix

## Issue

Frontend showing error:
```
WebSocket connection error: Error: Invalid namespace
```

## Root Cause

The frontend was trying to connect to Socket.IO at `ws://villagesmesh.com/api`, which Socket.IO interprets as trying to connect to the `/api` namespace. However, the backend Socket.IO server is listening on the **default namespace** (`/`), not `/api`.

## Solution

Changed the WebSocket URL from:
```
REACT_APP_WS_URL=ws://villagesmesh.com/api
```

To:
```
REACT_APP_WS_URL=ws://villagesmesh.com
```

This makes the frontend connect to the root namespace where Socket.IO is actually listening.

## Deployment

Run on the production server:

```bash
# Rebuild frontend with corrected WebSocket URL
./scripts/rebuild-frontend-for-domain.sh

# Or manually:
cd frontend
npm run build
cd ..

# Rebuild and restart frontend container
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
docker compose -f docker-compose.prod.yml restart nginx
```

## Verification

After deployment, check browser console:
- ✅ Should see: "WebSocket connected"
- ✅ Should NOT see: "Invalid namespace" error
- ✅ Real-time updates should work

## Technical Details

**Socket.IO URL Structure:**
- `ws://domain.com` → Connects to default namespace `/`
- `ws://domain.com/api` → Tries to connect to namespace `/api`

**Our Setup:**
- Backend Socket.IO listens on: `/` (default namespace)
- Nginx proxies `/socket.io/` to backend
- Frontend should connect to: `ws://villagesmesh.com` (not `/api`)

**Why `/api` in REST but not WebSocket:**
- REST API endpoints: `http://villagesmesh.com/api/v1/nodes` ✅
- WebSocket connection: `ws://villagesmesh.com` ✅ (Socket.IO adds `/socket.io/` automatically)
