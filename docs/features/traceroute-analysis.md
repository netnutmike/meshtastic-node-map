# Traceroute Analysis

The Traceroute Analysis tab in Network Insights provides detailed information about traceroute messages in your Meshtastic network, helping you understand routing paths and network topology.

## Overview

Traceroutes show the actual path that messages take through your mesh network, hop by hop. This is invaluable for:
- Understanding network topology
- Identifying routing bottlenecks
- Debugging connectivity issues
- Optimizing network layout

## Features

### Traceroute Table

The main table displays all recent traceroute messages with the following information:

| Column | Description |
|--------|-------------|
| **Timestamp** | When the traceroute was received |
| **From** | The node that initiated the traceroute |
| **To** | The destination node (or "Broadcast") |
| **Hops** | Number of hops in the path (color-coded) |
| **Path** | Visual representation of the routing path |
| **RSSI** | Signal strength (mobile hidden) |
| **SNR** | Signal-to-noise ratio (mobile hidden) |

### Hop Count Color Coding

Hop counts are color-coded to quickly identify path efficiency:
- 🟢 **Green** (1-3 hops): Excellent - Direct or short path
- 🟡 **Yellow** (4-5 hops): Good - Moderate path length
- 🔴 **Red** (6+ hops): Poor - Long path, may indicate routing issues

### Signal Quality Indicators

**RSSI (Received Signal Strength Indicator)**
- 🟢 Green: -70 dBm or better (Strong signal)
- 🟡 Yellow: -70 to -90 dBm (Moderate signal)
- 🔴 Red: Below -90 dBm (Weak signal)

**SNR (Signal-to-Noise Ratio)**
- 🟢 Green: 5 dB or better (Excellent)
- 🟡 Yellow: 0 to 5 dB (Good)
- 🔴 Red: Below 0 dB (Poor)

### Path Visualization

The path column shows the complete routing path with:
- **Filled chips**: Valid nodes with known names
- **Outlined chips**: Unknown or invalid nodes
- **Arrows (→)**: Direction of message flow

Example path:
```
Gateway1 → Router2 → Client3 → Destination
```

## How Traceroutes Work

### Meshtastic Traceroute

When a node sends a traceroute message:
1. The message includes a `routingPath` array
2. Each hop adds its node ID to the path
3. The final destination receives the complete path
4. The path is stored in the database

### Path Analysis

The system analyzes each traceroute to:
- Extract the complete routing path
- Identify each hop by node ID
- Look up node details (name, role, etc.)
- Calculate path metrics (hop count, signal quality)

## Use Cases

### 1. Network Topology Discovery

Traceroutes reveal the actual network structure:
- Which nodes act as routers
- How messages flow through the network
- Redundant paths and backup routes

### 2. Troubleshooting Connectivity

When nodes can't communicate:
- Check if traceroutes reach the destination
- Identify where paths break
- Find nodes with poor signal quality

### 3. Optimizing Node Placement

Use traceroute data to:
- Identify nodes with excessive hops
- Find optimal locations for new nodes
- Reduce path lengths by repositioning nodes

### 4. Monitoring Network Health

Track traceroute patterns over time:
- Increasing hop counts may indicate network growth
- Changing paths may indicate node failures
- Consistent paths indicate stable routing

## API Endpoint

### GET /api/links/traceroutes

Retrieves traceroute messages with detailed path information.

**Query Parameters:**
- `maxAge`: Maximum age in hours (default: 24)
- `limit`: Maximum number of results (default: 100)

**Response:**
```json
{
  "traceroutes": [
    {
      "id": "trace123",
      "messageId": "msg456",
      "timestamp": "2026-02-02T10:30:00Z",
      "fromNode": {
        "nodeId": "!abc12345",
        "hexId": "abc12345",
        "shortName": "Gateway1",
        "longName": "Main Gateway"
      },
      "toNode": {
        "nodeId": "!def67890",
        "hexId": "def67890",
        "shortName": "Client1",
        "longName": "Remote Client"
      },
      "routingPath": ["!abc12345", "!router01", "!def67890"],
      "hopCount": 3,
      "hops": [
        {
          "nodeId": "!abc12345",
          "hexId": "abc12345",
          "shortName": "Gateway1",
          "longName": "Main Gateway",
          "role": "ROUTER",
          "isValid": true
        },
        {
          "nodeId": "!router01",
          "hexId": "router01",
          "shortName": "Router1",
          "longName": "Mesh Router 1",
          "role": "ROUTER",
          "isValid": true
        },
        {
          "nodeId": "!def67890",
          "hexId": "def67890",
          "shortName": "Client1",
          "longName": "Remote Client",
          "role": "CLIENT",
          "isValid": true
        }
      ],
      "rssi": -75,
      "snr": 8.5,
      "topic": "msh/2/json/LongFast/!abc12345"
    }
  ],
  "count": 1,
  "filters": {
    "maxAgeHours": 24,
    "limit": 100
  }
}
```

## Tips for Analysis

### Identifying Router Nodes

Nodes that appear frequently in the middle of paths are likely acting as routers:
- Look for nodes that appear in many different traceroutes
- These are critical infrastructure nodes
- Ensure they have good power and antenna placement

### Finding Isolated Nodes

Nodes that only appear as endpoints may be isolated:
- Check if they have direct paths to gateways
- Consider adding intermediate nodes
- Verify antenna and power settings

### Detecting Routing Loops

Watch for:
- Paths with repeated node IDs
- Unusually long hop counts
- Paths that don't reach the destination

### Optimizing Network Layout

Use traceroute data to:
1. Identify nodes with consistently long paths
2. Find optimal locations for new router nodes
3. Reduce overall network hop counts
4. Improve message delivery reliability

## Performance Considerations

- Traceroutes are limited to the most recent 100 by default
- Data is filtered to the last 24 hours by default
- Invalid node IDs (all F's) are automatically filtered
- Node lookups are performed for each hop to get names

## Related Features

- **Network Topology Graph**: Visual representation of traceroute paths
- **Neighbors Tab**: Shows direct neighbor relationships
- **Gateway Comparison**: Analyzes which gateways hear which nodes
- **Longest Links**: Identifies long-distance connections

## Future Enhancements

Potential improvements:
- Path comparison between different time periods
- Hop count statistics and trends
- Path efficiency scoring
- Automatic routing optimization suggestions
- Export traceroute data to CSV
- Filter by specific nodes or paths
- Highlight problematic paths
