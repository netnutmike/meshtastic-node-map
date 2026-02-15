# Requirements Document

## Introduction

The Meshtastic Node Mapper is a web-based application that visualizes Meshtastic mesh network nodes on an interactive map by consuming real-time data from MQTT brokers. The system provides comprehensive node monitoring, telemetry visualization, message tracking, and network analysis tools for Meshtastic mesh networks.

## Glossary

- **Meshtastic_Node_Mapper**: The complete web application system for visualizing Meshtastic networks
- **MQTT_Broker**: Message broker service (Mosquitto) that receives Meshtastic network data
- **Node**: A Meshtastic device in the mesh network with location and telemetry data
- **Telemetry_Data**: Environmental and device metrics from Meshtastic nodes (battery, temperature, etc.)
- **Position_Data**: Geographic coordinates (latitude, longitude, altitude) of Meshtastic nodes
- **Message_Data**: Text messages, routing information, and network packets from Meshtastic devices
- **Database_Service**: PostgreSQL database storing all Meshtastic network data
- **Web_Interface**: Frontend application providing map visualization and node management
- **Docker_Compose_Stack**: Complete containerized deployment including all services
- **Configuration_System**: YAML-based configuration management for all application settings

## Requirements

### Requirement 1

**User Story:** As a Meshtastic network administrator, I want to visualize all active nodes on an interactive map, so that I can monitor the geographic distribution and status of my mesh network.

#### Acceptance Criteria

1. WHEN the Meshtastic_Node_Mapper starts THEN the system SHALL display an interactive map using OpenStreetMap as the default tile source
2. WHEN nodes have valid position data THEN the system SHALL render each node as a colored dot on the map based on connection status
3. WHEN a node is connected to MQTT THEN the system SHALL display the node with a green dot
4. WHEN a node is disconnected from MQTT THEN the system SHALL display the node with a blue dot
5. WHEN a node is offline THEN the system SHALL display the node with a red dot

### Requirement 2

**User Story:** As a network operator, I want to see detailed information about each node when hovering over it, so that I can quickly assess node status and configuration.

#### Acceptance Criteria

1. WHEN a user hovers over a node dot THEN the system SHALL display a popup containing node image, name, short name, MQTT status, position precision, role, hardware, battery level, air utilization, altitude, ID, hex ID, last updated timestamp, and last position updated timestamp
2. WHEN the hover popup is displayed THEN the system SHALL provide a "Show Full Details" button for comprehensive node information
3. WHEN the hover popup is displayed THEN the system SHALL provide a "Show Neighbors That Heard Us" button for network topology visualization
4. WHEN the hover popup is displayed THEN the system SHALL provide a "Show Neighbors That We Heard" button for reverse network topology visualization
5. WHEN neighbor visualization is activated THEN the system SHALL draw directional arrows on the map between the selected node and its neighbors

### Requirement 3

**User Story:** As a network analyst, I want to access comprehensive node details in a dedicated panel, so that I can analyze historical data and detailed metrics for troubleshooting.

#### Acceptance Criteria

1. WHEN a user clicks "Show Full Details" THEN the system SHALL open a detailed panel containing all hover information plus additional sections
2. WHEN the details panel opens THEN the system SHALL provide buttons for "Sent Messages", "Received Messages", and "Gated Messages" with message history
3. WHEN the details panel opens THEN the system SHALL display a details section with ID, hex ID, role, hardware, and firmware information
4. WHEN the details panel opens THEN the system SHALL show a LoRa configuration section with region, modem preset, and default channel status
5. WHEN the details panel opens THEN the system SHALL provide a position section displaying latitude, longitude, and altitude coordinates

### Requirement 4

**User Story:** As a network monitor, I want to view historical telemetry data with configurable time ranges, so that I can analyze trends and identify issues over time.

#### Acceptance Criteria

1. WHEN the details panel displays device metrics THEN the system SHALL provide a selectable time range dropdown for historical data visualization
2. WHEN device metrics are shown THEN the system SHALL display historical graphs for battery level, channel utilization, and air utilization for transmit
3. WHEN device metrics are shown THEN the system SHALL display current real-time values for battery level, voltage, channel utilization, air utilization for transmit, and last update timestamp
4. WHEN environmental metrics are requested THEN the system SHALL display historical graphs for temperature, humidity, and barometric pressure with selectable date ranges
5. WHEN environmental metrics are shown THEN the system SHALL display current real-time values for temperature, relative humidity, and barometric pressure

### Requirement 5

**User Story:** As a system administrator, I want to monitor power metrics and recent network activity, so that I can track remote power systems and debug network issues.

#### Acceptance Criteria

1. WHEN the details panel opens THEN the system SHALL provide a power metrics section for monitoring remote power systems
2. WHEN the details panel opens THEN the system SHALL display the last 5 MQTT packets received for the selected node
3. WHEN the details panel opens THEN the system SHALL show the last 5 traceroute packets for network path analysis
4. WHEN the details panel opens THEN the system SHALL display timestamps for first seen, last seen, last neighbor list update, and last position update
5. WHEN the details panel opens THEN the system SHALL provide a copyable link for sharing the current node view with others

### Requirement 6

**User Story:** As a user, I want a clean and intuitive main interface with search capabilities, so that I can efficiently navigate and find specific nodes in the network.

#### Acceptance Criteria

1. WHEN the main page loads THEN the system SHALL display a configurable logo in the top left corner
2. WHEN the main page loads THEN the system SHALL show a configurable site name next to the logo
3. WHEN the main page loads THEN the system SHALL provide a search bar for finding specific nodes by name or identifier
4. WHEN the main page loads THEN the system SHALL display navigation icons for About, Devices, Settings, Tools, Custom Links, and Map Refresh
5. WHEN the search bar receives input THEN the system SHALL filter and highlight matching nodes on the map

### Requirement 7

**User Story:** As an administrator, I want configurable application settings that persist across sessions, so that I can customize the interface behavior for my specific use case.

#### Acceptance Criteria

1. WHEN the settings panel opens THEN the system SHALL provide configuration options for nodes max age, nodes disconnected age, nodes offline age, default zoom level, temperature format, and auto-update position in URL
2. WHEN settings are modified THEN the system SHALL save changes automatically to local browser storage
3. WHEN the user returns to the application THEN the system SHALL restore previously saved settings automatically
4. WHEN the reset button is clicked THEN the system SHALL restore all settings to their default configured values
5. WHEN "Show All" option is enabled THEN the system SHALL disable age-based node filtering and display all nodes regardless of last update time

### Requirement 8

**User Story:** As a network administrator, I want multiple map visualization options and overlays, so that I can analyze the network from different perspectives.

#### Acceptance Criteria

1. WHEN the map options panel opens THEN the system SHALL provide selectable map sources including OpenStreetMap, OpenTopoMap, Esri Satellite, Google Satellite, and Google Hybrid
2. WHEN the map options panel opens THEN the system SHALL provide node filtering options for All, Routers, Clustered, and None
3. WHEN the map options panel opens THEN the system SHALL provide overlay toggles for Legend, Neighbors, and Position History
4. WHEN the map options panel opens THEN the system SHALL provide view modes for Nodes, Node Types, and Bandwidth Utilization
5. WHEN different view modes are selected THEN the system SHALL update the map visualization to reflect the chosen perspective

### Requirement 9

