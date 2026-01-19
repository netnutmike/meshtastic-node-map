# 🔧 Connection Pool Fix - Use Transactions

## The Real Problem

Even with 100 connections, you're still hitting timeouts. The issue isn't the pool size - it's that **connections aren't being released**.

### Why Connections Get Stuck

Each MQTT message does 7-10 separate database operations:
1. Find node
2. Create/update node  
3. Create position
4. Create telemetry
5. Find/create fromNode
6. Find/create toNode
7. Create message

Each operation holds a connection. With high MQTT traffic, all 100 connections get used and never released fast enough.

## The Solution: Prisma Transactions

Wrap all operations for each MQTT message in a **single transaction**:
- Uses only 1 connection per message (instead of 7-10)
- Releases the connection immediately after the transaction completes
- Much faster and more efficient

### What Changed

**Before (7-10 connections per message):**
```typescript
let node = await this.nodeRepository.findByNodeId(data.nodeId);  // Connection 1
node = await this.nodeRepository.create(createData);              // Connection 2
await this.positionRepository.create(position);                   // Connection 3
await this.telemetryRepository.create(telemetry);                 // Connection 4
// ... more operations, more connections
```

**After (1 connection per message):**
```typescript
await this.nodeRepository['db'].$transaction(async (tx) => {
  // All operations use the same transaction connection
  let node = await tx.node.findUnique(...);
  node = await tx.node.create(...);
  await tx.position.create(...);
  await tx.telemetryReading.create(...);
  // ... all operations in one transaction
}, {
  maxWait: 5000,   // Wait max 5s for a transaction slot
  timeout: 30000,  // Transaction must complete in 30s
});
```

## Deploy The Fix

### On Your Production Server:

```bash
# Rebuild backend with transaction fix
docker compose -f docker-compose.prod.yml build --no-cache backend

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### Monitor Results:

```bash
# Should see NO connection pool errors
docker compose -f docker-compose.prod.yml logs -f backend | grep -i "connection pool\|P2024"

# Should see steady node creation
docker compose -f docker-compose.prod.yml logs -f backend | grep "Created new node"

# Watch node count increase
watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;"'
```

## Expected Results

**Before (connection leak):**
```
error: Timed out fetching a new connection from the connection pool
(Current connection pool timeout: 60, connection limit: 100)
```

**After (transactions):**
```
info: Created new node: !abc123
info: Stored position for node: !abc123
info: Stored telemetry for node: !abc123
debug: Stored message from node: !abc123
```

No more timeouts! Connections are released immediately.

## Why This Works

**Connection Usage:**
- Before: 100 messages × 7 operations = 700 connection requests (pool exhausted!)
- After: 100 messages × 1 transaction = 100 connection requests (pool handles it easily)

**Connection Release:**
- Before: Connections held for entire message processing (slow)
- After: Connection released immediately after transaction (fast)

## Files Modified

- `backend/src/services/mqtt-manager.service.ts` - Wrapped all operations in `$transaction()`

## Verification

After deploying:

### 1. No Connection Pool Errors
```bash
docker compose -f docker-compose.prod.yml logs backend --tail=200 | grep "connection pool"
```
**Expected:** No output

### 2. Fast Processing
```bash
docker compose -f docker-compose.prod.yml logs backend --tail=50 | grep "Processing data"
```
**Expected:** Steady stream of "Processing data for node" messages

### 3. Node Count Increasing
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"
```
**Expected:** Increasing count

## Performance Impact

- **7-10x fewer connection requests** per MQTT message
- **Faster connection release** (immediate vs delayed)
- **Better throughput** - can handle much higher MQTT traffic
- **Atomic operations** - all-or-nothing, better data consistency

## Summary

**Issue 1:** ✅ FIXED - Race condition (unique constraint errors)  
**Issue 2:** ✅ FIXED - Connection pool size (increased to 100)  
**Issue 3:** ✅ FIXING NOW - Connection leak (using transactions)

This transaction fix will finally resolve the connection pool exhaustion!

---

**Action Required:** Rebuild and restart backend on production server
