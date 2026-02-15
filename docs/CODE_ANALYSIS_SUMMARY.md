# Malla Code Analysis Summary

## Key Implementation Insights from Malla Codebase

### Architecture Overview

**Technology Stack:**
- Backend: Python 3.11+ with Flask
- Database: SQLite with optimized queries
- Frontend: Jinja2 templates + Vanilla JavaScript
- MQTT: Separate capture process using paho-mqtt
- Caching: In-memory Python dictionaries with TTL (60-300 seconds)
- Charts: Plotly.js for interactive visualizations

**Performance Optimizations:**
- Aggressive SQL query optimization (single queries instead of N+1)
- In-memory caching with TTL for expensive calculations
- Bulk node name lookups to avoid repeated queries
- Location history pre-fetching for distance calculations
- Grouped packet display to reduce data volume

---

## Feature Implementation Details

### 1. Longest Links Analysis

**File:** `src/malla/services/traceroute_service.py::get_longest_links_analysis()`

**Key Features:**
- Analyzes last 7 days of traceroute packets (configurable)
- Pre-fetches location history for all nodes (major performance optimization)
- Calculates distance for each RF hop using location at packet timestamp
- Filters by minimum distance (default 1km) and SNR (default -20dB)
- Groups bidirectional links (A↔B treated as same link)
- Tracks multiple observations of same link
- Shows "age warning" if location data is stale (e.g., "from 2.5h ago")
- Supports both direct hops and multi-hop paths

**Performance Notes:**
- Uses location history cache to avoid per-hop DB queries
- Limits to 25,000 packets for reasonable performance
- Implements hourly bucketing for location lookups
- Streams processing to avoid large intermediate lists

**Database Queries:**
```python
# Pre-fetch location history for all nodes
locations = LocationRepository.get_node_location_history(node_id, limit=50)

# Find best location at timestamp using binary search on DESC sorted list
# Falls back to oldest/newest if no exact match
```

---

### 2. Gateway Comparison Tool

**File:** `src/malla/services/gateway_service.py::compare_gateways()`

**Key Features:**
- Compares two gateways by analyzing common received packets
- Filters to same hop_limit to exclude retransmissions
- Shows RSSI/SNR differences between gateways
- Generates scatter plots (Gateway1 vs Gateway2 signal quality)
- Timeline charts showing signal over time
- Histogram of signal differences
- Statistics: packet count, average RSSI/SNR, correlation

**UI Components:**
- Gateway selector dropdowns with node name resolution
- Time range filter
- Source node filter
- Interactive Plotly charts
- Detailed packet table with differences

---

### 3. Line of Sight Analysis

**File:** `src/malla/routes/main_routes.py::line_of_sight()`  
**Template:** `src/malla/templates/line_of_sight.html`

**Key Features:**
- Interactive node picker with search (reusable component)
- URL parameters for pre-loading: `?from=X&to=Y`
- Calculates straight-line distance using Haversine
- Displays map with line between nodes
- Shows elevation profile if altitude data available
- Analyzes historical connectivity from traceroutes
- Displays signal quality statistics from packet history
- Accessible from map link popups and tools menu

**Node Picker Component:**
- Searchable dropdown with autocomplete
- Caches node list client-side
- Displays node name, ID, and hardware model
- Filters by online status

---

### 4. Traceroute Graph Visualization

**File:** `src/malla/utils/traceroute_graph.py`  
**Template:** `src/malla/templates/traceroute_graph.html`

**Key Features:**
- Force-directed graph using D3.js
- Nodes sized by participation count
- Links colored by signal quality
- Hover tooltips with node details
- Click to highlight paths
- Filter by time range, gateway, minimum SNR
- Shows both direct and indirect links
- Calculates network centrality metrics

**Graph Data Structure:**
```python
{
  "nodes": [
    {
      "id": node_id,
      "name": display_name,
      "packet_count": count,
      "avg_snr": snr,
      "last_seen": timestamp
    }
  ],
  "links": [
    {
      "source": from_node_id,
      "target": to_node_id,
      "packet_count": count,
      "avg_snr": snr,
      "last_seen": timestamp,
      "is_bidirectional": bool
    }
  ]
}
```

---

### 5. Analytics Service

**File:** `src/malla/services/analytics_service.py`

