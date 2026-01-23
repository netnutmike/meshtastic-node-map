# User Guide

Welcome to the Meshtastic Node Mapper user guide. This comprehensive guide will help you understand and use all features of the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Map View](#map-view)
3. [Node Management](#node-management)
4. [Network Insights](#network-insights)
5. [MQTT Monitor](#mqtt-monitor)
6. [Multi-Network Support](#multi-network-support)
7. [Coverage Analysis](#coverage-analysis)
8. [Message History](#message-history)
9. [Telemetry & Monitoring](#telemetry--monitoring)
10. [Data Export](#data-export)
11. [Mobile Features](#mobile-features)
12. [Settings & Configuration](#settings--configuration)

## Getting Started

### First Launch

When you first open the application at http://localhost:3000, you'll see:

1. **Interactive Map**: The main view showing your network
2. **Navigation Bar**: Access to different pages and features
3. **Connection Status**: Shows if you're connected to MQTT
4. **Settings Icon**: Configure your connection and preferences

### Connecting to Your Network

1. Click the **Settings** icon (⚙️) in the top right
2. Navigate to **MQTT Connection** section
3. Enter your connection details:
   - **Broker URL**: Your MQTT broker address (e.g., `mqtt://mqtt.meshtastic.org`)
   - **Port**: Usually 1883 for MQTT, 8883 for secure MQTT
   - **Username**: If your broker requires authentication
   - **Password**: Your MQTT password
   - **Topic Pattern**: The MQTT topic to subscribe to
     - Default: `msh/US/2/json/LongFast/!#`
     - Replace `US` with your region (EU_868, AU_915, etc.)
4. Click **Save and Connect**

Within seconds, you should see nodes appearing on the map!

## Map View

The map is the heart of the application, showing all your mesh network nodes in real-time.

### Understanding Node Markers

Nodes are displayed as colored markers on the map:

- **🟢 Green**: Node is online and active (seen recently)
- **🔵 Blue**: Node is disconnected from MQTT but recently seen
- **🔴 Red**: Node is offline (not seen in configured time threshold)

**Node Marker Features:**
- **Size**: 24x24 pixels for easy visibility
- **Animations**: Recently updated nodes pulse to show activity
- **Age Indicators**: Older nodes gradually fade and show age indicators
- **Labels**: Optional node name labels (toggle in Map Options)

### Map Options Panel

Click the **Map Options** button (⚙️) to access display settings:

**Map Sources:**
- OpenStreetMap (default)
- OpenTopoMap (topographic)
- Esri Satellite
- Google Satellite
- Google Hybrid
- Carto Light
- Carto Dark

**Node Display:**
- **Display Mode**: All nodes, routers only, clustered, or none
- **View Mode**: 
  - Nodes (standard view)
  - Node Types (color by role)
  - Bandwidth Utilization (color by channel usage)

**Overlays:**
- **Legend**: Show/hide map legend
- **Neighbors**: Display neighbor connections with arrows
- **Position History**: Show node movement trails
- **Node Labels**: Display node names next to markers (NEW!)

**Clustering:**
- Automatically groups nearby nodes at lower zoom levels
- Cluster sizes: Small (18px), Medium (24px), Large (30px)
- Click clusters to zoom in and see individual nodes

### Interacting with the Map

**Viewing Node Details:**
- Click any node marker to open a popup with quick info
- Click "View Details" in the popup for complete information

**Map Controls:**
- **Zoom**: Use mouse wheel or +/- buttons
- **Pan**: Click and drag the map
- **Reset View**: Click the home icon to center on all nodes
- **Layers**: Toggle between different map styles (Street, Satellite, Terrain)

**Map Options:**
- **Show Clusters**: Group nearby nodes for better performance
- **Show Neighbor Lines**: Display connections between nodes
- **Show Coverage Areas**: Visualize estimated signal coverage
- **Show Routing Paths**: See message routing between nodes

### Node Popup Information

When you click a node, the popup shows:

- **Node Name**: Short name and long name
- **Status**: Online/offline/disconnected indicator with color coding
- **Hardware**: Device model with friendly names (e.g., "RAK WisBlock 4631" instead of "HW_33")
- **Hex ID**: Node's hexadecimal identifier
- **Role**: Device role (Client, Router, Repeater, Tracker, etc.)
- **Battery**: Current battery level percentage (if available)
- **Voltage**: Current voltage reading (if available)
- **Channel Utilization**: Current channel usage percentage (if available)
- **Air Utilization**: Transmission air time percentage (if available)
- **Altitude**: GPS altitude in meters (if available)
- **GPS Precision**: Position accuracy in meters (if available)
- **Last Seen**: Timestamp of last activity
- **Quick Actions**: View details, center map, show neighbors

**Live Indicators:**
- **LIVE** badge: Node updated in last 5 minutes
- **OLD** badge: Node hasn't been seen in a while (75% of max age threshold)

## Node Management

### Nodes Page

Access the Nodes page from the navigation bar to see a detailed list of all nodes.

**Features:**
- **Search**: Find nodes by name, ID, hex ID, or hardware model
- **Filter**: 
  - Show active only (toggle)
  - Show unknown nodes (toggle)
  - Filter by hardware, role, or status
- **Sort**: Click column headers to sort by:
  - ID, Short Name, Long Name
  - Hardware Model, Role
  - Altitude, Latitude, Longitude
  - Neighbor Count
  - Battery %, Voltage, Channel Utilization
  - Last Seen, Owner
- **Pagination**: Navigate through large node lists (50 nodes per page)
- **Real-time Updates**: Node list updates automatically as data arrives
- **Telemetry Display**: Battery level, voltage, and channel utilization shown inline (NEW!)

**Column Information:**
- **ID**: Hexadecimal node identifier
- **Short Name**: 4-character node name
- **Long Name**: Full node name
- **Hardware**: Friendly hardware model name (e.g., "Heltec V3" instead of "HW_10")
- **Role**: CLIENT, ROUTER, REPEATER, TRACKER, etc.
- **Altitude**: GPS altitude in meters
- **Latitude/Longitude**: GPS coordinates
- **Neighbors**: Count of directly connected nodes
- **Battery %**: Current battery level (if available)
- **Voltage**: Current voltage reading (if available)
- **Ch. Util. %**: Channel utilization percentage (if available)
- **Last Seen**: Time since last activity (e.g., "5m ago", "2h ago")
- **Owner**: Node owner name (if available)
- **Actions**: View details, center map buttons

### Node Details Panel

Click any node to open the detailed information panel with multiple tabs:

**Overview Tab:**
- Node identification (Node ID, Hex ID)
- Names (Short Name, Long Name if available)
- Hardware model with friendly name
- Device role
- MQTT connection status
- Battery level with color coding (green >50%, orange >20%, red ≤20%)
- Voltage reading
- Channel utilization percentage
- Air utilization TX percentage
- Altitude and GPS precision
- Last seen and last heard timestamps

**Messages Tab:**
- Filter messages by direction:
  - **Sent Messages**: Messages from this node
  - **Received Messages**: Messages to this node
  - **Gated Messages**: Messages routed through this node
- Message history with timestamps
- Message types and content
- Routing information

**Details Tab:**
- **Identification Section**:
  - Node ID (database ID)
  - Hex ID (Meshtastic identifier)
- **Hardware Information**:
  - Hardware model with friendly name
  - Device role

**LoRa Config Tab:**
- Region settings (US915, EU_868, etc.)
- Frequency band information
- Modem configuration (bandwidth, spreading factor, coding rate)
- Channel status and information
- Note: Configuration data is placeholder (not transmitted via MQTT)

**Position Tab:**
- Current GPS coordinates (latitude, longitude)
- Altitude in meters
- GPS precision (accuracy) in meters
- Position quality indicator (excellent, good, fair, poor)
- Position source (GPS)
- Formatted coordinates in multiple formats:
  - Decimal Degrees
  - Degrees, Minutes, Seconds (DMS)

**Telemetry Tab:**
- Interactive charts showing historical data
- Device metrics over time
- Environmental data (if available)
- Configurable time ranges

## MQTT Monitor

The MQTT Monitor provides real-time visibility into all MQTT messages flowing through your network.

### Accessing MQTT Monitor

Click the **MQTT Monitor** button in the navigation bar to open the monitor interface.

### Real-Time Message Stream

**Message Display:**
- Live stream of incoming MQTT messages
- Color-coded by message type
- Automatic scrolling (can be paused)
- Timestamp for each message
- Message details in expandable format

**Message Information:**
- **From**: Source node (short name and hex ID)
- **To**: Destination node or broadcast
- **Type**: Message type (POSITION, TELEMETRY, NODEINFO, TEXT, etc.)
- **Channel**: LoRa channel number
- **Hop Start**: Maximum hops allowed
- **Hops Away**: Current hop count
- **RSSI**: Received Signal Strength Indicator
- **SNR**: Signal-to-Noise Ratio
- **Payload**: Message content (expandable JSON)

### Message Filtering

**Filter by Message Type:**
- All Messages
- Position Updates
- Telemetry (Device Metrics)
- Node Info
- Text Messages
- Neighbor Info (NEW!)
- Other message types

**Filter by Node:**
- Show all nodes
- Filter by specific sender
- Filter by specific receiver

**Search:**
- Search message content
- Search by node name or ID
- Search by topic

### Statistics Panel

Real-time statistics updated every second:

**Message Counts:**
- **Total Messages**: All messages received
- **Messages/Minute**: Current message rate
- **Encrypted**: Count of encrypted messages
- **Decrypted**: Successfully decrypted messages
- **Decryption Failures**: Failed decryption attempts

**Message Types Breakdown:**
- Count by message type
- Percentage distribution
- Visual indicators

**Performance Metrics:**
- Average RSSI
- Average SNR
- Message success rate
- Decryption success rate

### Message Details

Click any message to expand and see:

**Full Payload:**
- Complete JSON structure
- Nested data (position, telemetry, etc.)
- Formatted for readability

**Telemetry Data (when applicable):**
- Battery level percentage
- Voltage reading
- Channel utilization
- Air utilization TX
- Uptime in seconds

**Position Data (when applicable):**
- Latitude and longitude
- Altitude
- GPS precision
- Timestamp

**Encryption Information:**
- Encryption status
- Channel used
- Decryption success/failure

### Using MQTT Monitor for Debugging

**Verify Data Flow:**
- Confirm messages are being received
- Check message rates
- Identify missing nodes

**Test Encryption:**
- Verify encryption keys are correct
- Check decryption success rate
- Identify encryption issues

**Monitor Network Health:**
- Watch for message patterns
- Identify chatty nodes
- Detect network issues

**Troubleshoot Nodes:**
- See if specific nodes are transmitting
- Check message types from nodes
- Verify telemetry data

## Network Insights

The Network Insights page provides comprehensive analytics about your mesh network.

### Statistics Dashboard

**Network Summary:**
- Total nodes in network
- Online vs offline count
- Total messages processed
- Network uptime

**Node Distribution:**
- Nodes by hardware model (pie chart)
- Nodes by role (router, client, etc.)
- Geographic distribution
- Firmware version breakdown

**Message Analytics:**
- Messages per hour/day/week
- Message types distribution
- Top talkers (most active nodes)
- Message success rate

**Network Health:**
- Average signal strength
- Channel utilization trends
- Battery levels across network
- Nodes needing attention

### Coverage Analysis

Visualize and analyze your network's coverage:

**Coverage Map:**
- Estimated signal coverage areas
- Coverage gaps and weak spots
- Optimal placement suggestions
- Terrain-aware analysis

**Coverage Metrics:**
- Total coverage area (square km/miles)
- Population covered
- Coverage percentage by region
- Redundancy analysis (overlapping coverage)

**Planning Tools:**
- Add hypothetical nodes to see coverage impact
- Optimize node placement
- Identify best locations for new nodes
- Export coverage data for planning

### Utilization Analysis

Monitor how your network resources are being used:

**Channel Utilization:**
- Real-time channel usage percentage
- Historical trends and patterns
- Peak usage times
- Comparison across channels

**Air Time Analysis:**
- Transmission time per node
- Fair use compliance
- Nodes exceeding limits
- Optimization recommendations

**Network Capacity:**
- Current load vs capacity
- Projected growth
- Bottleneck identification
- Scaling recommendations

## Multi-Network Support

Manage multiple mesh networks from a single interface.

### Adding Networks

1. Go to **Settings** → **Networks**
2. Click **Add Network**
3. Enter network details:
   - **Name**: Descriptive name for the network
   - **MQTT Broker**: Connection details
   - **Region**: LoRa region (US, EU_868, etc.)
   - **Channels**: Channel configuration
4. Click **Save**

### Switching Networks

- Use the **Network Selector** dropdown in the navigation bar
- Click a network name to switch to it
- The map and all data will update to show the selected network

### Cross-Network Analytics

Compare performance across multiple networks:

- **Network Comparison**: Side-by-side statistics
- **Performance Metrics**: Message rates, uptime, coverage
- **Node Distribution**: Hardware and role breakdown
- **Best Practices**: Learn from your best-performing networks

### Network Isolation

Keep networks separate or allow cross-network features:

- **Isolated Mode**: Each network is completely separate
- **Federated Mode**: Share certain data between networks
- **Gateway Nodes**: Nodes that bridge multiple networks

## Coverage Analysis

Plan and optimize your network coverage.

### Viewing Coverage

1. Go to **Network Insights** → **Coverage Analysis**
2. The map shows estimated coverage areas for each node
3. Color coding indicates signal strength:
   - **Dark Green**: Strong signal (excellent coverage)
   - **Light Green**: Good signal
   - **Yellow**: Moderate signal
   - **Orange**: Weak signal
   - **Red**: Very weak signal

### Coverage Tools

**Gap Analysis:**
- Automatically identifies areas with no coverage
- Suggests optimal locations for new nodes
- Calculates required node count for full coverage

**Terrain Analysis:**
- Considers elevation and obstacles
- Line-of-sight calculations
- Fresnel zone clearance

**Planning Mode:**
- Add virtual nodes to see coverage impact
- Test different configurations
- Export plans for implementation

### Coverage Reports

Generate detailed coverage reports:

1. Click **Generate Report**
2. Select report type:
   - **Summary**: Overview of coverage metrics
   - **Detailed**: Node-by-node analysis
   - **Planning**: Recommendations for improvement
3. Choose format (PDF, HTML, or CSV)
4. Download or email the report

## Message History

Track all messages flowing through your network.

### Viewing Messages

Access message history from:
- **Messages** page in navigation
- **Node Details** → **Messages** tab
- **Search** → Filter by message type or content

### Message Types

The application tracks various message types:

- **Text Messages**: User-sent text communications
- **Position Updates**: GPS location broadcasts
- **Telemetry**: Sensor data and device metrics
- **Node Info**: Node identification and capabilities
- **Routing**: Network routing information
- **Admin**: Administrative messages

### Message Details

Click any message to see:

- **Content**: The message payload
- **Sender/Receiver**: Source and destination nodes
- **Timestamp**: When the message was sent/received
- **Routing Path**: Hops the message took through the network
- **Signal Quality**: RSSI and SNR at each hop
- **Encryption**: Whether the message was encrypted
- **Acknowledgment**: If delivery was confirmed

### Message Search & Filter

**Search Options:**
- Search by text content
- Filter by sender or receiver
- Filter by message type
- Date range selection
- Signal quality thresholds

**Advanced Filters:**
- Encrypted vs unencrypted
- Acknowledged vs unacknowledged
- Direct vs routed messages
- By channel number
- By hop count

### Routing Visualization

See how messages travel through your network:

1. Select a message
2. Click **Show Routing Path**
3. The map displays:
   - Source node (green)
   - Intermediate hops (yellow)
   - Destination node (red)
   - Lines showing the path
   - Signal strength at each hop

## Telemetry & Monitoring

The application automatically collects and displays telemetry data from your mesh network nodes.

### Device Telemetry

**Automatically Collected Metrics:**
- **Battery Level**: Percentage remaining (0-100%)
- **Voltage**: Current battery voltage
- **Channel Utilization**: LoRa channel usage percentage
- **Air Utilization TX**: Transmission air time percentage
- **Uptime**: Device uptime in seconds

**Data Sources:**
- MQTT DEVICE_METRICS messages
- Automatic parsing of both JSON and protobuf formats
- Real-time updates as messages arrive

**Display Locations:**
- Nodes list table (inline display)
- Node details panel (Overview tab)
- Map popup (when clicking nodes)
- Telemetry charts (historical data)

### Telemetry Data Storage

**Database Storage:**
- All telemetry readings stored in `telemetry_readings` table
- Node table columns updated with latest values for quick access
- Historical data retained based on retention settings

**Update Frequency:**
- Updates as MQTT messages arrive
- Typically every few minutes per node
- Depends on node configuration

### Viewing Telemetry History

**Telemetry Charts:**
1. Open Node Details Panel
2. Navigate to **Telemetry** tab
3. View interactive charts showing:
   - Battery level over time
   - Voltage trends
   - Channel utilization patterns
   - Air time usage

**Time Range Selection:**
- Last 24 hours
- Last 7 days
- Last 30 days
- Custom date range

### Neighbor Information

**Neighbor Data Collection:**
- Automatically parsed from NEIGHBORINFO messages
- Stores neighbor relationships in database
- Tracks SNR (signal quality) to neighbors
- Records last heard time

**Viewing Neighbors:**
- Node details panel shows neighbor count
- Neighbor visualization on map (when enabled)
- Neighbor list with signal strength

**Note:** Neighbor info broadcasts must be enabled on Meshtastic devices. This feature is not enabled by default and requires device configuration.

### Environmental Telemetry

If your nodes have environmental sensors:

**Supported Metrics:**
- Temperature
- Humidity
- Barometric pressure
- Gas resistance
- Air quality index (IAQ)

**Display:**
- Telemetry tab in node details
- Historical charts
- Environmental data export

### Telemetry Alerts

Set up alerts for telemetry thresholds:

**Battery Alerts:**
- Low battery warnings (< 20%)
- Critical battery alerts (< 10%)
- Voltage drop notifications

**Channel Utilization Alerts:**
- High utilization warnings (> 75%)
- Channel saturation alerts (> 90%)

**Configuration:**
- Go to Settings → Notifications
- Configure thresholds
- Choose notification methods

## Data Export

Export your network data for analysis, backup, or sharing.

### Export Options

Access data export from **Settings** → **Data Export** or the export icon on various pages.

**Available Formats:**
- **CSV**: Spreadsheet-compatible format
- **JSON**: Structured data for programming
- **KML**: Geographic data for Google Earth
- **GeoJSON**: Geographic data for GIS applications

### What You Can Export

**Nodes:**
- All node information
- Current status and telemetry
- Position history
- Neighbor relationships

**Messages:**
- Complete message history
- Filtered message sets
- Routing information
- Signal quality data

**Telemetry:**
- Device metrics over time
- Environmental data
- Power metrics
- Custom time ranges

**Network Data:**
- Network configuration
- Channel settings
- Coverage analysis results
- Statistics and analytics

### Automated Exports

Set up automatic exports:

1. Go to **Settings** → **Automated Exports**
2. Click **Create Schedule**
3. Configure:
   - **What to export**: Select data types
   - **Format**: Choose export format
   - **Frequency**: Daily, weekly, or monthly
   - **Destination**: Local download or remote server
4. Click **Save Schedule**

### Backup & Restore

**Creating Backups:**
1. Go to **Settings** → **Backup**
2. Click **Create Backup**
3. Choose what to include:
   - Database (all historical data)
   - Configuration (settings and networks)
   - User accounts (if authentication enabled)
4. Download the backup file

**Restoring from Backup:**
1. Go to **Settings** → **Backup**
2. Click **Restore from Backup**
3. Select your backup file
4. Confirm the restoration
5. Application will restart with restored data

## Mobile Features

The application is fully optimized for mobile devices.

### Mobile Interface

When accessed from a phone or tablet:

- **Responsive Layout**: Adapts to screen size
- **Touch Gestures**: Pinch to zoom, swipe to pan
- **Mobile Menu**: Collapsible navigation
- **Optimized Performance**: Reduced data usage

### Offline Mode

Use the application without internet connection:

**Enabling Offline Mode:**
1. Go to **Settings** → **Offline Mode**
2. Toggle **Enable Offline Mode**
3. Select data to cache:
   - Map tiles for your area
   - Recent node data
   - Message history
4. Click **Download for Offline Use**

**Using Offline:**
- View cached nodes and messages
- See last known positions
- Access downloaded map tiles
- Data syncs when connection returns

### GPS Integration

Use your device's GPS for location features:

**Enable GPS:**
1. Allow location access when prompted
2. Your position appears as a blue dot on the map
3. Use **Center on Me** button to find yourself

**GPS Features:**
- Track your position in real-time
- Measure distance to nodes
- Navigate to node locations
- Record your path for coverage testing

### Field Mode

Optimized interface for field use:

1. Go to **Settings** → **Display**
2. Enable **Field Mode**
3. Features:
   - High contrast display
   - Larger touch targets
   - Simplified interface
   - Battery saver mode
   - Quick access to essential info

## Settings & Configuration

Customize the application to your preferences.

### General Settings

**Display Options:**
- **Theme**: Light, dark, or auto (follows system)
- **Language**: Select your preferred language
- **Units**: Metric or imperial measurements
- **Time Format**: 12-hour or 24-hour
- **Date Format**: Various regional formats

**Map Settings:**
- **Default Zoom**: Starting zoom level
- **Default Center**: Initial map position
- **Map Style**: Street, satellite, terrain, or custom
- **Marker Style**: Icon style and size
- **Animation**: Enable/disable marker animations

**Node Display:**
- **Show Offline Nodes**: Toggle visibility of offline nodes
- **Node Age Threshold**: When to mark nodes as offline
- **Label Display**: Show/hide node labels
- **Cluster Threshold**: When to group nearby nodes

### MQTT Configuration

**Connection Settings:**
- **Broker URL**: MQTT server address
- **Port**: Connection port (1883 or 8883)
- **Protocol**: MQTT or MQTT over WebSocket
- **Username/Password**: Authentication credentials
- **Client ID**: Unique identifier for this connection

**Topic Configuration:**
- **Subscribe Topics**: Topics to listen to
- **Publish Topics**: Topics for sending data
- **QoS Level**: Quality of Service (0, 1, or 2)
- **Retain Messages**: Keep last message on broker

**Advanced Options:**
- **Reconnect Interval**: Time between reconnection attempts
- **Keep Alive**: Connection keep-alive interval
- **Clean Session**: Start fresh or resume session
- **TLS/SSL**: Secure connection settings

### Notification Settings

Configure alerts and notifications:

**Node Alerts:**
- **New Node Detected**: Alert when new nodes join
- **Node Offline**: Alert when nodes go offline
- **Low Battery**: Alert for low battery levels
- **Position Change**: Alert for significant movement

**Message Alerts:**
- **New Messages**: Notify on new messages
- **Direct Messages**: Alert for messages to specific nodes
- **Emergency Messages**: Priority alerts
- **Keyword Alerts**: Notify on specific words

**Network Alerts:**
- **High Utilization**: Alert when channel is busy
- **Connection Issues**: Notify on MQTT problems
- **Coverage Gaps**: Alert for coverage issues

### User Accounts (Optional)

If authentication is enabled:

**Account Management:**
- **Profile**: Update your information
- **Password**: Change your password
- **API Keys**: Generate keys for API access
- **Sessions**: View and manage active sessions

**Permissions:**
- **View**: Read-only access to data
- **Edit**: Modify nodes and settings
- **Admin**: Full system access
- **Export**: Permission to export data

### Advanced Settings

**Performance:**
- **Update Interval**: How often to refresh data
- **Cache Duration**: How long to cache data
- **Max Nodes**: Limit displayed nodes for performance
- **Batch Size**: Number of updates to process at once

**Database:**
- **Retention Period**: How long to keep historical data
- **Cleanup Schedule**: When to remove old data
- **Backup Schedule**: Automatic backup frequency

**Logging:**
- **Log Level**: Detail level for logs (error, warn, info, debug)
- **Log Retention**: How long to keep logs
- **Remote Logging**: Send logs to external service

## Tips & Best Practices

### Optimizing Performance

**For Large Networks (100+ nodes):**
- Enable node clustering on the map
- Increase update intervals
- Limit historical data retention
- Use filters to show relevant nodes only
- Disable node labels on map (use popup instead)
- Consider using "Routers Only" display mode

**For Slow Connections:**
- Enable offline mode
- Reduce map tile quality
- Disable real-time animations
- Limit telemetry history
- Use lighter map styles (Carto Light)

**Development Environment:**
- Rate limits are higher in development mode
- Use `NODE_ENV=development` for testing
- Monitor resource usage with `monitor-health.sh` script

### Network Monitoring

**Daily Checks:**
- Review network statistics
- Check for offline nodes
- Monitor channel utilization
- Review message success rates
- Check MQTT Monitor for unusual patterns
- Verify telemetry data is being received

**Weekly Tasks:**
- Analyze coverage gaps
- Review top talkers
- Check battery levels across network
- Review neighbor relationships
- Export data for backup
- Check for nodes needing attention

**Monthly Maintenance:**
- Generate coverage reports
- Export data for long-term backup
- Review and optimize settings
- Plan network expansions
- Analyze utilization trends
- Update documentation

### Understanding Telemetry

**Battery Monitoring:**
- Green (>50%): Healthy
- Orange (20-50%): Monitor
- Red (<20%): Needs attention
- Voltage readings help identify battery health

**Channel Utilization:**
- <25%: Excellent
- 25-50%: Good
- 50-75%: Moderate (monitor)
- >75%: High (consider optimization)

**Air Utilization:**
- Meshtastic has fair use limits
- Monitor nodes with high air time
- Optimize message frequency if needed

### Encryption & Security

**Encryption Keys:**
- Default channel key: `AQ==` (1-byte PSK)
- Configure custom keys in `config/app.yml`
- Keys must match Meshtastic device configuration
- Test encryption with `test-encryption-key.sh` script

**Decryption:**
- Application automatically decrypts messages
- Decryption statistics shown in MQTT Monitor
- Failed decryptions indicate key mismatch

### Data Management

**Database Maintenance:**
- Regular backups recommended
- Use `clear-nodes.sh` to reset data (with caution)
- Monitor disk space with `check-disk-space.sh`
- Clean up old data with retention policies

**Performance Tuning:**
- Adjust retention periods based on needs
- Export and archive old data
- Monitor database size
- Use indexes for better query performance

### Troubleshooting

**No Nodes Appearing:**
1. Check MQTT connection status (green indicator)
2. Verify topic pattern is correct
3. Open MQTT Monitor to see if messages are arriving
4. Ensure nodes are transmitting
5. Check firewall settings
6. Verify encryption keys match

**No Telemetry Data:**
1. Check if DEVICE_METRICS messages are in MQTT Monitor
2. Verify nodes are sending telemetry
3. Check encryption/decryption success rate
4. Confirm telemetry is enabled on devices
5. Wait a few minutes for data to arrive

**Slow Performance:**
1. Clear browser cache
2. Reduce number of displayed nodes
3. Disable unnecessary features (animations, labels)
4. Check system resources
5. Review rate limiting (429 errors)
6. Use `debug-lockup.sh` if services freeze

**Data Not Updating:**
1. Check MQTT connection indicator
2. Verify network connectivity
3. Review error logs in browser console
4. Check backend logs: `docker-compose logs backend`
5. Restart services if needed
6. Use `quick-diagnostic.sh` for health check

**Rate Limiting (429 Errors):**
1. Development mode has higher limits
2. Check if frontend is polling too frequently
3. Review browser console for excessive requests
4. Restart backend to reset rate limits
5. Adjust rate limits in `backend/src/middleware/rateLimiting.ts`

**Service Lockups:**
1. Run `debug-lockup.sh` to capture diagnostics
2. Check resource usage (CPU, memory, disk)
3. Review database connection pool
4. Check for long-running queries
5. Monitor with `monitor-health.sh`
6. Review logs in generated debug file

### Hardware Model Names

The application displays friendly hardware names instead of codes:

- HW_10 → "Heltec V3"
- HW_33 → "RAK WisBlock 4631"
- HW_99 → "Seeed Studio Wio Tracker L1"
- And many more...

Full list available in `frontend/src/utils/hardwareModels.ts`

### Firmware Versions

**Note:** Firmware versions are NOT available via public MQTT. This is a Meshtastic protocol limitation for privacy/security. Firmware version information is only available when directly connected to devices via serial/Bluetooth.

### Neighbor Information

**Enabling Neighbor Broadcasts:**
- Must be enabled on Meshtastic devices
- Not enabled by default
- Requires device configuration
- Broadcasts NEIGHBORINFO messages periodically

**When Enabled:**
- Neighbor counts appear in nodes list
- Neighbor relationships stored in database
- Signal strength (SNR) tracked
- Visualize connections on map

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

**Navigation:**
- `M`: Go to Map view
- `N`: Go to Nodes page
- `I`: Go to Network Insights
- `S`: Open Settings
- `Q`: Open MQTT Monitor (NEW!)
- `?`: Show keyboard shortcuts help

**Map Controls:**
- `+`: Zoom in
- `-`: Zoom out
- `H`: Reset to home view
- `F`: Toggle fullscreen
- `L`: Toggle node labels (NEW!)
- `O`: Open map options panel

**General:**
- `/`: Focus search box
- `Esc`: Close dialogs/panels
- `Ctrl+E`: Export current view
- `Ctrl+R`: Refresh data

## Recent Updates & New Features

### Version 1.0.2 (January 2026)

**Telemetry Improvements:**
- ✅ Fixed telemetry data parsing for all fields (battery, voltage, channel utilization, air util TX)
- ✅ Support for both snake_case (JSON) and camelCase (protobuf) field names
- ✅ Fixed falsy value handling (0 values no longer converted to undefined)
- ✅ Real-time telemetry display in nodes list
- ✅ Node table columns automatically updated with latest telemetry

**Map Enhancements:**
- ✅ Node labels feature - show node names on map
- ✅ Larger node icons (24x24px) and cluster icons for better visibility
- ✅ Improved hardware model display with friendly names
- ✅ Enhanced node popup with all telemetry data
- ✅ Better status indicators (online/disconnected/offline)

**MQTT Monitor:**
- ✅ Real-time message stream with filtering
- ✅ Statistics panel with message counts and rates
- ✅ Decryption success tracking
- ✅ Neighbor Info message type filter
- ✅ Expandable message details

**Performance & Stability:**
- ✅ Increased rate limits for development (50,000 req/hour)
- ✅ Service lockup debugging tools (`debug-lockup.sh`, `monitor-health.sh`)
- ✅ Resource limits in docker-compose for stability
- ✅ Comprehensive diagnostic scripts

**UI/UX Improvements:**
- ✅ Removed firmware version field (not available via MQTT)
- ✅ Better hardware model names throughout UI
- ✅ Improved node details panel layout
- ✅ Enhanced telemetry display
- ✅ Better error handling and user feedback

**Documentation:**
- ✅ Comprehensive scripts README with all 43 scripts documented
- ✅ Updated user guide with latest features
- ✅ Service lockup debugging guide
- ✅ Telemetry display fix documentation

### Known Limitations

**Firmware Versions:**
- Not transmitted via public MQTT (Meshtastic protocol limitation)
- Only available when directly connected to devices
- Firmware version fields removed from UI

**Neighbor Information:**
- Requires neighbor broadcasts to be enabled on devices
- Not enabled by default on Meshtastic devices
- Must be configured per device

**Node Details Panel Scrolling:**
- Scrolling in panel may affect map zoom on some browsers
- Workaround: Use arrow keys or scrollbar to scroll panel
- Fix in progress

### Encryption Support

**Supported Encryption:**
- AES-128 (16-byte keys)
- AES-256 (32-byte keys)
- Automatic nonce construction from packet metadata
- Default channel key support

**Configuration:**
- Keys configured in `config/app.yml`
- Must match Meshtastic device configuration
- Test with `test-encryption-key.sh` script

**Decryption Monitoring:**
- MQTT Monitor shows decryption statistics
- Success/failure counts
- Encrypted vs decrypted message counts

## Getting Help

### In-App Help

- Click the **?** icon for context-sensitive help
- Hover over any setting for a tooltip explanation
- Check the **About** page for version and system info

### Documentation

- **[Installation Guide](installation.md)**: Setup instructions
- **[Troubleshooting](troubleshooting.md)**: Common issues
- **[API Guide](api-guide.md)**: For developers and integrations

### Community Support

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share tips
- **Meshtastic Forums**: Connect with the broader community

---

This user guide covers all major features of the Meshtastic Node Mapper. For technical details and development information, see the [Developer Documentation](developer/).
