# User Guide

Welcome to the Meshtastic Node Mapper user guide. This comprehensive guide will help you understand and use all features of the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Map View](#map-view)
3. [Node Management](#node-management)
4. [Network Insights](#network-insights)
5. [Multi-Network Support](#multi-network-support)
6. [Coverage Analysis](#coverage-analysis)
7. [Message History](#message-history)
8. [Data Export](#data-export)
9. [Mobile Features](#mobile-features)
10. [Settings & Configuration](#settings--configuration)

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

- **🟢 Green**: Node is online and active (seen in last 5 minutes)
- **🟡 Yellow**: Node is recently active (seen in last hour)
- **🔴 Red**: Node is offline (not seen in over an hour)
- **⚫ Gray**: Node has never been seen or is very old

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
- **Status**: Online/offline indicator
- **Hardware**: Device model (T-Beam, Heltec, RAK, etc.)
- **Battery**: Current battery level and voltage
- **Signal**: RSSI and SNR values
- **Last Seen**: When the node was last heard from
- **Quick Actions**: View details, center map, show neighbors

## Node Management

### Nodes Page

Access the Nodes page from the navigation bar to see a detailed list of all nodes.

**Features:**
- **Search**: Find nodes by name, ID, or hardware model
- **Filter**: Show only online nodes, specific hardware, or roles
- **Sort**: Order by name, last seen, battery level, or signal strength
- **Pagination**: Navigate through large node lists
- **Bulk Actions**: Export or manage multiple nodes at once

### Node Details Panel

Click any node to open the detailed information panel:

**Overview Tab:**
- Node identification (ID, hex ID, names)
- Hardware information (model, firmware version)
- Role (Client, Router, Repeater, Tracker)
- Current status and connection info

**Position Tab:**
- Current GPS coordinates
- Altitude and precision
- Position history with timeline
- Map showing position changes over time

**Telemetry Tab:**
- **Device Metrics**: Battery, voltage, channel utilization, air time
- **Environment Metrics**: Temperature, humidity, barometric pressure
- **Power Metrics**: Solar panel voltage and current
- **Charts**: Historical data visualization

**Messages Tab:**
- All messages sent from or to this node
- Message types (text, position, telemetry, etc.)
- Routing information and hop count
- Signal quality (RSSI/SNR) for each message

**Neighbors Tab:**
- List of directly connected nodes
- Signal strength to each neighbor
- Last heard time
- Visualize neighbor connections on map

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

**For Slow Connections:**
- Enable offline mode
- Reduce map tile quality
- Disable real-time animations
- Limit telemetry history

### Network Monitoring

**Daily Checks:**
- Review network statistics
- Check for offline nodes
- Monitor channel utilization
- Review message success rates

**Weekly Tasks:**
- Analyze coverage gaps
- Review top talkers
- Check battery levels
- Update firmware if needed

**Monthly Maintenance:**
- Generate coverage reports
- Export data for backup
- Review and optimize settings
- Plan network expansions

### Troubleshooting

**No Nodes Appearing:**
1. Check MQTT connection status
2. Verify topic pattern is correct
3. Ensure nodes are transmitting
4. Check firewall settings

**Slow Performance:**
1. Clear browser cache
2. Reduce number of displayed nodes
3. Disable unnecessary features
4. Check system resources

**Data Not Updating:**
1. Check MQTT connection
2. Verify network connectivity
3. Review error logs
4. Restart the application

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

**Navigation:**
- `M`: Go to Map view
- `N`: Go to Nodes page
- `I`: Go to Network Insights
- `S`: Open Settings
- `?`: Show keyboard shortcuts help

**Map Controls:**
- `+`: Zoom in
- `-`: Zoom out
- `H`: Reset to home view
- `F`: Toggle fullscreen
- `L`: Toggle layers menu

**General:**
- `/`: Focus search box
- `Esc`: Close dialogs/panels
- `Ctrl+E`: Export current view
- `Ctrl+R`: Refresh data

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
