# RF Link Visualization Guide

## Overview

The RF Link Visualization feature provides real-time visualization of actual radio frequency (RF) connections between Meshtastic nodes. Unlike theoretical neighbor relationships, RF links show proven communication paths based on actual packet transmissions.

## What are RF Links?

RF links represent confirmed radio connections between nodes in your mesh network. The system detects these links through two methods:

1. **Traceroute Links**: Extracted from TRACEROUTE_APP messages showing multi-hop paths
2. **Packet Links**: Detected from 0-hop packets (direct receptions) across all message types

## Accessing RF Link Visualization

### On the Map Page

1. Navigate to the **Map** page
2. Click the **Map Options** button (⚙️)
3. Under **Overlays**, enable **RF Links**
4. Links will appear as lines connecting nodes

### Link Display Options

**Toggle Link Types:**
- **Traceroute Links**: Solid lines showing confirmed routing paths
- **Packet Links**: Dashed lines showing direct packet receptions
- **Both**: Display all detected RF connections

**Color Coding by Success Rate:**
- 🟢 **Green** (80-100%): Excellent link quality
- 🟡 **Yellow** (50-79%): Good link quality
- 🔴 **Red** (<50%): Poor link quality

## Understanding Link Types

### Traceroute Links (Solid Lines)

**Source**: TRACEROUTE_APP messages (portnum 41)

**How They Work:**
- Nodes send traceroute packets through the network
- Each hop records the route taken
- System extracts consecutive node pairs as direct RF hops
- Aggregates statistics over time

**What They Show:**
- Proven multi-hop routing paths
- Intermediate nodes in message delivery
- Network topology and routing efficiency

**Example:**
```
Node A → Node B → Node C → Node D

Creates RF links:
- A ↔ B (traceroute)
- B ↔ C (traceroute)
- C ↔ D (traceroute)
```

### Packet Links (Dashed Lines)

**Source**: All packet types with 0-hop detection

**How They Work:**
- Monitors all incoming packets at gateways
- Identifies 0-hop packets using: `hop_start = hop_limit`
- Creates link between sender and receiving gateway
- Works without encryption keys (uses packet metadata)

**What They Show:**
- Direct radio reception between nodes
- Real-time coverage and connectivity
- Gateway reception patterns

**Example:**
```
Node A transmits with hop_limit=3, hop_start=3
Gateway B receives it directly (0 hops)

Creates RF link:
- A ↔ B (packet, 0-hop)
```

## Link Information Popup

Click any RF link line to see detailed information:

**Link Details:**
- **From Node**: Source node name and hex ID
- **To Node**: Destination node name and hex ID
- **Link Type**: Traceroute or Packet
- **Success Rate**: Calculated reliability percentage
- **Packet Count**: Number of packets observed
- **Signal Quality**:
  - Average RSSI (Received Signal Strength Indicator)
  - Average SNR (Signal-to-Noise Ratio)
- **Last Seen**: Timestamp of most recent packet
- **Bidirectional**: Whether link works in both directions

**Success Rate Calculation:**
```
success_rate = min(100, max(10, packet_count * 10))
```

This formula:
- Starts at 10% minimum (new links)
- Increases 10% per packet observed
- Caps at 100% (10+ packets)

## Hop Depth Filtering

Filter the map to show only nodes within N hops of a selected node.

### Using Hop Depth Filter

1. Click any node on the map
2. In the node popup, click **Filter by Hop Depth**
3. Select hop depth:
   - **1 Hop**: Direct neighbors only
   - **2 Hops**: Neighbors and their neighbors
   - **3 Hops**: Three-hop radius
   - **All Hops**: Show entire network

### How It Works

The system uses Breadth-First Search (BFS) algorithm:

1. Starts from selected node
2. Finds all directly connected nodes (1 hop)
3. Finds nodes connected to those (2 hops)
4. Continues until reaching specified depth
5. Hides all nodes outside the hop radius

**Example Network:**
```
    A
   / \
  B   C
 / \   \
D   E   F
```

From node A:
- **1 Hop**: Shows A, B, C
- **2 Hops**: Shows A, B, C, D, E, F
- **3 Hops**: Shows entire network (if no more nodes)

### Use Cases

**Network Troubleshooting:**
- Isolate connectivity issues
- Verify routing paths
- Identify network segments

**Coverage Analysis:**
- See reach from specific nodes
- Plan node placement
- Identify coverage gaps

**Performance Testing:**
- Test multi-hop reliability
- Measure hop-based latency
- Optimize routing

## Time Range Selection

Control which RF links are displayed based on age.

### Setting Time Range

1. Open **Map Options** panel
2. Find **RF Links Time Range** setting
3. Select time window:
   - **Last Hour**: Very recent links only
   - **Last 6 Hours**: Recent activity
   - **Last 24 Hours** (default): Daily patterns
   - **Last 7 Days**: Weekly trends
   - **Last 14 Days** (maximum): Long-term patterns

