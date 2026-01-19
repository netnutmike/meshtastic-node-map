# Architecture Overview

This document provides a comprehensive overview of the Meshtastic Node Mapper system architecture, design decisions, and component interactions.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │   Mobile     │  │   API        │          │
│  │   (React)    │  │   Browser    │  │   Clients    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Reverse Proxy Layer                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Nginx                                  │   │
│  │  - Load Balancing                                        │   │
│  │  - SSL Termination                                       │   │
│  │  - Static File Serving                                   │   │
│  │  - Request Routing                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   Application Layer      │   │   Real-time Layer        │
│  ┌────────────────────┐  │   │  ┌────────────────────┐  │
│  │   Backend API      │  │   │  │   WebSocket        │  │
│  │   (Express.js)     │  │   │  │   (Socket.IO)      │  │
│  │                    │  │   │  │                    │  │
│  │  - REST API        │  │   │  │  - Real-time       │  │
│  │  - Business Logic  │  │   │  │    Updates         │  │
│  │  - Validation      │  │   │  │  - Event Streaming │  │
│  │  - Authentication  │  │   │  │  - Subscriptions   │  │
│  └────────────────────┘  │   │  └────────────────────┘  │
└──────────────────────────┘   └──────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   MQTT       │  │   Analytics  │  │   Export     │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Coverage   │  │   Multi-Net  │  │   Security   │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   Data Layer             │   │   Cache Layer            │
│  ┌────────────────────┐  │   │  ┌────────────────────┐  │
│  │   PostgreSQL       │  │   │  │   Redis            │  │
│  │   + TimescaleDB    │  │   │  │                    │  │
│  │                    │  │   │  │  - Session Store   │  │
│  │  - Relational Data │  │   │  │  - Query Cache     │  │
│  │  - Time-series     │  │   │  │  - Rate Limiting   │  │
│  │  - Geospatial      │  │   │  │  - Pub/Sub         │  │
│  └────────────────────┘  │   │  └────────────────────┘  │
└──────────────────────────┘   └──────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Message Broker Layer                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Mosquitto MQTT Broker                  │   │
│  │  - Message Routing                                        │   │
│  │  - Topic Management                                       │   │
│  │  - QoS Handling                                          │   │
│  │  - Meshtastic Integration                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend Application

**Technology**: React 18+ with TypeScript

**Key Features:**
- Single Page Application (SPA) architecture
- Component-based UI with Material-UI
- Redux Toolkit for state management
- React Router for navigation
- Leaflet.js for interactive maps
- Chart.js for data visualization
- Socket.IO client for real-time updates

**Directory Structure:**
```
frontend/src/
├── components/          # Reusable UI components
│   ├── Map/            # Map-related components
│   ├── Nodes/          # Node display components
│   ├── Analytics/      # Analytics visualizations
│   └── Common/         # Shared components
├── pages/              # Page-level components
├── store/              # Redux store and slices
├── services/           # API and external services
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

**State Management:**
- **Redux Toolkit**: Centralized state management
- **Slices**: Feature-based state organization
- **Async Thunks**: Asynchronous operations
- **Selectors**: Memoized state derivation

### Backend API

**Technology**: Node.js with Express.js and TypeScript

**Architecture Pattern**: Layered architecture with clear separation of concerns

**Layers:**
1. **Routes**: HTTP endpoint definitions and request handling
2. **Controllers**: Request/response processing and validation
3. **Services**: Business logic and orchestration
4. **Repositories**: Data access and persistence
5. **Models**: Data structures and types

**Directory Structure:**
```
backend/src/
├── routes/             # API route definitions
├── controllers/        # Request handlers
├── services/           # Business logic
├── database/
│   └── repositories/   # Data access layer
├── middleware/         # Express middleware
├── types/              # TypeScript types
├── utils/              # Utility functions
└── index.ts            # Application entry point
```

**Key Services:**
- **MQTT Service**: Meshtastic message broker integration
- **Analytics Service**: Network statistics and insights
- **Coverage Service**: Coverage analysis and planning
- **Export Service**: Data export and backup
- **Multi-Network Service**: Multiple network management
- **Security Service**: Authentication and authorization

### Database Layer

**Primary Database**: PostgreSQL 15+ with TimescaleDB extension

**Data Models:**
- **Nodes**: Mesh network node information
- **Positions**: GPS location history
- **Telemetry**: Device and environmental metrics
- **Messages**: Message history and routing
- **Networks**: Network configuration
- **Users**: User accounts (optional)

**TimescaleDB Features:**
- **Hypertables**: Automatic time-series partitioning
- **Continuous Aggregates**: Pre-computed rollups
- **Compression**: Automatic data compression
- **Retention Policies**: Automatic data cleanup

**Indexing Strategy:**
- B-tree indexes for exact matches
- GiST indexes for geospatial queries
- BRIN indexes for time-series data
- Partial indexes for filtered queries

### Cache Layer

**Technology**: Redis 7+

**Use Cases:**
- **Session Storage**: User session management
- **Query Cache**: Frequently accessed data
- **Rate Limiting**: API request throttling
- **Pub/Sub**: Real-time event distribution
- **Temporary Data**: Short-lived computations

**Cache Strategies:**
- **Cache-Aside**: Application manages cache
- **Write-Through**: Updates cache on write
- **TTL-based**: Automatic expiration
- **LRU Eviction**: Least recently used removal

### Message Broker

**Technology**: Eclipse Mosquitto MQTT Broker

**Integration:**
- Subscribes to Meshtastic MQTT topics
- Processes incoming mesh network messages
- Publishes updates to connected clients
- Handles message routing and QoS

**Topic Structure:**
```
msh/{region}/{modem_preset}/json/{channel}/!{gateway_id}
```

**Message Flow:**
1. Meshtastic device publishes to MQTT
2. Mosquitto receives and routes message
3. Backend subscribes and processes message
4. Data stored in PostgreSQL
5. Real-time update sent via WebSocket
6. Frontend receives and displays update

## Data Flow

### Inbound Data Flow (MQTT → Database)

```
Meshtastic Device
       │
       ▼
