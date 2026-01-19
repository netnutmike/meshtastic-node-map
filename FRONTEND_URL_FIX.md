# Frontend URL Configuration Fix

## Problem
The frontend was built with hardcoded `localhost` URLs instead of the production domain `villagesmesh.com`. This causes API calls to fail because the browser tries to connect to `localhost` instead of the actual server.

## Root Cause
The frontend Docker image was built without the correct `REACT_APP_API_URL` and `REACT_APP_WS_URL` build arguments. These values are baked into the React build at compile time, so they need to be set during the Docker build process.

## Solution

### Quick Fix (Recommended)
Run the rebuild script on your production server:

```bash
cd /path/to/meshtastic-node-mapper
./scripts/rebuild-frontend-for-domain.sh villagesmesh.com
```

This script will:
1. Load environment variables from `.env.prod`
2. Stop the frontend container
3. Rebuild the frontend with correct URLs
4. Start the frontend container
5. Verify the deployment

### Manual Fix
If you prefer to do it manually:

```bash
# 1. Set environment variables
export REACT_APP_API_URL="https://villagesmesh.com/api"
export REACT_APP_WS_URL="wss://villagesmesh.com/api"
export FRONTEND_URL="https://villagesmesh.com"

# 2. Stop frontend
docker compose -f docker-compose.prod.yml stop frontend

# 3. Rebuild frontend with correct URLs
docker compose -f docker-compose.prod.yml build --no-cache \
  --build-arg REACT_APP_API_URL="$REACT_APP_API_URL" \
  --build-arg REACT_APP_WS_URL="$REACT_APP_WS_URL" \
  frontend

# 4. Start frontend
docker compose -f docker-compose.prod.yml up -d frontend

# 5. Check logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

## Verification

### 1. Check Browser Console
Open your browser to `https://villagesmesh.com` and check the console (F12):
- You should see API calls going to `https://villagesmesh.com/api/...`
- WebSocket should connect to `wss://villagesmesh.com/api`
- No more `localhost` references

### 2. Check Network Tab
In browser DevTools Network tab:
- API calls should show status 200 (or appropriate status)
- Look for calls to `/api/nodes`, `/api/networks`, etc.
- All should be going to `villagesmesh.com`, not `localhost`

### 3. Check Backend Logs
```bash
docker compose -f docker-compose.prod.yml logs backend --tail=50
```
You should see incoming API requests from the frontend.

### 4. Test WebSocket Connection
The connection status indicator in the UI should show "Connected" (green).

## Configuration Files

### .env.prod
The `.env.prod` file contains the correct environment variables:
```bash
REACT_APP_API_URL=https://villagesmesh.com/api
REACT_APP_WS_URL=wss://villagesmesh.com/api
FRONTEND_URL=https://villagesmesh.com
```

### docker-compose.prod.yml
The frontend service uses these build args:
```yaml
frontend:
  build:
    args:
      REACT_APP_API_URL: ${REACT_APP_API_URL:-http://localhost:3001}
      REACT_APP_WS_URL: ${REACT_APP_WS_URL:-ws://localhost:3001}
```

### Nginx Configuration
Nginx is correctly configured to proxy:
- `/api/*` → backend:3001
- `/socket.io/*` → backend:3001 (WebSocket)
- `/*` → frontend:8080 (static files)

## Troubleshooting

### Still seeing localhost URLs after rebuild
1. **Clear browser cache**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Try incognito/private mode**: This ensures no cached files
3. **Check build args were applied**:
   ```bash
   docker compose -f docker-compose.prod.yml config | grep REACT_APP
   ```

### API calls return 502 Bad Gateway
1. Check backend is running:
   ```bash
   docker compose -f docker-compose.prod.yml ps backend
   ```
2. Check backend logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs backend --tail=50
   ```
3. Test backend directly:
   ```bash
   curl http://localhost:3001/health
   ```

### WebSocket not connecting
1. Check nginx logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs nginx --tail=50
   ```
2. Verify WebSocket upgrade headers in browser Network tab
3. Check backend WebSocket endpoint:
   ```bash
   docker compose -f docker-compose.prod.yml logs backend | grep socket.io
   ```

### Frontend shows blank page
1. Check frontend logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs frontend --tail=50
   ```
2. Check nginx logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs nginx --tail=50
   ```
3. Verify frontend container is healthy:
   ```bash
   docker compose -f docker-compose.prod.yml ps frontend
   ```

## Important Notes

1. **Build-time vs Runtime**: React environment variables are baked into the build at compile time. Changing `.env.prod` after the image is built won't affect the frontend - you must rebuild.

2. **HTTPS/WSS**: Make sure you're using `https://` and `wss://` (not `http://` and `ws://`) for production with SSL.

3. **CORS**: The backend `FRONTEND_URL` environment variable should match your domain to allow CORS requests.

4. **DNS**: Ensure `villagesmesh.com` DNS is pointing to your server's IP address.

5. **Firewall**: Ports 80 and 443 must be open on your server.

## Next Steps After Fix

Once the frontend is rebuilt and working:

1. **Test all features**:
   - Map loads with nodes
   - Node details panel works
   - Statistics page shows data
   - Network insights display correctly
   - MQTT monitor shows traffic

2. **Monitor logs** for any errors:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```

3. **Set up SSL** (if not already done):
   - Use Let's Encrypt/Certbot for free SSL certificates
   - Update nginx config to use SSL
   - Redirect HTTP to HTTPS

4. **Performance tuning**:
   - Monitor resource usage
   - Adjust connection pool settings if needed
   - Enable caching in nginx for static assets

## Success Indicators

✅ Browser console shows no localhost URLs
✅ API calls return data (check Network tab)
✅ WebSocket shows "Connected" status
✅ Map displays nodes from database
✅ No CORS errors in console
✅ Backend logs show incoming requests

## Related Documentation

- `TRANSACTION_FIX.md` - Connection pool and transaction fixes
- `MQTT_RACE_CONDITION_FIX_V2.md` - MQTT race condition fixes
- `DEPLOYMENT_ISSUE_FIX.md` - Database initialization fixes
- `docs/production-deployment.md` - Full production deployment guide
