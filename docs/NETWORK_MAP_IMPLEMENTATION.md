# Malla Network Map Implementation Analysis

## Overview

Malla's network map is superior to our current topology graph because it shows **actual RF links** between nodes based on real packet data, not just NEIGHBORINFO messages. This document explains how they implement it and how we can duplicate their approach.

---

## Key Differences from Our Current Implementation

### Our Current Approach (Network Topology Graph)
- **Data Source**: NEIGHBORINFO_APP messages (portnum 42) only
- **Problem**: Requires nodes to send NEIGHBORINFO (happens every 1-3 hours)
- **Problem**: Requires PSK encryption keys to decrypt NEIGHBORINFO
- **Problem**: Limited data - only shows what nodes report as neighbors
- **Result**: Often shows no connections because NEIGHBORINFO is rare/encrypted

### Malla's Approach (Network Map)
- **Data Source 1**: Traceroute packets (TRACEROUTE_APP, portnum 41)
- **Data Source 2**: Direct packet receptions (0-hop packets from any protocol)
- **Advantage**: Works with ANY packet type, not just NEIGHBORINFO
- **Advantage**: Doesn't require encryption keys (uses packet metadata)
- **Advantage**: Shows real RF links based on actual communication
- **Result**: Rich network visualization with many connections

---

## How Malla Gets Link Data

### 1. Traceroute Links (Primary Source)

**What They Are:**
- RF hops extracted from TRACEROUTE_APP messages
- Shows which nodes can communicate directly via radio
- Includes signal quality (SNR, RSSI) and reliability metrics

**How They Extract Them:**
```python
# From TracerouteService.get_network_graph_data()
# Analyzes traceroute packets to find consecutive node pairs in routes

# Example: If traceroute shows route [A, B, C, D]
# Creates links: A↔B, B↔C, C↔D (bidirectional)

# For each link, tracks:
- packet_count: How many times this hop was seen
- avg_snr: Average signal-to-noise ratio
- avg_rssi: Average signal strength
- last_seen: Most recent observation
- success_rate: Calculated from packet count (more = more reliable)
```

**Database Query Pattern:**
```sql
-- Find traceroute packets
SELECT 
    from_node_id,
    to_node_id,
    raw_payload,  -- Contains route data
    rssi,
    snr,
    timestamp
FROM packet_history
WHERE portnum = 41  -- TRACEROUTE_APP
    AND processed_successfully = 1
    AND timestamp >= ?
ORDER BY timestamp DESC
LIMIT 2000
```

**Route Parsing:**
```python
# Parse protobuf to extract route_nodes array
# Example route: [node1, node2, node3, node4]

# Extract consecutive pairs (RF hops):
for i in range(len(route_nodes) - 1):
    from_node = route_nodes[i]
    to_node = route_nodes[i + 1]
    # This is a direct RF hop
    create_link(from_node, to_node, signal_quality)
```

### 2. Packet Links (Secondary Source)

**What They Are:**
- Direct RF receptions detected from ANY packet type
- A link exists if a gateway directly received a packet (0 hops)
- Shows real RF coverage between nodes

**How They Detect Them:**
```python
# From LocationService.get_packet_links()
# Finds packets where hop_count = 0 (direct reception)

# Key insight: When hop_start == hop_limit, packet was received directly
# This means the gateway has direct RF line-of-sight to the sender

# Creates link between:
- from_node_id (sender)
- gateway_id (receiver, converted to node_id)
```

**Database Query:**
```sql
SELECT
    from_node_id,
    gateway_id,
    COUNT(*) AS packet_count,
    AVG(CAST(rssi AS FLOAT)) AS avg_rssi,
    AVG(CAST(snr AS FLOAT)) AS avg_snr,
    MAX(timestamp) AS last_seen
FROM packet_history
WHERE from_node_id IS NOT NULL
    AND gateway_id IS NOT NULL
    AND hop_start IS NOT NULL
    AND hop_limit IS NOT NULL
    AND hop_start = hop_limit  -- 0-hop packets only (direct reception)
    AND timestamp >= ?
GROUP BY from_node_id, gateway_id
```

