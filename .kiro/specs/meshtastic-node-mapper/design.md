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
  version: "1.0.0"
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