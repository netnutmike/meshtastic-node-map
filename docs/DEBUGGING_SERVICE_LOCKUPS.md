# Debugging Service Lockups

## Overview

This guide helps diagnose and resolve service lockup issues where containers become unresponsive and require restart.

## Quick Diagnostic Steps

### 1. When Services Lock Up (DO THIS FIRST!)

**IMPORTANT: Run the debug script BEFORE restarting services to capture diagnostic data:**

```bash
./scripts/debug-lockup.sh
```

This captures:
- Container status and resource usage
- System memory and disk space
- Container logs (last 100 lines each)
- Database connection counts and long-running queries
- Database locks
- MQTT process and port status
- Network connectivity between services
- Recent errors from all services

The report is saved to `debug-logs/lockup-TIMESTAMP.log`

### 2. Review the Debug Report

```bash
# View the most recent debug report
ls -lt debug-logs/ | head -5
cat debug-logs/lockup-YYYYMMDD-HHMMSS.log
```

Look for:
- **Out of Memory (OOM) events**: Check "Recent OOM Events" section
- **High resource usage**: CPU/Memory percentages near 100%
- **Database connection exhaustion**: Active connections near max_connections limit
- **Long-running queries**: Queries running for minutes/hours
- **Database locks**: Ungranted locks blocking operations
- **MQTT connection issues**: Port not listening or process not running
- **Network connectivity failures**: Services unable to reach each other
- **Error patterns**: Repeated errors in logs

### 3. Restart Services

After capturing diagnostics:

```bash
# Development
docker-compose restart

# Or full restart if needed
docker-compose down && docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml restart
```

## Continuous Monitoring

Run the health monitor in the background to catch issues proactively:

```bash
# Start monitoring (checks every 60 seconds)
./scripts/monitor-health.sh &

# Or with custom interval (e.g., every 30 seconds)
./scripts/monitor-health.sh 30 &

# View monitoring logs
tail -f logs/health-monitor.log

# Stop monitoring
pkill -f monitor-health.sh
```

The monitor automatically runs the debug script when it detects ERROR status (exited containers).

## Common Causes and Solutions

### 1. Memory Exhaustion

**Symptoms:**
- OOM events in debug report
- Containers showing high memory usage
- Services becoming unresponsive

**Solutions:**
- Add resource limits to docker-compose.yml (see below)
- Increase system memory
- Reduce MQTT message buffer size
- Optimize database queries

### 2. Database Connection Pool Exhaustion

**Symptoms:**
- High connection count (near max_connections)
- "too many connections" errors in logs
- Backend unable to query database

**Solutions:**
- Check for connection leaks in application code
- Reduce connection pool size in DATABASE_URL
- Increase PostgreSQL max_connections
- Review long-running queries

### 3. MQTT Broker Overload

**Symptoms:**
- MQTT port not responding
- High message rate in MQTT monitor
- Mosquitto process using high CPU

**Solutions:**
- Add connection limits to mosquitto.conf
- Reduce message retention
- Add resource limits to mosquitto container
- Consider message rate limiting

### 4. Database Lock Contention

**Symptoms:**
- Long-running queries
- Ungranted locks in pg_locks
- Slow API responses

**Solutions:**
- Review queries causing locks
- Optimize transaction scope
- Add appropriate indexes
- Consider read replicas for heavy queries

### 5. Disk Space Exhaustion

**Symptoms:**
- Disk usage > 90%
- "No space left on device" errors
- Database unable to write

**Solutions:**
```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -a --volumes

# Clean up old logs
find ./logs -name "*.log" -mtime +7 -delete

# Clean up old debug reports
find ./debug-logs -name "*.log" -mtime +7 -delete
```

## Adding Resource Limits (Development)

The production docker-compose already has resource limits. To add them to development:

```yaml
# In docker-compose.yml, add to each service:
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

Recommended limits:
- **postgres**: 2G memory, 1.0 CPU
- **redis**: 512M memory, 0.5 CPU
- **mosquitto**: 512M memory, 0.5 CPU
- **backend**: 1G memory, 1.0 CPU
- **frontend**: 256M memory, 0.5 CPU

## MQTT Connection Limits

Add to `config/mosquitto/mosquitto.conf`:

```conf
# Limit maximum connections
max_connections 100

# Limit connections per listener
max_connections -1

# Message queue limits
max_queued_messages 1000
max_inflight_messages 20

# Memory limits
message_size_limit 268435456
```

## Database Connection Pool Configuration

In `backend/.env` or docker-compose environment:

```bash
# Limit connection pool size
DATABASE_URL=postgresql://user:pass@postgres:5432/db?connection_limit=20&pool_timeout=60
```

## Monitoring Best Practices

1. **Run health monitor continuously** in production
2. **Set up log rotation** to prevent disk exhaustion
3. **Monitor resource trends** over time
4. **Set up alerts** for high resource usage
5. **Review debug reports** after each lockup to identify patterns

## Getting Help

When reporting lockup issues, include:
1. The debug report from `debug-logs/`
2. Health monitor logs showing resource trends
3. Description of what was happening when lockup occurred
4. Frequency of lockups (once, daily, hourly, etc.)
5. Any recent changes to configuration or code

## Advanced Diagnostics

### Check for Memory Leaks

```bash
# Monitor memory usage over time
watch -n 5 'docker stats --no-stream'

# Check for growing memory in specific container
docker stats meshtastic-backend --no-stream
```

### Check for Connection Leaks

```bash
# Monitor database connections
watch -n 5 'docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*) FROM pg_stat_activity;"'

# Check connection states
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
```

### Check MQTT Message Rate

```bash
# Subscribe to all topics and count messages
docker-compose exec mosquitto mosquitto_sub -h localhost -t '#' -v | pv -l > /dev/null
```

### Check for Network Issues

```bash
# Test connectivity between containers
docker-compose exec backend ping -c 3 postgres
docker-compose exec backend ping -c 3 redis
docker-compose exec backend ping -c 3 mosquitto

# Check DNS resolution
docker-compose exec backend nslookup postgres
```

## Prevention Strategies

1. **Resource Limits**: Always set memory and CPU limits
2. **Connection Pooling**: Use appropriate pool sizes
3. **Rate Limiting**: Limit API and MQTT message rates
4. **Log Rotation**: Prevent disk exhaustion
5. **Health Checks**: Enable all container health checks
6. **Monitoring**: Run continuous health monitoring
7. **Graceful Degradation**: Handle resource exhaustion gracefully
8. **Regular Maintenance**: Clean up old data and logs

## Next Steps

After identifying the root cause:
1. Implement the appropriate solution
2. Continue monitoring to verify fix
3. Document the issue and solution
4. Consider preventive measures
5. Update this guide with new findings
