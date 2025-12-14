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