# Feature Roadmap - Malla-Inspired Enhancements

This document outlines features from the [Malla project](https://github.com/zenitraM/malla) that should be implemented in the Meshtastic Node Mapper over time.

## Overview

Malla is a Python/Flask-based web analyzer for Meshtastic networks with excellent analytics, traceroute visualization, and network analysis tools. After analyzing the complete codebase, this roadmap identifies features to adopt and adapt for our TypeScript/Node.js project.

**Key Malla Architecture:**
- Backend: Python/Flask with SQLite database
- Frontend: Jinja2 templates with vanilla JavaScript
- MQTT Capture: Separate process that logs packets to SQLite
- Real-time: Uses simple polling, no WebSockets
- Caching: In-memory Python dictionaries with TTL

---

## Priority 1: Critical Analytics & Insights

### 1.0 Network Map with RF Links ⭐ HIGHEST PRIORITY

**Current State:** Network Topology Graph shows nodes but no connections (requires NEIGHBORINFO)  
**Malla Feature:** Interactive map showing actual RF links from traceroutes and packet data

**Why This is Critical:**
- Our current topology graph rarely shows connections because:
  - NEIGHBORINFO messages are sent only every 1-3 hours
  - NEIGHBORINFO requires PSK encryption keys to decrypt
  - Limited to what nodes report as neighbors
- Malla's approach works with ANY packet type and doesn't require encryption keys
- Shows real RF communication paths, not just reported neighbors

**Malla Implementation Details:**

**Data Source 1: Traceroute Links**
- Extracts RF hops from TRACEROUTE_APP messages (portnum 41)
- Parses protobuf route_nodes array to find consecutive node pairs
- Example: Route [A, B, C, D] creates links A↔B, B↔C, C↔D
- Tracks packet_count, avg_snr, avg_rssi, last_seen per link
- Calculates success_rate from observation frequency

**Data Source 2: Packet Links (Direct RF)**
- Detects direct receptions from ANY packet type
- Key insight: When `hop_start == hop_limit`, packet received directly (0 hops)
- Creates link between sender (from_node_id) and receiver (gateway_id)
- Shows real RF coverage between nodes
- Works without encryption keys (uses packet metadata)

**Database Queries:**
```sql
-- Traceroute link extraction
SELECT 
    from_node_id,
    to_node_id,
    raw_payload,  -- Contains route data
    rssi, snr, timestamp
FROM messages
WHERE portnum = 41  -- TRACEROUTE_APP
    AND processed_successfully = 1
    AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 2000;

-- Packet link extraction (0-hop detection)
SELECT
    from_node_id,
    gateway_id,
    COUNT(*) AS packet_count,
    AVG(rssi) AS avg_rssi,
    AVG(snr) AS avg_snr,
    MAX(timestamp) AS last_seen
FROM messages
WHERE from_node_id IS NOT NULL
    AND gateway_id IS NOT NULL
    AND hop_start IS NOT NULL
    AND hop_limit IS NOT NULL
    AND hop_start = hop_limit  -- Direct reception (0 hops)
    AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY from_node_id, gateway_id;
```

**Visualization Features:**
- Solid lines for traceroute links, dashed for packet links
- Color by success rate: Green (≥80%), Yellow (50-79%), Red (<50%)
- Link popup shows: success rate, SNR/RSSI, packet count, last seen
- Hop depth filter: Show only N hops from selected node
- Toggle link types independently
- Marker clustering for dense areas
- Line of sight analysis button per link

**Implementation:**
- [ ] **Traceroute Link Service** - Extract RF hops from traceroute packets
- [ ] **Packet Link Service** - Detect direct receptions (0-hop packets)
- [ ] **Link Aggregation** - Merge bidirectional links, calculate statistics
- [ ] **API Endpoint** - `/api/map/links` returning both link types
- [ ] **Map Visualization** - Draw links with Leaflet polylines
- [ ] **Link Toggles** - Show/hide traceroute vs packet links
- [ ] **Hop Depth Filter** - BFS algorithm to filter by hop distance
- [ ] **Link Popups** - Show detailed link information
- [ ] **Success Rate Calculation** - Scale packet count to 10-100%
- [ ] **Database Indexes** - Optimize for traceroute and 0-hop queries
- [ ] **Caching** - Cache link data for 5 minutes
- [ ] **Link History View** - Show all traceroutes containing a hop

**Database Schema:**
```sql
-- Add computed column for hop count
ALTER TABLE messages 
ADD COLUMN hop_count INTEGER GENERATED ALWAYS AS (hop_start - hop_limit) STORED;

-- Indexes for performance
CREATE INDEX idx_messages_traceroute 
ON messages(portnum, timestamp) 
WHERE portnum = 41;

CREATE INDEX idx_messages_direct_reception 
ON messages(from_node_id, gateway_id, timestamp)
WHERE hop_start = hop_limit;

CREATE INDEX idx_messages_hop_count 
ON messages(hop_count, timestamp);
```

**Technical Notes:**
- Process max 2000 traceroute packets for performance
- Default to 24 hours, max 14 days of data
- Send all data to client, filter in browser
- Use BFS for hop depth calculation
- Merge bidirectional links to reduce data volume
- Success rate formula: `min(100, max(10, packet_count * 10))`

**Reference Documentation:**
- See `docs/MALLA_NETWORK_MAP_IMPLEMENTATION.md` for complete analysis

---

### 1.1 Enhanced Dashboard Metrics

**Current State:** Basic node count and status  
**Malla Feature:** Comprehensive network health dashboard with 6 metric cards and multiple charts

**Complete Analysis:** See `docs/MALLA_DASHBOARD_AND_FEATURES_ANALYSIS.md` for full details

**Top-Level Metrics (6 Cards):**
- Total Nodes - All known mesh participants
- Active Nodes (24h) - With network coverage percentage
- Gateway Diversity - Number of data sources
- Protocol Diversity - Message types in use
- Total Messages - All-time packet count
- Processing Success Rate - Color-coded by threshold

**Implementation:**
- [ ] **Metric Cards** - 6 cards with proper calculations and color-coding
- [ ] **Network Coverage Calculation** - Active nodes / Total nodes percentage
- [ ] **Gateway Diversity Score** - Count of unique gateways
- [ ] **Protocol Diversity Count** - Distinct message types
- [ ] **Success Rate Calculation** - Successful / Total packets
- [ ] **Color Thresholds** - Green (≥95%), Yellow (85-94%), Red (<85%)

**Technical Notes:**
- Use single optimized SQL query for dashboard stats
- Cache results for 60 seconds
- Color-code based on thresholds
- Format large numbers with commas

**Reference:** `docs/MALLA_DASHBOARD_AND_FEATURES_ANALYSIS.md` - Dashboard Statistics section

---

### 1.2 Signal Quality Analytics

**Current State:** Basic RSSI/SNR display per node  
**Malla Feature:** Network-wide signal quality distribution and analysis with charts

**Complete Analysis:** See `docs/MALLA_DASHBOARD_AND_FEATURES_ANALYSIS.md` for full details

**Malla Implementation:**
- Signal Quality Distribution Chart (bar chart)
- Categories: Excellent (>-70dBm), Good (-70 to -80), Fair (-80 to -90), Poor (<-90)
- Network-wide averages (RSSI and SNR)
- Total measurements count
- SNR distribution (>10dB, 5-10dB, 0-5dB, <0dB)

**Implementation:**
- [ ] **Average RSSI** - Network-wide average signal strength
- [ ] **Average SNR** - Network-wide signal-to-noise ratio
- [ ] **Signal Quality Distribution Chart** - Bar chart with 4 categories
- [ ] **SNR Distribution Chart** - Separate chart for SNR ranges
- [ ] **Network Health Score** - Calculated from signal quality metrics
- [ ] **Signal Quality Heatmap** - Geographic visualization of signal strength
- [ ] **Weak Link Detection** - Identify connections with poor signal quality
- [ ] **Signal Trends** - Track signal quality over time

**SQL Query:**
```sql
SELECT
    AVG(CASE WHEN rssi IS NOT NULL AND rssi != 0 THEN rssi END) as avg_rssi,
    AVG(CASE WHEN snr IS NOT NULL THEN snr END) as avg_snr,
    SUM(CASE WHEN rssi > -70 THEN 1 ELSE 0 END) as rssi_excellent,
    SUM(CASE WHEN rssi > -80 AND rssi <= -70 THEN 1 ELSE 0 END) as rssi_good,
    SUM(CASE WHEN rssi > -90 AND rssi <= -80 THEN 1 ELSE 0 END) as rssi_fair,
    SUM(CASE WHEN rssi <= -90 THEN 1 ELSE 0 END) as rssi_poor
FROM messages
WHERE timestamp >= ?
    AND rssi IS NOT NULL 
    AND rssi != 0
```

**Technical Notes:**
- Add aggregation queries for signal metrics
- Create Chart.js visualizations
- Store historical signal quality data
- Add alerts for degrading signal quality
- Cache results for 60 seconds

**Reference:** `docs/MALLA_DASHBOARD_AND_FEATURES_ANALYSIS.md` - Signal Quality Distribution section

---

### 1.3 Advanced Analytics Charts

**Current State:** Basic statistics page  
**Malla Feature:** 7 comprehensive charts showing network activity, distribution, and patterns

**Complete Analysis:** See `docs/MALLA_DASHBOARD_AND_FEATURES_ANALYSIS.md` for all chart details

**Malla Charts:**

1. **Network Activity Trends (7 Days)** - Line chart
   - Messages per hour over 7 days
   - Shows peak and quiet hours
   - Identifies activity patterns

2. **Node Activity Distribution** - Doughnut chart
   - Very Active (>100 msgs), Moderately Active (10-100), Lightly Active (1-10), Inactive
   - Shows network participation levels

3. **Gateway Activity Distribution** - Bar chart
   - Top 10 gateways by packet count
   - Gradient colors by activity level
   - Identifies key data sources

4. **Signal Quality Distribution** - Bar chart
   - RSSI categories (Excellent/Good/Fair/Poor)
   - Color-coded by quality level

5. **Message Routing Patterns** - Doughnut chart
   - Direct (0 hops), Routed (1-2 hops), Multi-hop (3+)
   - Shows routing efficiency

6. **Protocol Usage (24h)** - Pie chart
   - Message count per protocol type
   - Shows which protocols are most used

7. **Most Active Nodes Table**
   - Top 10 nodes by packet count
   - Shows signal quality per node
   - Links to node details

**Implementation:**
- [ ] **7-Day Activity Trends** - Line chart showing message volume over time
- [ ] **Node Activity Distribution** - Bar chart of most active nodes
- [ ] **Gateway Activity Distribution** - Messages received per gateway
- [ ] **Message Routing Patterns** - Visualization of hop counts
- [ ] **Protocol Usage Chart** - Pie chart of message types (24h)
- [ ] **Top Talkers Table** - Most active nodes with message counts
- [ ] **Hop Distribution Chart** - Histogram of message hop counts
- [ ] **Time-of-Day Activity** - Heatmap showing peak usage times
- [ ] **Chart Theme Support** - Update colors when theme changes
- [ ] **Async Loading** - Load charts asynchronously with spinners

**Technical Notes:**
- Use Chart.js for all visualizations
- Add time-series data aggregation
- Implement efficient queries with proper indexing
- Add export functionality for chart data
- Cache chart data for 60 seconds
- Support dark/light theme switching
- Lazy load charts to improve page load time

**Reference:** `docs/MALLA_DASHBOARD_AND_FEATURES_ANALYSIS.md` - Charts section

---

## Priority 2: Traceroute & Path Analysis

### 2.1 Traceroute Capture & Display

**Current State:** Not implemented  
**Malla Feature:** Historical traceroute list view with packet path inspection

**Malla Implementation Details:**
- Stores traceroute packets in `packet_history` table with `portnum = 41` (TRACEROUTE_APP)
- Parses route data from `raw_payload` using protobuf
- Extracts `route_nodes` array and `route_back` array for bidirectional paths
- Displays in paginated table with filtering by gateway, source, destination
- Shows "forward path" and "return path" separately
- Calculates RF hops (direct radio links) vs total hops

**Implementation:**
- [ ] **Traceroute Message Capture** - Listen for TRACEROUTE_APP messages (portnum 41)
- [ ] **Traceroute Database Schema** - Store route, hops, timestamps
- [ ] **Traceroute List View** - Paginated table of all traceroutes
- [ ] **Traceroute Detail View** - Show complete path with timing
- [ ] **Traceroute Filtering** - By source, destination, time range, gateway
- [ ] **Traceroute Visualization** - Animated path on map
- [ ] **Hop Latency Display** - Time between each hop
- [ ] **Route Comparison** - Compare different paths between same nodes
- [ ] **Bidirectional Path Display** - Show forward and return paths separately
- [ ] **RF Hop Extraction** - Identify direct radio links from route data

**Database Schema:**
```sql
CREATE TABLE traceroutes (
  id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL,  -- Reference to packet_history
  source_node_id TEXT NOT NULL,
  destination_node_id TEXT NOT NULL,
  route_forward JSONB NOT NULL,  -- Array of node IDs (forward path)
  route_back JSONB,  -- Array of node IDs (return path, optional)
  hop_count INTEGER NOT NULL,
  rf_hop_count INTEGER,  -- Direct radio hops only
  total_time_ms INTEGER,
  timestamp TIMESTAMP NOT NULL,
  gateway_id TEXT,
  processed_successfully BOOLEAN DEFAULT true,
  FOREIGN KEY (source_node_id) REFERENCES nodes(id),
  FOREIGN KEY (destination_node_id) REFERENCES nodes(id),
  FOREIGN KEY (packet_id) REFERENCES messages(id)
);

CREATE INDEX idx_traceroutes_source ON traceroutes(source_node_id);
CREATE INDEX idx_traceroutes_dest ON traceroutes(destination_node_id);
CREATE INDEX idx_traceroutes_timestamp ON traceroutes(timestamp);
CREATE INDEX idx_traceroutes_gateway ON traceroutes(gateway_id);
```

**Technical Notes:**
- Malla uses `TraceroutePacket` class to parse and analyze route data
- Implements `has_return_path()` and `is_complete()` methods
- Uses `format_path_display()` for human-readable route strings
- Caches node names for performance (bulk lookups)
- Add protobuf decoder for TRACEROUTE_APP
- Create traceroute repository and service
- Add WebSocket updates for live traceroutes
- Implement path visualization on map with animation

---

### 2.2 Hop Analysis Tools

**Current State:** Not implemented  
**Malla Feature:** Hop-analysis tables showing RF link quality

**Malla Implementation:**
- `/traceroute-hops` route shows RF hop analysis
- Filters traceroutes to find specific node pairs
- Displays all traceroutes containing a direct RF hop between two nodes
- Shows signal quality (RSSI/SNR) for each hop
- Calculates hop reliability and frequency

**Implementation:**
- [ ] **Hop Analysis Table** - All direct RF links with signal quality
- [ ] **Link Quality Matrix** - Grid showing signal between all node pairs
- [ ] **Multi-Hop Path Analysis** - Identify common routing paths
- [ ] **Hop Count Statistics** - Distribution of hops per message
- [ ] **Bottleneck Detection** - Identify nodes with high hop counts
- [ ] **Alternative Path Suggestions** - Show possible alternate routes
- [ ] **RF Link Stability** - Track link quality over time
- [ ] **Hop Efficiency Score** - Compare actual vs optimal hop counts
- [ ] **Hop Pair Filtering** - Show all traceroutes containing specific node pairs

**Technical Notes:**
- Analyze routing_path data from messages
- Create graph algorithms for path analysis
- Add caching for expensive graph calculations
- Implement D3.js for interactive visualizations
- Use `get_rf_hops()` method to extract direct radio links
- Filter by minimum SNR and hop count

---

### 2.3 Traceroute RF Hop Analysis

**Current State:** Not implemented  
**Malla Feature:** Analyze direct RF hops between nodes from traceroute data

**Malla Implementation Details:**
- Route: `/traceroute-hops?from_node=X&to_node=Y`
- Searches all traceroutes for consecutive node pairs (direct RF hops)
- Displays traceroute packets where nodes X and Y appear consecutively
- Shows signal quality for that specific hop
- Includes timestamp and gateway information

**Implementation:**
- [ ] **RF Hop Detection** - Identify direct radio links from traceroutes
- [ ] **Hop Pair Analysis** - Show all traceroutes containing specific node pairs
- [ ] **Signal Quality per Hop** - RSSI/SNR for each hop in route
- [ ] **Hop Reliability Score** - Success rate for each link
- [ ] **Bidirectional Link Analysis** - Compare A→B vs B→A performance
- [ ] **Hop Distance Calculation** - Calculate RF distance between hops (see 2.4)
- [ ] **Hop Frequency Analysis** - How often does this hop appear in routes

**Technical Notes:**
- Parse traceroute data to extract hop pairs
- Correlate with position data for distance
- Create specialized queries for hop analysis
- Add visualization of hop quality
- Use consecutive node detection in route arrays

---

### 2.4 Distance Calculation Between Nodes

**Current State:** Not implemented  
**Malla Feature:** Calculate and display RF distances between nodes that can see each other

**Malla Implementation Details:**
- Uses Haversine formula for distance calculation
- Implemented in `LocationService.calculate_haversine_distance()`
- `/longest-links` route shows longest successful RF links
- Filters by minimum distance (default 1km) and minimum SNR (default -20dB)
- Calculates distances for both direct hops and multi-hop paths
- Shows distance, SNR, hop count, and traceroute count for each link
- Includes "age warning" for stale location data
- Optimized with location history caching to avoid repeated DB queries

**Implementation:**
- [ ] **Haversine Distance Calculation** - Calculate distance from GPS coordinates
- [ ] **Neighbor Distance Display** - Show distance for each neighbor relationship
- [ ] **Longest Links Explorer** - Table of longest successful RF links
- [ ] **Distance vs Signal Quality** - Scatter plot showing correlation
- [ ] **Range Analysis** - Calculate effective range per node
- [ ] **Line-of-Sight Estimation** - Estimate LOS based on distance/signal
- [ ] **Elevation Profile** - Show terrain between nodes (requires elevation API)
- [ ] **Link Budget Calculator** - Estimate theoretical max range
- [ ] **Multi-Hop Path Distance** - Calculate total distance for entire routes
- [ ] **Location History Tracking** - Use historical positions for accurate distance calculations

**Technical Notes:**
```typescript
// Haversine formula for distance calculation (from Malla)
function calculateHaversineDistance(
  lat1: number, lon1: number, 
  lat2: number, lon2: number
): number {
  const R = 6371.0; // Earth's radius in km
  
  // Convert to radians
  const lat1Rad = lat1 * Math.PI / 180;
  const lon1Rad = lon1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lon2Rad = lon2 * Math.PI / 180;
  
  // Haversine formula
  const dlat = lat2Rad - lat1Rad;
  const dlon = lon2Rad - lon1Rad;
  
  const a = Math.sin(dlat/2) ** 2 + 
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(dlon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}
```

**Malla's Longest Links Analysis:**
- Fetches last 7 days of traceroute packets
- Pre-fetches location history for all nodes (performance optimization)
- Calculates distance for each RF hop using location at packet timestamp
- Filters by minimum distance and SNR thresholds
- Groups bidirectional links (A↔B treated as same link)
- Tracks multiple observations of same link
- Shows "age warning" if location data is stale
- Supports both direct hops and multi-hop paths

- Add distance field to node_neighbors table
- Calculate on neighbor data insert/update
- Create "longest links" view with filtering
- Add distance filter to topology graph
- Implement location history caching for performance
- Add age warnings for stale location data

---

### 2.5 Line of Sight Analysis Tool ⭐ NEW

**Current State:** Not implemented  
**Malla Feature:** Interactive tool to analyze line-of-sight between two nodes

**Malla Implementation Details:**
- Route: `/line-of-sight` with optional `?from=X&to=Y` parameters
- Interactive node picker with search functionality
- Calculates distance using Haversine formula
- Displays map with line drawn between nodes
- Shows elevation profile if altitude data available
- Analyzes traceroute data for actual connectivity
- Displays signal quality statistics (RSSI/SNR) from historical data
- Shows whether nodes have successfully communicated
- Accessible from map link popups and tools menu

**Implementation:**
- [ ] **Line of Sight Page** - Dedicated analysis tool page
- [ ] **Node Picker Component** - Searchable dropdown for selecting nodes
- [ ] **Distance Calculation** - Show straight-line distance between nodes
- [ ] **Map Visualization** - Draw line between selected nodes on map
- [ ] **Elevation Profile** - Show terrain elevation between nodes (if data available)
- [ ] **Historical Connectivity** - Check if nodes have communicated via traceroutes
- [ ] **Signal Quality Stats** - Show RSSI/SNR statistics from packet history
- [ ] **URL Parameters** - Support pre-loading analysis via URL params
- [ ] **Link from Map** - Add "Line of Sight" option to node/link popups
- [ ] **Fresnel Zone Calculation** - Calculate first Fresnel zone clearance
- [ ] **Obstruction Detection** - Identify potential obstructions (requires elevation API)

**Technical Notes:**
- Reuse node picker component from other pages
- Query packet_history for direct communications between nodes
- Calculate bearing/azimuth between nodes
- Integrate with elevation API (e.g., Open-Elevation, USGS)
- Add to tools dropdown menu
- Implement as separate route with dedicated template

---

## Priority 3: Gateway & Network Analysis

### 3.1 Gateway Comparison Tool

**Current State:** Not implemented  
**Malla Feature:** Compare signal quality between two gateways

**Malla Implementation Details:**
- Route: `/gateway-comparison?gateway1=X&gateway2=Y`
- Uses `GatewayService.compare_gateways()` and `PacketRepository.get_gateway_comparison_data()`
- Finds common packets using INNER JOIN on `(mesh_packet_id, from_node_id, hop_limit)`
- Filters to same hop_limit to exclude retransmissions
- Requires both packets within 30 seconds of each other
- Calculates RSSI/SNR differences and statistics
- Generates interactive Plotly charts:
  - Scatter plot (Gateway1 RSSI vs Gateway2 RSSI)
  - Scatter plot (Gateway1 SNR vs Gateway2 SNR)
  - Timeline showing signal over time
  - Histogram of signal differences
- Shows detailed packet table with differences
- Supports filtering by time range, source node

**Implementation:**
- [ ] **Gateway Picker Component** - Reusable searchable dropdown (see 6.3)
- [ ] **Common Packet Query** - INNER JOIN on mesh_packet_id, from_node_id, hop_limit
- [ ] **Signal Quality Comparison** - Calculate RSSI/SNR differences
- [ ] **Statistics Calculation** - Average, min, max, standard deviation
- [ ] **Scatter Plot Charts** - Gateway1 vs Gateway2 signal quality
- [ ] **Timeline Charts** - Signal quality over time for both gateways
- [ ] **Histogram Charts** - Distribution of signal differences
- [ ] **Time Range Filter** - Compare over specific time periods
- [ ] **Source Node Filter** - Compare for specific transmitting nodes
- [ ] **Hop Limit Matching** - Only compare packets with same hop_limit
- [ ] **Detailed Packet Table** - Show all common packets with differences
- [ ] **Gateway Performance Metrics** - Packet count, average signal per gateway

**Database Query Pattern:**
```sql
SELECT
    p1.mesh_packet_id,
    p1.from_node_id,
    p1.timestamp,
    p1.rssi as gateway1_rssi,
    p1.snr as gateway1_snr,
    p2.rssi as gateway2_rssi,
    p2.snr as gateway2_snr,
    (p2.rssi - p1.rssi) as rssi_diff,
    (p2.snr - p1.snr) as snr_diff
FROM packet_history p1
INNER JOIN packet_history p2 ON (
    p1.mesh_packet_id = p2.mesh_packet_id
    AND p1.from_node_id = p2.from_node_id
    AND p1.hop_limit = p2.hop_limit
    AND ABS(p1.timestamp - p2.timestamp) < 30
)
WHERE p1.gateway_id = ?
    AND p2.gateway_id = ?
    AND p1.mesh_packet_id IS NOT NULL
    AND p1.rssi IS NOT NULL
    AND p2.rssi IS NOT NULL
ORDER BY p1.timestamp DESC
LIMIT 1000
```

**Technical Notes:**
- Use GatewayPicker component for gateway selection
- Bulk fetch node names for performance
- Cache gateway statistics (5min TTL)
- Add Plotly.js for interactive charts
- Support CSV export of comparison data

---

### 3.2 Gateway Diversity Metrics

**Current State:** Basic node count  
**Malla Feature:** Track number of unique gateways/data sources

**Malla Implementation Details:**
- Implemented in `GatewayService.get_gateway_statistics()`
- Cached for 5 minutes (300s TTL)
- Calculates:
  - Total unique gateways (COUNT DISTINCT gateway_id)
  - Gateway distribution (top 20 by packet count)
  - Unique sources per gateway
  - Average RSSI/SNR per gateway
  - Gateway diversity score (0-100, based on gateway count)
- Shows nodes with gateway data
- Tracks last seen timestamp per gateway
- Displays on dashboard as key metric

**Implementation:**
- [ ] **Gateway Count** - Number of active gateway nodes (24h window)
- [ ] **Gateway Distribution Table** - Top gateways with packet counts
- [ ] **Unique Sources per Gateway** - How many nodes each gateway hears
- [ ] **Gateway Signal Quality** - Average RSSI/SNR per gateway
- [ ] **Gateway Diversity Score** - 0-100 score (10 points per gateway, max 100)
- [ ] **Gateway Uptime Tracking** - Monitor gateway availability
- [ ] **Gateway Load Balancing** - Show message distribution across gateways
- [ ] **Last Seen Tracking** - When each gateway was last active
- [ ] **Gateway Activity Chart** - Packets received over time per gateway

**Technical Notes:**
```typescript
interface GatewayStatistics {
  total_gateways: number;
  gateway_distribution: Array<{
    gateway_id: string;
    packet_count: number;
    unique_sources: number;
    avg_rssi: number;
    avg_snr: number;
    last_seen: number;
  }>;
  nodes_with_gateway_counts: number;
  gateway_diversity_score: number; // 0-100
  analysis_hours: number;
}
```

- Cache statistics with 5min TTL
- Use COUNT DISTINCT for gateway counts
- Add gateway_id index for performance
- Display diversity score on dashboard
- Alert when diversity score drops below threshold

---

## Priority 4: Advanced Packet Analysis

### 4.1 Packet Browser Enhancements

**Current State:** Basic message history  
**Malla Feature:** Lightning-fast table with powerful filtering and packet grouping

**Malla Implementation Details:**
- Uses `ModernTable` JavaScript class for client-side table management
- Implements packet grouping to reduce duplicate receptions
- Groups by `(mesh_packet_id, from_node_id, to_node_id, portnum, portnum_name)`
- Shows aggregated stats per group:
  - Gateway count and list
  - RSSI range (min-max)
  - SNR range (min-max)
  - Hop count range
  - Reception count
  - Relay node counts (e.g., "0x12, 0x34*2, 0x56*3")
- Performance optimizations:
  - Fetches limited raw packets (5k-25k instead of millions)
  - Groups in-memory (fast)
  - Skips expensive COUNT(DISTINCT) for total count
  - Uses time windows to limit data scan
  - Estimated pagination for grouped queries
- Advanced filtering:
  - Time range (start_time, end_time)
  - Source/destination node
  - Port number (protocol type)
  - RSSI/SNR ranges
  - Gateway ID
  - Hop count
  - Exclude filters (exclude_from, exclude_to)
  - Primary channel
  - Search across multiple fields
- Multi-column sorting with in-memory sort
- Text message decoding and display
- URL state management for shareable links

**Implementation:**
- [ ] **Packet Grouping Toggle** - Checkbox to enable/disable grouping
- [ ] **Grouped Packet Display** - Show aggregated stats per unique packet
- [ ] **Gateway Count Column** - Number of gateways that received packet
- [ ] **Signal Range Display** - Show RSSI/SNR ranges (e.g., "-85.2 to -78.4 dBm")
- [ ] **Hop Range Display** - Show hop count ranges (e.g., "3-5 hops")
- [ ] **Reception Count** - How many times packet was received
- [ ] **Relay Node Aggregation** - Show relay nodes with counts
- [ ] **Advanced Time Filters** - Precise time range selection
- [ ] **Multi-Field Search** - Search across node IDs, gateway, channel, protocol
- [ ] **RSSI/SNR Range Filters** - Min/max signal quality filters
- [ ] **Exclude Filters** - Exclude specific nodes from results
- [ ] **Channel Filter** - Filter by primary channel
- [ ] **Hop Count Filter** - Filter by exact hop count
- [ ] **Multi-Column Sorting** - Sort by any column
- [ ] **Column Customization** - Show/hide columns
- [ ] **Saved Filters** - Save and reuse filter combinations
- [ ] **CSV Export** - Export filtered results
- [ ] **Real-time Updates** - Live packet stream with filtering
- [ ] **Text Message Display** - Decode and show TEXT_MESSAGE_APP content
- [ ] **URL State Management** - Store filters in URL for sharing

**Database Schema Enhancement:**
```sql
-- Add indexes for common filters
CREATE INDEX idx_packet_mesh_id ON messages(mesh_packet_id);
CREATE INDEX idx_packet_portnum ON messages(portnum);
CREATE INDEX idx_packet_channel ON messages(channel_id);
CREATE INDEX idx_packet_rssi ON messages(rssi);
CREATE INDEX idx_packet_snr ON messages(snr);
CREATE INDEX idx_packet_hop_count ON messages((hop_start - hop_limit));
```

**Technical Notes:**
- Use ModernTable class for table management
- Implement packet grouping in backend (PostgreSQL GROUP BY)
- Add time window limits for performance (default 7 days for grouped)
- Use estimated pagination for grouped queries
- Cache node names client-side
- Store filter state in URL parameters
- Add debounced search (300ms delay)
- Implement efficient pagination with LIMIT/OFFSET

---

### 4.2 Protocol Usage Analysis

**Current State:** Basic message type counts  
**Malla Feature:** Detailed protocol diversity and usage patterns

**Malla Implementation Details:**
- Tracks `portnum_name` field from packet_history
- Dashboard shows protocol type distribution (24h)
- Uses single optimized query with GROUP BY
- Cached in dashboard statistics (60s TTL)
- Shows packet count per protocol type
- Identifies most common protocols
- Part of network health metrics

**Implementation:**
- [ ] **Protocol Type Distribution** - Pie chart of message types (24h)
- [ ] **Protocol Timeline** - Usage of each protocol over time
- [ ] **Protocol per Node** - Which nodes use which protocols
- [ ] **Rare Protocol Detection** - Identify unusual message types
- [ ] **Protocol Efficiency** - Success rate per protocol type
- [ ] **Protocol Bandwidth Usage** - Bytes per protocol type
- [ ] **Protocol Frequency Chart** - Messages per hour by protocol
- [ ] **Protocol Comparison** - Compare protocol usage across time periods

**Technical Notes:**
```sql
-- Efficient protocol distribution query
SELECT 
    portnum_name, 
    COUNT(*) as count,
    AVG(payload_length) as avg_size,
    SUM(CASE WHEN processed_successfully = 1 THEN 1 ELSE 0 END) as successful
FROM packet_history
WHERE portnum_name IS NOT NULL 
    AND timestamp > ?
GROUP BY portnum_name
ORDER BY count DESC
```

- Add portnum_name index for performance
- Cache protocol stats with 60s TTL
- Use Plotly.js for pie charts
- Track protocol trends over time
- Add protocol-specific analytics
- Display on dashboard and dedicated page

---

## Priority 5: Performance & Optimization

### 5.1 Data Retention & Cleanup

**Current State:** No automatic cleanup  
**Malla Feature:** Configurable data retention with automatic cleanup

**Malla Implementation Details:**
- Configured in `config.yaml` with `data_retention_hours` setting
- Automatic cleanup runs hourly via background task
- Deletes packets older than retention period
- Keeps node_info records even after packet deletion
- Simple DELETE query with timestamp filter
- Logs cleanup statistics (records deleted)
- Default retention: 168 hours (7 days)
- Can be disabled by setting to 0

**Implementation:**
- [ ] **Retention Policy Configuration** - Set hours to retain data per table
- [ ] **Automatic Cleanup Job** - Hourly background task (cron)
- [ ] **Selective Retention** - Keep important data longer (traceroutes, etc.)
- [ ] **Cleanup Statistics** - Track deleted records and freed space
- [ ] **Manual Cleanup Trigger** - Admin button to force cleanup
- [ ] **Archive Before Delete** - Optional export before deletion
- [ ] **Retention by Data Type** - Different retention for messages, telemetry, positions
- [ ] **Keep Node Info** - Preserve node records even if no recent data
- [ ] **Cleanup Logging** - Log all cleanup operations
- [ ] **Disk Space Monitoring** - Alert when disk space low

**Technical Notes:**
```typescript
// Retention policy configuration
interface RetentionPolicy {
  messages: number;      // hours (default: 168 = 7 days)
  telemetry: number;     // hours (default: 168 = 7 days)
  positions: number;     // hours (default: 720 = 30 days)
  traceroutes: number;   // hours (default: 720 = 30 days, keep longer)
  keepNodeInfo: boolean; // Keep node records (default: true)
  enabled: boolean;      // Enable automatic cleanup (default: true)
}

// Cleanup query example
DELETE FROM messages 
WHERE timestamp < NOW() - INTERVAL '? hours'
  AND id NOT IN (
    SELECT DISTINCT message_id FROM traceroutes
  );
```

- Add cron job for hourly cleanup
- Implement soft delete option for recovery
- Add cleanup metrics to admin dashboard
- Optimize delete queries with batching
- Use VACUUM after large deletes (PostgreSQL)
- Add retention policy UI in settings

---

### 5.2 Database Optimization

**Current State:** PostgreSQL with basic indexes  
**Malla Feature:** Optimized SQLite with efficient queries

**Malla Implementation Details:**
- **Single Query Optimization** - Combines multiple queries into one with aggregations
- **Bulk Operations** - Fetches related data in batches (e.g., bulk node name lookups)
- **In-Memory Caching** - Python dictionaries with TTL (60-300s)
- **Location History Pre-fetching** - Loads all location data upfront for distance calculations
- **Efficient Pagination** - Uses LIMIT/OFFSET with proper indexes
- **Grouped Packet Processing** - Groups in-memory instead of expensive GROUP BY
- **Time Window Limits** - Restricts queries to recent data (7 days default)
- **Composite Indexes** - Multi-column indexes for common filter combinations
- **Streaming Processing** - Processes large datasets in chunks
- **Query Result Caching** - Caches expensive analytics queries

**Key Optimization Patterns:**
```sql
-- Single query for all dashboard stats instead of multiple queries
SELECT
    COUNT(*) as total_packets,
    COUNT(DISTINCT from_node_id) as active_nodes,
    AVG(rssi) as avg_rssi,
    AVG(snr) as avg_snr,
    SUM(CASE WHEN processed_successfully = 1 THEN 1 ELSE 0 END) as successful,
    -- RSSI distribution in single query
    SUM(CASE WHEN rssi > -70 THEN 1 ELSE 0 END) as rssi_excellent,
    SUM(CASE WHEN rssi > -80 AND rssi <= -70 THEN 1 ELSE 0 END) as rssi_good
FROM packet_history
WHERE timestamp >= ?
```

**Implementation:**
- [ ] **Query Performance Analysis** - Identify slow queries with EXPLAIN ANALYZE
- [ ] **Index Optimization** - Add indexes for common queries
- [ ] **Composite Indexes** - Multi-column indexes for filter combinations
- [ ] **Materialized Views** - Pre-calculate expensive aggregations
- [ ] **Query Result Caching** - Redis cache for analytics (60-300s TTL)
- [ ] **Connection Pooling** - Optimize database connections
- [ ] **Batch Operations** - Bulk inserts for high-volume data
- [ ] **Bulk Node Lookups** - Fetch multiple node names in single query
- [ ] **Location History Caching** - Pre-fetch location data for distance calculations
- [ ] **Time Window Restrictions** - Limit queries to recent data
- [ ] **In-Memory Grouping** - Group packets in application instead of database
- [ ] **Streaming Processing** - Process large datasets in chunks
- [ ] **Read Replicas** - Separate read/write database connections

**Technical Notes:**
```typescript
// Bulk node name lookup pattern
async function getBulkNodeNames(nodeIds: number[]): Promise<Map<number, string>> {
  const query = `
    SELECT node_id, long_name, short_name
    FROM nodes
    WHERE node_id = ANY($1)
  `;
  const result = await db.query(query, [nodeIds]);
  
  return new Map(
    result.rows.map(row => [
      row.node_id,
      row.long_name || row.short_name || `!${row.node_id.toString(16)}`
    ])
  );
}

// Caching pattern
const cache = new Map<string, { data: any, expires: number }>();

function getCached<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  
  if (cached && cached.expires > now) {
    return Promise.resolve(cached.data);
  }
  
  return fetchFn().then(data => {
    cache.set(key, { data, expires: now + (ttlSeconds * 1000) });
    return data;
  });
}
```

- Use EXPLAIN ANALYZE for query optimization
- Add composite indexes: `(timestamp, from_node_id)`, `(gateway_id, timestamp)`
- Implement Redis for distributed caching
- Monitor query performance metrics
- Use connection pooling (pg-pool)
- Batch insert messages (100-1000 at a time)
- Pre-fetch related data to avoid N+1 queries

---

## Priority 6: User Experience Enhancements

### 6.1 Embeddable Map

**Current State:** Full-page map only  
**Malla Feature:** Embeddable map with collapsed sidebar

**Malla Implementation Details:**
- URL parameter: `?sidebar-collapsed=true`
- Collapses sidebar automatically on load
- Maintains full map functionality
- Responsive design for narrow widths
- Used for embedding in external sites
- No special embed mode needed

**Implementation:**
- [ ] **Sidebar Collapse Parameter** - `?sidebar-collapsed=true`
- [ ] **Embed Mode** - Minimal UI for embedding (`?embed=true`)
- [ ] **Responsive Embed** - Works in narrow widths
- [ ] **Embed Code Generator** - Generate iframe code with options
- [ ] **Customizable Embed** - Choose what to show/hide via URL params
- [ ] **Public Embed Option** - Share without authentication
- [ ] **Auto-Collapse Sidebar** - Detect narrow width and auto-collapse
- [ ] **Embed Documentation** - Guide for embedding map

**Technical Notes:**
```html
<!-- Embed code example -->
<iframe 
  src="https://your-domain.com/map?sidebar-collapsed=true&embed=true"
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: 1px solid #ddd; border-radius: 8px;">
</iframe>
```

- Add URL parameter handling for sidebar state
- Create embed-specific CSS (minimal chrome)
- Add embed documentation page
- Implement iframe security headers (X-Frame-Options)
- Support customization via URL params:
  - `sidebar-collapsed=true` - Collapse sidebar
  - `embed=true` - Minimal UI mode
  - `hide-controls=true` - Hide map controls
  - `hide-search=true` - Hide search bar

---

### 6.2 Home Page Customization

**Current State:** Static homepage  
**Malla Feature:** Customizable markdown homepage

**Malla Implementation Details:**
- Reads `homepage.md` file from config directory
- Renders markdown content on homepage
- Falls back to default content if file not found
- Supports standard markdown formatting
- Can include links to documentation
- Simple file-based configuration

**Implementation:**
- [ ] **Markdown Content** - Render custom markdown on homepage
- [ ] **Admin Editor** - Edit homepage content via UI
- [ ] **Template Variables** - Insert dynamic stats in markdown (e.g., `{{total_nodes}}`)
- [ ] **Image Support** - Upload and embed images
- [ ] **Link Management** - Add custom links to resources
- [ ] **Multi-Language Support** - Different content per language
- [ ] **Preview Mode** - Preview changes before publishing
- [ ] **Version History** - Track content changes

**Technical Notes:**
```typescript
// Markdown rendering with template variables
function renderHomepage(markdown: string, stats: any): string {
  // Replace template variables
  let content = markdown
    .replace(/\{\{total_nodes\}\}/g, stats.totalNodes.toString())
    .replace(/\{\{active_nodes\}\}/g, stats.activeNodes.toString())
    .replace(/\{\{total_packets\}\}/g, stats.totalPackets.toString());
  
  // Render markdown to HTML
  return marked.parse(content);
}
```

- Use marked.js for markdown parsing
- Store content in database or config file
- Add WYSIWYG editor for admins (e.g., SimpleMDE)
- Implement content versioning
- Support template variables for dynamic content
- Add image upload functionality
- Sanitize HTML output for security

### 6.3 Reusable UI Components ⭐ NEW

**Current State:** Component duplication across pages  
**Malla Feature:** Reusable JavaScript components for consistent UX

**Malla Implementation Details:**

**1. Node Picker Component** (`node-picker.js`)
- Searchable dropdown with autocomplete
- Client-side caching of node list
- Keyboard navigation (arrow keys, enter, escape)
- Shows node name, hex ID, hardware model, packet count
- Supports "popular nodes" mode (top by packets)
- Debounced search (300ms)
- Firefox-compatible event handling
- Can include broadcast node option
- Used across multiple pages (line of sight, gateway comparison, filters)

**2. Gateway Picker Component** (`node-picker.js`)
- Similar to Node Picker but for gateways
- Shows gateway packet counts
- Converts between hex IDs and decimal node IDs
- Fallback to API if not in node cache
- Used in gateway comparison and filters

**3. Modern Table Component** (`modern-table.js`)
- Replaces DataTables with lightweight solution
- Client-side pagination and sorting
- Server-side data fetching
- Debounced search
- Customizable columns with render functions
- Support for badges, signal indicators, actions
- Event listener system for extensibility
- URL state management integration
- Estimated pagination for grouped queries

**4. Filter Store** (`filter-store.js`)
- Lightweight reactive state container using Proxy
- Notifies subscribers on state changes
- Used for shared filter state across components
- Enables reactive UI updates

**Implementation:**
- [ ] **Node Picker Component** - Reusable searchable node selector
- [ ] **Gateway Picker Component** - Reusable searchable gateway selector
- [ ] **Modern Table Component** - Lightweight table with pagination/sorting
- [ ] **Filter Store** - Reactive state management for filters
- [ ] **Signal Quality Badge** - Reusable signal quality indicator
- [ ] **Time Range Picker** - Reusable date/time range selector
- [ ] **Node Badge Component** - Consistent node display with icon
- [ ] **Loading Spinner** - Consistent loading states
- [ ] **Empty State Component** - Consistent empty state messaging
- [ ] **Toast Notifications** - Consistent notification system

**Technical Notes:**
```typescript
// Node Picker usage example
<div class="node-picker-container" data-include-broadcast="false">
  <input type="text" class="node-picker-input" placeholder="Search nodes...">
  <input type="hidden" name="node_id">
  <button class="node-picker-clear">×</button>
  <div class="node-picker-dropdown">
    <div class="node-picker-loading">Loading...</div>
    <div class="node-picker-no-results">No results found</div>
    <div class="node-picker-results"></div>
  </div>
</div>

<script>
// Auto-initializes on page load
// Or manually: new NodePicker(container);
</script>

// Modern Table usage example
const table = new ModernTable('table-container', {
  endpoint: '/api/packets',
  pageSize: 100,
  columns: [
    { key: 'timestamp', title: 'Time', sortable: true },
    { key: 'from_node_id', title: 'From', render: (val) => formatNodeId(val) },
    { key: 'rssi', title: 'RSSI', type: 'signal', unit: 'dBm' }
  ],
  filters: { gateway_id: 'abc123' }
});

// Filter Store usage example
const filterStore = createFilterStore({ 
  gateway_id: null, 
  start_time: null 
});

filterStore.subscribe(filters => {
  table.setFilters(filters);
});

// Update filter (triggers subscribers)
filterStore.state.gateway_id = 'abc123';
```

- Create shared component library
- Document component APIs
- Add TypeScript definitions
- Implement consistent styling
- Add accessibility features (ARIA labels)
- Support dark mode
- Add unit tests for components

---

### 6.4 URL State Management ⭐ NEW

**Current State:** Filter state lost on page refresh  
**Malla Feature:** Store filter state in URL parameters for shareable links

**Malla Implementation Details:**
- Uses `URLSearchParams` to manage query parameters
- Updates URL without page reload using `history.replaceState()`
- Reads URL parameters on page load to restore state
- Enables shareable links with filters applied
- Browser back/forward works correctly
- Bookmark-friendly URLs
- No server-side session needed

**Implementation:**
- [ ] **URL Parameter Sync** - Sync filter state to URL
- [ ] **State Restoration** - Read URL params on page load
- [ ] **History Management** - Use replaceState for URL updates
- [ ] **Shareable Links** - Generate shareable URLs with filters
- [ ] **Bookmark Support** - URLs work when bookmarked
- [ ] **Back/Forward Support** - Browser navigation works correctly
- [ ] **Deep Linking** - Link directly to filtered views

**Technical Notes:**
```javascript
// URL state management pattern (from filter-store.js)
function syncFiltersToUrl(filters) {
  const params = new URLSearchParams(window.location.search);
  
  // Update parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, value.toString());
    } else {
      params.delete(key);
    }
  });
  
  // Update URL without reload
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

function loadFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const filters = {};
  
  params.forEach((value, key) => {
    filters[key] = value;
  });
  
  return filters;
}

// Usage
const initialFilters = loadFiltersFromUrl();
const filterStore = createFilterStore(initialFilters);

filterStore.subscribe(filters => {
  syncFiltersToUrl(filters);
  // Update UI...
});
```

- Use `history.replaceState()` not `pushState()` to avoid cluttering history
- Debounce URL updates for rapid filter changes
- Encode special characters properly
- Handle array parameters (e.g., `?node_id=1&node_id=2`)
- Validate URL parameters on load
- Provide "Copy Link" button for easy sharing

---

## Priority 7: Network Health Monitoring

### 7.1 Network Health Score

**Current State:** Basic online/offline status  
**Malla Feature:** Comprehensive network health indicators

**Implementation:**
- [ ] **Health Score Calculation** - Weighted score from multiple factors
- [ ] **Health Factors:**
  - Active node percentage
  - Average signal quality
  - Message success rate
  - Gateway diversity
  - Network coverage
- [ ] **Health Trend Chart** - Track health over time
- [ ] **Health Alerts** - Notify when health degrades
- [ ] **Health Breakdown** - Show which factors are affecting score
- [ ] **Comparison Mode** - Compare health across time periods

**Technical Notes:**
```typescript
interface NetworkHealth {
  score: number;           // 0-100
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: {
    activeNodes: number;   // 0-100
    signalQuality: number; // 0-100
    messageSuccess: number; // 0-100
    gatewayDiversity: number; // 0-100
    coverage: number;      // 0-100
  };
  trend: 'improving' | 'stable' | 'degrading';
}
```

---

### 7.2 Anomaly Detection

**Current State:** Not implemented  
**Malla Feature:** Detect unusual network behavior

**Implementation:**
- [ ] **Unusual Activity Detection** - Spike in messages from node
- [ ] **Signal Quality Anomalies** - Sudden RSSI/SNR changes
- [ ] **Node Disappearance Alerts** - Previously active node goes offline
- [ ] **New Node Detection** - Alert when new nodes join
- [ ] **Routing Anomalies** - Unusual hop counts or paths
- [ ] **Protocol Anomalies** - Unexpected message types

**Technical Notes:**
- Implement statistical analysis
- Set baseline thresholds
- Create alert system
- Add anomaly dashboard

---

## Implementation Priority Summary

### Phase 1 (Q1 2026) - Foundation & Critical Features
1. **Network Map with RF Links (1.0)** ⭐ HIGHEST PRIORITY
2. Enhanced Dashboard Metrics (1.1)
3. Signal Quality Analytics (1.2)
4. Distance Calculation (2.4)
5. Data Retention & Cleanup (5.1)

### Phase 2 (Q2 2026) - Analytics
1. Advanced Analytics Charts (1.3)
2. Packet Browser Enhancements (4.1)
3. Protocol Usage Analysis (4.2)
4. Network Health Score (7.1)
5. Reusable UI Components (6.3)

### Phase 3 (Q3 2026) - Traceroute
1. Traceroute Capture & Display (2.1)
2. Hop Analysis Tools (2.2)
3. Traceroute RF Hop Analysis (2.3)
4. Line of Sight Analysis (2.5)

### Phase 4 (Q4 2026) - Advanced Features
1. Gateway Comparison Tool (3.1)
2. Gateway Diversity Metrics (3.2)
3. Anomaly Detection (7.2)
4. Embeddable Map (6.1)
5. URL State Management (6.4)

---

## Technical Considerations

### Database Schema Changes

New tables needed:
- `traceroutes` - Store traceroute data
- `traceroute_hops` - Individual hops in traceroutes
- `network_health_history` - Historical health scores
- `analytics_cache` - Cached analytics results

Schema modifications:
- Add `distance_km` to `node_neighbors`
- Add `gateway_score` to `nodes`
- Add `protocol_stats` JSONB to `networks`

### Performance Requirements

- Analytics queries must complete in < 2 seconds
- Real-time updates must have < 500ms latency
- Dashboard must load in < 3 seconds
- Support 10,000+ nodes without degradation

### API Endpoints to Add

```
GET  /api/v1/analytics/network-health
GET  /api/v1/analytics/signal-quality
GET  /api/v1/analytics/top-talkers
GET  /api/v1/traceroutes
GET  /api/v1/traceroutes/:id
GET  /api/v1/traceroutes/:id/hops
GET  /api/v1/gateways/compare
GET  /api/v1/hops/analysis
GET  /api/v1/links/longest
POST /api/v1/analytics/export
```

---

## Resources & References

- **Malla GitHub**: https://github.com/zenitraM/malla
- **Malla Live Instance**: https://malla.areyoumeshingwith.us
- **Meshtastic Traceroute Docs**: https://meshtastic.org/docs/configuration/module/traceroute/
- **Haversine Formula**: https://en.wikipedia.org/wiki/Haversine_formula

---

## Notes

- All features should maintain backward compatibility
- Prioritize performance and scalability
- Follow existing code patterns and architecture
- Add comprehensive tests for new features
- Document all new APIs and features
- Consider mobile responsiveness for all new UI

---

*Last Updated: January 2026*
*Content rephrased for compliance with licensing restrictions*
