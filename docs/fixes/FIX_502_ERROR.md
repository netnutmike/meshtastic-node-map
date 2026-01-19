# Fix 502 Bad Gateway Error

## Current Issue

The frontend at `http://villagesmesh.com/nodes` is getting **502 Bad Gateway** errors when trying to reach the API:

```
API request failed for /v1/nodes: Error: HTTP error! status: 502
WebSocket connection to 'ws://villagesmesh.com/socket.io/' failed
```

## What We Know

From previous diagnostics:
- ✅ Backend is healthy: `curl http://localhost:3001/health` works
- ✅ Nginx can reach backend internally: `docker compose exec nginx curl http://backend:3001/health` works  
- ✅ Nginx logs show NO incoming external requests
- ❌ External requests getting 502 errors

## Root Cause

The 502 error means nginx is trying to proxy the request but **cannot reach the backend**. Since internal health checks work, this suggests:

1. **Nginx is not receiving external requests** on port 80, OR
2. **Nginx configuration issue** with the proxy_pass directives, OR
3. **Docker networking issue** between containers

## Diagnostic Steps

Run these commands on the production server to diagnose:

### 1. Check if nginx is receiving external requests

```bash
# Watch nginx access logs in real-time
docker compose -f docker-compose.prod.yml logs -f nginx

# In another terminal, try to access the site
curl -v http://villagesmesh.com/api/v1/nodes
```

**Expected:** You should see the request appear in nginx logs
**If not:** Nginx is not receiving external traffic (firewall/DNS issue)

### 2. Check nginx error logs

```bash
docker compose -f docker-compose.prod.yml exec nginx cat /var/log/nginx/error.log
```

**Look for:** Connection refused, timeout, or upstream errors

### 3. Test API endpoint from the server itself

```bash
# Test through nginx from host
curl -v http://localhost/api/v1/nodes

# Test backend directly
curl -v http://localhost:3001/api/v1/nodes
```

### 4. Check Docker networking

```bash
# Check if nginx can reach backend
docker compose -f docker-compose.prod.yml exec nginx curl -v http://backend:3001/api/v1/nodes

# Check DNS resolution
docker compose -f docker-compose.prod.yml exec nginx nslookup backend

# Check network connectivity
docker compose -f docker-compose.prod.yml exec nginx ping -c 3 backend
```

### 5. Check what's listening on port 80

```bash
sudo netstat -tlnp | grep :80
# or
sudo ss -tlnp | grep :80
```

**Expected:** Should show docker-proxy or nginx listening on 0.0.0.0:80

### 6. Check Docker port mapping

```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected:** nginx should show `0.0.0.0:80->80/tcp`

## Possible Fixes

### Fix 1: Restart nginx

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

### Fix 2: Check nginx configuration

```bash
# Test nginx config
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Fix 3: Rebuild and restart all services

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Fix 4: Check firewall rules

```bash
# Check if port 80 is open
sudo ufw status | grep 80
# or
sudo iptables -L -n | grep 80
```

### Fix 5: Check if another service is using port 80

```bash
# Stop docker services
docker compose -f docker-compose.prod.yml down

# Check what's on port 80
sudo lsof -i :80

# Start services again
docker compose -f docker-compose.prod.yml up -d
```

## Quick Diagnostic Script

Run this comprehensive diagnostic:

```bash
./scripts/diagnose-502-error.sh
```

## Expected Working State

When fixed, you should see:

1. **Nginx access logs** showing incoming requests:
   ```
   172.x.x.x - - [19/Jan/2026:22:45:00 +0000] "GET /api/v1/nodes HTTP/1.1" 200 ...
   ```

2. **API requests succeeding**:
   ```bash
   curl http://villagesmesh.com/api/v1/nodes
   # Should return JSON with nodes
   ```

3. **WebSocket connecting**:
   ```bash
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     http://villagesmesh.com/socket.io/
   # Should return 101 Switching Protocols
   ```

4. **Frontend loading data** without errors in browser console

## Next Steps

1. Run the diagnostic commands above
2. Share the output so we can identify the exact issue
3. Apply the appropriate fix based on findings

The most likely issues are:
- Nginx not receiving external traffic (firewall/routing)
- Docker networking misconfiguration
- Port 80 conflict with another service
