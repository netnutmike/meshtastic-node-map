# Meshtastic Node Mapper - Design Document

## Overview

The Meshtastic Node Mapper is a comprehensive web-based application designed to visualize, monitor, and analyze Meshtastic mesh networks through real-time MQTT data consumption. The system provides an interactive map interface for network visualization, detailed node analytics, historical data tracking, and advanced network management capabilities.

The application follows a microservices architecture with containerized deployment, supporting everything from small hobbyist networks to large-scale enterprise mesh deployments. Key capabilities include real-time node visualization, comprehensive telemetry monitoring, network topology analysis, predictive analytics, and multi-network management.

## Architecture

### System Architecture

The system employs a modern, scalable microservices architecture with the following key components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │  API Gateway    │    │  MQTT Broker    │
│   (React/Vue)   │◄──►│   (Node.js)     │◄──►│  (Mosquitto)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │  Core Services  │              │
         │              │   (Node.js)     │              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static Files  │    │   PostgreSQL    │    │  Message Queue  │
│   (Nginx)       │    │   Database      │    │   (Redis)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with TypeScript for type safety and modern development
- Leaflet.js for interactive mapping with OpenStreetMap integration
- Material-UI or Ant Design for consistent, accessible UI components
- Chart.js or D3.js for telemetry visualization and analytics
- Socket.io client for real-time data updates

**Backend:**
- Node.js with Express.js framework for API services
- TypeScript for type safety across the entire stack
- MQTT.js for Mosquitto broker integration
- Prisma ORM for database operations and migrations
- Socket.io for real-time WebSocket communication
- Bull Queue for background job processing

**Database:**
- PostgreSQL 15+ for primary data storage with JSON support
- Redis for caching, session storage, and message queuing
- TimescaleDB extension for efficient time-series data handling

**Infrastructure:**
- Docker and Docker Compose for containerization
- Nginx for reverse proxy and static file serving
- Mosquitto MQTT broker for message handling
- Prometheus and Grafana for system monitoring (optional)

## Components and Interfaces

### Frontend Components

**MapComponent**
- Interactive map using Leaflet with multiple tile layer support
- Node rendering with status-based color coding and clustering
- Real-time position updates and smooth animations
- Overlay management for neighbors, coverage, and utilization
- Mobile-responsive touch controls and gesture support

**NodeDetailsPanel**
- Comprehensive node information display with tabbed interface
- Historical telemetry charts with configurable time ranges
- Message history with filtering and search capabilities
- Network topology visualization with interactive graphs
- Export functionality for node data and reports

**NavigationHeader**
- Configurable branding with logo and site name
- Search functionality with autocomplete and filtering
- Settings panel with persistent user preferences
- Tools menu with extensible plugin architecture
- Authentication controls and user management

**AnalyticsComponents**
- Real-time statistics dashboard with key metrics
- Network utilization charts and capacity planning
- Signal quality heatmaps and coverage analysis
- Predictive analytics with trend visualization
- Custom report generation and scheduling

### Backend Services

**MQTTService**
- Multi-broker connection management with failover
- Message parsing and validation for all Meshtastic protocols
- Real-time data streaming to connected clients
- Message routing and topic subscription management
- Error handling and connection recovery

**DatabaseService**
- Node lifecycle management and status tracking
- Time-series telemetry data storage and retrieval
- Message archival with configurable retention policies
- Spatial queries for geographic analysis
- Data migration and backup utilities

**APIService**
- RESTful endpoints for all data operations
- WebSocket connections for real-time updates
- Authentication and authorization middleware
- Rate limiting and API usage analytics
- OpenAPI documentation generation

**AnalyticsService**
- Machine learning models for predictive analysis
- Anomaly detection and alerting algorithms
- Network optimization recommendations
- Performance trend analysis and forecasting
- Custom analytics plugin framework

### External Interfaces

**MQTT Protocol Interface**
- Meshtastic protobuf message decoding
- Support for all standard Meshtastic message types
- Custom message type extensibility
- Message encryption and security handling
- Protocol version compatibility management

**Map Tile Services**
- OpenStreetMap, OpenTopoMap integration
- Commercial satellite imagery support (Google, Esri)
- Offline tile caching and storage
- Custom tile server configuration
- Terrain and elevation data integration

**Authentication Providers**
- Local user account management
- LDAP/Active Directory integration
- OAuth 2.0 provider support (Google, GitHub, etc.)
- API key management and rotation
- Role-based access control (RBAC)

## Data Models

### Core Entities

