# Production Deployment Fixes - Complete Summary

## Overview
This document summarizes all fixes applied to get the production deployment working on `villagesmesh.com`.

## Timeline of Issues and Fixes

### Issue 1: Database Tables Not Created ✅ FIXED
**Problem**: Backend crashed with "relation 'networks' does not exist"
**Root Cause**: Prisma migrations marked as applied but tables never created
**Solution**: 
- Fixed TypeScript compilation error in `backend/src/index.ts`
- Added retry logic to backend startup
- Created `scripts/force-schema-creation.sh` to reset and recreate schema
**Status**: ✅ Resolved - Database tables created successfully

### Issue 2: MQTT Race Condition ✅ FIXED
**Problem**: Nodes not being created, "Unique constraint failed on nodeId" errors
**Root Cause**: Multiple concurrent MQTT messages trying to create same node simultaneously
**Solution**:
- Modified `backend/src/services/mqtt-manager.service.ts`
- Added race condition handling by catching `DatabaseValidationError`
- Added null checks to prevent crashes
**Status**: ✅ Resolved - Nodes being created without errors

### Issue 3: Connection Pool Exhaustion ✅ FIXED
**Problem**: "Timed out fetching connection from pool" errors, 36 connections stuck "idle in transaction"
**Root Cause**: Connection leak - database operations not properly releasing connections
**Solution**:
- Wrapped all MQTT message handling in single Prisma transaction
- Changed from 7-10 separate operations to 1 transaction per message
- Increased connection pool limits and timeouts
- Added PostgreSQL performance tuning
**Status**: ✅ Resolved - User confirmed "everything seems to be working now"

### Issue 4: Frontend Shows No Data ⚠️ IN PROGRESS
**Problem**: Frontend loads but shows no data, browser console shows `localhost` in API URLs
**Root Cause**: Frontend built with hardcoded `localhost` URLs instead of production domain
**Solution**: Rebuild frontend with correct URLs
**Status**: ⚠️ Awaiting deployment

## Current Status

### ✅ Working
- PostgreSQL database with all tables
- Backend API responding to requests
- MQTT broker receiving traffic
- Nodes being created in database
- Transactions preventing connection leaks
- Nginx proxying configured correctly

### ⚠️ Needs Action
- Frontend needs rebuild with correct URLs

## Next Steps

### 1. Rebuild Frontend (REQUIRED)
```bash
cd /path/to/meshtastic-node-mapper
./scripts/rebuild-frontend-for-domain.sh villagesmesh.com
```

This will:
- Load environment from `.env.prod`
- Stop frontend container
- Rebuild with `REACT_APP_API_URL=https://villagesmesh.com/api`
- Rebuild with `REACT_APP_WS_URL=wss://villagesmesh.com/api`
- Start frontend container
- Verify deployment

### 2. Verify in Browser
1. Open `https://villagesmesh.com`
2. Press F12 for DevTools
3. Check Console - should see no `localhost` references
4. Check Network tab - API calls should go to `villagesmesh.com/api`
5. Clear cache if needed: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### 3. Monitor Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

## Key Files Modified

### Backend
- `backend/src/index.ts` - Added retry logic, fixed TypeScript error
- `backend/src/services/mqtt-manager.service.ts` - Transaction wrapping, race condition handling
- `backend/src/database/connection.ts` - Increased connection pool settings
- `backend/package.json` - Added Prisma seed configuration

### Configuration
- `docker-compose.prod.yml` - PostgreSQL tuning, connection pool settings
- `.env.prod` - Production environment variables for villagesmesh.com
- `config/nginx/nginx.prod.conf` - API proxying (already correct)

### Scripts
- `scripts/force-schema-creation.sh` - Database schema reset
- `scripts/diagnose-connection-leak.sh` - Connection pool diagnostics
- `scripts/rebuild-frontend-for-domain.sh` - Frontend rebuild with correct URLs

### Documentation
- `DEPLOYMENT_ISSUE_FIX.md` - Database initialization fixes
- `MQTT_RACE_CONDITION_FIX_V2.md` - Race condition fixes
- `TRANSACTION_FIX.md` - Connection pool fixes
- `FRONTEND_URL_FIX.md` - Frontend URL configuration (this issue)
- `FRONTEND_FIX_COMMANDS.md` - Quick command reference

## Configuration Summary

### Environment Variables (.env.prod)
```bash
REACT_APP_API_URL=https://villagesmesh.com/api
REACT_APP_WS_URL=wss://villagesmesh.com/api
FRONTEND_URL=https://villagesmesh.com
POSTGRES_DB=meshtastic_mapper
POSTGRES_USER=meshtastic
# ... (passwords set by user)
```

### Database Connection Pool
- Max connections: 50 (Prisma) / 200 (PostgreSQL)
- Connection timeout: 30s
- Query timeout: 60s
- Pool timeout: 60s

### Nginx Proxying
- `/api/*` → backend:3001
- `/socket.io/*` → backend:3001 (WebSocket)
- `/*` → frontend:8080

## Troubleshooting Quick Reference

### Backend Issues
```bash
# Check backend health
curl http://localhost:3001/health

# View backend logs
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Check database connections
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

### Frontend Issues
```bash
# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend --tail=50

# Verify build args
docker compose -f docker-compose.prod.yml config | grep REACT_APP

# Rebuild if needed
./scripts/rebuild-frontend-for-domain.sh villagesmesh.com
```

### MQTT Issues
```bash
# Check MQTT logs
docker compose -f docker-compose.prod.yml logs mosquitto --tail=50

# Test MQTT connection
mosquitto_sub -h localhost -t 'msh/#' -v
```

### Nginx Issues
```bash
# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx --tail=50

# Test nginx config
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Success Criteria

When everything is working, you should see:

✅ **Backend**
- Health endpoint returns 200
- Nodes being created from MQTT traffic
- No connection pool errors
- No race condition errors

✅ **Frontend**
- Page loads at https://villagesmesh.com
- No localhost URLs in browser console
- API calls successful in Network tab
- WebSocket connected (green indicator)
- Map displays nodes
- All pages show data

✅ **Database**
- Tables exist and populated
- Connections properly released
- No "idle in transaction" connections
- Query performance good

✅ **MQTT**
- Broker receiving traffic
- Messages being processed
- Nodes appearing in database
- No duplicate node errors

## Performance Monitoring

### Check System Resources
```bash
# Container stats
docker stats

# Disk usage
docker system df

# Database size
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT pg_size_pretty(pg_database_size('meshtastic_mapper'));"
```

### Monitor Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Error logs only
docker compose -f docker-compose.prod.yml logs | grep -i error
```

## Maintenance Commands

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Backup Database
```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U meshtastic meshtastic_mapper > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Contact and Support

If issues persist after following this guide:

1. Check all logs for errors
2. Verify environment variables are set correctly
3. Ensure DNS is pointing to correct IP
4. Verify firewall allows ports 80, 443, 1883
5. Check SSL certificates if using HTTPS

## Related Documentation

- `FRONTEND_URL_FIX.md` - Detailed frontend URL fix guide
- `FRONTEND_FIX_COMMANDS.md` - Quick command reference
- `TRANSACTION_FIX.md` - Connection pool fix details
- `MQTT_RACE_CONDITION_FIX_V2.md` - Race condition fix details
- `DEPLOYMENT_ISSUE_FIX.md` - Database initialization fix details
- `docs/production-deployment.md` - Full production deployment guide
- `docs/troubleshooting-database.md` - Database troubleshooting guide
