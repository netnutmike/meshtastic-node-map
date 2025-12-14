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