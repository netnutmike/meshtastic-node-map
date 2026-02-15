# Malla Dashboard and Additional Features Analysis

## Overview

This document catalogs all the additional statistics, charts, and features that Malla provides beyond our current implementation. These should be added to enhance our dashboard, packets page, and nodes list.

---

## Dashboard Statistics & Charts

### Top-Level Metrics Cards (6 Cards)

1. **Total Nodes**
   - Count of all known mesh participants
   - Simple count from node_info table

2. **Active Nodes (24h)** 
   - Nodes that sent packets in last 24 hours
   - Shows percentage of total nodes (network coverage)
   - Color: Green (success indicator)
   - Formula: `(active_nodes_24h / total_nodes * 100)`

3. **Gateway Diversity**
   - Number of unique gateways/data sources
   - Indicates network reliability
   - Color: Warning (yellow)
   - Higher = better redundancy

4. **Protocol Diversity**
   - Number of different message types in use
   - Shows variety of network activity
   - Color: Info (blue)
   - Count of distinct portnum_name values

5. **Total Messages**
   - All-time packet count
   - Formatted with commas (e.g., "1,234,567")
   - Shows overall network activity

6. **Processing Success Rate**
   - Percentage of successfully decoded messages
   - Color-coded:
     - Green: ≥95%
     - Yellow: 85-94%
     - Red: <85%
   - Formula: `(successful_packets / total_packets * 100)`

### Network Health Panel

**Progress Bars:**

1. **Network Coverage**
   - Active nodes / Total nodes percentage
   - Color-coded:
     - Green: ≥70%
     - Yellow: 40-69%
     - Red: <40%
   - Shows "X of Y nodes active"

2. **Message Success Rate**
   - Packet processing reliability
   - Same color coding as above
   - Shows percentage in progress bar

3. **Gateway Diversity**
   - Number of gateways as percentage (max 10 = 100%)
   - Blue progress bar
   - Shows "X sources"

**Quick Stats (2 columns):**
- Recent Activity: Messages in last hour
- Protocol Types: Count of different message types

### Charts

#### 1. Network Activity Trends (7 Days)
- **Type**: Line chart
- **Data**: Messages per hour over 7 days
- **X-axis**: Hour labels (0:00, 1:00, etc.)
- **Y-axis**: Message count
- **Color**: Info blue with transparent fill
- **Purpose**: Show activity patterns over time

**SQL Query:**
```sql
SELECT
    strftime('%H', datetime(timestamp, 'unixepoch')) AS hour,
    COUNT(*) AS total_packets,
    SUM(CASE WHEN processed_successfully = 1 THEN 1 ELSE 0 END) AS successful_packets
FROM packet_history
WHERE timestamp >= ?
GROUP BY hour
```

#### 2. Node Activity Distribution
- **Type**: Doughnut chart
- **Categories**:
  - Very Active (>100 messages)
  - Moderately Active (10-100 messages)
  - Lightly Active (1-10 messages)
  - Inactive (0 messages)
- **Colors**: Green, Info, Warning, Danger
- **Purpose**: Show how active the network nodes are

**SQL Query:**
```sql
WITH node_activity AS (
    SELECT
        from_node_id,
        COUNT(*) as packet_count
    FROM packet_history
    WHERE from_node_id IS NOT NULL 
        AND timestamp >= ?
    GROUP BY from_node_id
)
SELECT
    COUNT(*) as active_nodes,
    SUM(CASE WHEN packet_count > 100 THEN 1 ELSE 0 END) as very_active,
    SUM(CASE WHEN packet_count > 10 AND packet_count <= 100 THEN 1 ELSE 0 END) as moderately_active,
    SUM(CASE WHEN packet_count >= 1 AND packet_count <= 10 THEN 1 ELSE 0 END) as lightly_active
FROM node_activity
```

#### 3. Gateway Activity Distribution
- **Type**: Bar chart
- **Data**: Top 10 gateways by packet count
- **X-axis**: Gateway IDs
- **Y-axis**: Messages received
- **Colors**: Gradient blue (darker to lighter)
- **Purpose**: Show which gateways are most active

**SQL Query:**
```sql
SELECT
    gateway_id,
    COUNT(*) as total_packets
FROM packet_history
WHERE gateway_id IS NOT NULL
    AND timestamp >= ?
GROUP BY gateway_id
ORDER BY total_packets DESC
LIMIT 10
```

#### 4. Signal Quality Distribution
- **Type**: Bar chart
- **Categories**:
  - Excellent (>-70 dBm)
  - Good (-70 to -80 dBm)
  - Fair (-80 to -90 dBm)
  - Poor (<-90 dBm)
- **Colors**: Green, Warning, Info, Danger
- **Purpose**: Show overall network signal quality

