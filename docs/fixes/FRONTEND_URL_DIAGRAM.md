# Frontend URL Configuration - Visual Guide

## The Problem

### Before Fix (Current State)
```
Browser (villagesmesh.com)
    │
    ├─ Loads HTML/CSS/JS from: https://villagesmesh.com ✓
    │
    └─ Tries to fetch API from: http://localhost:3001 ✗
                                 ^^^^^^^^^^^^^^^^^^^^
                                 WRONG! This is baked into the React build
```

**Result**: Frontend loads but shows no data because API calls fail.

### After Fix (Target State)
```
Browser (villagesmesh.com)
    │
    ├─ Loads HTML/CSS/JS from: https://villagesmesh.com ✓
    │
    └─ Fetches API from: https://villagesmesh.com/api ✓
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                         CORRECT! Nginx proxies to backend
```

**Result**: Frontend loads AND displays data from backend.

## How React Environment Variables Work

### Build Time (When Docker Image is Created)
```javascript
// In React code:
const API_URL = process.env.REACT_APP_API_URL;

// During build, this becomes:
const API_URL = "http://localhost:3001";  // ← Hardcoded into bundle.js
```

### Runtime (When User Opens Browser)
```javascript
// The value is already baked in, can't be changed:
const API_URL = "http://localhost:3001";  // ← Still hardcoded!
```

**This is why we need to rebuild the Docker image with correct values.**

## The Fix Process

### Step 1: Set Build Arguments
```bash
export REACT_APP_API_URL="https://villagesmesh.com/api"
export REACT_APP_WS_URL="wss://villagesmesh.com/api"
```

### Step 2: Rebuild Docker Image
```bash
docker compose build --build-arg REACT_APP_API_URL="..." frontend
```

### Step 3: During Build
```dockerfile
# Dockerfile.prod
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL

# These get passed to npm build
RUN npm run build
```

### Step 4: React Build Process
```javascript
// Now during build:
const API_URL = process.env.REACT_APP_API_URL;

// Becomes:
const API_URL = "https://villagesmesh.com/api";  // ← Correct!
```

### Step 5: New Bundle Created
```
bundle.js now contains:
  const API_URL = "https://villagesmesh.com/api";
```

## Network Flow After Fix

```
User Browser
    │
    │ 1. Request: https://villagesmesh.com
    ▼
Nginx (Port 80/443)
    │
    │ 2. Proxy to frontend container
    ▼
Frontend Container (Port 8080)
    │
    │ 3. Serve HTML/CSS/JS with correct API URLs
    ▼
User Browser
    │
    │ 4. Execute JavaScript
    │ 5. Fetch: https://villagesmesh.com/api/nodes
    ▼
Nginx (Port 80/443)
    │
    │ 6. Proxy /api/* to backend
    ▼
Backend Container (Port 3001)
    │
    │ 7. Query database
    ▼
PostgreSQL
    │
    │ 8. Return data
    ▼
Backend → Nginx → Browser
    │
    │ 9. Display nodes on map ✓
    ▼
User sees data!
```

## Configuration Files

### .env.prod (Environment Variables)
```bash
# These are used during Docker build
REACT_APP_API_URL=https://villagesmesh.com/api
REACT_APP_WS_URL=wss://villagesmesh.com/api
FRONTEND_URL=https://villagesmesh.com
```

### docker-compose.prod.yml (Build Configuration)
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.prod
    args:
      REACT_APP_API_URL: ${REACT_APP_API_URL}  # ← Passed to build
      REACT_APP_WS_URL: ${REACT_APP_WS_URL}    # ← Passed to build
```

### frontend/Dockerfile.prod (Build Process)
```dockerfile
# Accept build arguments
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL

# Make available to npm build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL

# Build React app (URLs get baked in here)
RUN npm run build
```

### config/nginx/nginx.prod.conf (Proxying)
```nginx
# Proxy API requests to backend
location /api/ {
    proxy_pass http://backend:3001;
}

# Proxy WebSocket to backend
location /socket.io/ {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Serve frontend static files
location / {
    proxy_pass http://frontend:8080;
}
```

## Why This Happens

### Development vs Production

**Development** (works fine):
```
Developer machine:
  - Frontend: http://localhost:3000
  - Backend: http://localhost:3001
  - Both on same machine, localhost works ✓
```

**Production** (breaks):
```
Production server:
  - Frontend: https://villagesmesh.com
  - Backend: http://localhost:3001 (inside container)
  - User browser can't reach "localhost" ✗
```

### The Solution
Use domain name instead of localhost:
```
Production server:
  - Frontend: https://villagesmesh.com
  - Backend: https://villagesmesh.com/api (proxied by nginx)
  - User browser can reach domain ✓
```

## Verification Checklist

### Before Fix
- [ ] Browser console shows: `GET http://localhost:3001/api/nodes net::ERR_CONNECTION_REFUSED`
- [ ] Network tab shows failed requests to localhost
- [ ] Map is empty, no nodes displayed
- [ ] Connection status shows "Disconnected"

### After Fix
- [x] Browser console shows: `GET https://villagesmesh.com/api/nodes 200 OK`
- [x] Network tab shows successful requests to villagesmesh.com
- [x] Map displays nodes from database
- [x] Connection status shows "Connected" (green)

## Common Mistakes

### ❌ Changing .env.prod After Build
```bash
# This won't work:
echo "REACT_APP_API_URL=https://villagesmesh.com/api" >> .env.prod
docker compose up -d  # ← Image already built with old values!
```

### ✓ Rebuild After Changing .env.prod
```bash
# This works:
echo "REACT_APP_API_URL=https://villagesmesh.com/api" >> .env.prod
docker compose build --no-cache frontend  # ← Rebuild with new values
docker compose up -d
```

### ❌ Using HTTP Instead of HTTPS
```bash
# Wrong for production with SSL:
REACT_APP_API_URL=http://villagesmesh.com/api   # ← HTTP
REACT_APP_WS_URL=ws://villagesmesh.com/api      # ← WS
```

### ✓ Using HTTPS and WSS
```bash
# Correct for production with SSL:
REACT_APP_API_URL=https://villagesmesh.com/api  # ← HTTPS
REACT_APP_WS_URL=wss://villagesmesh.com/api     # ← WSS
```

## Summary

1. **Problem**: React environment variables are baked into the build at compile time
2. **Cause**: Frontend was built with `localhost` URLs
3. **Solution**: Rebuild frontend Docker image with production domain URLs
4. **Command**: `./scripts/rebuild-frontend-for-domain.sh villagesmesh.com`
5. **Time**: ~5 minutes
6. **Result**: Frontend connects to correct API and displays data

## Next Steps

Run the fix:
```bash
./scripts/rebuild-frontend-for-domain.sh villagesmesh.com
```

See also:
- `DEPLOY_FRONTEND_FIX.md` - Step-by-step deployment guide
- `FRONTEND_FIX_COMMANDS.md` - Quick command reference
- `FRONTEND_URL_FIX.md` - Detailed troubleshooting guide
