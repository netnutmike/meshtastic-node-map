# Service Lockup Debugging - Implementation Summary

**Date**: January 22, 2026  
**Version**: 1.0.2  
**Status**: Debug tools created, resource limits added

## Problem

Services (including MQTT) have locked up twice and required restart. Need comprehensive debugging tools to diagnose the issue when it happens again.

## Solution Implemented

### 1. Debug Script (`scripts/debug-lockup.sh`)

**Purpose**: Capture comprehensive diagnostic information when services lock up.

**Usage**:
```bash
# Run BEFORE restarting services
./scripts/debug-lockup.sh
```

**What it captures**:
- Container status and resource usage
- System memory and disk space
- Docker system info and OOM events
- Container logs (last 100 lines each)
- Database connection counts
- Long-running queries
- Database locks
- MQTT process and port status
- Network connectivity tests
- Recent errors from all services

**Output**: Saves report to `debug-logs/lockup-TIMESTAMP.log`

### 2. Health Monitor Script (`scripts/monitor-health.sh`)

**Purpose**: Continuous monitoring to catch issues proactively.

**Usage**:
```bash
# Start monitoring (checks every 60 seconds)
./scripts/monitor-health.sh &

# Or with custom interval (e.g., every 30 seconds)
./scripts/monitor-health.sh 30 &

# View logs
tail -f logs/health-monitor.log

# Stop monitoring
pkill -f monitor-health.sh
```

**What it monitors**:
- Container health status
- CPU and memory usage
- Disk space
- Database connection count
- Automatically runs debug script on ERROR status

### 3. Resource Limits Added to Development

Added resource limits to `docker-compose.yml` to prevent resource exhaustion:

- **postgres**: 2G memory, 1.0 CPU
- **redis**: 512M memory, 0.5 CPU
- **mosquitto**: 512M memory, 0.5 CPU
- **backend**: 1G memory, 1.0 CPU
- **frontend**: 512M memory, 0.5 CPU

(Production already had these limits in `docker-compose.prod.yml`)

### 4. Documentation

Created comprehensive guide: `docs/DEBUGGING_SERVICE_LOCKUPS.md`

Covers:
- Quick diagnostic steps
- Common causes and solutions
- Continuous monitoring setup
- Advanced diagnostics
- Prevention strategies

## Next Steps When Lockup Occurs

1. **DO NOT RESTART YET** - Run the debug script first:
   ```bash
   ./scripts/debug-lockup.sh
   ```

2. **Review the debug report**:
   ```bash
   cat debug-logs/lockup-YYYYMMDD-HHMMSS.log
   ```

3. **Look for patterns**:
   - Out of Memory (OOM) events
   - High resource usage (CPU/Memory near 100%)
   - Database connection exhaustion
   - Long-running queries
   - Database locks
   - MQTT connection issues
   - Network connectivity failures
   - Error patterns in logs

4. **Restart services**:
   ```bash
   # Development
   docker-compose restart
   
   # Production
   docker-compose -f docker-compose.prod.yml restart
   ```

5. **Share the debug report** for analysis

## Possible Root Causes to Investigate

Based on the implementation, here are likely causes:

### 1. Memory Exhaustion
- **Symptoms**: OOM events, high memory usage
- **Solution**: Resource limits now in place, may need adjustment

### 2. Database Connection Pool Exhaustion
- **Symptoms**: High connection count, "too many connections" errors
- **Solution**: Check for connection leaks, reduce pool size

### 3. MQTT Broker Overload
- **Symptoms**: MQTT port not responding, high message rate
- **Solution**: Connection limits already configured (max_connections: 1000)

### 4. Database Lock Contention
- **Symptoms**: Long-running queries, ungranted locks
- **Solution**: Optimize queries, review transaction scope

### 5. Disk Space Exhaustion
- **Symptoms**: Disk usage > 90%, write errors
- **Solution**: Clean up logs and Docker resources

## Monitoring Recommendations

1. **Run health monitor continuously** in production:
   ```bash
   nohup ./scripts/monitor-health.sh 60 > /dev/null 2>&1 &
   ```

2. **Set up log rotation** to prevent disk exhaustion

3. **Review debug reports** after each lockup to identify patterns

4. **Monitor resource trends** over time using health monitor logs

## Files Modified

- `scripts/debug-lockup.sh` - Created
- `scripts/monitor-health.sh` - Created
- `docker-compose.yml` - Added resource limits
- `docs/DEBUGGING_SERVICE_LOCKUPS.md` - Created comprehensive guide
- `docs/fixes/SERVICE_LOCKUP_DEBUGGING.md` - This summary
- `TODO.md` - Updated with lockup debugging status

## Testing

Both scripts have been created and made executable. They are ready to use when the next lockup occurs.

## Additional Notes

- The mosquitto config already has connection limits configured (max_connections: 1000)
- Production docker-compose already had resource limits
- Development now has matching resource limits
- Scripts work with both development and production docker-compose files

## Support

For detailed information, see:
- `docs/DEBUGGING_SERVICE_LOCKUPS.md` - Complete debugging guide
- `scripts/debug-lockup.sh` - Debug script with inline comments
- `scripts/monitor-health.sh` - Monitoring script with inline comments