### Why Time Range Matters

**Short Time Ranges (1-6 hours):**
- Show current network state
- Identify active connections
- Real-time troubleshooting
- Current coverage patterns

**Long Time Ranges (7-14 days):**
- Historical connectivity patterns
- Intermittent link detection
- Mobile node tracking
- Network evolution analysis

**Performance Consideration:**
- Longer ranges = more data = slower loading
- Default 24 hours balances detail and performance
- Maximum 14 days (336 hours) to prevent overload

## Link Statistics

### Per-Link Metrics

**Packet Count:**
- Total packets observed on this link
- Higher count = more reliable data
- Minimum 1 packet to create link

**Average RSSI:**
- Signal strength in dBm
- Typical range: -120 to -30 dBm
- Higher (closer to 0) = stronger signal
- Example: -65 dBm is excellent

**Average SNR:**
- Signal-to-Noise Ratio in dB
- Typical range: -20 to +10 dB
- Higher = better signal quality
- Example: 8.5 dB is very good

**Last Seen:**
- Timestamp of most recent packet
- Helps identify stale links
- Used for time range filtering

### Network-Wide Statistics

Access from **Network Insights** → **RF Links**:

**Link Summary:**
- Total RF links detected
- Traceroute vs Packet link counts
- Bidirectional link percentage
- Average success rate

**Signal Quality Distribution:**
- RSSI histogram
- SNR distribution
- Quality by link type
- Trends over time

**Top Links:**
- Most reliable links (highest success rate)
- Strongest links (best RSSI/SNR)
- Most active links (highest packet count)
- Longest distance links

## Practical Applications

### Network Health Monitoring

**Daily Checks:**
1. Enable RF link visualization
2. Look for red (poor quality) links
3. Check for missing expected links
4. Verify bidirectional connectivity

**Indicators of Issues:**
- Many red links: Interference or poor placement
- Missing links: Node offline or out of range
- One-way links: Antenna or power issues
- Fluctuating links: Environmental interference

### Coverage Planning

**Before Adding Nodes:**
1. View current RF links
2. Identify coverage gaps
3. Use hop depth filter to see reach
4. Plan new node placement to fill gaps

**After Adding Nodes:**
1. Monitor new RF links forming
2. Verify expected connections
3. Check signal quality
4. Adjust placement if needed

### Troubleshooting Connectivity

**Problem**: Node not receiving messages

**Steps:**
1. Enable RF link visualization
2. Check if node has any RF links
3. If no links: Node out of range or offline
4. If links exist: Check success rate and signal quality
5. Use hop depth filter to verify routing paths

**Problem**: Poor message delivery

**Steps:**
1. View RF links for affected nodes
2. Check link success rates (look for red links)
3. Review RSSI/SNR values
4. Identify weak links in routing path
5. Consider node repositioning or adding repeaters

### Optimizing Network Performance

**Identify Bottlenecks:**
1. View all RF links
2. Look for nodes with many connections (hubs)
3. Check if hub links are high quality
4. Consider load balancing or adding redundancy

**Improve Routing:**
1. Analyze traceroute links
2. Identify inefficient multi-hop paths
3. Add nodes to create shorter paths
4. Verify new links form as expected

## Advanced Features

### Bidirectional Link Detection

**What It Means:**
- Link works in both directions
- Node A can reach Node B
- Node B can reach Node A

**Why It Matters:**
- Bidirectional links are more reliable
- Required for acknowledgments
- Better for two-way communication

**Visual Indicator:**
- Bidirectional: Single line with arrows on both ends
- Unidirectional: Line with arrow on one end only

### Link Aggregation

The system automatically aggregates multiple observations:

**For Traceroute Links:**
- Combines multiple traceroute packets
- Averages signal quality metrics
- Tracks packet count over time
- Updates success rate continuously

**For Packet Links:**
- Aggregates all 0-hop detections
- Combines data from multiple gateways
- Tracks reception patterns
- Identifies consistent vs intermittent links

### Performance Optimization

**For Large Networks (100+ nodes):**
- Use shorter time ranges (1-6 hours)
- Enable hop depth filtering
- Disable packet links if not needed
- Focus on traceroute links for routing analysis

**For Slow Connections:**
- Reduce time range to last hour
- Disable real-time updates
- Use static snapshots
- Export data for offline analysis

## Configuration

### In config/app.yml

```yaml
rfLinks:
  enabled: true
  defaultTimeRange: 24  # hours
  maxTimeRange: 336     # 14 days
  cacheTimeout: 300     # 5 minutes
  
  traceroute:
    enabled: true
    minPackets: 1
    
  packet:
    enabled: true
    minPackets: 1
    
  display:
    defaultVisible: true
    showLabels: false
    lineWeight: 2
    lineOpacity: 0.6
```

### In Map Options UI

Users can toggle:
- RF Links on/off
- Traceroute links on/off
- Packet links on/off
- Distance labels on links
- Time range selection
- Success rate color coding

