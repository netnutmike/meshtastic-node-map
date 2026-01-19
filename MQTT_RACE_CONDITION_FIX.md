# MQTT Race Condition Fix

## Problem Summary

Production deployment was receiving MQTT traffic (visible in MQTT Explorer) but nodes were not being created in the database. Backend logs showed repeated errors:

```
Unique constraint failed on the fields: (`nodeId`)
```

## Root Cause

In `backend/src/services/mqtt-manager.service.ts`, the `handleMeshtasticData` method had a race condition:

1. When processing MQTT messages, the code checks if a node exists: `if (!fromNode)`
2. If not found, it creates the node
3. **Problem:** Multiple simultaneous messages for the same node could all pass the `if (!fromNode)` check before any of them created the node
4. All concurrent requests would then try to CREATE the same node
5. Only one would succeed, the rest would fail with unique constraint violation (Prisma error P2002)
6. **Additional complication:** The `BaseRepository.create()` method wraps all Prisma errors through `executeWithErrorHandling()`, which converts P2002 into `DatabaseValidationError`
7. The failed requests would crash and not store the message data

## The Fix

### Changes Made to `mqtt-manager.service.ts`

**Lines 217-232 (fromNode creation):**
```typescript
let fromNode = await this.nodeRepository.findByNodeId(data.message.fromNodeId);
if (!fromNode) {
  try {
    fromNode = await this.nodeRepository.create({
      nodeId: data.message.fromNodeId,
      hexId: data.message.fromNodeId.replace('!', ''),
      networkId,
      role: 'CLIENT' as any,
      isOnline: true,
      mqttConnected: true
    });
  } catch (error: any) {
    // Handle race condition - node was created by another request
    if (error instanceof DatabaseValidationError && error.message.includes('Unique constraint')) {
      fromNode = await this.nodeRepository.findByNodeId(data.message.fromNodeId);
      if (fromNode) {
        logger.debug(`Sender node ${data.message.fromNodeId} was created by concurrent request`);
      }
    } else {
      throw error;
    }
  }
}
```

**Lines 235-250 (toNode creation):**
```typescript
let toNode = null;
if (data.message.toNodeId) {
  toNode = await this.nodeRepository.findByNodeId(data.message.toNodeId);
  if (!toNode) {
    try {
      toNode = await this.nodeRepository.create({
        nodeId: data.message.toNodeId,
        hexId: data.message.toNodeId.replace('!', ''),
        networkId,
        role: 'CLIENT' as any,
        isOnline: true,
        mqttConnected: true
      });
    } catch (error: any) {
      // Handle race condition - node was created by another request
      if (error instanceof DatabaseValidationError && error.message.includes('Unique constraint')) {
        toNode = await this.nodeRepository.findByNodeId(data.message.toNodeId);
        if (toNode) {
          logger.debug(`Receiver node ${data.message.toNodeId} was created by concurrent request`);
        }
      } else {
        throw error;
      }
    }
  }
}
```

**Lines 252-262 (null check before using fromNode):**
```typescript
if (fromNode) {
  await this.messageRepository.create({
    ...data.message,
    fromNodeId: fromNode.id,
    toNodeId: toNode?.id,
    receivedAt: new Date()
  });
  logger.debug(`Stored message from node: ${data.nodeId}`);
} else {
  logger.warn(`Could not create or find sender node: ${data.message.fromNodeId}`);
}
```

### How It Works

1. **Try to create the node** - If it doesn't exist, attempt creation
2. **Catch DatabaseValidationError** - The BaseRepository wraps Prisma P2002 errors into DatabaseValidationError
3. **Check error message** - Verify it's a unique constraint violation
4. **Retry the find** - Another request already created it, so fetch it
5. **Null check** - Ensure we have a valid node before using it
6. **Continue processing** - Store the message with the correct node reference

## Technical Details

**Why DatabaseValidationError instead of P2002?**

The codebase uses a `BaseRepository` class that wraps all database operations with `executeWithErrorHandling()`. This function (in `backend/src/database/connection.ts`) catches Prisma errors and converts them into custom error types:

```typescript
// From backend/src/database/connection.ts
if (error.code === 'P2002') {
  throw new DatabaseValidationError(
    `Unique constraint violation in ${operationName}`,
    error.meta?.target
  );
}
```

