# Complete Production Deployment Guide

## Overview
This guide covers the complete deployment process for villagesmesh.com, including all fixes that have been implemented.

## Issues Fixed
1. ✅ Database initialization (tables not created)
2. ✅ MQTT race condition (unique constraint errors)
3. ✅ Connection pool exhaustion (transaction batching)
4. ✅ Frontend URL configuration (localhost → production domain)

## Quick Start (TL;DR)

```bash
# 1. Initialize database
./scripts/force-schema-creation.sh

# 2. Start services
docker compose -f docker-compose.prod.yml up -d

# 3. Fix frontend URLs
./scripts/fix-frontend-urls.sh villagesmesh.com

# 4. Clear browser cache and reload
```

## Detailed Deployment Steps

### Step 1: Database Initialization

The database schema must be created before starting the backend.

```bash
# Run the database initialization script
./scripts/force-schema-creation.sh

# Verify tables were created
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "\dt"
```

**Expected output:** List of tables including `nodes`, `messages`, `positions`, `telemetry_readings`, `networks`

### Step 2: Start All Services

```bash
# Start all containers
docker compose -f docker-compose.prod.yml up -d

# Check all services are running
docker compose -f docker-compose.prod.yml ps
```

**Expected:** All services show "Up" status

### Step 3: Fix Frontend URLs

The frontend needs to be rebuilt with the correct domain URLs.

```bash
# For HTTP:
./scripts/fix-frontend-urls.sh villagesmesh.com

# For HTTPS (if you have SSL configured):
./scripts/fix-frontend-urls.sh villagesmesh.com https
```

**What this does:**
- Stops frontend container
- Rebuilds with correct API URLs (`/api/v1`)
- Starts frontend back up
- Runs health checks

### Step 4: Verify Deployment

```bash
# Check backend is responding
curl http://localhost/api/v1

# Check frontend is serving
curl -I http://localhost/

# Check for errors in logs
docker compose -f docker-compose.prod.yml logs --tail=50 backend
docker compose -f docker-compose.prod.yml logs --tail=50 frontend
```

### Step 5: Clear Browser Cache

**Critical:** The browser caches the old frontend with localhost URLs.

- **Chrome/Firefox:** Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Or:** Open in incognito/private mode
- **Or:** Clear all browsing data in browser settings

### Step 6: Verify Data Flow

Open `http://villagesmesh.com` in your browser:

1. **Check Console (F12):**
   - No errors about "localhost"
   - API calls going to `/api/v1/*`
   - WebSocket connected

2. **Check Network Tab:**
   - API requests returning 200 status
   - WebSocket connection established (WS tab)

3. **Check Map:**
   - Nodes appearing on map
   - Node count increasing
   - Real-time updates working

## Verification Checklist

### Backend Health
- [ ] Backend container running: `docker compose -f docker-compose.prod.yml ps backend`
- [ ] Health check passing: `curl http://localhost/health`
- [ ] API responding: `curl http://localhost/api/v1`
- [ ] No database errors in logs
- [ ] MQTT connected: `docker compose -f docker-compose.prod.yml logs backend | grep "MQTT"`

### Frontend Health
- [ ] Frontend container running
- [ ] Frontend loads at domain URL
- [ ] No console errors (F12 → Console)
- [ ] API calls to `/api/v1/*` (not localhost)
- [ ] WebSocket connected (Network → WS tab)

### Data Flow
- [ ] MQTT traffic in logs: `docker compose -f docker-compose.prod.yml logs mosquitto`
- [ ] Nodes in database: `docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"`
- [ ] Nodes visible on map
- [ ] Real-time updates working
- [ ] Statistics showing data

### Database Health
- [ ] All tables exist
- [ ] Connection count stable (< 50): `docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*) FROM pg_stat_activity;"`
- [ ] No "idle in transaction" connections
- [ ] No unique constraint errors in logs

## Common Issues & Solutions

### Issue 1: "relation 'networks' does not exist"

**Cause:** Database tables not created

**Fix:**
```bash
./scripts/force-schema-creation.sh
docker compose -f docker-compose.prod.yml restart backend
```

### Issue 2: "Unique constraint failed on nodeId"

**Status:** Fixed in code (race condition handling)

**Verify fix is applied:**
```bash
docker compose -f docker-compose.prod.yml logs backend | grep "Node already exists"
```

Should see "Node already exists" messages instead of errors.

### Issue 3: "Connection pool exhausted"

**Status:** Fixed in code (transaction batching)

**Verify:**
```bash
# Check connection count (should be < 50)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*) FROM pg_stat_activity;"

# Check for "idle in transaction" (should be 0)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction';"
```

### Issue 4: Frontend shows no data

**Cause:** Frontend built with localhost URLs

**Fix:**
```bash
./scripts/fix-frontend-urls.sh villagesmesh.com
# Then hard refresh browser: Ctrl+Shift+R
```

**Verify in browser console:**
- API calls should go to `/api/v1/*`
- No "localhost" in URLs
- No CORS errors

### Issue 5: MQTT not connecting

