# Telemetry and Neighbor Data Recording Fix

**Date**: January 22, 2026  
**Version**: 1.0.3  
**Status**: Implemented - Requires Testing

## Problem

Telemetry data and neighbor information were not being recorded in the database despite messages being received via MQTT.

## Root Causes

### 1. Neighbor Data Not Parsed
- NEIGHBORINFO_APP messages were being received but not parsed
- No protobuf definition for NeighborInfo message type
- No logic to extract and store neighbor relationships

### 2. Telemetry Data Possibly Not Being Received
- Need to verify if telemetry messages are actually being received
- Added enhanced logging to track telemetry parsing and storage

## Solution Implemented

### 1. Added NeighborInfo Protobuf Definitions

**File**: `backend/src/services/protobuf-decoder.service.ts`

Added protobuf message definitions:
```typescript
const NeighborInfo = new protobuf.Type('NeighborInfo')
  .add(new protobuf.Field('nodeId', 1, 'fixed32'))
  .add(new protobuf.Field('nodeBroadcastIntervalSecs', 2, 'uint32'))
  .add(new protobuf.Field('neighbors', 3, 'Neighbor', 'repeated'));

const Neighbor = new protobuf.Type('Neighbor')
  .add(new protobuf.Field('nodeId', 1, 'fixed32'))
  .add(new protobuf.Field('snr', 2, 'float'))
  .add(new protobuf.Field('lastRxTime', 3, 'fixed32'))
  .add(new protobuf.Field('nodeIdStr', 4, 'string'));
```

### 2. Added parseNeighborInfo Method

Parses neighbor information from NEIGHBORINFO_APP messages:
- Extracts list of neighbors with SNR and last heard time
- Formats node IDs correctly
- Returns array of neighbor data

### 3. Updated ParsedMeshtasticData Interface

**File**: `backend/src/services/mqtt.service.ts`

Added neighbors field:
```typescript
export interface ParsedMeshtasticData {
  nodeUpdate?: CreateNodeInput | UpdateNodeInput;
  position?: CreatePositionInput;
  telemetry?: CreateTelemetryInput;
  message?: CreateMessageInput;
  neighbors?: Array<{
    neighborId: string;
    snr?: number;
    lastHeard: Date;
  }>;
  nodeId: string;
}
```

### 4. Added Neighbor Storage Logic

**File**: `backend/src/services/mqtt-manager.service.ts`

Added logic to store neighbor relationships:
- Creates neighbor nodes if they don't exist
- Upserts neighbor relationships in `node_neighbors` table
- Updates SNR and last heard time
- Handles race conditions gracefully

### 5. Enhanced Telemetry Logging

Added detailed logging to track:
- When telemetry is parsed (with type)
- When telemetry is stored (with type)
- Any errors during telemetry storage

## Database Schema

The existing schema already supports both features:

### Telemetry Table
```prisma
model TelemetryReading {
  id        String        @id @default(cuid())
  nodeId    String
  type      TelemetryType
  timestamp DateTime
  data      Json
  createdAt DateTime      @default(now())
  node      Node          @relation(fields: [nodeId], references: [id])
}
```

### Neighbor Table
```prisma
model NodeNeighbor {
  id         String   @id @default(cuid())
  nodeId     String
  neighborId String
  rssi       Int?
  snr        Float?
  lastHeard  DateTime
  hopCount   Int      @default(1)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  node       Node     @relation("NodeNeighborsFrom", fields: [nodeId], references: [id])
  neighbor   Node     @relation("NodeNeighborsTo", fields: [neighborId], references: [id])
  
  @@unique([nodeId, neighborId])
}
```

## Testing Steps

### 1. Rebuild and Restart Services

```bash
# Development
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache backend
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Monitor Logs for Telemetry

```bash
# Watch for telemetry parsing
docker-compose logs -f backend | grep -i "telemetry"