MQTT Broker (Mosquitto)
       │
       ▼
MQTT Service (Backend)
       │
       ├──▶ Parse & Validate
       │
       ├──▶ Decode Protobuf (if needed)
       │
       ├──▶ Extract Data
       │    ├─▶ Node Info
       │    ├─▶ Position
       │    ├─▶ Telemetry
       │    └─▶ Messages
       │
       ▼
Repository Layer
       │
       ▼
PostgreSQL Database
       │
       ▼
WebSocket Broadcast
       │
       ▼
Connected Clients
```

### Outbound Data Flow (API Request)

```
Client Request
       │
       ▼
Nginx (Reverse Proxy)
       │
       ▼
Express Route Handler
       │
       ├──▶ Authentication Middleware
       │
       ├──▶ Validation Middleware
       │
       ├──▶ Rate Limiting Middleware
       │
       ▼
Controller
       │
       ▼
Service Layer
       │
       ├──▶ Check Redis Cache
       │    │
       │    ├─▶ Cache Hit → Return
       │    │
       │    └─▶ Cache Miss ↓
       │
       ▼
Repository Layer
       │
       ▼
PostgreSQL Query
       │
       ▼
Transform & Format
       │
       ├──▶ Update Redis Cache
       │
       ▼
JSON Response
       │
       ▼
Client
```

## Design Patterns

### Repository Pattern

Abstracts data access logic from business logic:

```typescript
interface IRepository<T> {
  findAll(filters?: any): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
```

**Benefits:**
- Testable business logic
- Swappable data sources
- Centralized query logic
- Type-safe operations

### Service Layer Pattern

Encapsulates business logic:

```typescript
class NodeService {
  constructor(
    private nodeRepository: NodeRepository,
    private positionRepository: PositionRepository,
    private cacheService: CacheService
  ) {}

