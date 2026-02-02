# API Documentation

This guide provides comprehensive documentation for the Meshtastic Node Mapper REST API and WebSocket interfaces.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [REST API Endpoints](#rest-api-endpoints)
4. [WebSocket API](#websocket-api)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Examples](#examples)

## Overview

The Meshtastic Node Mapper API provides programmatic access to mesh network data, including nodes, positions, telemetry, messages, and network analytics.

### Base URL
- **Development**: `http://localhost:3001/api/v1`
- **Production**: `https://your-domain.com/api/v1`

### API Versioning
The API uses URL versioning with the current version being `v1`. All endpoints are prefixed with `/api/v1`.

### Content Type
All API endpoints accept and return JSON data unless otherwise specified.

```http
Content-Type: application/json
Accept: application/json
```

### Interactive Documentation
Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3001/api/v1/docs`

## Authentication

The API supports multiple authentication methods depending on configuration.

### API Key Authentication (Recommended)

```http
Authorization: Bearer your-api-key-here
```

### JWT Token Authentication

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### No Authentication (Default)

When authentication is disabled in configuration, all endpoints are publicly accessible.

## REST API Endpoints

### Health Check

#### GET /health
Returns the health status of the API and its dependencies.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-13T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "mqtt": "connected"
  }
}
```

### Nodes

#### GET /nodes
Retrieve all nodes with optional filtering.

**Query Parameters:**
- `hardwareModel` (string): Filter by hardware model
- `role` (string): Filter by node role
- `isOnline` (boolean): Filter by online status
- `networkId` (string): Filter by network ID
- `limit` (number): Limit number of results (default: 100)
- `offset` (number): Offset for pagination (default: 0)

**Example Request:**
```http
GET /api/v1/nodes?hardwareModel=TBEAM&isOnline=true&limit=50
```

**Response:**
```json
{
  "data": [
    {
      "id": "clp123456789",
      "nodeId": "123456789",
      "hexId": "75bcd15",
      "shortName": "NODE01",
      "longName": "My Meshtastic Node 01",
      "hardwareModel": "TBEAM",
      "firmwareVersion": "2.2.0",
      "role": "ROUTER",
      "isOnline": true,
      "mqttConnected": true,
      "batteryLevel": 85,
      "voltage": 4.1,
      "channelUtilization": 15.5,
      "airUtilTx": 2.3,
      "lastSeen": "2024-12-13T10:25:00.000Z",
      "lastHeard": "2024-12-13T10:25:00.000Z",
      "position": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "altitude": 10,
        "timestamp": "2024-12-13T10:20:00.000Z"
      },
      "networkId": "clp987654321"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### GET /nodes/:id
Retrieve a specific node by ID.

**Response:**
```json
{
  "id": "clp123456789",
  "nodeId": "123456789",
  "hexId": "75bcd15",
  "shortName": "NODE01",
  "longName": "My Meshtastic Node 01",
  "hardwareModel": "TBEAM",
  "firmwareVersion": "2.2.0",
  "role": "ROUTER",
  "isOnline": true,
  "mqttConnected": true,
  "batteryLevel": 85,
  "voltage": 4.1,
  "channelUtilization": 15.5,
  "airUtilTx": 2.3,
  "lastSeen": "2024-12-13T10:25:00.000Z",
  "lastHeard": "2024-12-13T10:25:00.000Z",
  "position": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "altitude": 10,
    "timestamp": "2024-12-13T10:20:00.000Z"
  },
  "neighbors": [
    {
      "nodeId": "987654321",
      "shortName": "NODE02",
      "rssi": -65,
      "snr": 8.5,
      "lastHeard": "2024-12-13T10:20:00.000Z"
    }
  ],
  "networkId": "clp987654321"
}
```

#### POST /nodes
Create a new node (Admin only).

**Request Body:**
```json
{
  "nodeId": "123456789",
  "hexId": "75bcd15",
  "shortName": "NODE01",
  "longName": "My Meshtastic Node 01",
  "hardwareModel": "TBEAM",
  "role": "ROUTER",
  "networkId": "clp987654321"
}
```

#### PUT /nodes/:id
Update an existing node (Admin only).

#### DELETE /nodes/:id
Delete a node (Admin only).

### Positions

#### GET /positions
Retrieve position data with optional filtering.

**Query Parameters:**
- `nodeId` (string): Filter by node ID
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)
- `bounds` (string): Geographic bounds (format: "lat1,lng1,lat2,lng2")

**Example Request:**
```http
GET /api/v1/positions?nodeId=clp123456789&startDate=2024-12-12T00:00:00Z
```

**Response:**
```json
{
  "data": [
    {
      "id": "clp111222333",
      "nodeId": "clp123456789",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "altitude": 10,
      "precision": 5,
      "timestamp": "2024-12-13T10:20:00.000Z",
      "source": "GPS"
    }
  ]
}
```

### Telemetry

#### GET /telemetry
Retrieve telemetry data with filtering options.

**Query Parameters:**
- `nodeId` (string): Filter by node ID
- `type` (string): Telemetry type (DEVICE_METRICS, ENVIRONMENT_METRICS, POWER_METRICS)
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)
- `limit` (number): Limit number of results

**Response:**
```json
{
  "data": [
    {
      "id": "clp444555666",
      "nodeId": "clp123456789",
      "type": "DEVICE_METRICS",
      "timestamp": "2024-12-13T10:25:00.000Z",
      "data": {
        "batteryLevel": 85,
        "voltage": 4.1,
        "channelUtilization": 15.5,
        "airUtilTx": 2.3
      }
    },
    {
      "id": "clp777888999",
      "nodeId": "clp123456789",
      "type": "ENVIRONMENT_METRICS",
      "timestamp": "2024-12-13T10:25:00.000Z",
      "data": {
        "temperature": 22.5,
        "humidity": 65.2,
        "pressure": 1013.25
      }
    }
  ]
}
```

### Messages

#### GET /messages
Retrieve message history with filtering.

**Query Parameters:**
- `fromNodeId` (string): Filter by sender node ID
- `toNodeId` (string): Filter by recipient node ID
- `type` (string): Message type
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)

**Response:**
```json
{
  "data": [
    {
      "id": "clp101112131",
      "messageId": "msg123",
      "fromNodeId": "clp123456789",
      "toNodeId": "clp987654321",
      "type": "TEXT",
      "content": {
        "text": "Hello from NODE01!"
      },
      "encrypted": false,
      "hopLimit": 3,
      "hopStart": 3,
      "wantAck": true,
      "priority": "DEFAULT",
      "channel": 0,
      "timestamp": "2024-12-13T10:30:00.000Z",
      "receivedAt": "2024-12-13T10:30:05.000Z",
      "routingPath": ["123456789", "555666777", "987654321"],
      "rssi": -65,
      "snr": 8.5
    }
  ]
}
```

### Networks

#### GET /networks
Retrieve all networks.

**Response:**
```json
{
  "data": [
    {
      "id": "clp987654321",
      "name": "My Mesh Network",
      "description": "Local community mesh network",
      "mqttBroker": "mqtt://broker.example.com:1883",
      "region": "US",
      "isActive": true,
      "createdAt": "2024-12-01T00:00:00.000Z",
      "channels": [
        {
          "index": 0,
          "name": "LongFast",
          "frequency": 906875000,
          "bandwidth": 250,
          "spreadingFactor": 11,
          "codingRate": 8,
          "isDefault": true
        }
      ]
    }
  ]
}
```

### Statistics

#### GET /statistics
Retrieve network statistics and analytics.

**Query Parameters:**
- `networkId` (string): Filter by network ID
- `timeRange` (string): Time range (1h, 24h, 7d, 30d)

**Response:**
```json
{
  "summary": {
    "totalNodes": 150,
    "onlineNodes": 120,
    "offlineNodes": 30,
    "totalMessages": 5420,
    "messagesLast24h": 340
  },
  "nodesByHardware": {
    "TBEAM": 85,
    "HELTEC_V3": 45,
    "RAK4631": 20
  },
  "nodesByRole": {
    "ROUTER": 90,
    "CLIENT": 50,
    "REPEATER": 10
  },
  "messagesByType": {
    "TEXT": 2100,
    "POSITION": 1800,
    "TELEMETRY": 1200,
    "NODEINFO": 320
  },
  "channelUtilization": {
    "average": 12.5,
    "peak": 45.2,
    "timestamp": "2024-12-13T09:15:00.000Z"
  }
}
```

### RF Links (NEW)

#### GET /map/links
Retrieve RF link data for network visualization.

**Query Parameters:**
- `hours` (number): Time range in hours (default: 24, max: 336)
- `nodeId` (string): Filter links for specific node
- `minSuccessRate` (number): Minimum success rate (0-100)

**Example Request:**
```http
GET /api/v1/map/links?hours=24
```

**Response:**
```json
{
  "traceroute_links": [
    {
      "from_node_id": "123456789",
      "to_node_id": "987654321",
      "packet_count": 15,
      "avg_rssi": -65.5,
      "avg_snr": 8.2,
      "last_seen": "2024-12-13T10:30:00Z",
      "success_rate": 100,
      "is_bidirectional": true
    }
  ],
  "packet_links": [
    {
      "from_node_id": "123456789",
      "to_node_id": "555666777",
      "packet_count": 8,
      "avg_rssi": -72.0,
      "avg_snr": 6.5,
      "last_seen": "2024-12-13T10:25:00Z",
      "success_rate": 80,
      "is_bidirectional": false
    }
  ],
  "cached": true,
  "cache_expires_at": "2024-12-13T10:35:00Z"
}
```

### Dashboard Analytics (NEW)

#### GET /analytics/dashboard
Retrieve comprehensive dashboard statistics and metrics.

**Query Parameters:**
- `networkId` (string): Filter by network ID (optional)

**Example Request:**
```http
GET /api/v1/analytics/dashboard
```

**Response:**
```json
{
  "metrics": {
    "total_nodes": 150,
    "active_nodes": 120,
    "active_percentage": 80,
    "gateway_diversity": 5,
    "protocol_diversity": 12,
    "total_messages_24h": 3420,
    "success_rate": 92.5
  },
  "charts": {
    "network_activity_7d": [
      { "date": "2024-12-07", "messages": 3200, "active_nodes": 115 },
      { "date": "2024-12-08", "messages": 3350, "active_nodes": 118 }
    ],
    "node_activity_distribution": {
      "very_active": 25,
      "active": 70,
      "moderate": 20,
      "inactive": 35
    },
    "gateway_activity": [
      { "gateway_id": "555666777", "name": "Gateway01", "message_count": 1250 },
      { "gateway_id": "888999000", "name": "Gateway02", "message_count": 980 }
    ],
    "signal_quality_distribution": {
      "excellent": 45,
      "good": 78,
      "fair": 32,
      "poor": 15
    },
    "routing_patterns": {
      "direct": 1850,
      "one_hop": 980,
      "two_hop": 420,
      "three_plus_hop": 170
    },
    "protocol_usage_24h": {
      "POSITION_APP": 1200,
      "TELEMETRY_APP": 850,
      "NODEINFO_APP": 320,
      "TEXT_MESSAGE_APP": 450,
      "TRACEROUTE_APP": 280,
      "NEIGHBORINFO_APP": 180,
      "OTHER": 140
    },
    "most_active_nodes": [
      {
        "node_id": "123456789",
        "short_name": "NODE01",
        "message_count": 245,
        "messages_per_hour": 10.2,
        "last_seen": "2024-12-13T10:30:00Z"
      }
    ]
  },
  "cached": true,
  "cache_expires_at": "2024-12-13T10:31:00Z"
}
```

### Distance Calculation (NEW)

#### GET /links/longest
Retrieve longest RF links with distance calculations.

**Query Parameters:**
- `minDistance` (number): Minimum distance in km (default: 1)
- `minSnr` (number): Minimum SNR in dB (default: -20)
- `limit` (number): Maximum results (default: 50)

**Example Request:**
```http
GET /api/v1/links/longest?minDistance=5&minSnr=-15
```

**Response:**
```json
{
  "links": [
    {
      "from_node_id": "123456789",
      "from_node_name": "NODE01",
      "to_node_id": "987654321",
      "to_node_name": "NODE02",
      "distance_km": 12.5,
      "distance_mi": 7.8,
      "avg_rssi": -78.5,
      "avg_snr": -12.3,
      "packet_count": 45,
      "success_rate": 85,
      "last_seen": "2024-12-13T10:25:00Z",
      "location_age_warning": false
    }
  ]
}
```

### Line of Sight Analysis (NEW)

#### GET /analysis/line-of-sight
Analyze line of sight between two nodes.

**Query Parameters:**
- `fromNodeId` (string): Source node ID (required)
- `toNodeId` (string): Destination node ID (required)
- `includeElevation` (boolean): Include elevation profile (default: false)

**Example Request:**
```http
GET /api/v1/analysis/line-of-sight?fromNodeId=123456789&toNodeId=987654321&includeElevation=true
```

**Response:**
```json
{
  "from_node": {
    "id": "123456789",
    "name": "NODE01",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "altitude": 10
  },
  "to_node": {
    "id": "987654321",
    "name": "NODE02",
    "latitude": 40.7589,
    "longitude": -73.9851,
    "altitude": 25
  },
  "distance_km": 5.2,
  "distance_mi": 3.2,
  "bearing": 45.5,
  "has_connectivity": true,
  "signal_quality": {
    "avg_rssi": -68.5,
    "avg_snr": 7.2,
    "packet_count": 125,
    "success_rate": 95
  },
  "elevation_profile": {
    "points": [
      { "distance": 0, "elevation": 10 },
      { "distance": 1.3, "elevation": 45 },
      { "distance": 2.6, "elevation": 38 },
      { "distance": 3.9, "elevation": 22 },
      { "distance": 5.2, "elevation": 25 }
    ],
    "max_elevation": 45,
    "min_elevation": 10,
    "fresnel_zone_clearance": true,
    "obstructions": []
  }
}
```

### Gateway Comparison (NEW)

#### GET /gateways/compare
Compare signal quality between two gateways.

**Query Parameters:**
- `gateway1` (string): First gateway ID (required)
- `gateway2` (string): Second gateway ID (required)
- `hours` (number): Time range in hours (default: 24)
- `sourceNode` (string): Filter by source node (optional)

**Example Request:**
```http
GET /api/v1/gateways/compare?gateway1=555666777&gateway2=888999000&hours=24
```

**Response:**
```json
{
  "gateway1": {
    "id": "555666777",
    "name": "Gateway01",
    "packet_count": 1250,
    "avg_rssi": -72.5,
    "avg_snr": 6.8,
    "unique_sources": 85
  },
  "gateway2": {
    "id": "888999000",
    "name": "Gateway02",
    "packet_count": 980,
    "avg_rssi": -75.2,
    "avg_snr": 5.5,
    "unique_sources": 72
  },
  "common_packets": [
    {
      "mesh_packet_id": "pkt123",
      "from_node_id": "123456789",
      "timestamp": "2024-12-13T10:20:00Z",
      "gateway1_rssi": -68,
      "gateway1_snr": 8.5,
      "gateway2_rssi": -72,
      "gateway2_snr": 6.2,
      "rssi_difference": 4,
      "snr_difference": 2.3
    }
  ],
  "statistics": {
    "common_packet_count": 450,
    "avg_rssi_difference": 3.2,
    "avg_snr_difference": 1.8,
    "gateway1_better_count": 280,
    "gateway2_better_count": 170
  }
}
```

### Packet Grouping (NEW)

#### GET /packets/grouped
Retrieve packets with grouping by packet ID.

**Query Parameters:**
- `groupBy` (boolean): Enable grouping (default: false)
- `startTime` (string): Start time (ISO 8601)
- `endTime` (string): End time (ISO 8601)
- `fromNode` (string): Filter by sender
- `toNode` (string): Filter by receiver
- `gateway` (string): Filter by gateway
- `portnum` (number): Filter by port number
- `hopCount` (string): Filter by hop count (any, direct, 1, 2, 3, 4+)
- `minRssi` (number): Minimum RSSI
- `maxRssi` (number): Maximum RSSI
- `minSnr` (number): Minimum SNR
- `maxSnr` (number): Maximum SNR

**Example Request:**
```http
GET /api/v1/packets/grouped?groupBy=true&startTime=2024-12-13T00:00:00Z&endTime=2024-12-13T23:59:59Z
```

**Response:**
```json
{
  "groups": [
    {
      "mesh_packet_id": "pkt123",
      "from_node_id": "123456789",
      "to_node_id": "987654321",
      "portnum": 3,
      "portnum_name": "POSITION_APP",
      "gateway_count": 3,
      "reception_count": 5,
      "rssi_min": -78,
      "rssi_max": -65,
      "rssi_avg": -71.5,
      "snr_min": 5.2,
      "snr_max": 8.5,
      "snr_avg": 6.8,
      "hop_min": 0,
      "hop_max": 2,
      "relay_nodes": "0x555666, 0x777888*2",
      "first_seen": "2024-12-13T10:20:00Z",
      "last_seen": "2024-12-13T10:20:05Z"
    }
  ],
  "total": 1250,
  "page": 1,
  "limit": 50
}
```

### Data Export

#### GET /export/nodes
Export node data in various formats.

**Query Parameters:**
- `format` (string): Export format (csv, json, kml)
- `fields` (string): Comma-separated list of fields to include
- Filtering parameters (same as GET /nodes)

**Response (CSV):**
```csv
nodeId,shortName,longName,hardwareModel,role,isOnline,latitude,longitude
123456789,NODE01,My Meshtastic Node 01,TBEAM,ROUTER,true,40.7128,-74.0060
987654321,NODE02,My Meshtastic Node 02,HELTEC_V3,CLIENT,false,40.7589,-73.9851
```

#### POST /export/backup
Create a full system backup (Admin only).

**Response:**
```json
{
  "backupId": "backup_20241213_103000",
  "filename": "meshtastic_backup_20241213_103000.sql",
  "size": 15728640,
  "createdAt": "2024-12-13T10:30:00.000Z",
  "downloadUrl": "/api/v1/export/backup/backup_20241213_103000"
}
```

### Authentication

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clp202122232",
    "username": "admin",
    "email": "admin@example.com",
    "role": "ADMIN"
  },
  "expiresAt": "2024-12-14T10:30:00.000Z"
}
```

#### POST /auth/register
Register a new user account.

#### GET /auth/profile
Get current user profile (requires authentication).

#### POST /auth/refresh
Refresh JWT token.

## WebSocket API

The WebSocket API provides real-time updates for mesh network data.

### Connection

Connect to the WebSocket server:

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token' // Optional, if authentication is enabled
  }
});
```

### Events

#### Client → Server Events

**Subscribe to Node Updates:**
```javascript
socket.emit('subscribe', {
  type: 'nodes',
  filters: {
    networkId: 'clp987654321',
    hardwareModel: 'TBEAM'
  }
});
```

**Unsubscribe:**
```javascript
socket.emit('unsubscribe', {
  type: 'nodes'
});
```

**Request MQTT Status:**
```javascript
socket.emit('getMQTTStatus');
```

#### Server → Client Events

**Node Updates:**
```javascript
socket.on('nodeUpdate', (data) => {
  console.log('Node updated:', data);
  // {
  //   type: 'node_updated',
  //   nodeId: 'clp123456789',
  //   data: { ... node data ... }
  // }
});
```

**Position Updates:**
```javascript
socket.on('positionUpdate', (data) => {
  console.log('Position updated:', data);
  // {
  //   type: 'position_updated',
  //   nodeId: 'clp123456789',
  //   position: { latitude: 40.7128, longitude: -74.0060, ... }
  // }
});
```

**Telemetry Updates:**
```javascript
socket.on('telemetryUpdate', (data) => {
  console.log('Telemetry updated:', data);
  // {
  //   type: 'telemetry_updated',
  //   nodeId: 'clp123456789',
  //   telemetry: { batteryLevel: 85, voltage: 4.1, ... }
  // }
});
```

**Message Updates:**
```javascript
socket.on('messageReceived', (data) => {
  console.log('New message:', data);
  // {
  //   type: 'message_received',
  //   message: { ... message data ... }
  // }
});
```

**Network Status:**
```javascript
socket.on('networkStatus', (data) => {
  console.log('Network status:', data);
  // {
  //   networkId: 'clp987654321',
  //   status: 'connected' | 'disconnected' | 'error',
  //   error?: 'Connection timeout'
  // }
});
```

**MQTT Status:**
```javascript
socket.on('mqttStatus', (data) => {
  console.log('MQTT status:', data);
  // {
  //   connected: true,
  //   networks: [
  //     {
  //       networkId: 'clp987654321',
  //       status: 'connected',
  //       messagesReceived: 1250,
  //       lastMessage: '2024-12-13T10:30:00.000Z'
  //     }
  //   ]
  // }
});
```

## Data Models

### Node
```typescript
interface Node {
  id: string;
  nodeId: string;
  hexId: string;
  shortName?: string;
  longName?: string;
  hardwareModel?: string;
  firmwareVersion?: string;
  role: 'CLIENT' | 'ROUTER' | 'REPEATER' | 'TRACKER';
  isOnline: boolean;
  mqttConnected: boolean;
  batteryLevel?: number;
  voltage?: number;
  channelUtilization?: number;
  airUtilTx?: number;
  lastSeen?: Date;
  lastHeard?: Date;
  position?: Position;
  neighbors?: NodeNeighbor[];
  networkId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Position
```typescript
interface Position {
  id: string;
  nodeId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  precision?: number;
  timestamp: Date;
  source: 'GPS' | 'MANUAL' | 'ESTIMATED' | 'NETWORK';
}
```

### TelemetryReading
```typescript
interface TelemetryReading {
  id: string;
  nodeId: string;
  type: 'DEVICE_METRICS' | 'ENVIRONMENT_METRICS' | 'POWER_METRICS';
  timestamp: Date;
  data: {
    // Device Metrics
    batteryLevel?: number;
    voltage?: number;
    channelUtilization?: number;
    airUtilTx?: number;
    
    // Environment Metrics
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

### Message
```typescript
interface Message {
  id: string;
  messageId?: string;
  fromNodeId: string;
  toNodeId?: string;
  type: 'TEXT' | 'POSITION' | 'TELEMETRY' | 'NODEINFO' | 'ROUTING';
  content: any;
  encrypted: boolean;
  hopLimit?: number;
  hopStart?: number;
  wantAck: boolean;
  priority: 'UNSET' | 'MIN' | 'BACKGROUND' | 'DEFAULT' | 'RELIABLE' | 'ACK' | 'MAX';
  channel: number;
  timestamp: Date;
  receivedAt: Date;
  routingPath: string[];
  rssi?: number;
  snr?: number;
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "nodeId",
      "reason": "Node ID must be a valid string"
    },
    "timestamp": "2024-12-13T10:30:00.000Z",
    "path": "/api/v1/nodes"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business logic error)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_REQUIRED` - Authentication token required
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `DUPLICATE_RESOURCE` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `DATABASE_ERROR` - Database operation failed
- `MQTT_CONNECTION_ERROR` - MQTT broker connection failed

## Rate Limiting

The API implements rate limiting to prevent abuse:

### Default Limits

- **General API**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **Data Export**: 5 requests per minute per user
- **WebSocket Connections**: 10 connections per IP

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702464600
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

## Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  }
});

// Get all online nodes
async function getOnlineNodes() {
  try {
    const response = await api.get('/nodes', {
      params: { isOnline: true }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching nodes:', error.response.data);
  }
}

// Get telemetry for a specific node
async function getNodeTelemetry(nodeId, hours = 24) {
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  try {
    const response = await api.get('/telemetry', {
      params: {
        nodeId,
        startDate: startDate.toISOString(),
        type: 'DEVICE_METRICS'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching telemetry:', error.response.data);
  }
}
```