**SQL Query:**
```sql
SELECT
    SUM(CASE WHEN rssi > -70 THEN 1 ELSE 0 END) as rssi_excellent,
    SUM(CASE WHEN rssi > -80 AND rssi <= -70 THEN 1 ELSE 0 END) as rssi_good,
    SUM(CASE WHEN rssi > -90 AND rssi <= -80 THEN 1 ELSE 0 END) as rssi_fair,
    SUM(CASE WHEN rssi <= -90 THEN 1 ELSE 0 END) as rssi_poor
FROM packet_history
WHERE timestamp >= ?
    AND rssi IS NOT NULL 
    AND rssi != 0
```

#### 5. Message Routing Patterns
- **Type**: Doughnut chart
- **Categories**:
  - Direct Messages (0 hops)
  - Routed Messages (1-2 hops)
  - Multi-hop Messages (3+ hops)
- **Colors**: Green, Warning, Danger
- **Purpose**: Show how messages are routed through network

**SQL Query:**
```sql
SELECT
    CASE 
        WHEN (hop_start - hop_limit) = 0 THEN 'direct'
        WHEN (hop_start - hop_limit) BETWEEN 1 AND 2 THEN 'routed'
        ELSE 'multi_hop'
    END as routing_type,
    COUNT(*) as count
FROM packet_history
WHERE timestamp >= ?
    AND hop_start IS NOT NULL
    AND hop_limit IS NOT NULL
GROUP BY routing_type
```

#### 6. Protocol Usage (24h)
- **Type**: Pie chart
- **Data**: Message count per protocol type
- **Labels**: Protocol names (TEXT_MESSAGE_APP, POSITION_APP, etc.)
- **Colors**: Variety of theme colors
- **Purpose**: Show which protocols are most used

**SQL Query:**
```sql
SELECT 
    portnum_name, 
    COUNT(*) as count
FROM packet_history
WHERE portnum_name IS NOT NULL 
    AND timestamp >= ?
GROUP BY portnum_name
ORDER BY count DESC
```

### Most Active Nodes Table

**Columns:**
1. **Node** - Name with link to node details
2. **Messages** - Packet count badge
3. **Signal** - Quality indicator (Excellent/Good/Fair/Poor)

**Data Source:**
```sql
SELECT 
    node_id,
    long_name,
    short_name,
    packet_count_24h,
    avg_rssi
FROM node_info
ORDER BY packet_count_24h DESC
LIMIT 10
```

### Network Information Cards (3 Cards)

**Card 1: Network Information**
- Total Nodes
- Active (24h)
- Gateways
- Protocols

**Card 2: Activity Summary**
- Total Messages (all time)
- Recent (1h)
- Success Rate

**Card 3: Signal Quality**
- Avg RSSI
- Avg SNR
- Network Health (Excellent/Good/Needs Attention)

---

## Packets Page Features

### Advanced Filtering Options

1. **Time Range**
   - Start Time (datetime-local input)
   - End Time (datetime-local input)

2. **Node Filters**
   - From Node (searchable picker)
   - To Node (searchable picker)
   - Exclude From Node (searchable picker)
   - Exclude To Node (searchable picker)
   - Include Broadcast option

3. **Gateway Filter**
   - Gateway (Receiver) - searchable picker
   - Shows gateway names, not just IDs

4. **Packet Type Filter**
   - Dropdown with all protocol types
   - Dynamically loaded from API

5. **Hop Count Filter**
   - Any Hops
   - Direct (0 hops)
   - 1 hop
   - 2 hops
   - 3 hops
   - 4+ hops

6. **Signal Quality Filter**
   - Min RSSI (number input)
   - Allows filtering by signal strength

7. **Channel Filter**
   - Primary Channel dropdown
   - Dynamically loaded from API

8. **Special Filters**
   - Exclude gateway self messages (checkbox)
   - Useful for removing gateway's own transmissions

### Packet Grouping Feature

**Toggle:** "Group by Packet ID"
- Groups packets with same mesh_packet_id
- Shows aggregated statistics:
  - Gateway count (how many gateways received it)
  - Gateway list (comma-separated)
  - RSSI range (min-max)
  - SNR range (min-max)
  - Hop count range
  - Reception count
  - Relay node counts (e.g., "0x12, 0x34*2, 0x56*3")

**Benefits:**
- Reduces duplicate packet display
- Shows network coverage per packet
- Identifies which gateways have best reception

### Table Columns (When Grouped)

1. **Timestamp** - Earliest reception time
2. **From Node** - Sender with name/ID
3. **To Node** - Destination with name/ID
4. **Protocol** - Message type badge
5. **Gateway Count** - Number of receivers
6. **RSSI Range** - Signal strength range
7. **SNR Range** - Signal quality range
8. **Hop Range** - Routing hops range
9. **Reception Count** - Total receptions
10. **Relay Nodes** - Nodes that relayed (with counts)
11. **Success** - Processing status
12. **Text Content** - Decoded message (if TEXT_MESSAGE_APP)

