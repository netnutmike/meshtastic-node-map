# Network Topology Graph Improvements

## Summary

Fixed the network topology graph to properly display connections between nodes based on three types of relationships:
1. **Neighbor relationships** - Direct neighbor links with RSSI/SNR
2. **Traceroute paths** - Hop-by-hop routing paths from traceroute messages
3. **Gateway connections** - Nodes heard by gateways (NEW)

Also removed the unnecessary "Neighbors" and "Traceroutes" toggle switches as requested.

## Changes Made

### Frontend Changes

**File: `frontend/src/components/Map/NetworkTopologyGraph.tsx`**

1. **Added Gateway Link Type**
   - Updated `GraphLink` interface to include `'gateway'` type
   - Gateway links are displayed as blue dotted lines
   - Added gateway link legend entry

2. **Removed Toggle Switches**
   - Removed `showNeighbors` and `showTraceroutes` state variables
   - Removed corresponding toggle switches from UI
   - All link types are now always included

3. **Updated Link Rendering**
   - Gateway links: Blue dotted lines (`rgba(33, 150, 243)`)
   - Traceroute links: Purple dashed lines (`rgba(156, 39, 176)`)
   - Neighbor links: Solid lines colored by signal strength (green to red)

4. **Simplified API Call**
   - Always fetch all link types (neighbors, traceroutes, and gateways)
   - Removed conditional parameters for link types

### Backend Changes

**File: `backend/src/routes/links.ts`**

1. **Added Gateway Link Detection**
   - Queries messages table for recent messages with MQTT topics
   - Parses MQTT topic format: `msh/2/json/LongFast/!gatewayId`
   - Extracts gateway ID from the last segment of the topic
   - Creates links from gateway to message sender

2. **Gateway Link Logic**
   - Validates gateway ID format (must start with `!`)
   - Prevents self-links (gateway hearing itself)
   - Deduplicates links per gateway-node pair (keeps most recent)
   - Limits to 5000 most recent messages for performance

3. **Updated API Documentation**
   - Added description of gateway link type
   - Documented that links include three types: neighbor, traceroute, gateway

### Test Coverage

**File: `backend/src/__tests__/topology-links.test.ts`**

Created comprehensive tests for the topology links API:
- Tests for neighbor links
- Tests for traceroute links
- Tests for gateway links
- Tests for SNR filtering
- Tests for age filtering
- Tests for self-link prevention
- Tests for metadata inclusion

### Documentation

**File: `docs/features/network-topology-graph.md`**

Created comprehensive documentation covering:
- Link types and their visual representation
- Layout options (force-directed, circular, hierarchical)
- Filtering options
- How gateway link detection works
- API endpoint documentation
- Usage tips and best practices

## How Gateway Links Work

Gateway links are automatically detected by analyzing MQTT topics:

```
Message received on topic: msh/2/json/LongFast/!abc12345
                                                 └─ Gateway ID
```

When a message is received on a topic ending with a node ID (e.g., `!abc12345`), it indicates that gateway heard the message from the source node. The system creates a directed link from the gateway to the message sender.

### Example

If gateway `!gateway01` receives a message from node `!node123` on topic `msh/2/json/LongFast/!gateway01`, the system creates:

```json
{
  "source": "!gateway01",
  "target": "!node123",
  "type": "gateway",
  "timestamp": "2026-02-02T10:35:00Z"
}
```

## Visual Representation

### Link Types

1. **Neighbor Links** (Solid, colored by signal strength)
   - Green: Strong (-50 dBm or better)
   - Light Green: Good (-70 to -50 dBm)
   - Yellow: Fair (-85 to -70 dBm)
   - Orange: Poor (-100 to -85 dBm)
   - Red: Very poor (below -100 dBm)

2. **Traceroute Links** (Purple dashed)
   - Shows actual routing paths
   - Helps identify network topology

3. **Gateway Links** (Blue dotted)
   - Shows gateway coverage
   - Helps identify which nodes are heard by which gateways

## Performance Considerations

- Gateway link detection queries up to 5000 recent messages
- Traceroute links limited to 1000 most recent
- All data filtered by age (default 24 hours)
- Links are deduplicated to reduce clutter
- Canvas rendering optimized for ~100 nodes

## API Response Example

```json
{
  "links": [
    {
      "source": "!abc12345",
      "target": "!def67890",
      "type": "neighbor",
      "rssi": -65,
      "snr": 8.5,
      "lastHeard": "2026-02-02T10:30:00Z",
      "metadata": {
        "sourceName": "Node1",
        "targetName": "Node2"
      }
    },
    {
      "source": "!abc12345",
      "target": "!ghi11111",
      "type": "traceroute",
      "hopIndex": 0,
      "totalHops": 3,
      "timestamp": "2026-02-02T10:32:00Z"
    },
    {
      "source": "!gateway01",
      "target": "!abc12345",
      "type": "gateway",
      "timestamp": "2026-02-02T10:35:00Z",
      "metadata": {
        "messageId": "msg123",
        "targetName": "Node1"
      }
    }
  ],
  "count": 3
}
```

## Testing

To test the changes:

1. **Start the application**
   ```bash
   docker-compose up -d
   ```

2. **Open the Network Topology Graph**
   - Navigate to the map page
   - Click the topology graph button

3. **Verify Link Types**
   - Check that neighbor links appear as solid colored lines
   - Check that traceroute links appear as purple dashed lines
   - Check that gateway links appear as blue dotted lines

4. **Verify No Toggle Switches**
   - Confirm that "Neighbors" and "Traceroutes" toggles are removed
   - All link types should be visible by default

## Future Enhancements

Potential improvements:
- Interactive node dragging
- Zoom and pan controls
- Link strength animation over time
- Time-based playback of network evolution
- Export to image/SVG format
- 3D visualization option
- Filtering by specific gateway
- Highlighting paths between selected nodes

## Deployment

No database migrations required. Changes are backward compatible.

To deploy:
```bash
# Rebuild frontend
cd frontend
npm run build

# Rebuild backend
cd ../backend
npm run build

# Restart services
docker-compose restart backend frontend
```

## Related Files

- `frontend/src/components/Map/NetworkTopologyGraph.tsx` - Main component
- `backend/src/routes/links.ts` - API endpoint
- `backend/src/__tests__/topology-links.test.ts` - Tests
- `docs/features/network-topology-graph.md` - User documentation
