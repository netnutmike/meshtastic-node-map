# Telemetry Display Fix

**Date**: January 23, 2026  
**Issue**: Telemetry data not showing in nodes list despite being recorded

## Problem

Telemetry data was being stored in the `telemetry_readings` table, but the nodes list was showing empty values for battery, voltage, and channel utilization.

## Root Cause

The nodes list displays data from the `nodes` table columns:
- `batteryLevel`
- `voltage`
- `channelUtilization`
- `airUtilTx`

However, telemetry data was only being stored in the separate `telemetry_readings` table and these node columns were never being updated.

## Solution

### 1. Updated MQTT Manager Service

**File**: `backend/src/services/mqtt-manager.service.ts`

Added logic to update the node's telemetry columns when DEVICE_METRICS telemetry is received:

```typescript
// Also update the node's telemetry fields for quick access
if (data.telemetry.type === 'DEVICE_METRICS' && data.telemetry.data) {
  const metrics = data.telemetry.data as any;
  const updateData: any = {};
  
  if (metrics.batteryLevel !== undefined) {
    updateData.batteryLevel = metrics.batteryLevel;
  }
  if (metrics.voltage !== undefined) {
    updateData.voltage = metrics.voltage;
  }
  if (metrics.channelUtilization !== undefined) {
    updateData.channelUtilization = metrics.channelUtilization;
  }
  if (metrics.airUtilTx !== undefined) {
    updateData.airUtilTx = metrics.airUtilTx;
  }
  
  if (Object.keys(updateData).length > 0) {
    await tx.node.update({
      where: { id: node.id },
      data: updateData
    });
    logger.debug(`Updated node ${data.nodeId} with latest device metrics`);
  }
}
```

### 2. Backfilled Existing Data

Ran SQL query to update all nodes with their latest telemetry values:

```sql
WITH latest_telemetry AS (
  SELECT DISTINCT ON ("nodeId") 
    "nodeId",
    data
  FROM telemetry_readings
  WHERE type = 'DEVICE_METRICS'
  ORDER BY "nodeId", timestamp DESC
)
UPDATE nodes n
SET 
  "batteryLevel" = CAST((lt.data->>'batteryLevel') AS INTEGER),
  voltage = CAST((lt.data->>'voltage') AS FLOAT),
  "channelUtilization" = CAST((lt.data->>'channelUtilization') AS FLOAT),
  "airUtilTx" = CAST((lt.data->>'airUtilTx') AS FLOAT)
FROM latest_telemetry lt
WHERE n.id = lt."nodeId"
  AND (lt.data->>'voltage') IS NOT NULL;
```

**Result**: Updated 9 nodes with their latest telemetry data

## Verification

### Before Fix
```
nodeId   | shortName | batteryLevel | voltage | channelUtilization
---------|-----------|--------------|---------|-------------------
!435a79e0| RQ01      |              |         |                   
```

### After Fix
```
nodeId   | shortName | batteryLevel | voltage | channelUtilization
---------|-----------|--------------|---------|-------------------
!435a79e0| RQ01      |              | 4.075   |                   
```

## How It Works Now

1. **Telemetry message arrives** via MQTT
2. **Stored in telemetry_readings table** (historical data)
3. **Node columns updated** (for quick access in lists)
4. **Frontend displays** the node's voltage/battery/utilization from nodes table

## Benefits

- **Faster queries**: No need to join with telemetry_readings for node lists
- **Latest values**: Always shows the most recent telemetry
- **Historical data**: Still preserved in telemetry_readings for charts/analysis

## Testing

1. **Check nodes list**: Should now show voltage values
2. **Wait for new telemetry**: New DEVICE_METRICS will automatically update nodes
3. **Check logs**: Look for "Updated node X with latest device metrics"

## Files Modified

- `backend/src/services/mqtt-manager.service.ts` - Added node column updates
- Database - Backfilled existing telemetry data

## Next Steps

- Refresh browser to see telemetry data in nodes list
- Monitor logs for automatic updates: `docker-compose logs -f backend | grep "Updated node.*metrics"`
- Telemetry will now be visible immediately when new DEVICE_METRICS arrive