So we must catch `DatabaseValidationError` instead of checking `error.code === 'P2002'`.

## Deployment Instructions

### On Production Server

1. **Deploy the fix:**
   ```bash
   ./scripts/deploy-mqtt-race-condition-fix.sh
   ```

   This script will:
   - Check current node count
   - Check for existing errors
   - Rebuild backend with the fix
   - Restart backend
   - Verify the fix is working

2. **Monitor node creation:**
   ```bash
   watch -n 5 'docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -t -c "SELECT COUNT(*) FROM nodes;"'
   ```

3. **Watch for successful node creation:**
   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend | grep -i "created new node"
   ```

4. **Verify no more errors:**
   ```bash
   docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep "Unique constraint"
   ```
   Should return no results after the fix.

### Manual Deployment (if script fails)

```bash
# Stop backend
docker compose -f docker-compose.prod.yml stop backend

# Rebuild with no cache
docker compose -f docker-compose.prod.yml build --no-cache backend

# Start backend
docker compose -f docker-compose.prod.yml up -d backend

# Monitor logs
docker compose -f docker-compose.prod.yml logs -f backend
```

## Expected Results

After deploying the fix:

1. **No more unique constraint errors** in backend logs
2. **Nodes start appearing** in the database
3. **Messages are stored** successfully
4. **Node count increases** as MQTT traffic is processed

## Verification

Run these commands to verify the fix is working:

```bash
# 1. Check node count (should increase over time)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"

# 2. Check message count (should increase)
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM messages;"

# 3. Check for errors (should be none)
docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep -i error

# 4. Check MQTT connection status
docker compose -f docker-compose.prod.yml logs backend --tail=50 | grep -i "mqtt connected"
```

## Why This Happened

This is a classic **race condition** bug that only appears under high concurrency:

- **Dev machine:** Lower MQTT traffic volume, fewer concurrent messages, race condition rarely triggered
- **Production:** Higher traffic volume, many simultaneous messages, race condition triggered frequently

The bug was always present in the code, but production's higher traffic made it visible.

## Files Modified

- `backend/src/services/mqtt-manager.service.ts` - Added race condition handling
- `scripts/deploy-mqtt-race-condition-fix.sh` - Deployment script
- `PRODUCTION_MQTT_TROUBLESHOOTING.md` - Updated documentation
- `MQTT_RACE_CONDITION_FIX.md` - This document

## Related Issues

This fix also resolves:
- Nodes not appearing despite MQTT traffic
- Backend crashes during high message volume
- Inconsistent node creation between dev and production
- "Cannot read property 'id' of null" errors when fromNode is null

## Technical Details

**Why DatabaseValidationError instead of P2002?**

The codebase uses a `BaseRepository` class that wraps all database operations with `executeWithErrorHandling()`. This function (in `backend/src/database/connection.ts`) catches Prisma errors and converts them into custom error types:

```typescript
// From backend/src/database/connection.ts
if (error.code === 'P2002') {
  throw new DatabaseValidationError(
    `Unique constraint violation in ${operationName}`,
    error.meta?.target
  );
}
```

So we must catch `DatabaseValidationError` instead of checking `error.code === 'P2002'`.

**Prisma Error Code P2002:**
- Unique constraint violation
- Thrown when trying to create a record with a duplicate unique field
- In this case: `nodeId` field has a unique constraint
- Gets wrapped into DatabaseValidationError by the error handler

**Why the retry works:**
- If we catch DatabaseValidationError with "Unique constraint" message, we know another request successfully created the node
- We can safely retry the `findByNodeId` query
- The node will now exist and be returned
- We can continue processing with the found node

## Testing

To test the fix works correctly:

1. Send multiple MQTT messages for the same node simultaneously
2. Verify all messages are processed without errors
3. Verify the node is created exactly once
4. Verify all messages reference the correct node

## Performance Impact

**Minimal:** The try-catch adds negligible overhead. The retry only happens when a race condition occurs, which should be rare after the first message for each node.

## Future Improvements

Consider implementing:
1. **Node caching** - Cache recently accessed nodes to reduce database queries
2. **Batch processing** - Group messages by node and process in batches
3. **Queue system** - Use a message queue to serialize node creation
4. **Optimistic locking** - Use database-level optimistic locking for node updates

For now, the current fix is sufficient and handles the race condition correctly.
