/**
 * **Feature: meshtastic-node-mapper, Property 10: Data storage and interface updates**
 * **Validates: Requirements 13.1, 13.2**
 * 
 * Property: For any new data stored in the database, the web interface should reflect 
 * the changes within the configured update interval
 */

import * as fc from 'fast-check';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { NodeRepository } from '../database/repositories/node.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { NetworkRepository } from '../database/repositories/network.repository';
import { NodeRole, PositionSource, TelemetryType, MessageType, MessagePriority, LoRaRegion } from '../types/database';

describe('API Data Consistency Property Tests', () => {
  let nodeRepository: NodeRepository;
  let positionRepository: PositionRepository;
  let telemetryRepository: TelemetryRepository;
  let messageRepository: MessageRepository;
  let networkRepository: NetworkRepository;
  let testNetworkId: string;
  let adminToken: string;

  beforeAll(async () => {
    nodeRepository = new NodeRepository();
    positionRepository = new PositionRepository();
    telemetryRepository = new TelemetryRepository();
    messageRepository = new MessageRepository();
    networkRepository = new NetworkRepository();

    // Generate test JWT token
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    adminToken = jwt.sign(
      { id: '1', username: 'admin', role: 'admin', permissions: ['read', 'write', 'admin'] },
      secret,
      { expiresIn: '1h' }
    );

    // Create a test network for all tests
    const testNetwork = await networkRepository.create({
      name: 'Test Network',
      description: 'Network for property testing',
      mqttBroker: 'mqtt://test-broker:1883',
      mqttCredentials: { username: 'test', password: 'test' },
      region: LoRaRegion.US,
      isActive: true
    });
    testNetworkId = testNetwork.id;
  });

  afterAll(async () => {
    // Clean up test network
    if (testNetworkId) {
      await networkRepository.delete(testNetworkId);
    }
  });

  // Generators for test data with proper uniqueness
  const nodeIdArbitrary = fc.integer({ min: 1, max: 0xFFFFFFFF }).map((num) => {
    // Generate a proper Meshtastic node ID format like !12345678
    // Use timestamp + random to ensure uniqueness
    const timestamp = Date.now();
    const unique = (timestamp + num) % 0xFFFFFFFF;
    return `!${unique.toString(16).padStart(8, '0')}`;
  });
  
  const hexIdArbitrary = fc.integer({ min: 1, max: 0xFFFFFFFF }).map((num) => {
    // Generate proper 8-character hex ID
    // Use timestamp + random to ensure uniqueness
    const timestamp = Date.now();
    const unique = (timestamp + num + 1000) % 0xFFFFFFFF;
    return unique.toString(16).padStart(8, '0');
  });
  const shortNameArbitrary = fc.string({ minLength: 1, maxLength: 4 });
  const longNameArbitrary = fc.string({ minLength: 1, maxLength: 40 });
  const roleArbitrary = fc.constantFrom(...Object.values(NodeRole));
  const latitudeArbitrary = fc.float({ min: -90, max: 90 });
  const longitudeArbitrary = fc.float({ min: -180, max: 180 });
  const altitudeArbitrary = fc.float({ min: -1000, max: 10000 });
  const batteryLevelArbitrary = fc.integer({ min: 0, max: 100 });
  const voltageArbitrary = fc.float({ min: 0, max: 5 });
  const utilizationArbitrary = fc.float({ min: 0, max: 100 });

  const nodeDataArbitrary = fc.record({
    nodeId: nodeIdArbitrary,
    hexId: hexIdArbitrary,
    shortName: fc.option(shortNameArbitrary, { nil: undefined }),
    longName: fc.option(longNameArbitrary, { nil: undefined }),
    hardwareModel: fc.option(fc.string(), { nil: undefined }),
    firmwareVersion: fc.option(fc.string(), { nil: undefined }),
    role: roleArbitrary,
    networkId: fc.constant('')  // Will be set dynamically in tests
  });

  const positionDataArbitrary = fc.record({
    latitude: latitudeArbitrary,
    longitude: longitudeArbitrary,
    altitude: fc.option(altitudeArbitrary, { nil: undefined }),
    precision: fc.option(fc.float({ min: 0, max: 100 }), { nil: undefined }),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    source: fc.constantFrom(...Object.values(PositionSource))
  });

  const telemetryDataArbitrary = fc.record({
    type: fc.constantFrom(...Object.values(TelemetryType)),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    data: fc.record({
      batteryLevel: fc.option(batteryLevelArbitrary, { nil: undefined }),
      voltage: fc.option(voltageArbitrary, { nil: undefined }),
      channelUtilization: fc.option(utilizationArbitrary, { nil: undefined }),
      airUtilTx: fc.option(utilizationArbitrary, { nil: undefined }),
      temperature: fc.option(fc.float({ min: -40, max: 85 }), { nil: undefined }),
      humidity: fc.option(fc.float({ min: 0, max: 100 }), { nil: undefined }),
      pressure: fc.option(fc.float({ min: 300, max: 1100 }), { nil: undefined })
    })
  });

  test('Property: Node creation through API reflects in database and subsequent API calls', async () => {
    await fc.assert(
      fc.asyncProperty(nodeDataArbitrary, async (nodeDataTemplate) => {
        const nodeData = { ...nodeDataTemplate, networkId: testNetworkId };
        
        let createdNode: any = null;
        try {
          // Create node through API
          const createResponse = await request(app)
            .post('/api/v1/nodes')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(nodeData)
            .expect(201);

          createdNode = createResponse.body.data;
          expect(createdNode).toBeDefined();
          expect(createdNode.nodeId).toBe(nodeData.nodeId);
          expect(createdNode.hexId).toBe(nodeData.hexId);

          // Verify node exists in database
          const dbNode = await nodeRepository.findById(createdNode.id);
          expect(dbNode).toBeDefined();
          expect(dbNode!.nodeId).toBe(nodeData.nodeId);
          expect(dbNode!.hexId).toBe(nodeData.hexId);
          expect(dbNode!.role).toBe(nodeData.role);

          // Verify node appears in API list
          const listResponse = await request(app)
            .get('/api/v1/nodes')
            .query({ nodeId: nodeData.nodeId })
            .expect(200);

          const foundNodes = listResponse.body.data.filter((n: any) => n.id === createdNode.id);
          expect(foundNodes).toHaveLength(1);
          expect(foundNodes[0].nodeId).toBe(nodeData.nodeId);

          // Verify node can be retrieved by ID
          const getResponse = await request(app)
            .get(`/api/v1/nodes/${createdNode.id}`)
            .expect(200);

          expect(getResponse.body.data.id).toBe(createdNode.id);
          expect(getResponse.body.data.nodeId).toBe(nodeData.nodeId);
        } finally {
          // Clean up
          if (createdNode) {
            try {
              await nodeRepository.delete(createdNode.id);
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        }
      }),
      { numRuns: 10 }
    );
  });

  test('Property: Position creation through API reflects in database and node position endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        nodeDataArbitrary,
        positionDataArbitrary,
        async (nodeDataTemplate, positionData) => {
          let node: any = null;
          let createdPosition: any = null;
          
          try {
            // Create node first
            const nodeData = { ...nodeDataTemplate, networkId: testNetworkId };
            node = await nodeRepository.create(nodeData);

            // Create position through API
            const positionPayload = {
              ...positionData,
              nodeId: node.id
            };

            const createResponse = await request(app)
              .post('/api/v1/positions')
              .set('Authorization', `Bearer ${adminToken}`)
              .send(positionPayload)
              .expect(201);

            createdPosition = createResponse.body.data;
            expect(createdPosition).toBeDefined();
            expect(createdPosition.latitude).toBeCloseTo(positionData.latitude, 5);
            expect(createdPosition.longitude).toBeCloseTo(positionData.longitude, 5);

            // Verify position exists in database
            const dbPosition = await positionRepository.findById(createdPosition.id);
            expect(dbPosition).toBeDefined();
            expect(dbPosition!.nodeId).toBe(node.id);
            expect(dbPosition!.latitude).toBeCloseTo(positionData.latitude, 5);
            expect(dbPosition!.longitude).toBeCloseTo(positionData.longitude, 5);

            // Verify position appears in node's positions endpoint
            const nodePositionsResponse = await request(app)
              .get(`/api/v1/nodes/${node.id}/positions`)
              .expect(200);

            const foundPositions = nodePositionsResponse.body.data.filter(
              (p: any) => p.id === createdPosition.id
            );
            expect(foundPositions).toHaveLength(1);
            expect(foundPositions[0].latitude).toBeCloseTo(positionData.latitude, 5);

            // Verify position appears in general positions list
            const positionsResponse = await request(app)
              .get('/api/v1/positions')
              .query({ nodeId: node.id })
              .expect(200);

            const foundInList = positionsResponse.body.data.filter(
              (p: any) => p.id === createdPosition.id
            );
            expect(foundInList).toHaveLength(1);
          } finally {
            // Clean up
            try {
              if (createdPosition) await positionRepository.delete(createdPosition.id);
              if (node) await nodeRepository.delete(node.id);
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Property: Telemetry creation through API reflects in database and node telemetry endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        nodeDataArbitrary,
        telemetryDataArbitrary,
        async (nodeDataTemplate, telemetryData) => {
          // Create node first
          const nodeData = { ...nodeDataTemplate, networkId: testNetworkId };
          const node = await nodeRepository.create(nodeData);

          // Create telemetry through API
          const telemetryPayload = {
            ...telemetryData,
            nodeId: node.id
          };

          const createResponse = await request(app)
            .post('/api/v1/telemetry')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(telemetryPayload)
            .expect(201);

          const createdTelemetry = createResponse.body.data;
          expect(createdTelemetry).toBeDefined();
          expect(createdTelemetry.type).toBe(telemetryData.type);

          // Verify telemetry exists in database
          const dbTelemetry = await telemetryRepository.findById(createdTelemetry.id);
          expect(dbTelemetry).toBeDefined();
          expect(dbTelemetry!.nodeId).toBe(node.id);
          expect(dbTelemetry!.type).toBe(telemetryData.type);

          // Verify telemetry appears in node's telemetry endpoint
          const nodeTelemetryResponse = await request(app)
            .get(`/api/v1/nodes/${node.id}/telemetry`)
            .expect(200);

          const foundTelemetry = nodeTelemetryResponse.body.data.filter(
            (t: any) => t.id === createdTelemetry.id
          );
          expect(foundTelemetry).toHaveLength(1);
          expect(foundTelemetry[0].type).toBe(telemetryData.type);

          // Verify telemetry appears in general telemetry list
          const telemetryResponse = await request(app)
            .get('/api/v1/telemetry')
            .query({ nodeId: node.id, type: telemetryData.type })
            .expect(200);

          const foundInList = telemetryResponse.body.data.filter(
            (t: any) => t.id === createdTelemetry.id
          );
          expect(foundInList).toHaveLength(1);

          // Clean up
          try {
            await telemetryRepository.delete(createdTelemetry.id);
            await nodeRepository.delete(node.id);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Property: Node updates through API reflect consistently across all endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        nodeDataArbitrary,
        fc.record({
          batteryLevel: fc.option(batteryLevelArbitrary, { nil: undefined }),
          voltage: fc.option(voltageArbitrary, { nil: undefined }),
          channelUtilization: fc.option(utilizationArbitrary, { nil: undefined }),
          isOnline: fc.option(fc.boolean(), { nil: undefined }),
          mqttConnected: fc.option(fc.boolean(), { nil: undefined })
        }),
        async (nodeDataTemplate, updateData) => {
          // Create node first
          const nodeData = { ...nodeDataTemplate, networkId: testNetworkId };
          const node = await nodeRepository.create(nodeData);

          // Update node through API
          const updateResponse = await request(app)
            .put(`/api/v1/nodes/${node.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateData)
            .expect(200);

          const updatedNode = updateResponse.body.data;
          expect(updatedNode.id).toBe(node.id);

          // Verify updates are reflected in database
          const dbNode = await nodeRepository.findById(node.id);
          expect(dbNode).toBeDefined();
          
          if (updateData.batteryLevel !== undefined) {
            expect(dbNode!.batteryLevel).toBe(updateData.batteryLevel);
          }
          if (updateData.voltage !== undefined) {
            expect(dbNode!.voltage).toBeCloseTo(updateData.voltage, 2);
          }
          if (updateData.isOnline !== undefined) {
            expect(dbNode!.isOnline).toBe(updateData.isOnline);
          }

          // Verify updates appear in API list
          const listResponse = await request(app)
            .get('/api/v1/nodes')
            .query({ nodeId: nodeData.nodeId })
            .expect(200);

          const foundNodes = listResponse.body.data.filter((n: any) => n.id === node.id);
          expect(foundNodes).toHaveLength(1);
          
          if (updateData.batteryLevel !== undefined) {
            expect(foundNodes[0].batteryLevel).toBe(updateData.batteryLevel);
          }
          if (updateData.isOnline !== undefined) {
            expect(foundNodes[0].isOnline).toBe(updateData.isOnline);
          }

          // Verify updates appear in individual node endpoint
          const getResponse = await request(app)
            .get(`/api/v1/nodes/${node.id}`)
            .expect(200);

          if (updateData.batteryLevel !== undefined) {
            expect(getResponse.body.data.batteryLevel).toBe(updateData.batteryLevel);
          }
          if (updateData.voltage !== undefined) {
            expect(getResponse.body.data.voltage).toBeCloseTo(updateData.voltage, 2);
          }

          // Clean up
          try {
            await nodeRepository.delete(node.id);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});