**User Story:** As a system deployer, I want a containerized deployment solution with persistent configuration, so that I can easily install and maintain the application in any environment.

#### Acceptance Criteria

1. WHEN Docker Compose is executed THEN the system SHALL deploy PostgreSQL database, Mosquitto MQTT broker, and the web application as separate containers
2. WHEN the deployment starts THEN the system SHALL create external directories for configuration files and log storage
3. WHEN the system starts for the first time THEN the system SHALL generate default configuration files for all services automatically
4. WHEN the database container starts THEN the system SHALL create the required database schema automatically on first run
5. WHEN configuration files are modified THEN the system SHALL apply changes without requiring container rebuilds

### Requirement 10

**User Story:** As a developer, I want comprehensive documentation and a well-structured repository, so that I can understand, contribute to, and maintain the codebase effectively.

#### Acceptance Criteria

1. WHEN the repository is accessed THEN the system SHALL provide detailed user documentation, developer documentation, installation guide, and README in a documents directory
2. WHEN documentation is created THEN the system SHALL include an index file and reference links from the top-level README
3. WHEN the repository is initialized THEN the system SHALL include proper versioning, license (GPL v3), and automated dependency management via Renovate
4. WHEN the about page is accessed THEN the system SHALL display the current application version
5. WHEN the repository is set up THEN the system SHALL include all standard repository components including CI/CD configuration, issue templates, and contribution guidelines

### Requirement 11

**User Story:** As a network analyst, I want specialized monitoring and analysis tools, so that I can perform detailed network diagnostics and utilization analysis.

#### Acceptance Criteria

1. WHEN the tools menu is accessed THEN the system SHALL provide an MQTT monitor for real-time traffic observation
2. WHEN the tools menu is accessed THEN the system SHALL provide a detailed statistics report showing node counts, message breakdowns by topic and type, encryption status, node types, and packet routing statistics
3. WHEN the tools menu is accessed THEN the system SHALL provide a utilization report for network capacity analysis
4. WHEN utilization analysis is performed THEN the system SHALL optionally overlay color-coded dots on the map representing network utilization at specific locations
5. WHEN statistics are generated THEN the system SHALL distinguish between over-the-air packets and direct MQTT messages

### Requirement 12

**User Story:** As an administrator, I want to configure the application through YAML files and provide user information, so that I can customize the interface and provide important information without requiring user accounts.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL load all configuration from YAML files including branding, network settings, and feature toggles
2. WHEN the about page is accessed THEN the system SHALL display application information and a configurable custom content section from configuration files
3. WHEN custom links are configured in YAML THEN the system SHALL display a custom links icon in the navigation with hover descriptions and external link functionality
4. WHEN no custom links are configured THEN the system SHALL hide the custom links icon from the navigation
5. WHEN authentication is configured as optional THEN the system SHALL show login options in the interface, otherwise authentication features SHALL be hidden

### Requirement 13

**User Story:** As a system operator, I want automatic data collection and real-time updates, so that the map reflects current network conditions without manual intervention.

#### Acceptance Criteria

1. WHEN the MQTT_Broker receives Meshtastic messages THEN the system SHALL parse and store location data, telemetry data, and message data to the Database_Service
2. WHEN new data is stored THEN the system SHALL update the Web_Interface automatically within one minute by default
3. WHEN the refresh button is clicked THEN the system SHALL immediately redraw the map with the latest data from the database
4. WHEN nodes exceed the configured maximum age THEN the system SHALL hide them from the map unless "Show All" is enabled
5. WHEN parsing MQTT messages THEN the system SHALL handle all standard Meshtastic message types including position reports, telemetry, text messages, and routing information
6. WHEN binary protobuf messages are received THEN the system SHALL decode ServiceEnvelope messages using protobufjs with inline message definitions
7. WHEN JSON messages are received THEN the system SHALL parse them using the existing JSON parser for backward compatibility
8. WHEN NODEINFO_APP messages (portnum 4) are received THEN the system SHALL extract and store shortName, longName, hardwareModel, and role information
9. WHEN POSITION_APP messages (portnum 3) are received THEN the system SHALL decode latitude/longitude coordinates and store position data
10. WHEN TELEMETRY_APP messages (portnum 38) are received THEN the system SHALL decode device metrics, environment metrics, or power metrics and store telemetry readings

#### Implementation Status: ✅ COMPLETE

- Protobuf decoder service implemented using `protobufjs` library
- Automatic detection of protobuf vs JSON message format
- Support for NODEINFO_APP, POSITION_APP, TELEMETRY_APP, TEXT_MESSAGE_APP
- Successfully processing 50+ protobuf messages per minute from live MQTT stream
- Nodes are being created and tracked with real-time lastSeen updates
- Node details (names, hardware) will populate when NODEINFO messages are received from the network

### Requirement 14

**User Story:** As a user, I want responsive and attractive interface design, so that I can efficiently use the application across different devices and screen sizes.

#### Acceptance Criteria

1. WHEN the Web_Interface loads THEN the system SHALL use modern frontend frameworks and libraries for responsive design
2. WHEN the interface is displayed THEN the system SHALL provide intuitive navigation and visually appealing styling
3. WHEN the application is accessed on mobile devices THEN the system SHALL adapt the layout for touch interaction and smaller screens
4. WHEN interactive elements are used THEN the system SHALL provide appropriate visual feedback and loading indicators
5. WHEN the map is manipulated THEN the system SHALL provide smooth zoom and pan interactions with standard map controls

### Requirement 15

**User Story:** As a network administrator, I want to track and visualize message routing paths and network topology, so that I can understand how data flows through the mesh network.

#### Acceptance Criteria

1. WHEN a message is received via MQTT THEN the system SHALL store the complete routing path including all intermediate hops
2. WHEN viewing node details THEN the system SHALL display a network topology view showing direct neighbors and signal strength indicators
3. WHEN traceroute data is available THEN the system SHALL visualize the routing path on the map with directional arrows and hop indicators
4. WHEN analyzing network connectivity THEN the system SHALL provide a graph view of the mesh topology with nodes as vertices and connections as edges
5. WHEN signal strength data is available THEN the system SHALL color-code connection lines based on signal quality (RSSI/SNR values)

### Requirement 16

**User Story:** As a user, I want to filter and search nodes by various criteria, so that I can quickly find specific devices or types of devices in large networks.

#### Acceptance Criteria

1. WHEN using the search functionality THEN the system SHALL support filtering by node name, short name, ID, hex ID, hardware type, and firmware version
2. WHEN applying filters THEN the system SHALL provide dropdown menus for hardware types, roles, and firmware versions
3. WHEN filtering by geographic area THEN the system SHALL allow drawing a bounding box or circle on the map to limit results
4. WHEN filtering by time THEN the system SHALL support date range selection for last seen, last heard, and last position update
5. WHEN multiple filters are applied THEN the system SHALL combine them with logical AND operations and show the count of matching nodes

### Requirement 17

**User Story:** As a network operator, I want to monitor channel usage and frequency analysis, so that I can optimize network performance and identify interference.

#### Acceptance Criteria

1. WHEN channel utilization data is received THEN the system SHALL track and display per-channel usage statistics over time
2. WHEN displaying channel information THEN the system SHALL show frequency, bandwidth, spreading factor, and coding rate for each channel
3. WHEN analyzing network performance THEN the system SHALL provide charts showing message success rates, retry counts, and average hop counts
4. WHEN interference is detected THEN the system SHALL highlight channels with high error rates or unusual activity patterns
5. WHEN comparing channels THEN the system SHALL display side-by-side utilization graphs for multiple channels simultaneously

