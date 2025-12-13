/**
 * Unit tests for API endpoints
 * Tests all CRUD operations for each entity type
 * Validates request/response formats and error codes
 * Tests authentication and authorization logic
 * Requirements: 28.1, 21.4
 */

import request from 'supertest';
import { app } from '../index';
import { NodeRepository } from '../database/repositories/node.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { NetworkRepository } from '../database/repositories/network.repository';
import { NodeRole, PositionSource, TelemetryType, MessageType, LoRaRegion } from '../types/database';
import jwt from 'jsonwebtoken';

describe('API Endpoints Unit Tests', () => {
  let nodeRepository: NodeRepository;
  let positionRepository: PositionRepository;
  let telemetryRepository: TelemetryRepository;
  let messageRepository: MessageRepository;
  let networkRepository: NetworkRepository;
  let testNetworkId: string;
  let testNodeId: string;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    nodeRepository = new NodeRepository();
    positionRepository = new PositionRepository();
    telemetryRepository = new TelemetryRepository();
    messageRepository = new MessageRepository();
    networkRepository = new NetworkRepository();

    // Generate test JWT tokens
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    adminToken = jwt.sign(
      { id: '1', username: 'admin', role: 'admin', permissions: ['read', 'write', 'admin'] },
      secret,
      { expiresIn: '1h' }
    );
    viewerToken = jwt.sign(
      { id: '3', username: 'viewer', role: 'viewer', permissions: ['read'] },
      secret,
      { expiresIn: '1h' }
    );

    // Create test network
    const testNetwork = await networkRepository.create({
      name: 'Test Network',
      description: 'Network for unit testing',
      mqttBroker: 'mqtt://test-broker:1883',
      mqttCredentials: { username: 'test', password: 'test' },
      region: LoRaRegion.US,
      isActive: true
    });
    testNetworkId = testNetwork.id;

    // Create test node
    const testNode = await nodeRepository.create({
      nodeId: '12345678',
      hexId: 'abcd1234',
      shortName: 'TEST',
      longName: 'Test Node',
      hardwareModel: 'TBEAM',
      firmwareVersion: '2.2.0',
      role: NodeRole.ROUTER,
      networkId: testNetworkId
    });
    testNodeId = testNode.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testNodeId) {
      await nodeRepository.delete(testNodeId);
    }
    if (testNetworkId) {
      await networkRepository.delete(testNetworkId);
    }
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/v1/auth/login - successful login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.role).toBe('admin');
    });

    test('POST /api/v1/auth/login - invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });

    test('POST /api/v1/auth/login - missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('GET /api/v1/auth/me - with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.role).toBe('admin');
    });

    test('GET /api/v1/auth/me - without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.error).toBe('TOKEN_REQUIRED');
    });
  });

  describe('Node Endpoints', () => {
    test('GET /api/v1/nodes - list nodes', async () => {
      const response = await request(app)
        .get('/api/v1/nodes')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/nodes - with filters', async () => {
      const response = await request(app)
        .get('/api/v1/nodes')
        .query({
          role: 'ROUTER',
          isOnline: true,
          page: 1,
          limit: 10
        })
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    test('GET /api/v1/nodes/:id - get specific node', async () => {
      const response = await request(app)
        .get(`/api/v1/nodes/${testNodeId}`)
        .expect(200);

      expect(response.body.data.id).toBe(testNodeId);
      expect(response.body.data.nodeId).toBe('12345678');
    });

    test('GET /api/v1/nodes/:id - non-existent node', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/v1/nodes/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('NOT_FOUND');
    });

    test('POST /api/v1/nodes - create node with admin token', async () => {
      const nodeData = {
        nodeId: '87654321',
        hexId: '4321dcba',
        shortName: 'NEW',
        longName: 'New Test Node',
        role: 'CLIENT',
        networkId: testNetworkId
      };

      const response = await request(app)
        .post('/api/v1/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(nodeData)
        .expect(201);

      expect(response.body.data.nodeId).toBe(nodeData.nodeId);
      expect(response.body.data.hexId).toBe(nodeData.hexId);

      // Clean up
      await nodeRepository.delete(response.body.data.id);
    });

    test('POST /api/v1/nodes - create node without permission', async () => {
      const nodeData = {
        nodeId: '87654321',
        hexId: '4321dcba',
        shortName: 'NEW',
        longName: 'New Test Node',
        role: 'CLIENT',
        networkId: testNetworkId
      };

      const response = await request(app)
        .post('/api/v1/nodes')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(nodeData)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    test('POST /api/v1/nodes - invalid data', async () => {
      const invalidData = {
        nodeId: '', // Invalid: empty
        hexId: '4321dcba',
        role: 'INVALID_ROLE', // Invalid role
        networkId: 'not-a-uuid' // Invalid UUID
      };

      const response = await request(app)
        .post('/api/v1/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('PUT /api/v1/nodes/:id - update node', async () => {
      const updateData = {
        batteryLevel: 85,
        isOnline: true,
        channelUtilization: 25.5
      };

      const response = await request(app)
        .put(`/api/v1/nodes/${testNodeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.batteryLevel).toBe(85);
      expect(response.body.data.isOnline).toBe(true);
    });

    test('GET /api/v1/nodes/:id/positions - get node positions', async () => {
      const response = await request(app)
        .get(`/api/v1/nodes/${testNodeId}/positions`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/nodes/:id/neighbors - get node neighbors', async () => {
      const response = await request(app)
        .get(`/api/v1/nodes/${testNodeId}/neighbors`)
        .expect(200);

      expect(response.body.data).toHaveProperty('heardBy');
      expect(response.body.data).toHaveProperty('heard');
      expect(Array.isArray(response.body.data.heardBy)).toBe(true);
      expect(Array.isArray(response.body.data.heard)).toBe(true);
    });
  });

  describe('Position Endpoints', () => {
    let testPositionId: string;

    test('POST /api/v1/positions - create position', async () => {
      const positionData = {
        nodeId: testNodeId,
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: 10,
        precision: 5,
        timestamp: new Date().toISOString(),
        source: 'GPS'
      };

      const response = await request(app)
        .post('/api/v1/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(positionData)
        .expect(201);

      expect(response.body.data.latitude).toBeCloseTo(40.7128, 4);
      expect(response.body.data.longitude).toBeCloseTo(-74.0060, 4);
      testPositionId = response.body.data.id;
    });

    test('GET /api/v1/positions - list positions', async () => {
      const response = await request(app)
        .get('/api/v1/positions')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/positions/:id - get specific position', async () => {
      const response = await request(app)
        .get(`/api/v1/positions/${testPositionId}`)
        .expect(200);

      expect(response.body.data.id).toBe(testPositionId);
      expect(response.body.data.latitude).toBeCloseTo(40.7128, 4);
    });

    test('GET /api/v1/positions/latest - get latest positions', async () => {
      const response = await request(app)
        .get('/api/v1/positions/latest')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    afterAll(async () => {
      if (testPositionId) {
        await positionRepository.delete(testPositionId);
      }
    });
  });

  describe('Telemetry Endpoints', () => {
    let testTelemetryId: string;

    test('POST /api/v1/telemetry - create telemetry reading', async () => {
      const telemetryData = {
        nodeId: testNodeId,
        type: 'DEVICE_METRICS',
        timestamp: new Date().toISOString(),
        data: {
          batteryLevel: 75,
          voltage: 3.7,
          channelUtilization: 15.5,
          airUtilTx: 8.2
        }
      };

      const response = await request(app)
        .post('/api/v1/telemetry')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(telemetryData)
        .expect(201);

      expect(response.body.data.type).toBe('DEVICE_METRICS');
      expect(response.body.data.data.batteryLevel).toBe(75);
      testTelemetryId = response.body.data.id;
    });

    test('GET /api/v1/telemetry - list telemetry readings', async () => {
      const response = await request(app)
        .get('/api/v1/telemetry')
        .query({ type: 'DEVICE_METRICS' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/telemetry/latest/:nodeId - get latest telemetry for node', async () => {
      const response = await request(app)
        .get(`/api/v1/telemetry/latest/${testNodeId}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('node');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    afterAll(async () => {
      if (testTelemetryId) {
        await telemetryRepository.delete(testTelemetryId);
      }
    });
  });

  describe('Message Endpoints', () => {
    let testMessageId: string;

    test('POST /api/v1/messages - create message', async () => {
      const messageData = {
        fromNodeId: testNodeId,
        type: 'TEXT',
        content: 'Hello, world!',
        encrypted: false,
        wantAck: false,
        priority: 'DEFAULT',
        channel: 0,
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.data.type).toBe('TEXT');
      expect(response.body.data.content).toBe('Hello, world!');
      testMessageId = response.body.data.id;
    });

    test('GET /api/v1/messages - list messages', async () => {
      const response = await request(app)
        .get('/api/v1/messages')
        .query({ type: 'TEXT' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/messages/:id - get specific message', async () => {
      const response = await request(app)
        .get(`/api/v1/messages/${testMessageId}`)
        .expect(200);

      expect(response.body.data.id).toBe(testMessageId);
      expect(response.body.data.content).toBe('Hello, world!');
    });

    afterAll(async () => {
      if (testMessageId) {
        await messageRepository.delete(testMessageId);
      }
    });
  });

  describe('Network Endpoints', () => {
    test('GET /api/v1/networks - list networks', async () => {
      const response = await request(app)
        .get('/api/v1/networks')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Check that credentials are redacted
      if (response.body.data.length > 0) {
        expect(response.body.data[0].mqttCredentials).toEqual({ configured: true });
      }
    });

    test('GET /api/v1/networks/:id - get specific network', async () => {
      const response = await request(app)
        .get(`/api/v1/networks/${testNetworkId}`)
        .expect(200);

      expect(response.body.data.id).toBe(testNetworkId);
      expect(response.body.data.name).toBe('Test Network');
      // Check that credentials are redacted
      expect(response.body.data.mqttCredentials).toEqual({ configured: true });
    });

    test('POST /api/v1/networks - create network (admin only)', async () => {
      const networkData = {
        name: 'New Test Network',
        description: 'Another test network',
        mqttBroker: 'mqtt://new-broker:1883',
        mqttCredentials: { username: 'newuser', password: 'newpass' },
        region: 'EU_868',
        isActive: true
      };

      const response = await request(app)
        .post('/api/v1/networks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(networkData)
        .expect(201);

      expect(response.body.data.name).toBe('New Test Network');
      expect(response.body.data.region).toBe('EU_868');

      // Clean up
      await networkRepository.delete(response.body.data.id);
    });

    test('POST /api/v1/networks - unauthorized (viewer role)', async () => {
      const networkData = {
        name: 'Unauthorized Network',
        mqttBroker: 'mqtt://unauthorized:1883',
        mqttCredentials: {},
        region: 'US'
      };

      const response = await request(app)
        .post('/api/v1/networks')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(networkData)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    test('GET /api/v1/networks/:id/stats - get network statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/networks/${testNetworkId}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('network');
    });
  });

  describe('Rate Limiting', () => {
    test('Rate limiting headers are present', async () => {
      const response = await request(app)
        .get('/api/v1/nodes')
        .expect(200);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('Error Handling', () => {
    test('Invalid UUID parameter returns 400', async () => {
      const response = await request(app)
        .get('/api/v1/nodes/invalid-uuid')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('Non-existent endpoint returns 404', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('NOT_FOUND');
    });

    test('Malformed JSON returns 400', async () => {
      const response = await request(app)
        .post('/api/v1/nodes')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });
});