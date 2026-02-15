# RF Link Detection Services

## Overview

This module implements RF link detection for Meshtastic mesh networks by analyzing both traceroute packets and direct (0-hop) packet receptions. The services extract actual RF connectivity between nodes without relying on NEIGHBORINFO messages.

## Requirements

Implements requirements 34.1, 34.2, 34.3, 34.11, 34.12, 34.13, 34.14 from the Meshtastic Node Mapper specification.

## Architecture

### Services

1. **TracerouteLinkService** (`traceroute-link.service.ts`)
   - Extracts RF hops from TRACEROUTE_APP packets (portnum 41)
   - Parses route_nodes array to identify consecutive node pairs
   - Aggregates statistics: packet_count, avg_rssi, avg_snr, last_seen
   - Calculates success rates and identifies bidirectional links

2. **PacketLinkService** (`packet-link.service.ts`)
   - Detects 0-hop packets where hop_start = hop_limit
   - Identifies direct RF receptions between sender and gateway
   - Extracts gateway ID from MQTT topic path
   - Works without encryption keys (uses packet metadata only)

3. **RFLinkService** (`rf-link.service.ts`)
   - Aggregates links from both traceroute and packet sources
   - Implements 5-minute caching for performance
   - Merges bidirectional links to reduce data volume
   - Provides unified API for RF link retrieval

## Data Model

```typescript
interface RFLink {
  from_node_id: string;        // Source node ID
  to_node_id: string;          // Destination node ID
  link_type: 'traceroute' | 'packet';  // Link detection method
  packet_count: number;        // Number of packets observed
  avg_rssi: number;           // Average signal strength (dBm)
  avg_snr: number;            // Average signal-to-noise ratio (dB)
  last_seen: Date;            // Most recent observation
  success_rate: number;       // Calculated: min(100, max(10, packet_count * 10))
  is_bidirectional: boolean;  // Whether reverse link also exists
}
```

## Usage

### Basic Usage

```typescript
import { rfLinkService } from './services/rf-link.service';

// Get all RF links for the last 24 hours
const result = await rfLinkService.getAllRFLinks(24, true);

console.log(`Traceroute links: ${result.traceroute_links.length}`);
console.log(`Packet links: ${result.packet_links.length}`);
console.log(`Total links: ${result.all_links.length}`);
```

### Advanced Usage

```typescript
// Get links for last 7 days without merging bidirectional
const result = await rfLinkService.getAllRFLinks(168, false);

// Clear cache to force fresh data
rfLinkService.clearCache();

// Get cache statistics
const stats = rfLinkService.getCacheStats();
console.log(`Cache entries: ${stats.entries}`);
```

## Link Detection Methods

### Traceroute Links (Solid Lines)

- Source: TRACEROUTE_APP messages (portnum 41)
- Detection: Consecutive pairs in route_nodes array
- Reliability: High (explicit routing information)
- Visualization: Solid lines on map

### Packet Links (Dashed Lines)

- Source: Any packet where hop_start = hop_limit
- Detection: Direct RF reception (0 hops)
- Reliability: Medium (inferred from hop count)
- Visualization: Dashed lines on map

## Success Rate Calculation

Success rate is calculated using the formula:

```
success_rate = min(100, max(10, packet_count * 10))
```

This provides:
- Minimum 10% for any observed link (1 packet)
- Linear scaling from 10% to 100% (1-10 packets)
- Maximum 100% for well-established links (10+ packets)

## Bidirectional Link Merging

Links are merged bidirectionally to reduce data volume:

1. Generate consistent link key: `min(nodeA, nodeB)-max(nodeA, nodeB)`
2. Merge statistics from both directions
3. Update last_seen to most recent observation
4. Mark as bidirectional if reverse link exists

## Performance Optimizations

### Database Indexes

The following indexes are created for optimal query performance:

```sql
-- Traceroute packet queries
CREATE INDEX idx_messages_traceroute_timestamp 
ON messages (type, timestamp DESC) 
WHERE type = 'TRACEROUTE_APP';

-- 0-hop packet detection
CREATE INDEX idx_messages_hop_detection 
ON messages ("hopStart", "hopLimit", timestamp DESC) 
WHERE "hopStart" IS NOT NULL AND "hopLimit" IS NOT NULL;

-- Gateway-based queries
CREATE INDEX idx_messages_from_node_timestamp 
ON messages ("fromNodeId", timestamp DESC);

-- Topic-based gateway extraction
CREATE INDEX idx_messages_topic 
ON messages (topic) 
WHERE topic IS NOT NULL;

-- Link aggregation
CREATE INDEX idx_messages_link_aggregation 
ON messages ("fromNodeId", "toNodeId", timestamp DESC, rssi, snr);
```

### Caching Strategy

- Cache TTL: 5 minutes
- Cache key format: `rf-links-{hours}-{mergeBidirectional}`
- Automatic cleanup of expired entries
- Manual cache clearing available

### Query Limits

- Traceroute packets: 2000 most recent
- 0-hop packets: 5000 most recent
- Time window: 1-336 hours (max 14 days)

## API Integration

### Recommended Endpoint

```typescript
// GET /api/map/links?hours=24
router.get('/api/map/links', async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours as string) || 24, 336);
  const result = await rfLinkService.getAllRFLinks(hours, true);
  res.json(result);
});
```

### Response Format

```json
{
  "traceroute_links": [
    {
      "from_node_id": "!12345678",
      "to_node_id": "!87654321",
      "link_type": "traceroute",
      "packet_count": 15,
      "avg_rssi": -82.5,
      "avg_snr": 9.2,
      "last_seen": "2024-01-15T10:30:00Z",
      "success_rate": 100,
      "is_bidirectional": true
    }
  ],
  "packet_links": [...],
  "all_links": [...]
}
```

## Testing

### Property-Based Tests

Located in `__tests__/rf-link-detection.property.test.ts`:

- Route extraction produces N-1 links from N nodes
- Success rate calculation correctness
- Bidirectional link symmetry
- 0-hop packet detection
- Gateway extraction from MQTT topics
- Average calculation correctness

### Unit Tests

Located in `__tests__/rf-link-services.test.ts`:

- Link key generation
- Success rate calculation edge cases
- Average calculation
- Bidirectional link merging
- Gateway extraction from various topic formats
- 0-hop packet detection
- Link merging strategies
- Cache management
- Data structure validation

## Migration

To apply the database indexes:

```bash
psql -U postgres -d meshtastic_node_mapper -f backend/prisma/migrations/add_rf_link_indexes.sql
```

Or use Prisma migrations if integrated into the migration workflow.

## Future Enhancements

1. **Signal Quality Analysis**
   - Track RSSI/SNR trends over time
   - Identify degrading links
   - Alert on poor signal quality

2. **Link Reliability Scoring**
   - Incorporate packet loss rates
   - Consider temporal consistency
   - Weight by hop count

3. **Network Topology Analysis**
   - Identify critical links
   - Detect network partitions
   - Suggest optimal routing paths

4. **Real-time Updates**
   - WebSocket notifications for new links
   - Live link quality monitoring
   - Dynamic map updates

## References

- Design Document: `.kiro/specs/meshtastic-node-mapper/design.md`
- Requirements: `.kiro/specs/meshtastic-node-mapper/requirements.md` (Requirement 34)
- Malla Implementation: `docs/NETWORK_MAP_IMPLEMENTATION.md`