## Troubleshooting

### No RF Links Appearing

**Check:**
1. RF Links overlay is enabled in Map Options
2. Time range includes recent activity
3. Nodes are transmitting (check MQTT Monitor)
4. TRACEROUTE_APP messages are being received
5. Database has link data: `docker-compose exec postgres psql -U meshtastic -d meshtastic_mapper -c "SELECT COUNT(*) FROM traceroute_links;"`

### Links Not Updating

**Check:**
1. MQTT connection is active (green indicator)
2. Backend service is running: `docker-compose ps backend`
3. Check backend logs: `docker-compose logs backend | grep "RF link"`
4. Clear browser cache and refresh
5. Verify time range includes recent data

### Poor Link Quality Everywhere

**Possible Causes:**
1. **Interference**: Check for sources of 900MHz/2.4GHz interference
2. **Antenna Issues**: Verify antennas are properly connected
3. **Power Levels**: Check if nodes are using appropriate power settings
4. **Distance**: Nodes may be too far apart
5. **Obstacles**: Buildings, terrain, or foliage blocking signals

**Solutions:**
1. Adjust node placement
2. Add repeater nodes
3. Increase transmit power (within legal limits)
4. Improve antenna height/positioning
5. Use directional antennas for long links

### One-Way Links

**Causes:**
1. **Asymmetric Power**: One node transmitting at higher power
2. **Antenna Issues**: Damaged or poorly connected antenna
3. **Receiver Sensitivity**: One node has better receiver
4. **Interference**: Directional interference source

**Diagnosis:**
1. Check both nodes' transmit power settings
2. Verify antenna connections
3. Test with different nodes
4. Check for local interference sources

## Best Practices

### Daily Monitoring

1. **Quick Visual Check**: Enable RF links and scan for red lines
2. **Verify Critical Links**: Check links between important nodes
3. **Monitor New Links**: Watch for new nodes joining network
4. **Check Bidirectionality**: Ensure important links work both ways

### Weekly Analysis

1. **Export Link Data**: Save RF link statistics for trending
2. **Review Success Rates**: Identify degrading links
3. **Analyze Patterns**: Look for time-based connectivity issues
4. **Plan Improvements**: Identify areas needing attention

### Network Changes

**Before Changes:**
1. Document current RF link state
2. Export link statistics
3. Note critical links to preserve

**After Changes:**
1. Monitor new RF links forming
2. Verify expected connections
3. Check signal quality improvements
4. Document results

## Integration with Other Features

### With Hop Depth Filtering

Combine RF links with hop depth filtering to:
- Visualize routing paths from specific nodes
- Identify multi-hop dependencies
- Plan redundant paths
- Optimize network topology

### With Distance Calculation

RF links can display distance information:
- Enable distance labels on links
- See physical distance vs hop count
- Identify long-distance links
- Plan optimal node spacing

### With Line of Sight Analysis

Use RF links with LOS tool to:
- Verify theoretical LOS matches actual links
- Identify unexpected connections (reflection/diffraction)
- Troubleshoot missing expected links
- Validate terrain modeling

### With Gateway Comparison

Compare RF link quality across gateways:
- See which gateway receives better from each node
- Identify optimal gateway placement
- Balance network load
- Improve coverage

## API Access

### Get RF Links

```bash
GET /api/map/links?hours=24
```

**Response:**
```json
{
  "traceroute_links": [
    {
      "from_node_id": "123456789",
      "to_node_id": "987654321",
      "packet_count": 15,
      "avg_rssi": -65.5,
      "avg_snr": 8.2,
      "last_seen": "2024-12-13T10:30:00Z",
      "success_rate": 100,
      "is_bidirectional": true
    }
  ],
  "packet_links": [
    {
      "from_node_id": "123456789",
      "to_node_id": "555666777",
      "packet_count": 8,
      "avg_rssi": -72.0,
      "avg_snr": 6.5,
      "last_seen": "2024-12-13T10:25:00Z",
      "success_rate": 80,
      "is_bidirectional": false
    }
  ]
}
```

### Filter by Time Range

```bash
GET /api/map/links?hours=6
```

### Get Links for Specific Node

```bash
GET /api/map/links?nodeId=123456789&hours=24
```

## Further Reading

- [Network Map Implementation](../NETWORK_MAP_IMPLEMENTATION.md) - Technical details
- [Distance Calculation](distance-calculation.md) - Distance on RF links
- [Line of Sight Analysis](line-of-sight.md) - LOS integration
- [Hop Depth Filtering](hop-depth-filtering.md) - Advanced filtering
- [Implementation Guide](../implementation/DISTANCE_DISPLAY_IMPLEMENTATION.md) - Technical implementation details

---

**Need Help?** Check the [Troubleshooting Guide](../troubleshooting.md) or ask in [GitHub Discussions](https://github.com/your-org/meshtastic-node-mapper/discussions).