# Should see messages like:
# "Parsed DEVICE_METRICS telemetry for node !xxxxxxxx"
# "Stored DEVICE_METRICS telemetry for node: !xxxxxxxx"
```

### 3. Monitor Logs for Neighbors

```bash
# Watch for neighbor parsing
docker-compose logs -f backend | grep -i "neighbor"

# Should see messages like:
# "Parsing neighbor info for node !xxxxxxxx, found 3 neighbors"
# "Neighbor: !yyyyyyyy, SNR: 8.5, Last heard: 2026-01-22T..."
# "Stored neighbor relationship: !xxxxxxxx -> !yyyyyyyy"
```

### 4. Check Database

```bash
# Check telemetry count
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM telemetry_readings;"

# Check telemetry by type
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT type, COUNT(*) FROM telemetry_readings GROUP BY type;"

# Check neighbor count
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM node_neighbors;"

# View recent neighbors
docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT n1.node_id, n2.node_id as neighbor, nn.snr, nn.last_heard FROM node_neighbors nn JOIN nodes n1 ON nn.node_id = n1.id JOIN nodes n2 ON nn.neighbor_id = n2.id ORDER BY nn.last_heard DESC LIMIT 10;"
```

### 5. Check Frontend

- Navigate to Node Details page
- Check if telemetry charts show data
- Check if neighbor information is displayed

## Expected Behavior

### Telemetry
- Device metrics (battery, voltage, channel utilization) should be recorded
- Environment metrics (temperature, humidity, pressure) should be recorded
- Power metrics (voltage/current per channel) should be recorded
- Telemetry should appear in node details and charts

### Neighbors
- Neighbor relationships should be recorded when NEIGHBORINFO messages are received
- SNR values should be stored
- Last heard timestamps should be updated
- Neighbor information should appear in node details

## Troubleshooting

### No Telemetry Data

1. **Check if telemetry messages are being received**:
   ```bash
   docker-compose logs backend | grep "TELEMETRY_APP"
   ```

2. **Check if telemetry is encrypted**:
   - Telemetry on encrypted channels needs proper decryption
   - Verify channel keys are configured in `config/app.yml`

3. **Check for parsing errors**:
   ```bash
   docker-compose logs backend | grep "Failed to parse telemetry"
   ```

### No Neighbor Data

1. **Check if NEIGHBORINFO messages are being received**:
   ```bash
   docker-compose logs backend | grep "NEIGHBORINFO_APP"
   ```

2. **Check for parsing errors**:
   ```bash
   docker-compose logs backend | grep "Error parsing NeighborInfo"
   ```

3. **Verify neighbor broadcast is enabled on nodes**:
   - Nodes must have neighbor info broadcasting enabled
   - Check Meshtastic device settings

### Database Errors

1. **Check for constraint violations**:
   ```bash
   docker-compose logs backend | grep "P2002\|P2003"
   ```

2. **Check database connections**:
   ```bash
   docker-compose exec -T postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT count(*) FROM pg_stat_activity;"
   ```

## Files Modified

- `backend/src/services/protobuf-decoder.service.ts` - Added NeighborInfo parsing
- `backend/src/services/mqtt.service.ts` - Updated ParsedMeshtasticData interface
- `backend/src/services/mqtt-manager.service.ts` - Added neighbor storage logic, enhanced telemetry logging
- `docs/fixes/TELEMETRY_NEIGHBOR_FIX.md` - This documentation

## Next Steps

1. Deploy changes to production
2. Monitor logs for telemetry and neighbor messages
3. Verify data is being stored in database
4. Check frontend displays the data correctly
5. Update TODO.md to mark these issues as complete

## Notes

- Telemetry frequency depends on node configuration (typically every 15-30 minutes)
- Neighbor info frequency depends on node configuration (typically every 15-30 minutes)
- Not all nodes broadcast telemetry or neighbor info
- Encrypted channels require proper keys to decrypt telemetry/neighbor data
