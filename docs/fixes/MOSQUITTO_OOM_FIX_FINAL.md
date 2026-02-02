# Mosquitto OOM Crash Fix - Final Solution

## Problem Summary

Mosquitto MQTT broker was experiencing repeated Out-Of-Memory (OOM) crashes, restarting every 40-50 seconds. The debug output showed:

- **20+ OOM kill events** in kernel logs
- **Mosquitto using ~1046MB** before crash (hitting 1GB limit)
- **Container status**: "Up 2 seconds" (just restarted)
- **CPU usage**: 33.40% (high, rebuilding state after crash)
- **Backend healthy**: 384.6MB/1GB (37.56%)

## Root Causes

1. **Insufficient Memory Limit**: Mosquitto was limited to 512MB (later increased to 1GB), but still insufficient
2. **High Message Volume**: 4 bridge connections to external MQTT brokers with wildcard subscriptions
3. **Aggressive Queue Settings**: 
   - `max_queued_messages: 1000` (too high)
   - `max_inflight_messages: 100` (too high)
   - `queue_qos0_messages: true` (queuing all QoS 0 messages)
   - `max_queued_bytes: 0` (unlimited)
4. **Persistence Enabled**: Retained messages consuming memory

## Bridge Connections Contributing to Load

The Mosquitto configuration has 4 bridge connections:

```
1. bridge_to_meshtastic (mqtt.meshtastic.org)
   - Subscribing to: msh/US/FL/#, msh/US/MD/#, msh/US/PA/#, msh/US/VA/#, msh/US/DC/#, msh/US/NC/#, msh/US/DMV/#

2. liamcottle (mqtt.meshtastic.liamcottle.net)
   - Publishing to: msh/US/FL/#

3. areyoumeshingwithus (mqtt.areyoumeshingwith.us)
   - Subscribing to: msh/US/FL/#

4. villagesmesh (villagesmesh.com)
   - Subscribing to: msh/US/FL/#
```

Each wildcard subscription (`#`) can match thousands of topics, resulting in massive message volume.

## Solution Applied

### 1. Increased Memory Limits (docker-compose.prod.yml)

```yaml
mosquitto:
  deploy:
    resources:
      limits:
        memory: 2G      # Increased from 512M
      reservations:
        memory: 512M    # Increased from 256M
```

### 2. Optimized Memory Management (mosquitto.conf)

```conf
# Reduced queue limits
max_inflight_messages 20        # Was: 100
max_queued_messages 100         # Was: 1000

# Disabled QoS 0 queuing (saves memory)
queue_qos0_messages false       # Was: true

# Added byte limit for queues
max_queued_bytes 104857600      # Was: 0 (unlimited), Now: 100MB

# Added message size limit
message_size_limit 268435456    # 256MB max
```

## Files Modified

1. **docker-compose.prod.yml**
   - Mosquitto memory limit: 512M → 2G
   - Mosquitto memory reservation: 256M → 512M

2. **config/mosquitto/mosquitto.conf**
   - max_inflight_messages: 100 → 20
   - max_queued_messages: 1000 → 100
   - queue_qos0_messages: true → false
   - max_queued_bytes: 0 → 100MB
   - Added message_size_limit: 256MB

3. **scripts/fix-mosquitto-oom-final.sh**
   - Created automated fix script

## How to Apply the Fix

Run the fix script:

```bash
./scripts/fix-mosquitto-oom-final.sh
```

The script will:
1. Show current Mosquitto status and OOM events
2. Stop services
3. Optionally clear persistence data
4. Start services with new configuration
5. Monitor startup and memory usage

## Monitoring After Fix

### Watch Memory Usage
```bash
watch -n 5 'docker stats --no-stream | grep mosquitto'
```

### Check for New OOM Events
```bash
dmesg | grep -i 'out of memory' | grep mosquitto | tail -10
```

### View Mosquitto Logs
```bash
docker logs -f meshtastic-mosquitto-prod
```

### Check Connected Clients
```bash
docker exec meshtastic-mosquitto-prod mosquitto_sub -h localhost -t '$SYS/broker/clients/connected' -C 1
```

## Expected Results

After applying the fix:
- **Memory usage**: Should stabilize around 500-800MB (well below 2GB limit)
- **No OOM crashes**: Container should stay up continuously
- **CPU usage**: Should drop to <5% after initial startup
- **Message processing**: Should continue normally with reduced queue sizes

## If Issues Persist

If Mosquitto still crashes after this fix, consider:

### 1. Reduce Bridge Connections
Comment out some bridges in `mosquitto.conf` to reduce message volume:

```conf
# connection areyoumeshingwithus
# address mqtt.areyoumeshingwith.us:1883
# ...
```

### 2. Disable Persistence
If retained messages aren't critical:

```conf
persistence false
# persistence_location /mosquitto/data/
# autosave_interval 1800
```

### 3. Further Reduce Limits
```conf
max_connections 100          # Was: 1000
max_inflight_messages 10     # Was: 20
max_queued_messages 50       # Was: 100
```

### 4. Filter Topics More Specifically
Instead of wildcard subscriptions, subscribe to specific topics:

```conf
# Instead of: topic msh/US/FL/# in 0
# Use specific topics:
topic msh/US/FL/Villages/# in 0
topic msh/US/FL/Orlando/# in 0
```

### 5. Monitor Message Volume
Check which topics are generating the most traffic:

```bash
docker exec meshtastic-mosquitto-prod mosquitto_sub -h localhost -t '$SYS/broker/messages/received' -C 10
```

## Technical Details

### Why This Happens

Mosquitto stores messages in memory for:
- **Queued messages**: Messages waiting to be delivered to subscribers
- **Inflight messages**: Messages currently being transmitted
- **Retained messages**: Messages marked as retained (stored permanently)
- **Bridge buffers**: Messages queued for bridge connections

With 4 bridges and wildcard subscriptions, the message volume can be enormous:
- Each bridge can receive 100-1000 messages/second
- With 4 bridges, that's 400-4000 messages/second
- At 1KB per message, that's 400KB-4MB/second
- Over time, queues fill up and consume all available memory

### Memory Calculation

Before fix:
- max_queued_messages: 1000 per client
- max_inflight_messages: 100 per client
- 4 bridges + local clients = ~10 clients
- Average message size: ~1KB
- **Potential memory**: (1000 + 100) × 10 × 1KB = ~11MB just for queues
- **Plus**: Retained messages, persistence, connection overhead
- **Total**: Can easily exceed 1GB with high message volume

After fix:
- max_queued_messages: 100 per client
- max_inflight_messages: 20 per client
- max_queued_bytes: 100MB total
- **Potential memory**: (100 + 20) × 10 × 1KB = ~1.2MB for queues
- **Plus**: 100MB max for all queued bytes
- **Total**: Should stay well under 500MB

## Prevention

To prevent future OOM issues:

1. **Monitor memory usage** regularly
2. **Set up alerts** for high memory usage (>80%)
3. **Review bridge connections** periodically
4. **Use specific topic filters** instead of wildcards
5. **Consider message retention policies**
6. **Implement log rotation** for Mosquitto logs

## Related Documentation

- `docs/DEBUGGING_SERVICE_LOCKUPS.md` - General debugging guide
- `scripts/debug-lockup.sh` - Diagnostic script
- `scripts/fix-mosquitto-oom-final.sh` - Automated fix script

---

**Status**: ✅ Fix Applied  
**Date**: January 26, 2026  
**Version**: 1.1.0