**Node Entity**
```typescript
interface Node {
  id: string;                    // Unique node identifier
  hexId: string;                 // Hexadecimal representation
  shortName: string;             // Display short name
  longName: string;              // Full node name
  hardwareModel: string;         // Device hardware type
  firmwareVersion: string;       // Current firmware version
  role: NodeRole;                // Router, Client, etc.
  position: Position | null;     // Current geographic position
  lastSeen: Date;               // Last MQTT activity
  lastHeard: Date;              // Last direct communication
  isOnline: boolean;            // Current online status
  mqttConnected: boolean;       // MQTT connection status
  batteryLevel?: number;        // Current battery percentage
  voltage?: number;             // Current voltage reading
  channelUtilization?: number;  // Channel usage percentage
  airUtilTx?: number;          // Air utilization transmit
  neighbors: NodeNeighbor[];    // Connected neighbors
  telemetry: TelemetryReading[]; // Historical telemetry
  messages: Message[];          // Associated messages
  createdAt: Date;             // First seen timestamp
  updatedAt: Date;             // Last update timestamp
}
```

**Position Entity**
```typescript
interface Position {
  id: string;
  nodeId: string;
  latitude: number;             // Decimal degrees
  longitude: number;            // Decimal degrees
  altitude?: number;            // Meters above sea level
  precision?: number;           // GPS precision estimate
  timestamp: Date;              // Position fix time
  source: PositionSource;       // GPS, Manual, Estimated
}
```

**TelemetryReading Entity**
```typescript
interface TelemetryReading {
  id: string;
  nodeId: string;
  type: TelemetryType;          // Device, Environment, Power
  timestamp: Date;
  data: {
    // Device Metrics
    batteryLevel?: number;
    voltage?: number;
    channelUtilization?: number;
    airUtilTx?: number;
    
    // Environmental Metrics
    temperature?: number;
    humidity?: number;
    pressure?: number;
    
    // Power Metrics
    ch1Voltage?: number;
    ch1Current?: number;
    ch2Voltage?: number;
    ch2Current?: number;
  };
}
```

**Message Entity**
```typescript
interface Message {
  id: string;
  fromNodeId: string;
  toNodeId?: string;            // null for broadcast
  type: MessageType;            // Text, Position, Telemetry, etc.
  content: string | object;     // Message payload
  encrypted: boolean;           // Encryption status
  hopLimit: number;            // Maximum hops allowed
  hopStart: number;            // Starting hop count
  wantAck: boolean;            // Acknowledgment requested
  priority: MessagePriority;    // Message priority level
  channel: number;             // Channel index
  timestamp: Date;             // Message timestamp
  receivedAt: Date;            // MQTT receipt time
  routingPath: string[];       // Node IDs in routing path
}
```

**Network Entity**
```typescript
interface Network {
  id: string;
  name: string;                 // Network display name
  description?: string;         // Network description
  mqttBroker: string;          // MQTT broker URL
  mqttCredentials: object;     // Authentication details
  region: LoRaRegion;          // LoRa frequency region
  channels: Channel[];         // Network channels
  isActive: boolean;           // Network monitoring status
  createdAt: Date;
  updatedAt: Date;
}
```

### Relationship Models

**NodeNeighbor**
```typescript
interface NodeNeighbor {
  nodeId: string;
  neighborId: string;
  rssi?: number;               // Signal strength
  snr?: number;                // Signal-to-noise ratio
  lastHeard: Date;             // Last communication
  hopCount: number;            // Hops to reach neighbor
}
```

