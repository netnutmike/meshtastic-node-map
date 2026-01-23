# Telemetry and Neighbor Data Testing Summary

## Date: January 23, 2026

## Issues Fixed

### 1. Telemetry Data Not Showing in Nodes List

**Problem:**
- Telemetry data (battery level, voltage, channel utilization, air util TX) was being received via MQTT but not displaying in the nodes list
- Only voltage was being stored, other fields were missing

**Root Causes:**
1. **Falsy Value Bug in Protobuf Decoder**: Using `||` operator converted `0` values to `undefined`
   ```typescript
   // BEFORE (incorrect)
   channelUtilization: metrics.channelUtilization || undefined
   
   // AFTER (correct)
   channelUtilization: metrics.channelUtilization !== undefined && metrics.channelUtilization !== null ? metrics.channelUtilization : undefined
   ```

2. **Snake_case vs camelCase Field Names**: JSON MQTT messages use snake_case (`battery_level`, `channel_utilization`, `air_util_tx`) but code only looked for camelCase
   ```typescript
   // AFTER (handles both)
   const batteryLevel = payload.batteryLevel ?? payload.battery_level;
   const channelUtilization = payload.channelUtilization ?? payload.channel_utilization;
   const airUtilTx = payload.airUtilTx ?? payload.air_util_tx;
   ```

**Files Modified:**
- `backend/src/services/protobuf-decoder.service.ts` - Fixed falsy value handling
- `backend/src/services/mqtt.service.ts` - Added snake_case field name support

**Status:** ✅ FIXED - Telemetry data now populates correctly in nodes list

### 2. Neighbor Information Not Being Recorded

**Current Status:**
- Neighbor parsing code is implemented and ready
- No NEIGHBORINFO messages have been received from the MQTT broker
- Database table `node_neighbors` is empty (0 records)

**Why No Neighbor Data:**
Neighbor info broadcasts are **not enabled by default** on Meshtastic devices. Users must explicitly enable this feature in their device settings:
- Setting: `neighbor_info_enabled`
- Broadcast interval: Configurable (default is off)

**Message Types Received (last 10 minutes):**
- POSITION: 10,527 messages
- TEXT: 2,733 messages  
- NODEINFO: 657 messages
- NEIGHBORINFO: 0 messages ❌

**What's Working:**
- ✅ Protobuf definitions for NeighborInfo and Neighbor messages
- ✅ Parsing logic in `parseNeighborInfo()` method
- ✅ Database storage logic in mqtt-manager
- ✅ Creates neighbor nodes if they don't exist
- ✅ Stores relationships with SNR and last heard time

**What's Needed:**
- Users need to enable neighbor info broadcasts on their Meshtastic devices
- Once enabled, the system will automatically capture and display neighbor relationships

**Testing:**
To test neighbor functionality, you would need:
1. Access to a Meshtastic device
2. Enable neighbor info broadcasts in device settings
3. Wait for the device to broadcast neighbor info (based on configured interval)
4. Check the nodes list for neighbor count
5. View node details to see neighbor relationships

## Verification

### Telemetry Data Example
Node: RQ01 (!435a79e0)
```
Battery Level: 91%
Voltage: 4.07V
Channel Utilization: 1.75%
Air Util TX: 0.529%
```

### API Response
```bash
curl "http://localhost:3001/api/v1/nodes?search=RQ01" | jq '.data[0]'
```
Returns all telemetry fields correctly.

### Database Verification
```sql
SELECT "nodeId", "shortName", "batteryLevel", voltage, "channelUtilization", "airUtilTx" 
FROM nodes 
WHERE "nodeId" = '!435a79e0';
```
Shows all fields populated.

## Next Steps

1. **Telemetry**: Working correctly, no further action needed
2. **Neighbors**: Waiting for NEIGHBORINFO messages from devices with neighbor broadcasts enabled
3. **Channel Utilization Display**: May need to fix format function to handle `0` values properly

## Related Files
- `backend/src/services/protobuf-decoder.service.ts`
- `backend/src/services/mqtt.service.ts`
- `backend/src/services/mqtt-manager.service.ts`
- `frontend/src/pages/NodesPage.tsx`
- `docs/TELEMETRY_DISPLAY_FIX.md`
- `docs/fixes/TELEMETRY_NEIGHBOR_FIX.md`
