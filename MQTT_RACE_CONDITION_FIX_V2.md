# MQTT Race Condition Fix - UPDATED

## Problem Summary

Production deployment was receiving MQTT traffic (visible in MQTT Explorer) but nodes were not being created in the database. Backend logs showed repeated errors:

```
Unique constraint failed on the fields: (`nodeId`)
Error handling Meshtastic data: Unique constraint violation in create
DatabaseValidationError: Unique constraint violation in create
```

## Root Cause Analysis

### Primary Issue: Race Condition
In `backend/src/services/mqtt-manager.service.ts`, the `handleMeshtasticData` method had a race condition when multiple MQTT messages arrived simultaneously for the same node.

### Secondary Issue: Error Wrapper
The `executeWithErrorHandling` function in `backend/src/database/connection.ts` wraps all database operations and converts Prisma's P2002 error into a `DatabaseValidationError`. This means catching `error.code === 'P2002'` doesn't work - we need to catch `DatabaseValidationError` instead.

## The Complete Fix

### 1. Import DatabaseValidationError

```typescript
import { DatabaseValidationError } from '../database/connection';
```

### 2. Wrap ALL Node Creation Attempts

The fix needs to be applied in THREE places where nodes are created:

#### Location 1: Main Node Creation (lines 177-203)
```typescript
if (!node && data.nodeUpdate) {
  try {
    const createData = {
      nodeId: data.nodeId,
      hexId: data.nodeId.replace('!', ''),
      ...data.nodeUpdate,
      networkId,
      isOnline: true,
      mqttConnected: true
    };
    node = await this.nodeRepository.create(createData);
    logger.info(`Created new node: ${data.nodeId}`);
  } catch (error: any) {
    if (error instanceof DatabaseValidationError && error.message.includes('Unique constraint')) {
      node = await this.nodeRepository.findByNodeId(data.nodeId);
      if (node) {
        logger.debug(`Node ${data.nodeId} was created by concurrent request, using existing node`);
      }
    } else {
      throw error;
    }
  }
}
```

#### Location 2: Sender Node Creation (lines 217-232)
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

#### Location 3: Receiver Node Creation (lines 235-258)
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

### 3. Add Null Check Before Using fromNode
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

## How It Works

1. **Try to create the node** - Attempt creation if node doesn't exist
2. **Catch DatabaseValidationError** - The error wrapper converts P2002 to this type
3. **Check error message** - Verify it contains "Unique constraint"
4. **Retry the find** - Another concurrent request created it, so fetch it
5. **Null check** - Ensure we have a valid node before using it
6. **Continue processing** - Store the message with the correct node reference

## Why This Fix Works

- **Handles concurrency gracefully** - Multiple requests can try to create the same node
- **No data loss** - All messages are processed even when race conditions occur
- **Proper error handling** - Only catches the specific error we expect
- **Logging** - Debug logs show when race conditions are handled
- **Type-safe** - Uses instanceof check for proper TypeScript type narrowing

## Deployment

Run on your production server:

```bash
./scripts/deploy-mqtt-race-condition-fix.sh
```

## Verification

After deployment, you should see:

1. **No more "Unique constraint" errors** in logs
2. **Nodes being created** - count increases over time
3. **Debug logs** showing race condition handling (optional)
4. **Messages stored successfully**

Check with:
```bash
# Should be empty (no errors)
docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep "Unique constraint"

# Should show increasing count
docker compose -f docker-compose.prod.yml exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM nodes;"

# Should show activity
docker compose -f docker-compose.prod.yml logs -f backend | grep "Created new node"
```

## Files Modified

- `backend/src/services/mqtt-manager.service.ts` - Added race condition handling in 3 locations
- `scripts/deploy-mqtt-race-condition-fix.sh` - Deployment script
- `MQTT_RACE_CONDITION_FIX_V2.md` - This updated documentation

## Technical Notes

**Why DatabaseValidationError instead of P2002?**

The `executeWithErrorHandling` wrapper in `connection.ts` intercepts all Prisma errors and converts them to custom error types. This is good for consistency but means we can't check `error.code` directly. Instead, we check:
- `error instanceof DatabaseValidationError` - Type check
- `error.message.includes('Unique constraint')` - Message check

This is more robust than checking error codes and works with the existing error handling infrastructure.
