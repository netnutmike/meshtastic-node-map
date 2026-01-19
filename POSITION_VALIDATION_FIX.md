# Position Validation Fix

## Issue Discovered

After fixing the frontend URL configuration and connection pool issues, we discovered a new problem in the backend logs:

```
error: Error handling Meshtastic data: 
Invalid `prisma.position.create()` invocation:

{
  data: {
    nodeId: "cmklmhipy004f6ttbelowhik2",
    longitude: undefined,
    altitude: 42,
    precision: undefined,
    timestamp: new Date("2026-01-19T22:31:00.000Z"),
    source: "GPS",
+   latitude: Float  <-- MISSING
  }
}

Argument `latitude` is missing.
```

## Root Cause

Some MQTT messages contain position data with altitude but **no latitude/longitude coordinates**. This is valid in Meshtastic (a node might report altitude from a barometer without GPS lock), but our code was trying to create database records without the required latitude/longitude fields.

The Prisma schema requires both `latitude` and `longitude` to be present for position records, causing validation errors.

## Solution

Modified `backend/src/services/mqtt-manager.service.ts` to validate position data before attempting to create database records:

```typescript
// Store position data (only if latitude and longitude are present)
if (data.position && data.position.latitude != null && data.position.longitude != null) {
  await tx.position.create({
    data: {
      ...data.position,
      nodeId: node.id
    }
  });
  logger.debug(`Stored position for node: ${data.nodeId}`);
} else if (data.position) {
  logger.debug(`Skipping position for node ${data.nodeId}: missing latitude/longitude`);
}
```

This change:
- ✅ Checks that both `latitude` and `longitude` are not null/undefined
- ✅ Only creates position records when valid coordinates exist
- ✅ Logs when position data is skipped (for debugging)
- ✅ Prevents validation errors and transaction failures
- ✅ Allows nodes to be created even without position data

## Deployment

Run the deployment script on the production server:

```bash
./scripts/fix-position-validation.sh
```

Or manually:

```bash
# Build backend
cd backend
npm run build
cd ..

# Restart backend
docker compose -f docker-compose.prod.yml restart backend

# Check health
curl http://localhost:3001/health

# Monitor logs
docker compose -f docker-compose.prod.yml logs -f backend
```

## Expected Behavior After Fix

- ✅ Backend processes MQTT messages without validation errors
- ✅ Nodes are created successfully even without GPS coordinates
- ✅ Position data is stored only when valid coordinates exist
- ✅ Logs show "Skipping position for node X: missing latitude/longitude" for incomplete data
- ✅ No more "Argument `latitude` is missing" errors

## Impact

This is a **non-breaking change** that makes the system more robust:
- Nodes without GPS lock can still be tracked
- Altitude-only data doesn't crash the system
- Telemetry and messages are still processed normally
- Position data is added later when GPS lock is acquired

## Related Files

- `backend/src/services/mqtt-manager.service.ts` - Added validation
- `scripts/fix-position-validation.sh` - Deployment script