**Cached Metrics (60s TTL):**
- Packet statistics (total, success rate, avg payload size)
- Node activity statistics (active/inactive distribution)
- Signal quality statistics (RSSI/SNR distributions)
- Temporal patterns (hourly breakdown)
- Top active nodes (by packet count)
- Packet type distribution
- Gateway distribution

**SQL Optimization Examples:**
```sql
-- Single query for all packet stats instead of multiple queries
SELECT
    COUNT(*) as total_packets,
    SUM(CASE WHEN processed_successfully = 1 THEN 1 ELSE 0 END) as successful,
    AVG(CASE WHEN payload_length IS NOT NULL THEN payload_length END) as avg_size,
    -- RSSI distribution in single query
    SUM(CASE WHEN rssi > -70 THEN 1 ELSE 0 END) as rssi_excellent,
    SUM(CASE WHEN rssi > -80 AND rssi <= -70 THEN 1 ELSE 0 END) as rssi_good,
    -- etc.
FROM packet_history
WHERE timestamp >= ?
```

---

### 6. Packet Grouping

**File:** `src/malla/database/repositories.py::PacketRepository.get_packets()`

**Key Feature:** Groups duplicate packets received by multiple gateways

**Implementation:**
- Groups by `(mesh_packet_id, from_node, to_node, portnum)`
- Shows aggregated stats: gateway count, RSSI range, SNR range, hop range
- Displays "reception count" for each unique packet
- Formats ranges: "3-5 hops", "-85.2 to -78.4 dBm"
- Tracks relay nodes with counts: "0x12, 0x34*2, 0x56*3"

**Performance:**
- Fetches limited raw packets (5k-25k instead of millions)
- Groups in-memory (fast)
- Skips expensive COUNT(DISTINCT) for total count
- Uses smaller multipliers for pagination

---

### 7. Node Service Features

**File:** `src/malla/services/node_service.py`

**Key Features:**
- Bulk node name lookups (single query for multiple nodes)
- Node location history tracking
- Hardware model display names
- Role-based filtering
- Packet count aggregation (24h, 7d, all-time)
- Last seen tracking
- Gateway count per node

**Caching Strategy:**
- Node names cached client-side in JavaScript
- Location history cached server-side (5min TTL)
- Bulk lookups to minimize DB queries

---

### 8. Direct Receptions Analysis

**File:** `src/malla/templates/components/direct_receptions.html`

**Key Feature:** Shows which gateways directly received packets from a node

**Implementation:**
- Queries packet_history for specific from_node
- Groups by gateway_id
- Shows packet count, RSSI/SNR stats per gateway
- Displays last seen timestamp
- Sortable table with signal quality indicators

---

### 9. Relay Node Analysis

**File:** `src/malla/templates/components/relay_node_analysis.html`

**Key Feature:** Analyzes which nodes relay packets for a specific node

**Implementation:**
- Tracks relay_node field in packet_history
- Shows relay frequency and signal quality
- Identifies key relay nodes in the network
- Helps understand routing patterns

---

## Database Schema Insights

### packet_history Table (Core)
```sql
CREATE TABLE packet_history (
    id INTEGER PRIMARY KEY,
    timestamp REAL NOT NULL,
    from_node_id INTEGER,
    to_node_id INTEGER,
    portnum INTEGER,
    portnum_name TEXT,
    gateway_id TEXT,
    channel_id TEXT,
    mesh_packet_id INTEGER,
    rssi REAL,
    snr REAL,
    hop_limit INTEGER,
    hop_start INTEGER,
    payload_length INTEGER,
    processed_successfully INTEGER,
    raw_payload BLOB,
    relay_node INTEGER,
    -- Many more fields...
);

-- Critical indexes
CREATE INDEX idx_packet_timestamp ON packet_history(timestamp);
CREATE INDEX idx_packet_from_node ON packet_history(from_node_id);
CREATE INDEX idx_packet_gateway ON packet_history(gateway_id);
CREATE INDEX idx_packet_mesh_id ON packet_history(mesh_packet_id);
```

### node_info Table
```sql
CREATE TABLE node_info (
    node_id INTEGER PRIMARY KEY,
    long_name TEXT,
    short_name TEXT,
    hw_model TEXT,
    role TEXT,
    last_packet_time REAL,
    packet_count_24h INTEGER,
    packet_count_7d INTEGER,
    packet_count_total INTEGER
);
```