### Table Columns (When Not Grouped)

1. **Timestamp** - Reception time
2. **From Node** - Sender
3. **To Node** - Destination
4. **Protocol** - Message type
5. **Gateway** - Receiver
6. **Channel** - Channel ID
7. **RSSI** - Signal strength
8. **SNR** - Signal quality
9. **Hop Count** - Number of hops
10. **Payload Length** - Message size
11. **Success** - Processing status
12. **Text Content** - Decoded message

### Additional Packet Details

**Per Packet:**
- Mesh Packet ID (for grouping)
- Via MQTT flag
- Want ACK flag
- Priority level
- Delayed flag
- Channel index
- RX time
- PKI encrypted flag
- Next hop
- Relay node
- TX after timestamp

---

## Nodes List Features

### Advanced Filtering Options

1. **Search**
   - Text input for name, ID, or hardware
   - Searches across multiple fields

2. **Role Filter**
   - Dropdown with all node roles
   - CLIENT, ROUTER, REPEATER, etc.
   - Dynamically loaded from API

3. **Hardware Model Filter**
   - Dropdown with all hardware types
   - TBEAM, TLORA, TECHO, etc.
   - Dynamically loaded from API

4. **Primary Channel Filter**
   - Dropdown with all channels
   - LongFast, LongSlow, etc.
   - Dynamically loaded from API

5. **Activity Filters**
   - Active nodes only (24h) - checkbox
   - Named nodes only - checkbox

### Table Columns

1. **Node ID** - Hex ID with link (e.g., !12345678)
2. **Name** - Long name or "Unnamed" with link
3. **Hardware** - Badge with model
4. **Role** - Color-coded badge
   - CLIENT: Blue
   - ROUTER: Green
   - ROUTER_LATE: Green
   - REPEATER: Yellow
   - CLIENT_MUTE: Gray
   - ROUTER_CLIENT: Info
   - SENSOR: Dark
5. **Primary Channel** - Channel name
6. **Last Seen** - Relative time (e.g., "2h ago")
7. **Packets (24h)** - Activity count
8. **Gateways** - Number of gateways that heard this node
9. **Actions** - Quick action buttons

### Node Actions (Per Row)

1. **View Details** - Link to node detail page
2. **View on Map** - Jump to node on map
3. **Line of Sight** - Analyze RF paths
4. **Direct Receptions** - Show which gateways heard this node
5. **Relay Analysis** - Show which nodes relay for this node

### Node Detail Page Enhancements

**Additional Sections:**

1. **Direct Receptions**
   - Table showing which gateways directly received packets
   - Columns: Gateway, Packet Count, Avg RSSI, Avg SNR, Last Seen
   - Helps understand RF coverage

2. **Relay Node Analysis**
   - Shows which nodes relay packets for this node
   - Columns: Relay Node, Relay Count, Avg Signal, Last Seen
   - Helps understand routing patterns

3. **Location History Map**
   - Shows historical GPS coordinates
   - Color-coded by age (green=recent, red=old)
   - Useful for mobile nodes

4. **Current Location Map**
   - Single marker for current position
   - Precision circle based on GPS accuracy
   - Link to Google Maps

5. **Packet Statistics**
   - Total packets sent
   - Packets by protocol type
   - Success rate
   - Average signal quality

6. **Gateway Statistics**
   - Which gateways heard this node
   - Reception quality per gateway
   - Coverage analysis

---

## Analytics API Endpoint

### `/api/analytics` Response Structure

```json
{
    "packet_statistics": {
        "total_packets": 12345,
        "successful_packets": 12000,
        "failed_packets": 345,
        "success_rate": 97.2,
        "average_payload_size": 45.6
    },
    "node_statistics": {
        "total_nodes": 150,
        "active_nodes": 120,
        "inactive_nodes": 30,
        "activity_rate": 80.0,
        "activity_distribution": {
            "very_active": 25,
            "moderately_active": 60,
            "lightly_active": 35,
            "inactive": 30
        }
    },
    "signal_quality": {
        "avg_rssi": -75.5,
        "avg_snr": 8.2,
        "rssi_distribution": {
            "excellent": 1200,
            "good": 3400,
            "fair": 2100,
            "poor": 500
        },
        "snr_distribution": {
            "excellent": 1500,
            "good": 2800,
            "fair": 2000,
            "poor": 900
        },
        "total_measurements": 7200
    },
    "temporal_patterns": {
        "hourly_breakdown": [
            {
                "hour": 0,
                "total_packets": 450,
                "successful_packets": 440,
                "success_rate": 97.8
            },
            // ... 24 hours
        ],
        "peak_hour": 18,
        "quiet_hour": 3
    },
    "top_nodes": [
        {
            "node_id": 123456,
            "display_name": "Node Name",
            "packet_count": 5000,
            "avg_rssi": -70.5,
            "signal_quality": "Excellent"
        },
        // ... top 10
    ],
    "packet_types": [
        {
            "portnum_name": "TEXT_MESSAGE_APP",
            "count": 3500
        },
        {
            "portnum_name": "POSITION_APP",
            "count": 2800
        },
        // ... all types
    ],
    "gateway_distribution": [
        {
            "gateway_id": "!12345678",
            "total_packets": 8500,
            "unique_sources": 85,
            "avg_rssi": -72.3,
            "avg_snr": 9.1,
            "last_seen": 1706000000
        },
        // ... top 10 gateways
    ]
}
```

