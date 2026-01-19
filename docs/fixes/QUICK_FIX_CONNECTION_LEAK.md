# 🚨 Connection Pool Still Exhausted - Quick Fix

## The Issue

Even with 100 connections and 60s timeout, you're still getting timeouts. This means:

**Not a pool size problem** - It's a **connection leak** problem.

The MQTT handler is doing too many sequential database operations per message:
1. Find/create node (2 queries)
2. Update node (1 query)
3. Create position (1 query)
4. Create telemetry (1 query)
5. Find/create message sender (2 queries)
6. Find/create message receiver (2 queries)
7. Create message (1 query)

**That's 10+ database operations per MQTT message!**

With high MQTT traffic, even 100 connections get exhausted quickly.

## Quick Fix (Right Now)

### 1. Restart Backend to Clear Stuck Connections
```bash
docker compose -f docker-compose.prod.yml restart backend
```

### 2. Check How Many Nodes You Have
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"
```

### 3. Monitor Connection Usage
```bash
./scripts/diagnose-connection-leak.sh
```

## Proper Fix (Requires Code Changes)

The MQTT handler needs to be optimized to use fewer database connections:

### Option 1: Use Transactions
Wrap all operations for a single MQTT message in one transaction:
```typescript
await prisma.$transaction(async (tx) => {
  // All operations here use same connection
  const node = await tx.node.upsert(...);
  await tx.position.create(...);
  await tx.telemetry.create(...);
});
```

### Option 2: Batch Operations
Queue MQTT messages and process them in batches:
```typescript
// Collect 10-50 messages
// Process all at once with bulk inserts
await prisma.node.createMany(...);
await prisma.position.createMany(...);
```

### Option 3: Reduce Operations
- Don't create/update node on every message
- Cache node lookups in memory
- Only update node every N seconds
- Batch position/telemetry inserts

## Temporary Workaround

If nodes are being created successfully (check the count), you can:

1. **Accept some errors** - The system is working, just dropping some messages during high load
2. **Throttle MQTT** - Reduce the message rate if possible
3. **Restart backend periodically** - Clear stuck connections every hour

## Check If It's Working

Despite the errors, check if data is being collected:

```bash
# Node count (should be increasing)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"

# Message count (should be increasing)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM messages;"

# Recent nodes (should show new ones)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT \"nodeId\", \"shortName\", \"createdAt\" FROM nodes ORDER BY \"createdAt\" DESC LIMIT 10;"
```

## Why This Happened

Your production MQTT traffic is **much higher** than the dev machine. The code wasn't designed for this volume. Each MQTT message triggers 10+ database queries, which works fine at low volume but exhausts connections at high volume.

## Next Steps

1. **Immediate:** Restart backend, check if nodes are being created
2. **Short-term:** Monitor and restart backend when errors spike
3. **Long-term:** Refactor MQTT handler to use transactions or batching

---

**Quick Command:**
```bash
# Restart and check
docker compose -f docker-compose.prod.yml restart backend && sleep 30 && docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"
```