### location_history Table
```sql
CREATE TABLE location_history (
    id INTEGER PRIMARY KEY,
    node_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude INTEGER,
    timestamp REAL NOT NULL,
    sats_in_view INTEGER,
    precision_bits INTEGER,
    FOREIGN KEY (node_id) REFERENCES node_info(node_id)
);

CREATE INDEX idx_location_node_time ON location_history(node_id, timestamp DESC);
```

---

## UI/UX Patterns

### Reusable Components

1. **Node Picker** (`node-picker.js`)
   - Searchable dropdown
   - Client-side caching
   - Displays node metadata
   - Used across multiple pages

2. **Modern Table** (`modern-table.js`)
   - Client-side sorting
   - Pagination
   - Column filtering
   - CSV export
   - URL state management

3. **Shared Sidebar** (`shared_sidebar.html`)
   - Consistent filters across pages
   - Time range selector
   - Gateway filter
   - Node filter
   - Collapsible on mobile

4. **Dark Mode Toggle** (`dark-mode-toggle.js`)
   - Persists preference in localStorage
   - Smooth transitions
   - Applies to all pages

### URL State Management

**Pattern:** Store filter state in URL parameters
```javascript
// Example from filter-store.js
const params = new URLSearchParams(window.location.search);
params.set('gateway', gatewayId);
params.set('start_time', startTime);
window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
```

**Benefits:**
- Shareable links with filters
- Browser back/forward works
- Bookmark-friendly
- No server-side session needed

---

## Performance Best Practices from Malla

1. **Bulk Operations**
   - Fetch all node names in one query
   - Pre-fetch location history for analysis
   - Use IN clauses instead of loops

2. **Caching Strategy**
   - Cache expensive calculations (60-300s TTL)
   - Cache on cache key: `(gateway_id, from_node, hop_count)`
   - Clear cache on data updates

3. **SQL Optimization**
   - Use single queries with aggregations
   - Avoid N+1 queries
   - Add indexes for common filters
   - Use CASE statements for distributions

4. **Pagination**
   - Limit raw data fetches
   - Group/aggregate in memory
   - Skip expensive total counts when possible

5. **Client-Side Optimization**
   - Cache node lists in JavaScript
   - Use URL state instead of server sessions
   - Lazy load charts and heavy components

---

## Key Takeaways for Our Implementation

### Must-Have Features
1. **Longest Links Analysis** - Users love seeing RF range achievements
2. **Gateway Comparison** - Essential for multi-gateway deployments
3. **Line of Sight Tool** - Helps with network planning
4. **Packet Grouping** - Reduces noise from duplicate receptions
5. **Traceroute Visualization** - Critical for understanding routing

### Architecture Decisions
1. **Keep SQLite for Malla-inspired features** - Their optimizations are SQLite-specific
2. **Add caching layer** - Redis or in-memory with TTL
3. **Bulk operations** - Always fetch related data in batches
4. **URL state management** - Better UX than server sessions

### Performance Priorities
1. **Pre-fetch location history** - Biggest optimization for distance calculations
2. **Cache analytics** - 60s TTL is reasonable for dashboard
3. **Limit packet fetches** - 25k packets max for analysis
4. **Index everything** - timestamp, node_id, gateway_id, mesh_packet_id

### UI/UX Priorities
1. **Reusable components** - Node picker, table, sidebar
2. **Dark mode** - Users expect it
3. **Shareable URLs** - Store state in URL params
4. **Mobile responsive** - Collapsible sidebars

---

## Files to Study Further

**Core Services:**
- `src/malla/services/traceroute_service.py` - Traceroute analysis algorithms
- `src/malla/services/location_service.py` - Distance calculations
- `src/malla/services/analytics_service.py` - Dashboard metrics
- `src/malla/services/gateway_service.py` - Gateway comparison

**Database:**
- `src/malla/database/repositories.py` - Optimized queries
- `src/malla/database/packet_repository_optimized.py` - Packet grouping

**Frontend:**
- `src/malla/static/js/node-picker.js` - Reusable node selector
- `src/malla/static/js/modern-table.js` - Table component
- `src/malla/static/js/filter-store.js` - URL state management

**Utils:**
- `src/malla/utils/geo_utils.py` - Distance calculations
- `src/malla/utils/traceroute_utils.py` - Route parsing
- `src/malla/utils/node_utils.py` - Bulk node operations

---

*Analysis based on Malla codebase commit: main branch*  
*Last updated: January 2026*