**Channel**
```typescript
interface Channel {
  id: string;
  networkId: string;
  index: number;               // Channel number
  name: string;                // Channel name
  psk: string;                 // Pre-shared key
  frequency: number;           // Center frequency (Hz)
  bandwidth: number;           // Channel bandwidth
  spreadingFactor: number;     // LoRa spreading factor
  codingRate: number;          // LoRa coding rate
  isDefault: boolean;          // Default channel flag
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Node color coding properties (1.3, 1.4, 1.5) can be combined into a single comprehensive property about status-based coloring
- Hover popup UI element properties (2.2, 2.3, 2.4) can be combined into one property about required popup buttons
- Details panel UI properties (3.2, 3.3, 3.4, 3.5) can be consolidated into comprehensive content validation
- Telemetry display properties (4.2, 4.3, 4.4, 4.5) can be combined into properties about required telemetry visualization

### Core Properties

**Property 1: Node rendering with position data**
*For any* node with valid position data, the node should appear on the map as a colored dot at the correct geographic coordinates
**Validates: Requirements 1.2**

**Property 2: Node status color coding**
*For any* node, the dot color should correspond to its connection status: green for MQTT connected, blue for MQTT disconnected, red for offline
**Validates: Requirements 1.3, 1.4, 1.5**

**Property 3: Hover popup content completeness**
*For any* node, hovering should display a popup containing all required fields: node image, name, short name, MQTT status, position precision, role, hardware, battery level, air utilization, altitude, ID, hex ID, last updated timestamp, and last position updated timestamp
**Validates: Requirements 2.1**

**Property 4: Hover popup required buttons**
*For any* node hover popup, the popup should contain "Show Full Details", "Show Neighbors That Heard Us", and "Show Neighbors That We Heard" buttons
**Validates: Requirements 2.2, 2.3, 2.4**

**Property 5: Neighbor visualization arrows**
*For any* node with neighbors, activating neighbor visualization should draw directional arrows between the selected node and all its connected neighbors
**Validates: Requirements 2.5**

**Property 6: Details panel comprehensive content**
*For any* node, opening the details panel should display all hover information plus additional sections for messages, device details, LoRa configuration, and position coordinates
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

**Property 7: Device telemetry visualization**
*For any* node with device telemetry data, the metrics section should display both historical graphs and current real-time values for battery level, voltage, channel utilization, and air utilization
**Validates: Requirements 4.1, 4.2, 4.3**

**Property 8: Environmental telemetry visualization**
*For any* node with environmental sensor data, the environmental section should display both historical graphs and current real-time values for temperature, humidity, and barometric pressure
**Validates: Requirements 4.4, 4.5**

**Property 9: MQTT message processing round-trip**
*For any* valid Meshtastic MQTT message, parsing then serializing should produce an equivalent message structure
**Validates: Requirements 13.5**

**Property 10: Data storage and interface updates**
*For any* new data stored in the database, the web interface should reflect the changes within the configured update interval
**Validates: Requirements 13.1, 13.2**

**Property 11: Age-based node filtering**
*For any* node exceeding the configured maximum age, the node should be hidden from the map unless "Show All" mode is enabled
**Validates: Requirements 13.4**

## Error Handling

### MQTT Connection Failures
- Implement exponential backoff retry logic for broker reconnections
- Maintain connection state monitoring with health checks
- Provide fallback to cached data when MQTT is unavailable
- Log all connection events with detailed error information
- Support multiple broker configurations for redundancy

### Database Operation Failures
- Implement transaction rollback for failed multi-table operations
- Provide data validation before database writes
- Handle connection pool exhaustion gracefully
- Implement automatic database schema migrations
- Support read replicas for high availability scenarios

### Message Parsing Errors
- Validate all incoming MQTT messages against Meshtastic protobuf schemas
- Handle malformed or corrupted message data gracefully
- Log parsing failures with message content for debugging
- Implement message versioning compatibility checks
- Provide fallback parsing for unknown message types

### Frontend Error Handling
- Implement global error boundaries for React components
- Provide user-friendly error messages for API failures
- Handle network connectivity issues with offline mode
- Implement retry mechanisms for failed API requests
- Cache critical data for offline functionality

### API Rate Limiting and Security
- Implement rate limiting per API key and IP address
- Handle authentication failures with proper HTTP status codes
- Validate all input parameters and sanitize user data
- Implement CORS policies for cross-origin requests
- Log security events and potential attack attempts

## Testing Strategy

### Dual Testing Approach

The system will employ both unit testing and property-based testing to ensure comprehensive coverage and correctness validation.

**Unit Testing Requirements:**
- Unit tests will verify specific examples, edge cases, and integration points
- Tests will cover API endpoints, database operations, and UI component behavior
- Mock external dependencies (MQTT broker, map services) for isolated testing
- Achieve minimum 80% code coverage across all modules
- Include performance benchmarks for critical operations

**Property-Based Testing Requirements:**
- Property-based tests will verify universal properties across all valid inputs
- Use Hypothesis (Python) or fast-check (JavaScript/TypeScript) for property testing
- Configure each property test to run minimum 100 iterations for thorough validation
- Tag each property test with explicit references to design document properties
- Use format: `**Feature: meshtastic-node-mapper, Property {number}: {property_text}**`

**Testing Framework Configuration:**
- **Frontend**: Jest + React Testing Library for unit tests, fast-check for property tests
- **Backend**: Jest + Supertest for API tests, fast-check for property tests
- **Database**: Use test database with Docker for integration tests
- **E2E**: Playwright for end-to-end user workflow testing

**Property Test Implementation:**
- Each correctness property must be implemented by exactly one property-based test
- Property tests should generate realistic test data using smart generators
- Avoid mocking in property tests to validate real system behavior
- Property tests must validate the complete property statement, not partial behavior

### Test Data Generation

**Smart Generators for Property Tests:**
- Node generator: Creates valid nodes with realistic hardware/firmware combinations
- Position generator: Generates valid GPS coordinates within reasonable bounds
- Message generator: Creates valid Meshtastic protocol messages with proper encoding
- Telemetry generator: Produces realistic sensor readings within expected ranges
- Network topology generator: Creates connected mesh networks with valid routing

**Test Environment Setup:**
- Containerized test environment with PostgreSQL, Redis, and Mosquitto
- Automated test data seeding for consistent test scenarios
- Test database migrations and cleanup between test runs
- Mock external services (map tiles, authentication providers) for reliable testing

## Implementation Architecture

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Nginx     │  │  Frontend   │  │   Backend   │        │
│  │ (Reverse    │  │   (React)   │  │  (Node.js)  │        │
│  │   Proxy)    │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                 │                 │              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │    Redis    │  │  Mosquitto  │        │
│  │ (Database)  │  │   (Cache)   │  │    (MQTT)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
meshtastic-node-mapper/
├── docker-compose.yml
├── .env.example
├── README.md
├── docs/
│   ├── index.md
│   ├── installation.md
│   ├── user-guide.md
│   └── developer-guide.md
├── config/
│   ├── app.yml
│   ├── mqtt.yml
│   ├── database.yml
│   └── nginx.conf
├── logs/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── Dockerfile
└── scripts/
    ├── setup.sh
    ├── backup.sh
    └── migrate.sh
```