### Requirement 18

**User Story:** As a system administrator, I want comprehensive logging and audit trails, so that I can troubleshoot issues and maintain security compliance.

#### Acceptance Criteria

1. WHEN any system event occurs THEN the system SHALL log the event with timestamp, source, and detailed information to structured log files
2. WHEN MQTT messages are processed THEN the system SHALL log message parsing results, errors, and data validation outcomes
3. WHEN user actions are performed THEN the system SHALL create audit log entries for configuration changes, data exports, and administrative functions
4. WHEN errors occur THEN the system SHALL log stack traces, context information, and recovery actions to dedicated error log files
5. WHEN log rotation is needed THEN the system SHALL automatically archive old logs and maintain configurable retention periods

### Requirement 19

**User Story:** As a data analyst, I want to export network data and generate reports, so that I can perform offline analysis and create documentation.

#### Acceptance Criteria

1. WHEN exporting node data THEN the system SHALL support CSV, JSON, and KML formats with selectable fields and date ranges
2. WHEN generating reports THEN the system SHALL create PDF summaries including network statistics, node inventories, and coverage maps
3. WHEN exporting message data THEN the system SHALL provide filtered exports by node, message type, date range, and content criteria
4. WHEN creating backups THEN the system SHALL export complete database snapshots in standard SQL format
5. WHEN sharing data THEN the system SHALL generate public URLs for specific map views with embedded filters and time ranges

### Requirement 20

**User Story:** As a mobile user, I want location-aware features and offline capabilities, so that I can use the application effectively in field conditions.

#### Acceptance Criteria

1. WHEN accessing the application on mobile devices THEN the system SHALL request location permissions and center the map on the user's current position
2. WHEN the user moves THEN the system SHALL optionally track and display the user's location on the map with a distinct marker
3. WHEN network connectivity is limited THEN the system SHALL cache map tiles and essential node data for offline viewing
4. WHEN in offline mode THEN the system SHALL queue user actions and synchronize when connectivity is restored
5. WHEN GPS is available THEN the system SHALL calculate and display distances from the user's location to visible nodes

### Requirement 21

**User Story:** As a security-conscious administrator, I want optional authentication and access control features, so that I can protect sensitive network information and control user permissions when needed, while keeping core functionality publicly accessible.

#### Acceptance Criteria

1. WHEN authentication is disabled THEN the system SHALL provide full access to map visualization, node information, statistics, and monitoring tools without requiring login
2. WHEN authentication is enabled via configuration THEN the system SHALL support configurable login methods including local accounts, LDAP, and OAuth providers
3. WHEN users are authenticated THEN the system SHALL enforce role-based permissions for administrative functions, configuration changes, and sensitive operations
4. WHEN authentication is disabled THEN the system SHALL use configuration files for all permanent settings and network configuration
5. WHEN API access is requested THEN the system SHALL support optional API key authentication with configurable rate limiting based on configuration settings

### Requirement 22

**User Story:** As a network planner, I want coverage analysis and simulation tools, so that I can optimize node placement and predict network performance.

#### Acceptance Criteria

1. WHEN analyzing coverage THEN the system SHALL calculate and display estimated radio range circles for each node based on hardware specifications and terrain
2. WHEN planning deployments THEN the system SHALL allow placing hypothetical nodes on the map and simulate their impact on network connectivity
3. WHEN evaluating terrain THEN the system SHALL integrate elevation data to model line-of-sight and signal propagation effects
4. WHEN optimizing placement THEN the system SHALL identify coverage gaps and suggest optimal locations for new nodes
5. WHEN modeling performance THEN the system SHALL estimate message delivery success rates and latency for different network configurations

### Requirement 23

**User Story:** As a network administrator, I want detailed node hardware and firmware tracking, so that I can maintain inventory and ensure network compatibility.

#### Acceptance Criteria

1. WHEN node information is received THEN the system SHALL track and display detailed hardware specifications including board type, frequency band, and antenna configuration
2. WHEN firmware data is available THEN the system SHALL monitor firmware versions across all nodes and highlight outdated or incompatible versions
3. WHEN displaying hardware inventory THEN the system SHALL provide sortable tables showing device counts by manufacturer, model, and firmware version
4. WHEN compatibility issues exist THEN the system SHALL warn about potential interoperability problems between different hardware or firmware combinations
5. WHEN generating hardware reports THEN the system SHALL create summaries of network composition including age distribution and upgrade recommendations

### Requirement 24

**User Story:** As a field technician, I want real-time signal quality monitoring and path analysis, so that I can optimize antenna placement and troubleshoot connectivity issues.

#### Acceptance Criteria

1. WHEN signal data is received THEN the system SHALL display real-time RSSI, SNR, and packet loss statistics for each node connection
2. WHEN analyzing signal paths THEN the system SHALL show signal strength heatmaps overlaid on the map with color-coded coverage areas
3. WHEN troubleshooting connectivity THEN the system SHALL provide link quality analysis showing the best and worst performing connections
4. WHEN monitoring performance THEN the system SHALL track and alert on degrading signal conditions or increasing error rates
5. WHEN optimizing placement THEN the system SHALL suggest antenna adjustments based on signal propagation patterns and terrain analysis

### Requirement 25

**User Story:** As a system operator, I want automated alerting and notification capabilities, so that I can respond quickly to network issues and critical events.

#### Acceptance Criteria

1. WHEN critical events occur THEN the system SHALL support configurable alerts via email, webhook, and in-application notifications
2. WHEN nodes go offline THEN the system SHALL trigger alerts based on configurable thresholds for offline duration and criticality
3. WHEN network performance degrades THEN the system SHALL detect and alert on unusual patterns in message delivery, routing failures, or channel utilization
4. WHEN environmental conditions exceed limits THEN the system SHALL alert on temperature, humidity, or power thresholds configured per node
5. WHEN security events are detected THEN the system SHALL immediately notify administrators of authentication failures, unauthorized access attempts, or suspicious activity

### Requirement 26

**User Story:** As a data scientist, I want advanced analytics and machine learning capabilities, so that I can predict network behavior and optimize performance proactively.

#### Acceptance Criteria

1. WHEN analyzing historical data THEN the system SHALL identify patterns in node behavior, message routing, and network utilization
2. WHEN predicting failures THEN the system SHALL use machine learning models to forecast node failures based on telemetry trends
3. WHEN optimizing routing THEN the system SHALL analyze message paths and suggest routing improvements based on historical performance
4. WHEN detecting anomalies THEN the system SHALL identify unusual network behavior that may indicate hardware issues or security threats
5. WHEN forecasting capacity THEN the system SHALL predict future network load and recommend scaling strategies based on growth trends

### Requirement 27

**User Story:** As a multi-site administrator, I want support for multiple MQTT brokers and network segmentation, so that I can manage geographically distributed or logically separated networks.

#### Acceptance Criteria

