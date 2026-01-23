# Service Lockup - Quick Reference Card

## 🚨 When Services Lock Up

### Step 1: Capture Diagnostics (DO THIS FIRST!)
```bash
./scripts/debug-lockup.sh
```
**DO NOT RESTART SERVICES UNTIL AFTER RUNNING THIS!**

### Step 2: Review the Report
```bash
# Find the latest report
ls -lt debug-logs/ | head -5

# View it
cat debug-logs/lockup-YYYYMMDD-HHMMSS.log
```

### Step 3: Restart Services
```bash
# Development
docker-compose restart

# Production
docker-compose -f docker-compose.prod.yml restart
```

---

## 📊 Continuous Monitoring

### Start Health Monitor
```bash
# Run in background (checks every 60 seconds)
./scripts/monitor-health.sh &

# Or with custom interval
./scripts/monitor-health.sh 30 &
```

### View Monitor Logs
```bash
tail -f logs/health-monitor.log
```

### Stop Monitor
```bash
pkill -f monitor-health.sh
```

---

## 🔍 What to Look For in Debug Reports

- **OOM Events**: Out of memory kills
- **High CPU/Memory**: Near 100% usage
- **DB Connections**: Count near max_connections
- **Long Queries**: Queries running for minutes
- **DB Locks**: Ungranted locks blocking operations
- **MQTT Issues**: Port not listening or process dead
- **Network Failures**: Services can't reach each other
- **Error Patterns**: Repeated errors in logs

---

## 🛠️ Quick Fixes

### Memory Issues
```bash
# Check memory usage
docker stats --no-stream

# Clean up Docker
docker system prune -a
```

### Disk Space Issues
```bash
# Check disk space
df -h

# Clean up old logs
find ./logs -name "*.log" -mtime +7 -delete
find ./debug-logs -name "*.log" -mtime +7 -delete
```

### Database Issues
```bash
# Check connections
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*) FROM pg_stat_activity;"

# Check long queries
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 5;"
```

### MQTT Issues
```bash
# Check MQTT status
docker-compose exec mosquitto sh -c "ps aux | grep mosquitto"

# Check MQTT port
docker-compose exec mosquitto sh -c "netstat -tlnp | grep 1883"
```

---

## 📚 Full Documentation

- **Complete Guide**: `docs/DEBUGGING_SERVICE_LOCKUPS.md`
- **Implementation Summary**: `docs/fixes/SERVICE_LOCKUP_DEBUGGING.md`
- **Debug Script**: `scripts/debug-lockup.sh`
- **Monitor Script**: `scripts/monitor-health.sh`

---

## 💡 Prevention Tips

1. ✅ Resource limits now configured in docker-compose.yml
2. ✅ MQTT connection limits configured (max: 1000)
3. ✅ Health monitoring scripts available
4. 🔄 Run health monitor continuously in production
5. 🔄 Set up log rotation
6. 🔄 Review debug reports after each lockup

---

## 📞 Reporting Issues

When reporting lockup issues, include:
1. Debug report from `debug-logs/`
2. Health monitor logs (if running)
3. What was happening when lockup occurred
4. Frequency of lockups
5. Any recent changes