  async getActiveNodes(): Promise<Node[]> {
    // Business logic here
  }
}
```

**Benefits:**
- Reusable business logic
- Transaction management
- Cross-cutting concerns
- Testable units

### Observer Pattern

Real-time updates via WebSocket:

```typescript
// Server-side
mqttService.on('nodeUpdate', (node) => {
  io.emit('nodeUpdate', node);
});

// Client-side
socket.on('nodeUpdate', (node) => {
  dispatch(updateNode(node));
});
```

### Factory Pattern

Creating service instances:

```typescript
class ServiceFactory {
  static createNodeService(): NodeService {
    const repository = new NodeRepository();
    const cache = new CacheService();
    return new NodeService(repository, cache);
  }
}
```

## Security Architecture

### Authentication

**Methods:**
- JWT tokens for API authentication
- Session-based for web interface
- API keys for programmatic access

**Flow:**
```
1. User submits credentials
2. Backend validates against database
3. JWT token generated and signed
4. Token returned to client
5. Client includes token in requests
6. Middleware validates token
7. Request processed if valid
```

### Authorization

**Role-Based Access Control (RBAC):**
- **Admin**: Full system access
- **User**: Read/write access to own data
- **Viewer**: Read-only access
- **API**: Programmatic access with scoped permissions

### Data Protection

**Encryption:**
- TLS/SSL for data in transit
- Encrypted passwords (bcrypt)
- Encrypted sensitive fields
- Secure session storage

**Input Validation:**
- Schema validation (Joi)
- SQL injection prevention (Prisma ORM)
- XSS protection (sanitization)
- CSRF protection (tokens)

### Rate Limiting

**Strategies:**
- IP-based rate limiting
- User-based rate limiting
- Endpoint-specific limits
- Sliding window algorithm

## Performance Optimization

### Database Optimization

**Indexing:**
- Composite indexes for common queries
- Partial indexes for filtered data
- Covering indexes for select queries

**Query Optimization:**
- Prepared statements
- Connection pooling
- Query result caching
- Batch operations

**Time-Series Optimization:**
- TimescaleDB hypertables
- Automatic partitioning
- Compression policies
- Retention policies

### Caching Strategy

**Multi-Level Caching:**
1. **Browser Cache**: Static assets
2. **CDN Cache**: Global distribution
3. **Redis Cache**: Application data
4. **Database Cache**: Query results

**Cache Invalidation:**
- Time-based expiration (TTL)
- Event-based invalidation
- Manual cache clearing
- Stale-while-revalidate

### Frontend Optimization

**Code Splitting:**
- Route-based splitting
- Component lazy loading
- Dynamic imports

**Asset Optimization:**
- Image compression
- Minification
- Tree shaking
- Bundle analysis

**Rendering Optimization:**
- Virtual scrolling for large lists
- Memoization (React.memo, useMemo)
- Debouncing and throttling
- Web Workers for heavy computations

## Scalability Considerations

### Horizontal Scaling

**Stateless Backend:**
- No server-side session storage
- JWT-based authentication
- Redis for shared state
- Load balancer distribution

**Database Scaling:**
- Read replicas for queries
- Write master for updates
- Connection pooling
- Query optimization

### Vertical Scaling

**Resource Allocation:**
- CPU limits per service
- Memory limits per service
- Disk I/O optimization
- Network bandwidth management

### Microservices Potential

**Future Architecture:**
- Separate services for major features
- Message queue for inter-service communication
- Service mesh for orchestration
- Independent scaling per service

## Monitoring and Observability

### Logging

**Structured Logging:**
- JSON format
- Log levels (error, warn, info, debug)
- Contextual information
- Correlation IDs

**Log Aggregation:**
- Centralized log collection
- Search and analysis
- Alerting on patterns
- Retention policies

### Metrics

**Application Metrics:**
- Request rate and latency
- Error rates
- Database query performance
- Cache hit rates

**System Metrics:**
- CPU and memory usage
- Disk I/O
- Network traffic
- Container health

### Tracing

**Distributed Tracing:**
- Request flow tracking
- Performance bottleneck identification
- Error propagation tracking
- Service dependency mapping

## Deployment Architecture

### Container Strategy

**Multi-Stage Builds:**
- Build stage: Compile and bundle
- Production stage: Minimal runtime
- Security scanning
- Layer caching

**Container Orchestration:**
- Docker Compose for development
- Docker Swarm or Kubernetes for production
- Health checks
- Auto-restart policies

### Network Architecture

**Service Communication:**
- Internal Docker network
- Service discovery
- Load balancing
- SSL/TLS termination

**External Access:**
- Reverse proxy (Nginx)
- Port mapping
- Domain routing
- Rate limiting

## Future Enhancements

### Planned Features

1. **GraphQL API**: Alternative to REST
2. **Real-time Collaboration**: Multi-user editing
3. **Machine Learning**: Predictive analytics
4. **Mobile Apps**: Native iOS/Android
5. **Plugin System**: Extensibility framework

### Architecture Evolution

1. **Microservices**: Service decomposition
2. **Event Sourcing**: Event-driven architecture
3. **CQRS**: Command Query Responsibility Segregation
4. **Serverless**: Function-as-a-Service components
5. **Edge Computing**: Distributed processing

---

This architecture is designed to be scalable, maintainable, and extensible while providing excellent performance and reliability for Meshtastic mesh network monitoring and analysis.