1. WHEN configuring multiple networks THEN the system SHALL support connections to multiple MQTT brokers simultaneously with separate authentication credentials
2. WHEN displaying multi-network data THEN the system SHALL provide network selection filters and visual indicators to distinguish between different mesh networks
3. WHEN managing permissions THEN the system SHALL enforce access controls per network segment with user-specific visibility rules
4. WHEN aggregating data THEN the system SHALL provide cross-network analytics while maintaining logical separation of sensitive information
5. WHEN synchronizing networks THEN the system SHALL support data federation and replication between geographically distributed instances

### Requirement 28

**User Story:** As an API consumer, I want comprehensive REST and WebSocket APIs, so that I can integrate the system with external tools and build custom applications.

#### Acceptance Criteria

1. WHEN accessing node data THEN the system SHALL provide RESTful APIs for querying nodes, messages, telemetry, and network topology with standard HTTP methods
2. WHEN requiring real-time updates THEN the system SHALL offer WebSocket connections for live data streaming with configurable subscription filters
3. WHEN integrating with external systems THEN the system SHALL support webhook notifications for events, alerts, and data changes
4. WHEN documenting APIs THEN the system SHALL provide OpenAPI/Swagger documentation with interactive testing capabilities
5. WHEN managing API access THEN the system SHALL implement rate limiting, authentication tokens, and usage analytics for all API endpoints

### Requirement 29

**User Story:** As a compliance officer, I want data retention and privacy controls, so that I can meet regulatory requirements and protect user privacy.

#### Acceptance Criteria

1. WHEN configuring data retention THEN the system SHALL support automatic purging of historical data based on configurable age and type policies
2. WHEN handling personal data THEN the system SHALL provide data anonymization options for location and message content based on privacy settings
3. WHEN exporting data THEN the system SHALL include privacy controls that redact or exclude sensitive information based on configuration settings
4. WHEN auditing access THEN the system SHALL maintain detailed logs of system access and data operations for compliance reporting
5. WHEN processing deletion requests THEN the system SHALL support complete data removal for specific nodes in compliance with privacy regulations

### Requirement 30

**User Story:** As a system administrator, I want the application to operate primarily through configuration files, so that I can deploy and manage the system without requiring user account management.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL load all operational settings from YAML configuration files including MQTT brokers, database settings, and feature flags
2. WHEN authentication is disabled in configuration THEN the system SHALL provide full functionality without any login requirements or user management
3. WHEN network settings are configured THEN the system SHALL connect to specified MQTT brokers and databases based on configuration files rather than user input
4. WHEN branding is configured THEN the system SHALL display custom logos, site names, and styling based on configuration files
5. WHEN authentication is enabled in configuration THEN the system SHALL provide optional enhanced features for authenticated users while maintaining public access to core functionality


### Requirement 31

**User Story:** As a user, I want a dedicated nodes list page, so that I can view and search all network nodes in a tabular format with detailed information.

#### Acceptance Criteria

1. WHEN accessing the nodes page THEN the system SHALL display a comprehensive table listing all nodes with columns for ID, Short Name, Long Name, Hardware Type, Firmware Version, Role, Altitude, Latitude, Longitude, Neighbor Count, Battery Percentage, Voltage, Airtime Utilization, Last Seen, and Owner
2. WHEN viewing the nodes table THEN the system SHALL provide a search field that filters nodes by Short Name, Long Name, or Node ID in real-time
3. WHEN using the active filter THEN the system SHALL provide a toggle switch to show only active nodes or all nodes in the network
4. WHEN clicking on a node row THEN the system SHALL open the detailed node information panel identical to clicking a node marker on the map
5. WHEN the nodes table is displayed THEN the system SHALL support sorting by any column to help users organize and analyze node data
6. WHEN node data updates THEN the system SHALL refresh the table in real-time to reflect current node status and telemetry
7. WHEN the table contains many nodes THEN the system SHALL provide pagination or virtual scrolling for performance with large networks
8. WHEN viewing the Actions column for a node THEN the system SHALL display a "View Details" icon button that opens the node details panel
9. WHEN viewing the Actions column for a node with valid position data THEN the system SHALL display a "Center Map" icon button that navigates to the map page and centers the map on that node's location
10. WHEN clicking the "Center Map" button THEN the system SHALL navigate to the map page, center the map view on the selected node's coordinates, and optionally highlight or open the popup for that node

### Requirement 32

**User Story:** As a network analyst, I want a comprehensive Network Insights dashboard with multiple analytical views, so that I can monitor messages, analyze network topology, view statistics, and identify top talkers in one centralized location.

#### Acceptance Criteria

1. WHEN accessing the Network Insights page THEN the system SHALL display a tabbed interface with four distinct tabs: Messages, Network Graph, Statistics, and Top Talkers
2. WHEN viewing the Messages tab THEN the system SHALL display a chronological list of all chat messages received from the network with sender name, message content, timestamp, and MQTT topic
3. WHEN viewing the Network Graph tab THEN the system SHALL display a table listing all nodes with their neighbor relationships including columns for Node Short Name, Node Long Name, Neighbors This Node Heard (with RSSI/SNR), Nodes That Heard This Node (with RSSI/SNR), and Last Update Timestamp
4. WHEN viewing the Statistics tab THEN the system SHALL display a message count by topic bar chart showing the distribution of messages across different MQTT topics
5. WHEN viewing the Statistics tab THEN the system SHALL display a message type distribution pie chart showing the breakdown of message types (chat, telemetry, position, nodeinfo, routing, etc.) for all messages
6. WHEN viewing the Statistics tab THEN the system SHALL display a message type by topic pie chart showing message type distribution filtered by selected MQTT topic
7. WHEN viewing the Statistics tab THEN the system SHALL display a hardware types distribution pie chart showing the breakdown of node hardware models across all messages
8. WHEN viewing the Statistics tab THEN the system SHALL display a hardware types by topic pie chart showing hardware distribution filtered by selected MQTT topic
9. WHEN viewing the Statistics tab THEN the system SHALL display a nodes by role pie chart showing the distribution of node roles (router, client, repeater, etc.) in the network
10. WHEN viewing the Statistics tab THEN the system SHALL display a message activity timeline chart showing message volume over time with configurable time ranges (24h, 7d, 30d)
11. WHEN viewing the Statistics tab THEN the system SHALL display a network health score gauge showing overall network performance based on node connectivity, message success rate, and average signal strength
12. WHEN viewing the Top Talkers tab THEN the system SHALL display a ranked list of the most active nodes showing Node Name, Message Count, Last Active Time, and Activity Percentage
13. WHEN viewing the Top Talkers tab THEN the system SHALL provide filtering options to view top talkers by time range (last hour, last day, last week, all time)
14. WHEN viewing the Top Talkers tab THEN the system SHALL display a bar chart visualization of the top 10 most active nodes with message counts
15. WHEN the Network Insights page is accessed THEN the system SHALL provide a navigation icon in the top menu bar using the Dashboard icon positioned before the About icon

### Requirement 33

