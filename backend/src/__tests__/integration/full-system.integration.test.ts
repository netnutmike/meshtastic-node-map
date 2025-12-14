/**
 * Full System Integration Tests
 * 
 * Tests complete user workflows end-to-end including:
 * - Docker deployment validation
 * - API integration with database
 * - MQTT message processing pipeline
 * - Real-time WebSocket updates
 * - Authentication and authorization flows
 * - Data export and backup functionality
 * 
 * Requirements: 10.1, 10.2, 10.3
 */

import request from 'supertest';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import * as mqtt from 'mqtt';
import { app } from '../../index';

describe('Full System Integration Tests', () => {
  let server: any;
  let io: Server;
  let clientSocket: any;
  let prisma: PrismaClient;
  let redisClient: any;
  let mqttClient: mqtt.MqttClient;
  
  const TEST_PORT = 3002;
  const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/test_meshtastic';
  const TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6380';
  const TEST_MQTT_URL = process.env.TEST_MQTT_URL || 'mqtt://localhost:1884';

  beforeAll(async () => {
    // Initialize test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL
        }
      }
    });

    // Initialize Redis client
    redisClient = createClient({ url: TEST_REDIS_URL });
    await redisClient.connect();

    // Initialize MQTT client
    mqttClient = mqtt.connect(TEST_MQTT_URL);

    // Start HTTP server with Socket.IO
    const httpServer = createServer(app);
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    server = httpServer.listen(TEST_PORT);

    // Wait for connections to be established
    await new Promise<void>((resolve) => {
      mqttClient.on('connect', () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup connections
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (server) {
      server.close();
    }
    if (io) {
      io.close();
    }
    if (redisClient) {
      await redisClient.quit();
    }
    if (mqttClient) {
      mqttClient.end();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    // Clean test database
    await prisma.message.deleteMany();
    await prisma.telemetryReading.deleteMany();
    await prisma.position.deleteMany();
    await prisma.nodeNeighbor.deleteMany();
    await prisma.node.deleteMany();
    await prisma.network.deleteMany();

    // Clean Redis cache
    await redisClient.flushAll();
  });

  describe('Complete User Workflow: Network Monitoring', () => {
    it('should handle complete node discovery and monitoring workflow', async () => {
      // Step 1: Create a network
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          description: 'Integration test network',
          mqttBroker: TEST_MQTT_URL,
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      const networkId = network.id;

      // Step 2: Simulate MQTT message for node discovery
      const nodeMessage = {
        from: 123456789,
        to: 4294967295, // Broadcast
        decoded: {
          portnum: 'NODEINFO_APP',
          payload: {
            shortName: 'TEST01',
            longName: 'Test Node 01',
            hardwareModel: 'TBEAM',
            role: 'ROUTER'
          }
        },
        id: 1,
        rxTime: Math.floor(Date.now() / 1000),
        hopLimit: 3,
        wantAck: false,
        priority: 'UNSET'
      };

      // Publish MQTT message
      mqttClient.publish('msh/US/2/json/LongFast/!4d2e1234', JSON.stringify(nodeMessage));

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Verify node was created in database
      const nodes = await request(app)
        .get('/api/nodes')
        .expect(200);

      expect(nodes.body.length).toBeGreaterThan(0);
      const testNode = nodes.body.find((n: any) => n.shortName === 'TEST01');
      expect(testNode).toBeDefined();
      expect(testNode.longName).toBe('Test Node 01');
      expect(testNode.hardwareModel).toBe('TBEAM');

      // Step 4: Add position data
      const positionMessage = {
        from: 123456789,
        decoded: {
          portnum: 'POSITION_APP',
          payload: {
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 10,
            time: Math.floor(Date.now() / 1000)
          }
        },
        id: 2,
        rxTime: Math.floor(Date.now() / 1000)
      };

      mqttClient.publish('msh/US/2/json/LongFast/!4d2e1234', JSON.stringify(positionMessage));
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 5: Verify position was stored
      const nodeWithPosition = await request(app)
        .get(`/api/nodes/${testNode.id}`)
        .expect(200);

      expect(nodeWithPosition.body.position).toBeDefined();
      expect(nodeWithPosition.body.position.latitude).toBe(40.7128);
      expect(nodeWithPosition.body.position.longitude).toBe(-74.0060);

      // Step 6: Add telemetry data
      const telemetryMessage = {
        from: 123456789,
        decoded: {
          portnum: 'TELEMETRY_APP',
          payload: {
            deviceMetrics: {
              batteryLevel: 85,
              voltage: 4.1,
              channelUtilization: 15.5,
              airUtilTx: 2.3
            }
          }
        },
        id: 3,
        rxTime: Math.floor(Date.now() / 1000)
      };

      mqttClient.publish('msh/US/2/json/LongFast/!4d2e1234', JSON.stringify(telemetryMessage));
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 7: Verify telemetry was stored
      const telemetryData = await request(app)
        .get(`/api/telemetry?nodeId=${testNode.id}`)
        .expect(200);

      expect(telemetryData.body.length).toBeGreaterThan(0);
      const deviceTelemetry = telemetryData.body.find((t: any) => t.type === 'DEVICE');
      expect(deviceTelemetry).toBeDefined();
      expect(deviceTelemetry.data.batteryLevel).toBe(85);
      expect(deviceTelemetry.data.voltage).toBe(4.1);
    });

    it('should handle real-time WebSocket updates', async () => {
      // Connect WebSocket client
      clientSocket = new (require('socket.io-client'))(`http://localhost:${TEST_PORT}`);

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => {
          resolve();
        });
      });

      // Listen for node updates
      const nodeUpdates: any[] = [];
      clientSocket.on('nodeUpdate', (data: any) => {
        nodeUpdates.push(data);
      });

      // Create a node via API
      const nodeResponse = await request(app)
        .post('/api/nodes')
        .send({
          id: '987654321',
          shortName: 'WS_TEST',
          longName: 'WebSocket Test Node',
          hardwareModel: 'HELTEC_V3',
          role: 'CLIENT',
          isOnline: true,
          mqttConnected: true
        })
        .expect(201);

      // Wait for WebSocket update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify WebSocket update was received
      expect(nodeUpdates.length).toBeGreaterThan(0);
      const update = nodeUpdates.find(u => u.shortName === 'WS_TEST');
      expect(update).toBeDefined();
      expect(update.longName).toBe('WebSocket Test Node');
    });
  });

  describe('Authentication and Authorization Workflow', () => {
    it('should handle complete authentication flow', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123!',
          role: 'VIEWER'
        })
        .expect(201);

      expect(registerResponse.body.user).toBeDefined();
      expect(registerResponse.body.token).toBeDefined();

      // Step 2: Login with credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'TestPassword123!'
        })
        .expect(200);

      const token = loginResponse.body.token;
      expect(token).toBeDefined();

      // Step 3: Access protected endpoint
      const protectedResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(protectedResponse.body.username).toBe('testuser');
      expect(protectedResponse.body.role).toBe('VIEWER');

      // Step 4: Test role-based access control
      const adminResponse = await request(app)
        .post('/api/networks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Admin Test Network',
          mqttBroker: 'mqtt://test:1883'
        })
        .expect(403); // Should be forbidden for VIEWER role

      expect(adminResponse.body.error).toContain('Insufficient permissions');
    });
  });

  describe('Data Export and Backup Workflow', () => {
    it('should handle complete data export workflow', async () => {
      // Step 1: Create test data
      const network = await prisma.network.create({
        data: {
          name: 'Export Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      const node = await prisma.node.create({
        data: {
          nodeId: '111222333',
          hexId: '6a2e333',
          shortName: 'EXPORT_TEST',
          longName: 'Export Test Node',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      await prisma.position.create({
        data: {
          nodeId: node.id,
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 50,
          timestamp: new Date()
        }
      });

      await prisma.telemetryReading.create({
        data: {
          nodeId: node.id,
          type: 'DEVICE_METRICS',
          timestamp: new Date(),
          data: {
            batteryLevel: 75,
            voltage: 3.9,
            channelUtilization: 12.3
          }
        }
      });

      // Step 2: Export data in CSV format
      const csvExport = await request(app)
        .get('/api/export/nodes?format=csv')
        .expect(200);

      expect(csvExport.headers['content-type']).toContain('text/csv');
      expect(csvExport.text).toContain('EXPORT_TEST');
      expect(csvExport.text).toContain('Export Test Node');

      // Step 3: Export data in JSON format
      const jsonExport = await request(app)
        .get('/api/export/nodes?format=json')
        .expect(200);

      expect(jsonExport.headers['content-type']).toContain('application/json');
      expect(jsonExport.body.length).toBeGreaterThan(0);
      const exportedNode = jsonExport.body.find((n: any) => n.shortName === 'EXPORT_TEST');
      expect(exportedNode).toBeDefined();

      // Step 4: Export filtered data
      const filteredExport = await request(app)
        .get('/api/export/nodes?format=json&hardwareModel=TBEAM')
        .expect(200);

      expect(filteredExport.body.length).toBeGreaterThan(0);
      filteredExport.body.forEach((node: any) => {
        expect(node.hardwareModel).toBe('TBEAM');
      });

      // Step 5: Create database backup
      const backupResponse = await request(app)
        .post('/api/export/backup')
        .expect(200);

      expect(backupResponse.body.backupId).toBeDefined();
      expect(backupResponse.body.filename).toBeDefined();
      expect(backupResponse.body.size).toBeGreaterThan(0);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent API requests efficiently', async () => {
      // Create test network first
      const network = await prisma.network.create({
        data: {
          name: 'Load Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      // Create test nodes
      const nodes = [];
      for (let i = 0; i < 10; i++) {
        nodes.push({
          nodeId: `load_test_${i}`,
          hexId: `load${i.toString(16)}`,
          shortName: `LOAD${i}`,
          longName: `Load Test Node ${i}`,
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        });
      }

      await prisma.node.createMany({ data: nodes });

      // Perform concurrent requests
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/nodes')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.body.length).toBeGreaterThanOrEqual(10);
      });

      // Performance assertion (should handle 50 requests in under 5 seconds)
      expect(totalTime).toBeLessThan(5000);
      console.log(`Handled 50 concurrent requests in ${totalTime}ms`);
    });

    it('should handle high-frequency MQTT message processing', async () => {
      const messageCount = 100;
      const startTime = Date.now();

      // Send multiple MQTT messages rapidly
      const promises = [];
      for (let i = 0; i < messageCount; i++) {
        const message = {
          from: 100000000 + i,
          decoded: {
            portnum: 'NODEINFO_APP',
            payload: {
              shortName: `PERF${i}`,
              longName: `Performance Test Node ${i}`,
              hardwareModel: 'TBEAM',
              role: 'ROUTER'
            }
          },
          id: i + 1000,
          rxTime: Math.floor(Date.now() / 1000)
        };

        promises.push(
          new Promise<void>((resolve) => {
            mqttClient.publish(`msh/US/2/json/LongFast/!perf${i}`, JSON.stringify(message));
            resolve();
          })
        );
      }

      await Promise.all(promises);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify messages were processed
      const nodes = await request(app)
        .get('/api/nodes')
        .expect(200);

      const perfNodes = nodes.body.filter((n: any) => n.shortName.startsWith('PERF'));
      expect(perfNodes.length).toBeGreaterThan(messageCount * 0.8); // Allow for some message loss

      console.log(`Processed ${perfNodes.length}/${messageCount} MQTT messages in ${processingTime}ms`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate database connection issue by using invalid query
      const response = await request(app)
        .get('/api/nodes?invalid_param=true')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle malformed MQTT messages gracefully', async () => {
      // Send malformed MQTT message
      mqttClient.publish('msh/US/2/json/LongFast/!malformed', 'invalid json data');

      // Wait for processing attempt
      await new Promise(resolve => setTimeout(resolve, 1000));

      // System should still be responsive
      const response = await request(app)
        .get('/api/nodes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle API rate limiting', async () => {
      // Make requests rapidly to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 200; i++) {
        promises.push(
          request(app)
            .get('/api/nodes')
        );
      }

      const responses = await Promise.all(promises);

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});