### Configuration Management

**YAML Configuration Structure:**
```yaml
# app.yml
app:
  name: "Meshtastic Node Mapper"
  version: "1.1.0"
  logo: "/assets/logo.png"
  
map:
  defaultZoom: 10
  defaultCenter: [40.7128, -74.0060]
  tileServers:
    - name: "OpenStreetMap"
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      
nodes:
  maxAge: 86400  # 24 hours
  disconnectedAge: 3600  # 1 hour
  offlineAge: 300  # 5 minutes
  
customLinks:
  - name: "Meshtastic Documentation"
    description: "Official Meshtastic docs"
    url: "https://meshtastic.org/docs"
```

### Security Considerations

**Authentication & Authorization:**
- JWT-based authentication with configurable expiration
- Role-based access control (Admin, Operator, Viewer)
- API key management for external integrations
- Rate limiting per user and endpoint
- Input validation and sanitization for all user data

**Data Protection:**
- Encrypt sensitive configuration data at rest
- Use HTTPS/TLS for all external communications
- Implement data anonymization for privacy compliance
- Audit logging for all administrative actions
- Secure session management with proper cookie settings

**Network Security:**
- Container network isolation with minimal exposed ports
- Firewall rules for production deployments
- MQTT broker authentication and access control
- Database connection encryption and user isolation
- Regular security updates via automated dependency management

### Performance Optimization

**Database Optimization:**
- Implement proper indexing for spatial and time-series queries
- Use connection pooling for database operations
- Implement read replicas for high-traffic scenarios
- Partition large tables by time ranges for better performance
- Use materialized views for complex analytical queries

**Frontend Optimization:**
- Implement map tile caching and preloading
- Use virtual scrolling for large node lists
- Lazy load components and data as needed
- Implement service worker for offline functionality
- Optimize bundle size with code splitting

**Real-time Updates:**
- Use WebSocket connections for live data streaming
- Implement efficient data diffing to minimize update payloads
- Use Redis pub/sub for scaling WebSocket connections
- Implement client-side data caching with invalidation
- Batch database writes for improved throughput

### Monitoring and Observability

**Application Monitoring:**
- Health check endpoints for all services
- Prometheus metrics for system performance
- Structured logging with correlation IDs
- Error tracking and alerting integration
- Performance monitoring for critical operations

**Business Metrics:**
- Track node count and network growth over time
- Monitor message throughput and processing latency
- Measure user engagement and feature usage
- Alert on network anomalies and performance degradation
- Generate automated reports for network administrators

This comprehensive design provides a solid foundation for implementing a scalable, maintainable, and feature-rich Meshtastic network monitoring solution that can grow from hobbyist use to enterprise-scale deployments.


---

## Malla-Inspired Enhancements

The following design elements are based on analysis of the Malla project, incorporating proven patterns for network visualization, analytics, and user experience.

### Enhanced Network Visualization Architecture

**RF Link Detection System:**

The system will implement a dual-source approach for detecting actual RF links between nodes:

1. **Traceroute Link Detection**
   - Monitors TRACEROUTE_APP messages (portnum 41)
   - Extracts route_nodes array from protobuf payload
   - Identifies consecutive node pairs as direct RF hops
   - Tracks signal quality (RSSI/SNR) and reliability metrics
   - Aggregates statistics per link: packet_count, avg_snr, avg_rssi, last_seen

2. **Packet Link Detection (0-Hop Analysis)**
   - Analyzes all packet types for direct receptions
   - Identifies 0-hop packets using condition: `hop_start = hop_limit`
   - Creates links between sender (from_node_id) and receiver (gateway_id)
   - Works without encryption keys (uses packet metadata)
   - Provides real-time RF coverage visualization

**Link Visualization Strategy:**

```typescript
interface RFLink {
  from_node_id: string;
  to_node_id: string;
  link_type: 'traceroute' | 'packet';
  packet_count: number;
  avg_rssi: number;
  avg_snr: number;
  last_seen: Date;
  success_rate: number;  // Calculated: min(100, max(10, packet_count * 10))
  is_bidirectional: boolean;
}

// Link rendering configuration
const linkStyles = {
  traceroute: {
    dashArray: undefined,  // Solid line
    weight: 2,
    opacity: 0.6
  },
  packet: {
    dashArray: '3, 6',  // Dashed line
    weight: 2,
    opacity: 0.6
  }
};

// Color coding by success rate
function getLinkColor(successRate: number): string {
  if (successRate >= 80) return '#28a745';  // Green
  if (successRate >= 50) return '#ffc107';  // Yellow
  return '#dc3545';  // Red
}
```