**User Story:** As a network administrator, I want the system to decrypt encrypted Meshtastic messages using channel-specific encryption keys, so that I can monitor and visualize data from encrypted mesh network channels.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL load channel encryption keys from the `config/app.yml` configuration file under the `encryption.channels` section
2. WHEN loading encryption keys THEN the system SHALL support base64-encoded keys of any length from 1 to 32 bytes
3. WHEN a key is shorter than 32 bytes THEN the system SHALL automatically pad the key with zeros to reach 32 bytes for AES-256-CTR encryption
4. WHEN an encrypted protobuf message is received via MQTT THEN the system SHALL extract the channel name from the MQTT topic path (format: `msh/<region>/<area>/<hop>/e/<channel_name>/<node_id>`)
5. WHEN processing an encrypted message THEN the system SHALL match the extracted channel name to the configured channel keys using case-insensitive comparison
6. WHEN a channel name matches a configured key THEN the system SHALL attempt to decrypt the message payload using AES-256-CTR with the corresponding key
7. WHEN decrypting a message THEN the system SHALL construct a 16-byte nonce using the packet ID (4 bytes little-endian), block counter starting at 0 (4 bytes little-endian), and 8 bytes of zeros
8. WHEN decryption succeeds THEN the system SHALL parse the decrypted payload as a protobuf Data message and continue normal message processing
9. WHEN decryption fails or protobuf parsing fails THEN the system SHALL skip the message and NOT create or update any database records for that packet
10. WHEN a message is received from a channel without a configured encryption key THEN the system SHALL skip the message and log that no key is configured for that channel
11. WHEN multiple channels are configured THEN the system SHALL support simultaneous decryption of messages from different channels using their respective keys
12. WHEN a channel is marked with `default: true` THEN the system SHALL use that key as the fallback when no channel-specific key is found
13. WHEN encryption keys are updated in the configuration file THEN the system SHALL reload the keys after a backend service restart
14. WHEN troubleshooting encryption THEN the system SHALL log detailed information including channel names, decryption attempts, success/failure status, and payload sizes
15. WHEN all encryption is working correctly THEN the system SHALL process encrypted messages identically to unencrypted messages, creating node records, position data, telemetry data, and message records as appropriate

#### Implementation Notes

- **Encryption Algorithm**: AES-256-CTR (Counter mode)
- **Key Format**: Base64-encoded in configuration, decoded to binary for use
- **Key Padding**: Keys shorter than 32 bytes are right-padded with zeros
- **Nonce Construction**: `[packet_id (4B LE)] + [counter (4B LE)] + [zeros (8B)]`
- **Channel Matching**: Case-insensitive channel name matching between MQTT topic and configuration
- **Error Handling**: Failed decryptions do not create database records to prevent invalid data
- **Configuration Location**: `config/app.yml` under `encryption.channels` array
- **Service Location**: `backend/src/services/encryption.service.ts`
- **Integration Point**: `backend/src/services/protobuf-decoder.service.ts`

#### Configuration Example

```yaml
encryption:
  channels:
    - name: "LongFast"
      key: "AQ=="  # 1-byte key, will be padded to 32 bytes
      default: true
    - name: "Primary"
      key: "1PG7OiApB3XvvX7g8kYzDYQD+CW+3Oi+Qs/LoIWh/gg="  # Full 32-byte key
    - name: "CustomChannel"
      key: "YourBase64KeyHere=="
```

#### User Instructions for Obtaining Encryption Keys

Users must obtain the actual encryption keys from their Meshtastic devices using one of these methods:

1. **Meshtastic CLI**: Run `meshtastic --export-config` and extract PSK values from the output
2. **Meshtastic Mobile App**: Navigate to Settings → Channels → [Channel Name] → View encryption key
3. **Meshtastic Web Interface**: Connect device via USB at https://client.meshtastic.org/ and view channel configuration
4. **Device Configuration Files**: Extract keys from `channels.json` or similar device configuration files

#### Implementation Status

**Status**: 🟡 Infrastructure Complete, User Configuration Required

**What's Working**:
- ✅ Encryption service loads and initializes successfully
- ✅ Keys are loaded from `config/app.yml` and padded correctly
- ✅ Channel name extraction from MQTT topics
- ✅ Channel filtering (only processes configured channels)
- ✅ Decryption process executes successfully
- ✅ Packet ID handling with unsigned 32-bit integers
- ✅ Failed decryptions are properly skipped without creating database records

**What Requires User Action**:
- ⚠️ Users must update `config/app.yml` with their actual device encryption keys
- ⚠️ Default keys in configuration are examples and will not decrypt real network traffic
- ⚠️ Each Meshtastic network uses unique keys that must be obtained from the devices

**Testing Verification**:
- Decryption infrastructure confirmed working via log analysis
- Channel filtering confirmed working (unconfigured channels properly skipped)
- Protobuf parsing failures indicate wrong keys, not broken decryption logic
- System correctly handles both encrypted and unencrypted messages


---

## Malla-Inspired Feature Requirements