**Check Mosquitto:**
```bash
docker compose -f docker-compose.prod.yml logs mosquitto
```

**Test MQTT:**
```bash
# Subscribe to all topics
mosquitto_sub -h localhost -t 'msh/#' -v

# Or check backend MQTT status
curl http://localhost/api/v1/mqtt-monitor/stats
```

## Monitoring Commands

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f mosquitto
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Check Service Status
```bash
# All containers
docker compose -f docker-compose.prod.yml ps

# Container stats (CPU, memory)
docker stats
```

### Database Queries
```bash
# Node count
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"

# Recent messages (last hour)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM messages WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';"

# Connection count
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT pg_size_pretty(pg_database_size('meshtastic_mapper'));"
```

### MQTT Stats
```bash
# Backend MQTT stats
curl http://localhost/api/v1/mqtt-monitor/stats

# Live MQTT messages
mosquitto_sub -h localhost -t 'msh/#' -v
```

## Architecture

```
Browser (villagesmesh.com)
    ↓
Nginx (port 80/443)
    ├─→ /api/v1/*     → Backend (port 3001) [API Routes]
    ├─→ /socket.io/*  → Backend (port 3001) [WebSocket]
    └─→ /*            → Frontend (port 8080) [Static Files]
    
Backend (port 3001)
    ├─→ PostgreSQL (port 5432) [Database]
    ├─→ Redis (port 6379) [Cache]
    └─→ Mosquitto (port 1883) [MQTT Broker]
```

## Configuration Files

### Environment Variables (.env.prod)
```bash
# Database
POSTGRES_DB=meshtastic_mapper
POSTGRES_USER=meshtastic
POSTGRES_PASSWORD=<strong-password>

# Redis
REDIS_PASSWORD=<strong-password>

# Backend
JWT_SECRET=<strong-secret>
FRONTEND_URL=http://villagesmesh.com

# Frontend (set via build args)
REACT_APP_API_URL=/api/v1
REACT_APP_WS_URL=ws://villagesmesh.com
```

### Key Files
- `docker-compose.prod.yml` - Production services configuration
- `config/nginx/nginx.prod.conf` - Nginx reverse proxy
- `config/mosquitto/mosquitto.conf` - MQTT broker
- `backend/prisma/schema.prisma` - Database schema
- `scripts/fix-frontend-urls.sh` - Frontend URL fix script
- `scripts/force-schema-creation.sh` - Database initialization

## Maintenance

### Update Application
```bash
# Pull latest code
git pull

# Rebuild services
docker compose -f docker-compose.prod.yml build

# Restart services
docker compose -f docker-compose.prod.yml up -d

# If frontend URLs changed, rebuild frontend
./scripts/fix-frontend-urls.sh villagesmesh.com
```

### Backup Database
```bash
# Create backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U meshtastic meshtastic_mapper > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker compose -f docker-compose.prod.yml exec -T postgres psql -U meshtastic meshtastic_mapper < backup_20260119_120000.sql
```

### Clean Old Data
```bash
# Delete messages older than 30 days
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "DELETE FROM messages WHERE \"createdAt\" < NOW() - INTERVAL '30 days';"

# Delete old telemetry
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "DELETE FROM telemetry_readings WHERE \"timestamp\" < NOW() - INTERVAL '30 days';"

# Vacuum database
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "VACUUM ANALYZE;"
```

## Success Criteria

Your deployment is successful when:

✅ All containers running and healthy  
✅ Frontend loads at `http://villagesmesh.com`  
✅ No console errors in browser  
✅ API calls going to `/api/v1/*`  
✅ WebSocket connected  
✅ Nodes visible on map  
✅ Real-time updates working  
✅ Statistics showing data  
✅ MQTT traffic being processed  
✅ No errors in logs  
✅ Database connections stable (< 50)  
✅ No "idle in transaction" connections  

## Support Documentation

- `QUICK_FIX_FRONTEND.md` - Quick frontend URL fix (2 minutes)
- `FRONTEND_URL_FIX_COMPLETE.md` - Detailed frontend fix guide
- `CONNECTION_POOL_FIX.md` - Database connection pool fix
- `MQTT_RACE_CONDITION_FIX_V2.md` - MQTT race condition fix
- `TRANSACTION_FIX.md` - Transaction batching fix
- `docs/troubleshooting-database.md` - Database troubleshooting
- `docs/troubleshooting.md` - General troubleshooting

## Timeline

- **T+0:** Run database initialization
- **T+1m:** Start all services
- **T+2m:** Fix frontend URLs
- **T+4m:** Frontend rebuilt and running
- **T+5m:** Clear browser cache and test
- **T+10m:** Verify all metrics
- **T+30m:** Monitor for stability
- **T+24h:** Confirm long-term stability

## Next Steps

After successful deployment:

1. **Monitor for 24 hours** to ensure stability
2. **Set up automated backups** (cron job)
3. **Configure SSL/TLS** if using HTTPS
4. **Set up monitoring** (Prometheus/Grafana if needed)
5. **Document any custom configuration** for your deployment

## Deployment Complete! 🎉

Once all success criteria are met, your production deployment is complete and working correctly.