### Python

```python
import requests
from datetime import datetime, timedelta

class MeshtasticAPI:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url
        self.session = requests.Session()
        if api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            })
    
    def get_nodes(self, **filters):
        """Get nodes with optional filtering"""
        response = self.session.get(f'{self.base_url}/nodes', params=filters)
        response.raise_for_status()
        return response.json()
    
    def get_node_telemetry(self, node_id, hours=24):
        """Get telemetry data for a specific node"""
        start_date = datetime.now() - timedelta(hours=hours)
        
        params = {
            'nodeId': node_id,
            'startDate': start_date.isoformat(),
            'type': 'DEVICE_METRICS'
        }
        
        response = self.session.get(f'{self.base_url}/telemetry', params=params)
        response.raise_for_status()
        return response.json()

# Usage
api = MeshtasticAPI('http://localhost:3001/api/v1', 'your-api-key')

# Get all TBEAM nodes
tbeam_nodes = api.get_nodes(hardwareModel='TBEAM')

# Get recent telemetry
telemetry = api.get_node_telemetry('clp123456789', hours=6)
```

### cURL Examples

```bash
# Get all nodes
curl -X GET "http://localhost:3001/api/v1/nodes" \
  -H "Authorization: Bearer your-api-key"

# Get node by ID
curl -X GET "http://localhost:3001/api/v1/nodes/clp123456789" \
  -H "Authorization: Bearer your-api-key"

# Get telemetry data
curl -X GET "http://localhost:3001/api/v1/telemetry?nodeId=clp123456789&type=DEVICE_METRICS" \
  -H "Authorization: Bearer your-api-key"

# Export nodes as CSV
curl -X GET "http://localhost:3001/api/v1/export/nodes?format=csv" \
  -H "Authorization: Bearer your-api-key" \
  -o nodes.csv

# Create a backup
curl -X POST "http://localhost:3001/api/v1/export/backup" \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json"
```

This API documentation provides comprehensive information for integrating with the Meshtastic Node Mapper API. For additional examples and use cases, please refer to the project's GitHub repository.