**Key Logic:**
```python
# hop_start = initial hop limit when packet was sent
# hop_limit = remaining hops when packet was received
# hop_count = hop_start - hop_limit

# If hop_count = 0 (hop_start == hop_limit):
#   → Packet was received directly without any relay
#   → Direct RF link exists between sender and receiver
```

---

## Map Visualization Details

### Link Display

**Traceroute Links (Solid Lines):**
- Color based on success rate:
  - Green (#28a745): ≥80% success rate
  - Yellow (#ffc107): 50-79% success rate
  - Red (#dc3545): <50% success rate
- Thickness: 2-3px (thicker when node selected)
- Opacity: 0.6-0.9
- Dashed if unreliable (<50% success)

**Packet Links (Dashed Lines):**
- Same color scheme as traceroute links
- Always dashed (dashArray: '3, 6') to distinguish from traceroute
- Shows direct RF coverage from packet metadata

### Link Popup Information

When clicking a link, shows:
```javascript
{
    from_node: "Node Name",
    to_node: "Node Name",
    success_rate: "85.5%",
    total_attempts: 42,
    avg_snr: "8.5 dB",
    avg_rssi: "-75 dBm",
    last_seen: "2 hours ago",
    link_type: "traceroute" | "packet"
}
```

Plus buttons for:
- "View History" - Shows all traceroutes containing this hop
- "Line of Sight" - Analyzes RF path between nodes

### Node Markers

**Custom Markers:**
- Circular markers with role-based colors
- Display short name or last 4 hex digits
- Size: 40x40px with white border
- Hover effect: scale(1.1)

**Marker Clustering:**
- Uses Leaflet MarkerCluster
- Groups nearby nodes (50px radius)
- Cluster sizes: small (<5), medium (5-10), large (>10)
- Click to zoom and expand cluster

### Hop Depth Filtering

**Feature:** When node selected, show only N hops away
```javascript
// Compute nodes within hop depth using BFS
function computeNodesWithinHops(startNodeId, maxHops) {
    const visited = new Set([startNodeId]);
    let frontier = [startNodeId];
    let hops = 0;
    
    while (frontier.length > 0 && hops < maxHops) {
        const nextFrontier = [];
        frontier.forEach(nodeId => {
            allLinkData.forEach(link => {
                // Add connected nodes to next frontier
                if (link.from_node_id === nodeId && !visited.has(link.to_node_id)) {
                    visited.add(link.to_node_id);
                    nextFrontier.push(link.to_node_id);
                }
                // Bidirectional check
                else if (link.to_node_id === nodeId && !visited.has(link.from_node_id)) {
                    visited.add(link.from_node_id);
                    nextFrontier.push(link.from_node_id);
                }
            });
        });
        frontier = nextFrontier;
        hops += 1;
    }
    return visited;
}
```

---

## API Endpoint Structure

### `/api/locations` Response

```json
{
    "locations": [
        {
            "node_id": 123456,
            "display_name": "Node Name",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "altitude": 100,
            "timestamp": 1706000000,
            "role": "ROUTER",
            "hw_model": "TBEAM",
            "primary_channel": "LongFast"
        }
    ],
    "traceroute_links": [
        {
            "from_node_id": 123456,
            "to_node_id": 789012,
            "success_rate": 85.5,
            "avg_snr": 8.5,
            "avg_rssi": -75,
            "age_hours": 2.5,
            "last_seen": 1706000000,
            "last_seen_str": "2024-01-23 10:30:00 UTC",
            "is_bidirectional": true,
            "total_hops_seen": 42,
            "link_type": "traceroute"
        }
    ],
    "packet_links": [
        {
            "from_node_id": 123456,
            "to_node_id": 345678,
            "success_rate": 90.0,
            "avg_snr": 12.3,
            "avg_rssi": -68,
            "age_hours": 1.2,
            "last_seen": 1706005000,
            "last_seen_str": "2024-01-23 11:45:00 UTC",
            "is_bidirectional": true,
            "total_hops_seen": 156,
            "link_type": "packet"
        }
    ],
    "total_count": 50,
    "filters_applied": {
        "start_time": 1705913600,
        "end_time": 1706000000
    },
    "data_period_days": 14
}
```

---

## Implementation Steps for Our Project

### Phase 1: Backend - Link Detection

1. **Create Traceroute Link Service**
   ```typescript
   // backend/src/services/traceroute-link.service.ts
   
   interface TracerouteLink {
       from_node_id: string;
       to_node_id: string;
       packet_count: number;
       avg_snr: number;
       avg_rssi: number;
       last_seen: Date;
       success_rate: number;
   }
   
   async function extractTracerouteLinks(hours: number = 24): Promise<TracerouteLink[]> {
       // 1. Query traceroute packets (portnum = 41)
       // 2. Parse protobuf to extract route_nodes
       // 3. Extract consecutive pairs as RF hops
       // 4. Aggregate by (from_node, to_node) pair
       // 5. Calculate statistics (count, avg SNR/RSSI, success rate)
       // 6. Return bidirectional links
   }
   ```

2. **Create Packet Link Service**
   ```typescript
   // backend/src/services/packet-link.service.ts
   
   interface PacketLink {
       from_node_id: string;
       to_node_id: string;
       packet_count: number;
       avg_snr: number;
       avg_rssi: number;
       last_seen: Date;
       success_rate: number;
   }
   
   async function extractPacketLinks(hours: number = 24): Promise<PacketLink[]> {
       // Query for 0-hop packets (hop_start = hop_limit)
       const query = `
           SELECT
               from_node_id,
               gateway_id,
               COUNT(*) as packet_count,
               AVG(rssi) as avg_rssi,
               AVG(snr) as avg_snr,
               MAX(timestamp) as last_seen
           FROM messages
           WHERE from_node_id IS NOT NULL
               AND gateway_id IS NOT NULL
               AND hop_start IS NOT NULL
               AND hop_limit IS NOT NULL
               AND hop_start = hop_limit  -- Direct reception
               AND timestamp >= NOW() - INTERVAL '? hours'
           GROUP BY from_node_id, gateway_id
       `;
       
       // Convert gateway_id to node_id
       // Merge bidirectional links
       // Calculate success rate
       // Return links
   }
   ```

3. **Add API Endpoint**
   ```typescript
   // backend/src/routes/map.routes.ts
   
   router.get('/api/map/links', async (req, res) => {
       const hours = parseInt(req.query.hours as string) || 24;
       
       const [tracerouteLinks, packetLinks] = await Promise.all([
           extractTracerouteLinks(hours),
           extractPacketLinks(hours)
       ]);
       
       res.json({
           traceroute_links: tracerouteLinks,
           packet_links: packetLinks,
           total_links: tracerouteLinks.length + packetLinks.length
       });
   });
   ```

### Phase 2: Frontend - Map Visualization

1. **Update Map Component**
   ```typescript
   // frontend/src/components/Map/NetworkMap.tsx
   
   interface MapLink {
       from_node_id: string;
       to_node_id: string;
       success_rate: number;
       avg_snr: number;
       avg_rssi: number;
       link_type: 'traceroute' | 'packet';
   }
   
   function drawLinks(links: MapLink[], type: 'traceroute' | 'packet') {
       links.forEach(link => {
           const fromPos = nodePositions[link.from_node_id];
           const toPos = nodePositions[link.to_node_id];
           
           if (!fromPos || !toPos) return;
           
           // Determine color based on success rate
           let color = '#dc3545'; // Red
           if (link.success_rate >= 80) color = '#28a745'; // Green
           else if (link.success_rate >= 50) color = '#ffc107'; // Yellow
           
           // Create polyline
           const line = L.polyline([fromPos, toPos], {
               color: color,
               weight: 2,
               opacity: 0.6,
               dashArray: type === 'packet' ? '3, 6' : undefined
           });
           
           // Add popup
           line.bindPopup(createLinkPopup(link));
           line.addTo(map);
       });
   }
   ```

2. **Add Link Toggles**
   ```typescript
   // Checkboxes to show/hide link types
   <input 
       type="checkbox" 
       checked={showTracerouteLinks}
       onChange={() => toggleTracerouteLinks()}
   />
   <label>Traceroute Links</label>
   
   <input 
       type="checkbox" 
       checked={showPacketLinks}
       onChange={() => togglePacketLinks()}
   />
   <label>Packet Links (Direct RF)</label>
   ```

3. **Add Hop Depth Filter**
   ```typescript
   // When node selected, show only N hops away
   <select value={hopDepth} onChange={(e) => setHopDepth(e.target.value)}>
       <option value="1">1 hop</option>
       <option value="2">2 hops</option>
       <option value="3">3 hops</option>
       <option value="999">All</option>
   </select>
   ```

### Phase 3: Database Optimization

1. **Add Indexes**
   ```sql
   -- For traceroute link extraction
   CREATE INDEX idx_messages_traceroute 
   ON messages(portnum, timestamp) 
   WHERE portnum = 41;
   
   -- For packet link extraction (0-hop detection)
   CREATE INDEX idx_messages_direct_reception 
   ON messages(from_node_id, gateway_id, timestamp)
   WHERE hop_start = hop_limit;
   
   -- For hop count calculation
   CREATE INDEX idx_messages_hop_count 
   ON messages((hop_start - hop_limit), timestamp);
   ```

2. **Add Computed Column (Optional)**
   ```sql
   -- Add hop_count as computed column for easier querying
   ALTER TABLE messages 
   ADD COLUMN hop_count INTEGER GENERATED ALWAYS AS (hop_start - hop_limit) STORED;
   
   CREATE INDEX idx_messages_hop_count ON messages(hop_count, timestamp);
   ```

---

## Key Insights

### Why This Works Better

1. **More Data Sources**: Uses traceroutes AND direct packet receptions, not just NEIGHBORINFO
2. **No Encryption Needed**: Works with packet metadata (hop counts, gateway IDs), not encrypted payloads
3. **Real RF Links**: Shows actual communication paths, not just reported neighbors
4. **Continuous Updates**: Every packet contributes data, not just periodic NEIGHBORINFO

### Performance Considerations

1. **Limit Time Window**: Default to 24 hours, max 14 days
2. **Limit Packet Count**: Process max 2000 traceroute packets
3. **Cache Results**: Cache link data for 5 minutes
4. **Client-Side Filtering**: Send all data to client, filter in browser
5. **Aggregate Links**: Merge bidirectional links to reduce data volume

### Success Rate Calculation

```python
# Malla's approach: Scale packet count to 10-100 range
success_rate = min(100, max(10, packet_count * 10))

# More packets = more reliable link
# 1 packet = 10% success
# 5 packets = 50% success
# 10+ packets = 100% success
```

---

## Additional Features to Consider

### 1. Link Quality Metrics
- Track SNR/RSSI over time
- Show signal quality trends
- Alert on degrading links

### 2. Link History
- Store historical link data
- Show link reliability over time
- Identify intermittent connections

### 3. Path Analysis
- Find all paths between two nodes
- Calculate path quality scores
- Suggest optimal routing

### 4. Coverage Analysis
- Identify coverage gaps
- Suggest node placement
- Calculate network redundancy

---

## References

- **Malla Map Template**: `malla-main/src/malla/templates/map.html`
- **Location Service**: `malla-main/src/malla/services/location_service.py`
- **Traceroute Service**: `malla-main/src/malla/services/traceroute_service.py`
- **API Routes**: `malla-main/src/malla/routes/api_routes.py`

---

*Last Updated: January 2026*
*Analysis based on Malla codebase main branch*