**Hop Depth Filtering:**

Implements breadth-first search (BFS) to compute nodes within N hops of selected node:

```typescript
function computeNodesWithinHops(
  startNodeId: string, 
  maxHops: number, 
  allLinks: RFLink[]
): Set<string> {
  const visited = new Set([startNodeId]);
  let frontier = [startNodeId];
  let hops = 0;
  
  while (frontier.length > 0 && hops < maxHops) {
    const nextFrontier: string[] = [];
    
    frontier.forEach(nodeId => {
      allLinks.forEach(link => {
        // Check both directions
        if (link.from_node_id === nodeId && !visited.has(link.to_node_id)) {
          visited.add(link.to_node_id);
          nextFrontier.push(link.to_node_id);
        } else if (link.to_node_id === nodeId && !visited.has(link.from_node_id)) {
          visited.add(link.from_node_id);
          nextFrontier.push(link.from_node_id);
        }
      });
    });
    
    frontier = nextFrontier;
    hops += 1;
  }
  
  return visited;
}
```

### Theme System Architecture

**DarkModeToggle Class:**

```typescript
class DarkModeToggle {
  private storageKey = 'malla-theme-preference';
  private mediaQuery: MediaQueryList;
  
  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.init();
  }
  
  private init(): void {
    // Apply saved or default theme
    const preference = this.getThemePreference();
    this.applyTheme(preference);
    
    // Listen for system preference changes
    this.mediaQuery.addEventListener('change', () => {
      if (this.getThemePreference() === 'auto') {
        this.applyTheme('auto');
      }
    });
  }
  
  getThemePreference(): 'light' | 'dark' | 'auto' {
    return (localStorage.getItem(this.storageKey) as any) || 'auto';
  }
  
  getEffectiveTheme(): 'light' | 'dark' {
    const preference = this.getThemePreference();
    if (preference === 'auto') {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return preference;
  }
  
  applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    const effectiveTheme = theme === 'auto'
      ? (this.mediaQuery.matches ? 'dark' : 'light')
      : theme;
    
    document.documentElement.setAttribute('data-bs-theme', effectiveTheme);
    this.updateMetaThemeColor(effectiveTheme);
    
    // Dispatch event for components
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: {
        preference: theme,
        effective: effectiveTheme
      }
    }));
  }
  
  cycleTheme(): void {
    const current = this.getThemePreference();
    const next = {
      'light': 'dark',
      'dark': 'auto',
      'auto': 'light'
    }[current] as 'light' | 'dark' | 'auto';
    
    this.setTheme(next);
  }
  
  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    localStorage.setItem(this.storageKey, theme);
    this.applyTheme(theme);
  }
  
  private updateMetaThemeColor(theme: 'light' | 'dark'): void {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#212529' : '#0d6efd');
  }
}
```

**Theme-Aware Components:**

```typescript
// Chart.js theme integration
function getChartColors() {
  const computedStyle = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  
  return {
    textColor: computedStyle.getPropertyValue('--bs-body-color').trim(),
    gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    primary: computedStyle.getPropertyValue('--bs-primary').trim(),
    success: computedStyle.getPropertyValue('--bs-success').trim(),
    warning: computedStyle.getPropertyValue('--bs-warning').trim(),
    danger: computedStyle.getPropertyValue('--bs-danger').trim(),
  };
}

// Leaflet map theme integration
function updateMapTheme() {
  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  
  const lightTileLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { attribution: '© OpenStreetMap © CARTO' }
  );
  
  const darkTileLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution: '© OpenStreetMap © CARTO' }
  );
  
  const newTileLayer = isDark ? darkTileLayer : lightTileLayer;
  
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer);
  }
  newTileLayer.addTo(map);
  currentTileLayer = newTileLayer;
}

// Listen for theme changes
window.addEventListener('themeChanged', () => {
  updateMapTheme();
  updateChartsForTheme();
});
```

### Mobile Responsive Architecture

**Responsive Breakpoint Strategy:**

```css
/* Mobile-first base styles */
html {
  font-size: 0.9rem;  /* Mobile base */
}

/* Tablet scaling */
@media (min-width: 768px) {
  html {
    font-size: 1rem;
  }
}

/* Desktop scaling */
@media (min-width: 1200px) {
  html {
    font-size: 1.05rem;
  }
}

/* Sidebar responsive behavior */
@media (min-width: 769px) {
  .table-sidebar {
    position: fixed;
    right: 0;
    top: 56px;
    width: 320px;
    height: calc(100vh - 56px);
    overflow-y: auto;
    transition: transform 0.3s ease;
  }
  
  .table-sidebar.collapsed {
    transform: translateX(100%);
  }
}

@media (max-width: 768px) {
  .table-sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 60vh;
    overflow-y: auto;
    z-index: 1050;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
    transition: transform 0.3s ease;
  }
  
  .table-sidebar.collapsed {
    transform: translateY(100%);
  }
}

/* Touch-friendly controls */
.btn-sm {
  min-height: 44px;
  min-width: 44px;
  padding: 0.5rem 1rem;
}

.btn-icon {
  width: 44px;
  height: 44px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Mobile table optimization */
@media (max-width: 768px) {
  .modern-table {
    font-size: 0.8rem;
  }
  
  .modern-table thead th,
  .modern-table tbody td {
    padding: 0.4rem 0.3rem;
  }
  
  .modern-table .hide-mobile {
    display: none;
  }
  
  /* Prevent iOS zoom on input focus */
  .form-control {
    font-size: 16px;
  }
}
```

