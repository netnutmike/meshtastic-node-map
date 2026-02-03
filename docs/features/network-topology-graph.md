# Network Topology Graph

The Network Topology Graph visualizes the connections between nodes in your Meshtastic network, showing how nodes communicate with each other.

## Features

### Link Types

The topology graph displays three types of connections:

1. **Neighbor Links** (Solid lines, colored by signal strength)
   - Direct neighbor relationships reported by nodes
   - Color-coded by RSSI signal strength:
     - Green: Strong signal (-50 dBm or better)
     - Light Green: Good signal (-70 to -50 dBm)
     - Yellow: Fair signal (-85 to -70 dBm)
     - Orange: Poor signal (-100 to -85 dBm)
     - Red: Very poor signal (below -100 dBm)
   - Line thickness indicates signal strength

2. **Traceroute Links** (Purple dashed lines)
   - Shows the actual path messages take through the network
   - Extracted from TRACEROUTE_APP messages
   - Displays hop-by-hop routing paths
   - Helps identify routing patterns and bottlenecks

3. **Gateway Links** (Blue dotted lines)
   - Shows which nodes are heard by which gateways
   - Extracted from MQTT topic information
   - Format: `msh/2/json/LongFast/!gatewayId`
   - Helps identify gateway coverage and connectivity

### Layout Options

Choose from three layout algorithms:

- **Force Directed**: Nodes repel each other while links pull them together, creating an organic layout
- **Circular**: Nodes arranged in a circle, good for seeing all connections
- **Hierarchical**: Nodes grouped by role (Router, Client, Repeater, etc.)

### Filtering Options

- **Filter by Role**: Show only specific node types (Router, Client, Repeater, etc.)
- **Min Signal Strength**: Filter out weak neighbor links below a threshold
- **Show Labels**: Toggle node name labels on/off

### Node Colors

Nodes are color-coded by their role:
- Blue: Router
- Green: Client
- Orange: Repeater
- Gray: Other roles

## How It Works

### Data Sources

The topology graph combines data from multiple sources:

1. **NodeNeighbor table**: Direct neighbor relationships with RSSI/SNR
2. **Message table (TRACEROUTE_APP)**: Routing paths from traceroute messages
3. **Message table (MQTT topics)**: Gateway-to-node relationships

### Gateway Link Detection

Gateway links are automatically detected by parsing MQTT topics:

```
Topic: msh/2/json/LongFast/!abc12345
       └─────────────────────┬────────┘
                      Gateway ID
```

When a message is received on a topic ending with a node ID, it indicates that gateway heard the message from the source node. The system creates a link from the gateway to the message sender.

### Link Deduplication

- Gateway links are deduplicated per gateway-node pair (only most recent kept)
- Self-links are automatically filtered out
- Invalid node IDs (all F's) are skipped

## Usage Tips

1. **Start with Force Directed layout** to see natural clustering
2. **Use Hierarchical layout** to understand network structure by role
3. **Filter by signal strength** to focus on reliable connections
4. **Look for isolated nodes** that may have connectivity issues
5. **Identify gateway coverage** by examining blue dotted lines
6. **Trace message paths** using purple dashed traceroute links

## API Endpoint

```
GET /api/links/topology
```

Query Parameters:
- `includeNeighbors`: Include neighbor relationships (default: true)
- `includeTraceroutes`: Include traceroute paths (default: true)
- `minSnr`: Minimum SNR for neighbor links in dB (optional)
- `maxAge`: Maximum age of data in hours (default: 24)

Response:
```json
{
  "links": [
    {
      "source": "!abc12345",
      "target": "!def67890",
      "type": "neighbor",
      "rssi": -65,
      "snr": 8.5,
      "lastHeard": "2026-02-02T10:30:00Z"
    },
    {
      "source": "!abc12345",
      "target": "!ghi11111",
      "type": "traceroute",
      "hopIndex": 0,
      "totalHops": 3
    },
    {
      "source": "!gateway01",
      "target": "!abc12345",
      "type": "gateway",
      "timestamp": "2026-02-02T10:35:00Z"
    }
  ],
  "count": 3
}
```

## Performance Considerations

- Recent messages are limited to 5000 for gateway link detection
- Traceroutes are limited to 1000 most recent
- Results are filtered by age (default 24 hours)
- Canvas rendering is optimized for up to ~100 nodes

## Future Enhancements

Potential improvements:
- Interactive node dragging
- Zoom and pan controls
- Link strength animation
- Time-based playback of network evolution
- Export to image/SVG
- 3D visualization option