The following requirements are based on analysis of the Malla project (https://github.com/zenitraM/malla), a Python/Flask-based Meshtastic network analyzer with excellent analytics and visualization capabilities. These features will enhance the Meshtastic Node Mapper with advanced network analysis, improved visualization, and better user experience.

**Reference Documentation:**
- `docs/MALLA_NETWORK_MAP_IMPLEMENTATION.md` - Network map implementation details
- `docs/FEATURE_ROADMAP_MALLA_INSPIRED.md` - Complete feature roadmap with priorities
- `docs/MALLA_DASHBOARD_AND_FEATURES_ANALYSIS.md` - Dashboard statistics and charts
- `docs/UI_UX_BEST_PRACTICES.md` - Theme support and mobile responsiveness

### Requirement 34

**User Story:** As a network administrator, I want to visualize actual RF links between nodes based on real packet data, so that I can understand true network connectivity without relying on NEIGHBORINFO messages.

#### Acceptance Criteria

1. WHEN traceroute packets (TRACEROUTE_APP, portnum 41) are received THEN the system SHALL extract consecutive node pairs from the route_nodes array as direct RF hops
2. WHEN processing traceroute data THEN the system SHALL track packet_count, avg_snr, avg_rssi, and last_seen timestamp for each RF hop
3. WHEN any packet is received with hop_start equal to hop_limit THEN the system SHALL identify this as a direct RF reception (0-hop packet) and create a packet link between sender and gateway
4. WHEN displaying the network map THEN the system SHALL draw solid lines for traceroute links and dashed lines for packet links
5. WHEN displaying RF links THEN the system SHALL color-code links based on success rate: green (≥80%), yellow (50-79%), red (<50%)
6. WHEN a user clicks on an RF link THEN the system SHALL display a popup showing success_rate, total_attempts, avg_snr, avg_rssi, last_seen, and link_type
7. WHEN the map is displayed THEN the system SHALL provide toggle controls to show/hide traceroute links and packet links independently
8. WHEN a node is selected THEN the system SHALL provide a hop depth filter to show only nodes within N hops (1, 2, 3, or all)
9. WHEN calculating hop depth THEN the system SHALL use breadth-first search (BFS) to compute nodes within the specified hop distance
10. WHEN processing traceroute packets THEN the system SHALL limit queries to the most recent 2000 packets for performance
11. WHEN querying for packet links THEN the system SHALL use the condition `hop_start = hop_limit` to identify direct receptions
12. WHEN aggregating link data THEN the system SHALL merge bidirectional links (A↔B treated as same link) to reduce data volume
13. WHEN calculating success rate THEN the system SHALL use the formula `min(100, max(10, packet_count * 10))` to scale packet count to percentage
14. WHEN the system starts THEN the system SHALL create database indexes on `(portnum, timestamp)` for traceroute queries and `(from_node_id, gateway_id, timestamp)` for packet link queries
15. WHEN link data is requested THEN the system SHALL cache results for 5 minutes to improve performance

**Implementation Notes:**
- Backend service: `backend/src/services/traceroute-link.service.ts`
- Backend service: `backend/src/services/packet-link.service.ts`
- API endpoint: `GET /api/map/links?hours=24`
- Frontend component: Update `frontend/src/components/Map/NetworkMap.tsx`
- Database: Add computed column `hop_count` as `(hop_start - hop_limit)`
- Default time window: 24 hours, maximum 14 days

### Requirement 35

**User Story:** As a user, I want to switch between light, dark, and auto themes, so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL check localStorage for saved theme preference (light, dark, or auto)
2. WHEN no theme preference is saved THEN the system SHALL default to 'auto' mode and detect system preference using `prefers-color-scheme` media query
3. WHEN the theme toggle button is clicked THEN the system SHALL cycle through themes in order: light → dark → auto → light
4. WHEN a theme is selected THEN the system SHALL save the preference to localStorage with key 'malla-theme-preference'
5. WHEN applying a theme THEN the system SHALL set the `data-bs-theme` attribute on the document root element to 'light' or 'dark'
6. WHEN in auto mode THEN the system SHALL resolve to light or dark based on system preference and update when system preference changes
7. WHEN the theme changes THEN the system SHALL dispatch a custom 'themeChanged' event with detail containing preference and effective theme
8. WHEN Chart.js charts are displayed THEN the system SHALL update chart colors to match the current theme
9. WHEN the Leaflet map is displayed THEN the system SHALL switch between light and dark tile layers based on the current theme
10. WHEN the theme changes THEN the system SHALL update the meta theme-color tag for mobile browsers (dark: #212529, light: #0d6efd)
11. WHEN components need theme-aware styling THEN the system SHALL use CSS custom properties from Bootstrap 5.3's theme system
12. WHEN the theme toggle is displayed THEN the system SHALL show an icon indicating the current mode (sun for light, moon for dark, circle-half for auto)

**Implementation Notes:**
- Frontend class: `frontend/src/utils/DarkModeToggle.ts`
- CSS variables: Use Bootstrap 5.3 `--bs-*` custom properties
- Map tiles: Light (CartoDB Positron), Dark (CartoDB Dark Matter)
- Chart colors: Compute from CSS custom properties on theme change
- Event listener: Components listen for 'themeChanged' event to update

### Requirement 36

**User Story:** As a mobile user, I want the application to be fully responsive with touch-friendly controls, so that I can effectively use it on smartphones and tablets.

#### Acceptance Criteria

1. WHEN the application is accessed on mobile devices THEN the system SHALL use responsive breakpoints: xs (<576px), sm (≥576px), md (≥768px), lg (≥992px), xl (≥1200px)
2. WHEN displaying action buttons THEN the system SHALL use icon-only buttons with tooltips instead of text labels to save horizontal space
3. WHEN action buttons are displayed THEN the system SHALL ensure minimum touch target size of 44x44 pixels for accessibility
4. WHEN the sidebar is displayed on desktop THEN the system SHALL position it fixed on the right side of the screen
5. WHEN the sidebar is displayed on mobile THEN the system SHALL position it as a bottom sheet that slides up from the bottom
6. WHEN the sidebar toggle is clicked on desktop THEN the system SHALL slide the sidebar horizontally (translateX)
7. WHEN the sidebar toggle is clicked on mobile THEN the system SHALL slide the sidebar vertically (translateY)
8. WHEN tables are displayed on mobile THEN the system SHALL hide less important columns using `.hide-mobile` class
9. WHEN form inputs are displayed on mobile THEN the system SHALL use minimum font-size of 16px to prevent iOS zoom
10. WHEN the viewport width is less than 768px THEN the system SHALL reduce table font size to 0.8rem and padding to 0.4rem 0.3rem
11. WHEN displaying the nodes list actions column THEN the system SHALL use icon buttons in a button group to fit without horizontal scrolling
12. WHEN more than 3-4 actions are needed THEN the system SHALL use a dropdown menu with three-dots icon to conserve space
13. WHEN the application is accessed on mobile THEN the system SHALL scale base font size from 0.9rem (mobile) to 1.05rem (desktop)
14. WHEN touch interactions are used THEN the system SHALL provide appropriate visual feedback and prevent accidental double-taps
15. WHEN the map is displayed on mobile THEN the system SHALL optimize controls for touch interaction with larger tap targets

**Implementation Notes:**
- CSS file: `frontend/src/styles/mobile.css`
- Responsive utilities: Use Bootstrap 5 responsive classes
- Icon library: Bootstrap Icons for consistent icon-only buttons
- Touch targets: Minimum 44x44px per Apple Human Interface Guidelines
- Sidebar component: Conditional rendering based on viewport width

### Requirement 37

**User Story:** As a network analyst, I want comprehensive dashboard statistics with multiple charts, so that I can monitor network health and activity patterns at a glance.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the system SHALL display 6 metric cards: Total Nodes, Active Nodes (24h), Gateway Diversity, Protocol Diversity, Total Messages, and Processing Success Rate
2. WHEN displaying Active Nodes THEN the system SHALL show the count and percentage of total nodes (network coverage)
3. WHEN displaying Gateway Diversity THEN the system SHALL show the count of unique gateways with color-coded indicator (blue)
4. WHEN displaying Protocol Diversity THEN the system SHALL show the count of distinct message types with color-coded indicator (info blue)
5. WHEN displaying Processing Success Rate THEN the system SHALL color-code based on thresholds: green (≥95%), yellow (85-94%), red (<85%)
6. WHEN the dashboard loads THEN the system SHALL display a Network Activity Trends line chart showing messages per hour over 7 days
7. WHEN the dashboard loads THEN the system SHALL display a Node Activity Distribution doughnut chart with categories: Very Active (>100 msgs), Moderately Active (10-100), Lightly Active (1-10), Inactive (0)
8. WHEN the dashboard loads THEN the system SHALL display a Gateway Activity Distribution bar chart showing top 10 gateways by packet count
9. WHEN the dashboard loads THEN the system SHALL display a Signal Quality Distribution bar chart with categories: Excellent (>-70dBm), Good (-70 to -80), Fair (-80 to -90), Poor (<-90)
10. WHEN the dashboard loads THEN the system SHALL display a Message Routing Patterns doughnut chart showing Direct (0 hops), Routed (1-2 hops), Multi-hop (3+)
11. WHEN the dashboard loads THEN the system SHALL display a Protocol Usage pie chart showing message count per protocol type for last 24 hours
12. WHEN the dashboard loads THEN the system SHALL display a Most Active Nodes table showing top 10 nodes with message counts and signal quality
13. WHEN dashboard data is requested THEN the system SHALL use a single optimized SQL query to fetch all statistics
14. WHEN dashboard data is fetched THEN the system SHALL cache results for 60 seconds to improve performance
15. WHEN charts are displayed THEN the system SHALL update colors automatically when theme changes from light to dark or vice versa

**Implementation Notes:**
- API endpoint: `GET /api/analytics/dashboard`
- Chart library: Chart.js with theme-aware color configuration
- Caching: Redis cache with 60-second TTL
- SQL optimization: Single query with aggregations and CASE statements
- Frontend component: `frontend/src/components/Analytics/Dashboard.tsx`

### Requirement 38

**User Story:** As a network operator, I want advanced packet filtering and grouping capabilities, so that I can analyze message patterns and identify duplicate receptions.

#### Acceptance Criteria

1. WHEN viewing the packets page THEN the system SHALL provide a "Group by Packet ID" toggle to enable/disable packet grouping
2. WHEN packet grouping is enabled THEN the system SHALL group packets by (mesh_packet_id, from_node_id, to_node_id, portnum, portnum_name)
3. WHEN displaying grouped packets THEN the system SHALL show aggregated statistics: gateway count, gateway list, RSSI range (min-max), SNR range (min-max), hop count range, reception count
4. WHEN displaying grouped packets THEN the system SHALL show relay node counts in format "0x12, 0x34*2, 0x56*3" where *N indicates N occurrences
5. WHEN filtering packets THEN the system SHALL provide time range filters with start_time and end_time datetime inputs
6. WHEN filtering packets THEN the system SHALL provide node filters: From Node, To Node, Exclude From Node, Exclude To Node with searchable pickers
7. WHEN filtering packets THEN the system SHALL provide a Gateway filter with searchable picker showing gateway names
8. WHEN filtering packets THEN the system SHALL provide a Port Number filter dropdown with all protocol types
9. WHEN filtering packets THEN the system SHALL provide a Hop Count filter with options: Any, Direct (0), 1 hop, 2 hops, 3 hops, 4+ hops
10. WHEN filtering packets THEN the system SHALL provide RSSI/SNR range filters with min/max number inputs
11. WHEN filtering packets THEN the system SHALL provide a Primary Channel filter dropdown
12. WHEN filtering packets THEN the system SHALL provide an "Exclude gateway self messages" checkbox
13. WHEN TEXT_MESSAGE_APP packets are displayed THEN the system SHALL decode and display the message content
14. WHEN filter state changes THEN the system SHALL update the URL parameters to enable shareable links
15. WHEN the packets page loads with URL parameters THEN the system SHALL restore filter state from URL

**Implementation Notes:**
- Frontend component: `frontend/src/components/Packets/PacketBrowser.tsx`
- Backend endpoint: `GET /api/packets?grouped=true&start_time=...&end_time=...`
- URL state management: Use URLSearchParams and history.replaceState()
- Performance: Limit to 5k-25k raw packets, group in-memory
- Pagination: Use estimated pagination for grouped queries

### Requirement 39

**User Story:** As a network planner, I want to calculate and display distances between nodes, so that I can analyze RF link performance and identify longest successful connections.

#### Acceptance Criteria

1. WHEN two nodes have valid position data THEN the system SHALL calculate the distance between them using the Haversine formula
2. WHEN calculating distance THEN the system SHALL use Earth's radius of 6371.0 km for the Haversine formula
3. WHEN displaying neighbor relationships THEN the system SHALL show the calculated distance in kilometers for each neighbor link
4. WHEN the longest links page is accessed THEN the system SHALL display a table of longest successful RF links with minimum distance threshold (default 1km)
5. WHEN displaying longest links THEN the system SHALL show: from_node, to_node, distance_km, avg_snr, avg_rssi, hop_count, traceroute_count, last_seen
6. WHEN calculating longest links THEN the system SHALL filter by minimum SNR threshold (default -20dB) to exclude poor quality links
7. WHEN calculating distances THEN the system SHALL use location data from the timestamp closest to the packet reception time
8. WHEN location data is stale THEN the system SHALL display an "age warning" if position data is older than a configurable threshold
9. WHEN calculating distances for traceroute hops THEN the system SHALL pre-fetch location history for all nodes to optimize performance
10. WHEN displaying RF links on the map THEN the system SHALL optionally show distance labels on link lines
11. WHEN analyzing multi-hop paths THEN the system SHALL calculate total path distance by summing individual hop distances
12. WHEN the line-of-sight tool is used THEN the system SHALL calculate and display straight-line distance between selected nodes
13. WHEN distance calculations are performed THEN the system SHALL cache location history data to avoid repeated database queries
14. WHEN displaying distance information THEN the system SHALL format distances with appropriate precision (e.g., "12.34 km" or "0.5 km")
15. WHEN comparing link performance THEN the system SHALL provide distance vs signal quality scatter plots

**Implementation Notes:**
- Service: `backend/src/services/distance-calculation.service.ts`
- Haversine formula: Standard geographic distance calculation
- Location history: Cache in-memory with Map<node_id, Position[]>
- API endpoint: `GET /api/links/longest?min_distance=1&min_snr=-20`
- Frontend component: `frontend/src/components/Analytics/LongestLinks.tsx`

### Requirement 40

**User Story:** As a network administrator, I want a line-of-sight analysis tool, so that I can evaluate RF connectivity potential between any two nodes.

#### Acceptance Criteria

1. WHEN the line-of-sight page is accessed THEN the system SHALL provide two searchable node picker dropdowns for selecting nodes
2. WHEN two nodes are selected THEN the system SHALL calculate and display the straight-line distance between them using Haversine formula
3. WHEN two nodes are selected THEN the system SHALL draw a line on the map connecting the two nodes
4. WHEN two nodes are selected THEN the system SHALL query historical packet data to determine if the nodes have communicated directly
5. WHEN historical connectivity exists THEN the system SHALL display signal quality statistics (avg RSSI, avg SNR) from packet history
6. WHEN historical connectivity exists THEN the system SHALL show the number of successful communications and last communication timestamp
7. WHEN elevation data is available THEN the system SHALL display an elevation profile chart showing terrain between the nodes
8. WHEN the line-of-sight tool is accessed with URL parameters `?from=X&to=Y` THEN the system SHALL pre-load the analysis for those nodes
9. WHEN viewing a link popup on the map THEN the system SHALL provide a "Line of Sight" button that opens the analysis tool with those nodes pre-selected
10. WHEN calculating line-of-sight THEN the system SHALL compute bearing/azimuth between the nodes for antenna alignment
11. WHEN elevation data is available THEN the system SHALL calculate first Fresnel zone clearance
12. WHEN terrain obstructions are detected THEN the system SHALL highlight potential obstacles in the elevation profile
13. WHEN no historical connectivity exists THEN the system SHALL display a message indicating nodes have not communicated directly
14. WHEN the analysis is complete THEN the system SHALL provide a shareable URL with the selected nodes in parameters
15. WHEN the line-of-sight tool is used THEN the system SHALL be accessible from the tools dropdown menu

**Implementation Notes:**
- Frontend component: `frontend/src/components/Tools/LineOfSight.tsx`
- Backend endpoint: `GET /api/analysis/line-of-sight?from=X&to=Y`
- Node picker: Reusable component with search and autocomplete
- Elevation API: Optional integration with Open-Elevation or USGS
- Map integration: Draw temporary line layer on map

### Requirement 41

**User Story:** As a network analyst, I want a gateway comparison tool, so that I can evaluate relative signal quality between different gateways.

#### Acceptance Criteria

1. WHEN the gateway comparison page is accessed THEN the system SHALL provide two searchable gateway picker dropdowns
2. WHEN two gateways are selected THEN the system SHALL find common packets using INNER JOIN on (mesh_packet_id, from_node_id, hop_limit)
3. WHEN finding common packets THEN the system SHALL require both packets to be within 30 seconds of each other
4. WHEN finding common packets THEN the system SHALL filter to same hop_limit to exclude retransmissions
5. WHEN displaying comparison results THEN the system SHALL show a scatter plot of Gateway1 RSSI vs Gateway2 RSSI
6. WHEN displaying comparison results THEN the system SHALL show a scatter plot of Gateway1 SNR vs Gateway2 SNR
7. WHEN displaying comparison results THEN the system SHALL show a timeline chart of signal quality over time for both gateways
8. WHEN displaying comparison results THEN the system SHALL show a histogram of signal differences (Gateway2 - Gateway1)
9. WHEN displaying comparison results THEN the system SHALL calculate and display statistics: average difference, min, max, standard deviation
10. WHEN displaying comparison results THEN the system SHALL show a detailed packet table with all common packets and their differences
11. WHEN filtering comparison data THEN the system SHALL provide time range filters to compare over specific periods
12. WHEN filtering comparison data THEN the system SHALL provide source node filter to compare for specific transmitting nodes
13. WHEN displaying gateway statistics THEN the system SHALL show packet count, average signal, and unique sources per gateway
14. WHEN comparison data is requested THEN the system SHALL cache gateway statistics for 5 minutes
15. WHEN comparison results are displayed THEN the system SHALL provide CSV export functionality

**Implementation Notes:**
- Frontend component: `frontend/src/components/Tools/GatewayComparison.tsx`
- Backend endpoint: `GET /api/gateways/compare?gateway1=X&gateway2=Y`
- Chart library: Plotly.js for interactive scatter plots and histograms
- Gateway picker: Reusable component similar to node picker
- Performance: Limit to 1000 common packets for initial display

### Requirement 42

**User Story:** As a system administrator, I want configurable data retention policies with automatic cleanup, so that I can manage database size and comply with data retention requirements.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL load data retention policies from configuration file with hours to retain per data type
2. WHEN retention policies are configured THEN the system SHALL support different retention periods for messages, telemetry, positions, and traceroutes
3. WHEN the cleanup job runs THEN the system SHALL execute hourly as a background task (cron job)
4. WHEN cleaning up messages THEN the system SHALL delete records older than the configured retention period
5. WHEN cleaning up data THEN the system SHALL preserve traceroute packets even if messages are deleted (longer retention)
6. WHEN cleaning up data THEN the system SHALL keep node_info records even if no recent packet data exists
7. WHEN cleanup completes THEN the system SHALL log statistics including records deleted and disk space freed
8. WHEN cleanup is needed immediately THEN the system SHALL provide an admin button to trigger manual cleanup
9. WHEN retention policy is disabled THEN the system SHALL skip automatic cleanup when `enabled: false` in configuration
10. WHEN large deletions occur THEN the system SHALL run VACUUM on PostgreSQL to reclaim disk space
11. WHEN cleanup runs THEN the system SHALL batch delete operations (1000 records at a time) for performance
12. WHEN cleanup is configured THEN the system SHALL support optional archive-before-delete to export data before removal
13. WHEN disk space is low THEN the system SHALL alert administrators via configured notification channels
14. WHEN cleanup operations occur THEN the system SHALL log all operations to audit trail
15. WHEN retention policies are updated THEN the system SHALL apply new policies after service restart

**Implementation Notes:**
- Configuration: `config/app.yml` under `retention` section
- Default retention: messages (168h/7d), telemetry (168h/7d), positions (720h/30d), traceroutes (720h/30d)
- Cron job: `backend/src/jobs/cleanup.job.ts`
- Batch size: 1000 records per delete operation
- Vacuum: Run after deleting >10,000 records

### Requirement 43

**User Story:** As a developer, I want reusable UI components with consistent behavior, so that I can build features faster and maintain a consistent user experience.

#### Acceptance Criteria

1. WHEN a node picker is needed THEN the system SHALL provide a reusable NodePicker component with search and autocomplete
2. WHEN the node picker is displayed THEN the system SHALL show node name, hex ID, hardware model, and packet count for each result
3. WHEN the node picker search is used THEN the system SHALL debounce input by 300ms to reduce API calls
4. WHEN the node picker is initialized THEN the system SHALL cache the node list client-side for performance
5. WHEN a gateway picker is needed THEN the system SHALL provide a reusable GatewayPicker component similar to NodePicker
6. WHEN a data table is needed THEN the system SHALL provide a ModernTable component with client-side pagination and sorting
7. WHEN the ModernTable is used THEN the system SHALL support customizable columns with render functions for badges and indicators
8. WHEN the ModernTable is used THEN the system SHALL provide debounced search functionality (300ms delay)
9. WHEN the ModernTable is used THEN the system SHALL support URL state management for filters and pagination
10. WHEN filter state is needed THEN the system SHALL provide a FilterStore using Proxy for reactive state management
11. WHEN the FilterStore state changes THEN the system SHALL notify all subscribers automatically
12. WHEN signal quality is displayed THEN the system SHALL use a consistent SignalQualityBadge component with color coding
13. WHEN time ranges are needed THEN the system SHALL provide a reusable TimeRangePicker component
14. WHEN loading states are needed THEN the system SHALL provide a consistent LoadingSpinner component
15. WHEN empty states are needed THEN the system SHALL provide a consistent EmptyState component with customizable messaging

**Implementation Notes:**
- Component library: `frontend/src/components/shared/`
- NodePicker: `frontend/src/components/shared/NodePicker.tsx`
- ModernTable: `frontend/src/components/shared/ModernTable.tsx`
- FilterStore: `frontend/src/utils/FilterStore.ts`
- Documentation: Add component API docs and usage examples

### Requirement 44

**User Story:** As a user, I want filter state to be stored in URL parameters, so that I can bookmark and share specific filtered views.

#### Acceptance Criteria

1. WHEN filters are applied THEN the system SHALL update URL parameters using URLSearchParams without page reload
2. WHEN URL parameters are updated THEN the system SHALL use history.replaceState() to avoid cluttering browser history
3. WHEN the page loads with URL parameters THEN the system SHALL restore filter state from URL
4. WHEN filter values are null or empty THEN the system SHALL remove those parameters from the URL
5. WHEN filter values are set THEN the system SHALL add or update those parameters in the URL
6. WHEN rapid filter changes occur THEN the system SHALL debounce URL updates by 300ms
7. WHEN array parameters are needed THEN the system SHALL support multiple values (e.g., `?node_id=1&node_id=2`)
8. WHEN URL parameters are read THEN the system SHALL validate and sanitize values before applying to filters
9. WHEN special characters are in filter values THEN the system SHALL properly encode them in URL parameters
10. WHEN a filtered view is bookmarked THEN the system SHALL restore the exact filter state when the bookmark is opened
11. WHEN the browser back/forward buttons are used THEN the system SHALL maintain filter state correctly
12. WHEN a "Copy Link" button is clicked THEN the system SHALL copy the current URL with all filters to clipboard
13. WHEN sharing a filtered view THEN the system SHALL ensure the URL contains all necessary parameters for exact reproduction
14. WHEN URL state management is used THEN the system SHALL work consistently across all pages (packets, nodes, map)
15. WHEN filter state is complex THEN the system SHALL handle nested objects and arrays in URL parameters

**Implementation Notes:**
- Utility: `frontend/src/utils/UrlStateManager.ts`
- Integration: Use with FilterStore for automatic URL sync
- Debounce: 300ms delay for URL updates
- Validation: Sanitize and validate all URL parameters on load
- Browser compatibility: Test with Chrome, Firefox, Safari, Edge