**Icon-Only Action Buttons:**

```typescript
// Node actions component
function renderNodeActions(nodeId: string): string {
  return `
    <div class="btn-group" role="group">
      <a href="/node/${nodeId}"
         class="btn btn-sm btn-primary" 
         title="View node details"
         data-bs-toggle="tooltip">
        <i class="bi bi-info-circle"></i>
      </a>
      <a href="/packets?from_node=${nodeId}"
         class="btn btn-sm btn-outline-secondary" 
         title="View packets"
         data-bs-toggle="tooltip">
        <i class="bi bi-envelope"></i>
      </a>
      <a href="/map?highlight=${nodeId}"
         class="btn btn-sm btn-outline-info" 
         title="View on map"
         data-bs-toggle="tooltip">
        <i class="bi bi-map"></i>
      </a>
    </div>
  `;
}
```

### Enhanced Analytics Architecture

**Dashboard Statistics Service:**

```typescript
interface DashboardStatistics {
  metrics: {
    totalNodes: number;
    activeNodes24h: number;
    activeNodesPercentage: number;
    gatewayDiversity: number;
    protocolDiversity: number;
    totalMessages: number;
    successRate: number;
  };
  charts: {
    networkActivityTrends: TimeSeriesData[];
    nodeActivityDistribution: CategoryData[];
    gatewayActivityDistribution: CategoryData[];
    signalQualityDistribution: CategoryData[];
    messageRoutingPatterns: CategoryData[];
    protocolUsage: CategoryData[];
  };
  topNodes: TopNodeData[];
}

// Single optimized query for all dashboard stats
const dashboardQuery = `
  WITH node_stats AS (
    SELECT
      COUNT(DISTINCT id) as total_nodes,
      COUNT(DISTINCT CASE WHEN last_seen >= NOW() - INTERVAL '24 hours' THEN id END) as active_nodes_24h
    FROM nodes
  ),
  message_stats AS (
    SELECT
      COUNT(*) as total_messages,
      COUNT(DISTINCT gateway_id) as gateway_diversity,
      COUNT(DISTINCT portnum_name) as protocol_diversity,
      SUM(CASE WHEN processed_successfully = true THEN 1 ELSE 0 END) as successful_messages,
      -- RSSI distribution
      SUM(CASE WHEN rssi > -70 THEN 1 ELSE 0 END) as rssi_excellent,
      SUM(CASE WHEN rssi > -80 AND rssi <= -70 THEN 1 ELSE 0 END) as rssi_good,
      SUM(CASE WHEN rssi > -90 AND rssi <= -80 THEN 1 ELSE 0 END) as rssi_fair,
      SUM(CASE WHEN rssi <= -90 THEN 1 ELSE 0 END) as rssi_poor
    FROM messages
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
  )
  SELECT * FROM node_stats, message_stats;
`;
```

**Chart Theme Integration:**

```typescript
function createThemeAwareChart(ctx: CanvasRenderingContext2D, config: ChartConfiguration) {
  const colors = getChartColors();
  
  // Apply theme colors to chart config
  config.options = {
    ...config.options,
    plugins: {
      ...config.options?.plugins,
      legend: {
        labels: {
          color: colors.textColor
        }
      }
    },
    scales: {
      x: {
        ticks: { color: colors.textColor },
        grid: { color: colors.gridColor }
      },
      y: {
        ticks: { color: colors.textColor },
        grid: { color: colors.gridColor }
      }
    }
  };
  
  return new Chart(ctx, config);
}

// Update all charts when theme changes
window.addEventListener('themeChanged', () => {
  Object.values(chartInstances).forEach(chart => {
    if (chart) chart.destroy();
  });
  chartInstances = {};
  createAllCharts();
});
```

### Distance Calculation Service

**Haversine Formula Implementation:**

