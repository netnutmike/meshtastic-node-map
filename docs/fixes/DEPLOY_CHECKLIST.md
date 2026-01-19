# 🚀 Production Deployment Checklist

## Pre-Deployment

- [x] Race condition bug identified in `mqtt-manager.service.ts`
- [x] Fix implemented with try-catch and retry logic
- [x] TypeScript compilation successful (no errors)
- [x] Null checks added to prevent crashes
- [x] Deployment script created and tested
- [x] Documentation written

## Deployment Steps

### 1. Transfer Files to Production Server

If you're working on a different machine, transfer these files:

```bash
# Copy the entire project or just pull from git
git pull origin main
```

### 2. Run Deployment Script

```bash
./scripts/deploy-mqtt-race-condition-fix.sh
```

**Expected output:**
- ✅ Backend rebuilds successfully
- ✅ Backend starts without errors
- ✅ Health check returns HTTP 200
- ✅ No unique constraint errors

### 3. Monitor Node Creation (5 minutes)

```bash
watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;"'
```

**Expected:** Node count increases every 5-10 seconds

### 4. Verify No Errors

```bash
docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep "Unique constraint"
```

**Expected:** No output (no errors)

### 5. Check Backend Logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend | grep "Created new node"
```

**Expected:** Regular "Created new node" messages

## Post-Deployment Verification

### Database Checks

```bash
# Node count
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"

# Message count
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM messages;"

# Position count
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM positions;"

# Network status
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT id, name, \"isActive\", \"mqttBroker\" FROM networks;"
```

### Service Health

```bash
# Backend health
curl http://localhost:3001/health

# All containers running
docker compose -f docker-compose.prod.yml ps

# No container restarts
docker compose -f docker-compose.prod.yml ps | grep -i "restarting"
```

### MQTT Connection

```bash
# Check MQTT connection status
docker compose -f docker-compose.prod.yml logs backend | grep -i "mqtt connected"

# Check Mosquitto logs
docker compose -f docker-compose.prod.yml logs mosquitto --tail=50
```

## Success Criteria

- [x] Backend container running (not restarting)
- [x] Backend health check returns 200
- [x] MQTT connection established
- [x] Node count > 0 and increasing
- [x] Message count > 0 and increasing
- [x] No "Unique constraint" errors in logs
- [x] "Created new node" messages in logs
- [x] No connection pool exhaustion errors
- [ ] Frontend accessible and showing data (NEEDS FIX - see below)

## Frontend Fix Required

The backend is working, but the frontend needs to be rebuilt with correct URLs.

### Quick Fix (5 minutes)

```bash
./scripts/rebuild-frontend-for-domain.sh villagesmesh.com
```

### What This Does
- Rebuilds frontend with `REACT_APP_API_URL=https://villagesmesh.com/api`
- Rebuilds frontend with `REACT_APP_WS_URL=wss://villagesmesh.com/api`
- Restarts frontend container

### Verify Frontend Fix
1. Open `https://villagesmesh.com` in browser
2. Press F12 for DevTools
3. Check Console - should see no `localhost` errors
4. Check Network tab - API calls should go to `villagesmesh.com/api`
5. Map should display nodes

### Documentation
- **Quick Guide:** `DEPLOY_FRONTEND_FIX.md`
- **Commands:** `FRONTEND_FIX_COMMANDS.md`
- **Detailed:** `FRONTEND_URL_FIX.md`
- **Visual:** `FRONTEND_URL_DIAGRAM.md`

## Rollback Plan (if needed)

If something goes wrong:

```bash
# Stop backend
docker compose -f docker-compose.prod.yml stop backend

# Check logs for specific error
docker compose -f docker-compose.prod.yml logs backend --tail=100

# Restart backend
docker compose -f docker-compose.prod.yml up -d backend

# If still failing, rebuild from scratch
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Issue: Backend won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Check database connection
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Rebuild
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml up -d backend
```

### Issue: Nodes still not appearing

```bash
# Run diagnostics
./scripts/diagnose-production-mqtt.sh

# Check MQTT traffic
docker compose -f docker-compose.prod.yml logs mosquitto --tail=50

# Verify network config
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT * FROM networks;"
```

### Issue: Still seeing unique constraint errors

```bash
# Verify the fix was applied
docker compose -f docker-compose.prod.yml exec backend cat /app/dist/services/mqtt-manager.service.js | grep -A 5 "P2002"

# If not found, rebuild
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml restart backend
```

## Documentation Reference

- **Quick Start:** `PRODUCTION_FIX_NOW.md`
- **Technical Details:** `MQTT_RACE_CONDITION_FIX.md`
- **Troubleshooting:** `PRODUCTION_MQTT_TROUBLESHOOTING.md`
- **Complete Guide:** `PRODUCTION_DEPLOYMENT_SUCCESS.md`
- **Visual Summary:** `FIX_SUMMARY.md`

## Timeline

- **T+0:** Run deployment script
- **T+30s:** Backend rebuilt and starting
- **T+1m:** Backend connected to MQTT
- **T+2m:** First nodes appearing
- **T+5m:** Steady node creation
- **T+10m:** Verify all metrics
- **T+30m:** Monitor for stability
- **T+24h:** Confirm long-term stability

## Notes

- The race condition bug only appeared under high MQTT traffic
- Dev machine had lower traffic, so bug was less visible
- Production traffic volume exposed the concurrency issue
- Fix handles concurrent node creation gracefully
- No data loss - all messages will be processed correctly

## Deployment Complete! ✅

Once all success criteria are met, your production deployment is complete and working correctly.

**Next:** Monitor for 24 hours to ensure stability, then consider this deployment successful.
