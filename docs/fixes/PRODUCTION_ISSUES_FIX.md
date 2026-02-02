# Production Issues Fix - January 26, 2026

## Issues Identified

Based on the debug output from your production server, there are **three critical interconnected issues**:

### 1. Mosquitto OOM Crashes (CRITICAL)

**Symptoms:**
- Mosquitto container status: "Up 28 seconds" (constantly restarting)
- Memory usage: 728.5MiB / 1GiB (71.15%) - hitting limit
- 20+ OOM kill events in kernel logs
- Container crashes every 40-60 seconds

**Root Cause:**
The production containers are still running with the **old 1GB memory limit**. Even though `docker-compose.prod.yml` was updated to 2GB, the running containers haven't been restarted with the new configuration.

**Evidence:**
```
Memory cgroup out of memory: Killed process 424609 (mosquitto) 
total-vm:1053440kB, anon-rss:1046092kB
```

### 2. Database Foreign Key Constraint Violations (CRITICAL)

**Symptoms:**
- Hundreds of database errors per minute
- Backend errors: `Foreign key constraint violated: nodes_networkId_fkey (index)`
- Error detail: `Key (networkId)=(default) is not present in table "networks"`

**Root Cause:**
The backend is trying to update nodes with `networkId='default'`, but the database only has a network with `id='default-network'`. This is a mismatch between what the backend expects and what exists in the database.

**Evidence:**
```sql
ERROR: insert or update on table "nodes" violates foreign key constraint "nodes_networkId_fkey"
DETAIL: Key (networkId)=(default) is not present in table "networks"
```

### 3. Backend MQTT Connection Failures (SECONDARY)

**Symptoms:**
- Rapid connect/disconnect cycles
- Frontend showing: "Network default-network status: disconnected/connected" cycling
- MQTT Monitor returning 503 errors

**Root Cause:**
This is a **consequence** of issues #1 and #2:
- Mosquitto keeps crashing (issue #1), so backend can't maintain connection
- Database errors (issue #2) prevent proper data processing

**Evidence:**
```
MQTT connection error: connect ECONNREFUSED 172.21.0.4:1883
Network default-network disconnected
```

## The Fix

### Quick Diagnostic (Run First)

```bash
chmod +x scripts/quick-production-diagnostic.sh
./scripts/quick-production-diagnostic.sh
```

This will show you all issues without making any changes.

### Apply the Fix

```bash
chmod +x scripts/fix-production-issues.sh
./scripts/fix-production-issues.sh
```

### What the Fix Does

1. **Checks current configuration** - Verifies Mosquitto memory limit and database state
2. **Fixes database network** - Renames 'default' to 'default-network' OR creates 'default-network' if missing
3. **Updates node records** - Changes any nodes using networkId='default' to 'default-network'
4. **Stops all services** - Cleanly shuts down docker-compose
5. **Optionally clears Mosquitto persistence** - Removes retained messages to prevent memory issues
6. **Restarts with new config** - Applies the 2GB memory limit from docker-compose.prod.yml
7. **Verifies the fix** - Checks that all issues are resolved

## Expected Results

After running the fix script:

✅ **Mosquitto:**
- Memory limit: 2GB (was 1GB)
- Status: Stable, no restarts
- Memory usage: 500-800MB (well below limit)
- No new OOM events

✅ **Database:**
- Network 'default-network' exists
- All nodes use correct networkId
- No foreign key constraint errors

✅ **Backend:**
- Stable MQTT connection
- No ECONNREFUSED errors
- MQTT Monitor returns 200 OK

✅ **Frontend:**
- Stable network status (no rapid cycling)
- MQTT Monitor page works
- Real-time updates working

## Monitoring After Fix

### Watch Mosquitto Memory
```bash
watch -n 5 'docker stats --no-stream | grep mosquitto'
```

Should show stable memory usage around 500-800MB, never approaching 2GB.

### Check for New OOM Events
```bash
dmesg | grep -i 'out of memory' | grep mosquitto | tail -10
```

Should show no new events after the fix.

### Monitor Backend MQTT Connection
```bash
docker logs -f meshtastic-backend-prod | grep -i mqtt
```

Should show stable "MQTT connected" messages, no disconnects.

### Check Database Errors
```bash
docker logs meshtastic-postgres-prod --tail 100 | grep ERROR
```

Should show no foreign key constraint violations.

## Why This Happened

1. **Mosquitto OOM**: The configuration files were updated in git, but the production containers were never restarted to apply the new 2GB memory limit. They continued running with the old 1GB limit.

2. **Database Network Mismatch**: At some point, a network was created with id='default' instead of 'default-network'. The backend code expects 'default-network', causing foreign key violations.

3. **Cascading Failures**: The Mosquitto crashes caused MQTT connection instability, which combined with database errors to create the rapid connect/disconnect cycles you're seeing in the frontend.

## Prevention

To prevent this in the future:

1. **Always restart services after config changes:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Monitor memory usage regularly:**
   - Set up alerts for containers using >80% of their memory limit
   - Check `docker stats` periodically

3. **Check for OOM events:**
   ```bash
   dmesg | grep -i 'out of memory' | tail -20
   ```

4. **Validate database state:**
   - Ensure network IDs match what the backend expects
   - Run database migrations after schema changes

5. **Use the health monitoring script:**
   ```bash
   ./monitor-health.sh
   ```

## Troubleshooting

### If Mosquitto Still Crashes After Fix

1. **Check memory limit was applied:**
   ```bash
   docker inspect meshtastic-mosquitto-prod --format='{{.HostConfig.Memory}}'
   ```
   Should show: `2147483648` (2GB in bytes)

2. **Consider reducing bridge connections** - You have 4 bridges with wildcard subscriptions generating massive message volume. Comment out some in `config/mosquitto/mosquitto.conf`.

3. **Disable persistence temporarily:**
   ```conf
   persistence false
   ```

### If Database Errors Continue

1. **Verify network exists:**
   ```bash
   docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper \
     -c "SELECT * FROM networks WHERE id = 'default-network';"
   ```

2. **Check for orphaned nodes:**
   ```bash
   docker exec meshtastic-postgres-prod psql -U meshtastic -d meshtastic_mapper \
     -c "SELECT COUNT(*) FROM nodes WHERE \"networkId\" NOT IN (SELECT id FROM networks);"
   ```

3. **Restart backend to reinitialize:**
   ```bash
   docker-compose -f docker-compose.prod.yml restart backend
   ```

### If MQTT Monitor Still Returns 503

1. **Wait 60 seconds** - Backend needs time to initialize MQTT connections

2. **Check backend logs:**
   ```bash
   docker logs meshtastic-backend-prod --tail 50 | grep -i "mqtt manager"
   ```
   Should show: "MQTT Manager initialized successfully"

3. **Restart backend if needed:**
   ```bash
   docker-compose -f docker-compose.prod.yml restart backend
   ```

## Related Documentation

- `docs/fixes/MOSQUITTO_OOM_FIX_FINAL.md` - Detailed Mosquitto OOM analysis
- `scripts/debug-lockup.sh` - General debugging script
- `scripts/monitor-health.sh` - Continuous health monitoring

---

**Status**: Ready to Apply  
**Date**: January 26, 2026  
**Severity**: CRITICAL  
**Estimated Downtime**: 2-3 minutes  
**Risk**: Low (fixes are reversible)