```typescript
class DistanceCalculationService {
  private readonly EARTH_RADIUS_KM = 6371.0;
  
  calculateHaversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
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
    
    return this.EARTH_RADIUS_KM * c;
  }
  
  async getLongestLinks(
    minDistanceKm: number = 1,
    minSnr: number = -20,
    days: number = 7
  ): Promise<LongestLink[]> {
    // Pre-fetch location history for performance
    const locationHistory = await this.fetchLocationHistory(days);
    
    // Get traceroute packets
    const traceroutes = await this.getTraceroutePackets(days);
    
    const links: Map<string, LongestLink> = new Map();
    
    for (const traceroute of traceroutes) {
      const route = this.parseRoute(traceroute.raw_payload);
      
      // Extract consecutive pairs (RF hops)
      for (let i = 0; i < route.length - 1; i++) {
        const fromNode = route[i];
        const toNode = route[i + 1];
        
        // Get positions at packet timestamp
        const fromPos = this.getPositionAtTime(locationHistory, fromNode, traceroute.timestamp);
        const toPos = this.getPositionAtTime(locationHistory, toNode, traceroute.timestamp);
        
        if (!fromPos || !toPos) continue;
        
        const distance = this.calculateHaversineDistance(
          fromPos.latitude, fromPos.longitude,
          toPos.latitude, toPos.longitude
        );
        
        if (distance < minDistanceKm) continue;
        if (traceroute.snr < minSnr) continue;
        
        // Create or update link
        const linkKey = this.getLinkKey(fromNode, toNode);
        const existing = links.get(linkKey);
        
        if (existing) {
          existing.packet_count++;
          existing.avg_snr = (existing.avg_snr * (existing.packet_count - 1) + traceroute.snr) / existing.packet_count;
          existing.avg_rssi = (existing.avg_rssi * (existing.packet_count - 1) + traceroute.rssi) / existing.packet_count;
          existing.last_seen = Math.max(existing.last_seen, traceroute.timestamp);
        } else {
          links.set(linkKey, {
            from_node_id: fromNode,
            to_node_id: toNode,
            distance_km: distance,
            packet_count: 1,
            avg_snr: traceroute.snr,
            avg_rssi: traceroute.rssi,
            last_seen: traceroute.timestamp
          });
        }
      }
    }
    
    return Array.from(links.values())
      .sort((a, b) => b.distance_km - a.distance_km);
  }
  
  private getLinkKey(node1: string, node2: string): string {
    // Bidirectional: always use same key for A↔B
    return node1 < node2 ? `${node1}-${node2}` : `${node2}-${node1}`;
  }
}
```

### Reusable Component Library

**NodePicker Component:**

```typescript
class NodePicker {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private dropdown: HTMLElement;
  private nodeCache: Map<string, Node> = new Map();
  private debounceTimer: number | null = null;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.input = container.querySelector('.node-picker-input')!;
    this.dropdown = container.querySelector('.node-picker-dropdown')!;
    
    this.init();
  }
  
  private init(): void {
    // Load node list
    this.loadNodes();
    
    // Setup event listeners
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('focus', () => this.showDropdown());
    document.addEventListener('click', (e) => this.handleClickOutside(e));
    
    // Keyboard navigation
    this.input.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }
  
  private async loadNodes(): Promise<void> {
    const response = await fetch('/api/nodes?summary=true');
    const nodes = await response.json();
    
    nodes.forEach((node: Node) => {
      this.nodeCache.set(node.id, node);
    });
  }
  
  private handleInput(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      this.filterAndDisplay();
    }, 300);
  }
  
  private filterAndDisplay(): void {
    const query = this.input.value.toLowerCase();
    const results = Array.from(this.nodeCache.values())
      .filter(node => 
        node.longName?.toLowerCase().includes(query) ||
        node.shortName?.toLowerCase().includes(query) ||
        node.hexId?.toLowerCase().includes(query)
      )
      .slice(0, 10);
    
    this.renderResults(results);
  }
  
  private renderResults(nodes: Node[]): void {
    this.dropdown.innerHTML = nodes.map(node => `
      <div class="node-picker-result" data-node-id="${node.id}">
        <div class="node-picker-result-name">${node.longName || node.shortName}</div>
        <div class="node-picker-result-meta">
          ${node.hexId} • ${node.hardwareModel} • ${node.packetCount24h} msgs
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    this.dropdown.querySelectorAll('.node-picker-result').forEach(el => {
      el.addEventListener('click', () => this.selectNode(el.getAttribute('data-node-id')!));
    });
  }
  
  private selectNode(nodeId: string): void {
    const node = this.nodeCache.get(nodeId);
    if (!node) return;
    
    this.input.value = node.longName || node.shortName || node.hexId;
    this.hideDropdown();
    
    // Dispatch event
    this.container.dispatchEvent(new CustomEvent('nodeSelected', {
      detail: { node }
    }));
  }
}
```

**ModernTable Component:**

```typescript
class ModernTable {
  private container: HTMLElement;
  private config: TableConfig;
  private data: any[] = [];
  private filteredData: any[] = [];
  private currentPage = 1;
  
  constructor(containerId: string, config: TableConfig) {
    this.container = document.getElementById(containerId)!;
    this.config = config;
    this.init();
  }
  
  private async init(): Promise<void> {
    await this.fetchData();
    this.render();
    this.setupEventListeners();
  }
  
  private async fetchData(): Promise<void> {
    const params = new URLSearchParams(this.config.filters || {});
    const response = await fetch(`${this.config.endpoint}?${params}`);
    this.data = await response.json();
    this.filteredData = [...this.data];
  }
  