---

## Implementation Priority

### Phase 1: Dashboard Enhancements (High Priority)

1. **Top-Level Metrics Cards**
   - Add 6 metric cards with proper calculations
   - Implement color-coding based on thresholds
   - Add network coverage percentage

2. **Network Health Panel**
   - Add 3 progress bars (coverage, success rate, gateway diversity)
   - Add quick stats section
   - Implement health grade calculation

3. **Analytics API Endpoint**
   - Create `/api/analytics` endpoint
   - Implement all statistics calculations
   - Add 60-second caching

4. **Basic Charts**
   - Network Activity Trends (line chart)
   - Protocol Usage (pie chart)
   - Signal Quality Distribution (bar chart)

### Phase 2: Advanced Charts (Medium Priority)

1. **Node Activity Distribution** (doughnut chart)
2. **Gateway Activity Distribution** (bar chart)
3. **Message Routing Patterns** (doughnut chart)
4. **Most Active Nodes Table**

### Phase 3: Packets Page Enhancements (Medium Priority)

1. **Advanced Filters**
   - Time range filters
   - Node pickers (from, to, exclude)
   - Gateway picker
   - Hop count filter
   - Signal quality filter

2. **Packet Grouping**
   - Group by mesh_packet_id
   - Show aggregated statistics
   - Display reception counts

3. **Additional Columns**
   - Text content decoding
   - Relay node information
   - Channel information

### Phase 4: Nodes List Enhancements (Low Priority)

1. **Advanced Filters**
   - Hardware model filter
   - Role filter
   - Channel filter
   - Activity checkboxes

2. **Additional Columns**
   - Gateway count
   - Last seen relative time
   - Primary channel

3. **Node Actions**
   - Quick action buttons per row
   - Direct receptions link
   - Relay analysis link

### Phase 5: Node Detail Enhancements (Low Priority)

1. **Direct Receptions Section**
2. **Relay Node Analysis Section**
3. **Location History Map**
4. **Enhanced Statistics**

---

## Database Optimization

### Required Indexes

```sql
-- For analytics queries
CREATE INDEX idx_messages_timestamp_success 
ON messages(timestamp, processed_successfully);

CREATE INDEX idx_messages_timestamp_from_node 
ON messages(timestamp, from_node_id);

CREATE INDEX idx_messages_timestamp_gateway 
ON messages(timestamp, gateway_id);

CREATE INDEX idx_messages_portnum_timestamp 
ON messages(portnum_name, timestamp);

-- For signal quality queries
CREATE INDEX idx_messages_rssi_timestamp 
ON messages(rssi, timestamp) 
WHERE rssi IS NOT NULL AND rssi != 0;

CREATE INDEX idx_messages_snr_timestamp 
ON messages(snr, timestamp) 
WHERE snr IS NOT NULL;

-- For hop count queries
CREATE INDEX idx_messages_hop_count_timestamp 
ON messages((hop_start - hop_limit), timestamp);
```

### Caching Strategy

1. **Analytics Data**: 60-second cache
2. **Gateway Distribution**: 5-minute cache
3. **Node Statistics**: 5-minute cache
4. **Chart Data**: 60-second cache

---

## UI/UX Improvements

### Theme Support

All charts must support dark/light theme:
- Use CSS custom properties for colors
- Update charts when theme changes
- Listen for `themeChanged` event

### Responsive Design

- Stack cards vertically on mobile
- Reduce chart heights on small screens
- Collapsible sidebar for filters
- Touch-friendly controls

### Performance

- Lazy load charts (show loading spinners)
- Fetch analytics data asynchronously
- Use Chart.js for efficient rendering
- Implement client-side caching

---

## References

- **Dashboard Template**: `malla-main/src/malla/templates/dashboard.html`
- **Analytics Service**: `malla-main/src/malla/services/analytics_service.py`
- **Packets Template**: `malla-main/src/malla/templates/packets.html`
- **Nodes Template**: `malla-main/src/malla/templates/nodes.html`
- **Modern Table Component**: `malla-main/src/malla/static/js/modern-table.js`

---

*Last Updated: January 2026*
*Analysis based on Malla codebase main branch*