  private render(): void {
    const start = (this.currentPage - 1) * this.config.pageSize;
    const end = start + this.config.pageSize;
    const pageData = this.filteredData.slice(start, end);
    
    const html = `
      <table class="modern-table">
        <thead>
          <tr>
            ${this.config.columns.map(col => `
              <th ${col.sortable ? 'class="sortable"' : ''} data-key="${col.key}">
                ${col.title}
                ${col.sortable ? '<i class="bi bi-chevron-expand"></i>' : ''}
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${pageData.map(row => `
            <tr>
              ${this.config.columns.map(col => `
                <td>${col.render ? col.render(row[col.key], row) : row[col.key]}</td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${this.renderPagination()}
    `;
    
    this.container.innerHTML = html;
  }
  
  private renderPagination(): string {
    const totalPages = Math.ceil(this.filteredData.length / this.config.pageSize);
    
    return `
      <div class="modern-table-pagination">
        <button ${this.currentPage === 1 ? 'disabled' : ''} data-action="prev">
          Previous
        </button>
        <span>Page ${this.currentPage} of ${totalPages}</span>
        <button ${this.currentPage === totalPages ? 'disabled' : ''} data-action="next">
          Next
        </button>
      </div>
    `;
  }
  
  setFilters(filters: Record<string, any>): void {
    this.config.filters = filters;
    this.fetchData().then(() => this.render());
  }
}
```

### URL State Management

**UrlStateManager Utility:**

```typescript
class UrlStateManager {
  private debounceTimer: number | null = null;
  
  syncFiltersToUrl(filters: Record<string, any>): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      
      // Update parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            params.delete(key);
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.set(key, value.toString());
          }
        } else {
          params.delete(key);
        }
      });
      
      // Update URL without reload
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }, 300);
  }
  
  loadFiltersFromUrl(): Record<string, any> {
    const params = new URLSearchParams(window.location.search);
    const filters: Record<string, any> = {};
    
    params.forEach((value, key) => {
      // Handle array parameters
      if (filters[key]) {
        if (!Array.isArray(filters[key])) {
          filters[key] = [filters[key]];
        }
        filters[key].push(value);
      } else {
        filters[key] = value;
      }
    });
    
    return filters;
  }
  
  generateShareableUrl(filters: Record<string, any>): string {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v.toString()));
        } else {
          params.set(key, value.toString());
        }
      }
    });
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }
}
```

### Data Retention and Cleanup

**Retention Policy Configuration:**

```yaml
# config/app.yml
retention:
  enabled: true
  policies:
    messages: 168        # 7 days in hours
    telemetry: 168       # 7 days
    positions: 720       # 30 days
    traceroutes: 720     # 30 days (keep longer)
  keepNodeInfo: true     # Preserve node records
  batchSize: 1000        # Records per delete batch
  vacuumThreshold: 10000 # Run VACUUM after this many deletes
```

**Cleanup Job Implementation:**

```typescript
class DataCleanupJob {
  private config: RetentionConfig;
  
  async execute(): Promise<CleanupResult> {
    if (!this.config.enabled) {
      return { skipped: true };
    }
    
    const results: CleanupResult = {
      messages: 0,
      telemetry: 0,
      positions: 0,
      traceroutes: 0,
      spaceFree: 0
    };
    
    // Clean messages (preserve traceroutes)
    results.messages = await this.cleanupMessages();
    
    // Clean telemetry
    results.telemetry = await this.cleanupTelemetry();
    
    // Clean positions
    results.positions = await this.cleanupPositions();
    
    // Clean traceroutes (longer retention)
    results.traceroutes = await this.cleanupTraceroutes();
    
    // Run VACUUM if needed
    const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0);
    if (totalDeleted > this.config.vacuumThreshold) {
      await this.runVacuum();
    }
    
    // Log results
    logger.info('Data cleanup completed', results);
    
    return results;
  }
  
  private async cleanupMessages(): Promise<number> {
    const cutoffTime = new Date(Date.now() - this.config.policies.messages * 3600 * 1000);
    let totalDeleted = 0;
    
    while (true) {
      const result = await prisma.$executeRaw`
        DELETE FROM messages
        WHERE id IN (
          SELECT id FROM messages
          WHERE timestamp < ${cutoffTime}
            AND id NOT IN (SELECT DISTINCT message_id FROM traceroutes WHERE message_id IS NOT NULL)
          LIMIT ${this.config.batchSize}
        )
      `;
      
      totalDeleted += result;
      
      if (result < this.config.batchSize) {
        break;
      }
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return totalDeleted;
  }
  
  private async runVacuum(): Promise<void> {
    logger.info('Running VACUUM to reclaim disk space');
    await prisma.$executeRawUnsafe('VACUUM ANALYZE');
  }
}
```

This enhanced design provides a comprehensive foundation for implementing all Malla-inspired features while maintaining the existing architecture and adding proven patterns for network visualization, analytics, and user experience.
