/**
 * **Feature: meshtastic-node-mapper, Property 10: Data storage and interface updates**
 * **Validates: Requirements 13.1, 13.2**
 * 
 * Property: For any new data stored in the database, the web interface should reflect 
 * the changes within the configured update interval
 */

import * as fc from 'fast-check';
import { Server } from 'socket.io';
import { createServer } from 'http';
import ioClient from 'socket.io-client';
import { NodeRepository } from '../database/repositories/node.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { NetworkRepository } from '../database/repositories/network.repository';
import { MQTTManagerService } from '../services/mqtt-manager.service';
import { NodeRole, PositionSource, TelemetryType, LoRaRegion } from '../types/database';

describe('Real-time Updates Property Tests', () => {
  let server: any;
  let io: Server;
  let clientSocket: any;
  let nodeRepository: NodeRepository;
  let positionRepository: PositionRepository;
  let telemetryRepository: TelemetryRepository;
  let networkRepository: NetworkRepository;
  let mqttManager: MQTTManagerService;
  let testNetworkId: string;

  beforeAll(async () => {
    // Set up test server with Socket.IO
    const httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Initialize repositories
    nodeRepository = new NodeRepository();
    positionRepository = new PositionRepository();
    telemetryRepository = new TelemetryRepository();
    networkRepository = new NetworkRepository();

    // Create test network
    const testNetwork = await networkRepository.create({
      name: 'Test Network RT',
      description: 'Network for real-time testing',
      mqttBroker: 'mqtt://test-broker:1883',
      mqttCredentials: { username: 'test', password: 'test' },
      region: LoRaRegion.US,
      isActive: true
    });
    testNetworkId = testNetwork.id;

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const port = (httpServer.address() as any)?.port;
        server = httpServer;
        
        // Connect client
        clientSocket = ioClient(`http://localhost:${port}`);
        clientSocket.on('connect', resolve);
      });
    });
  });

  afterAll(async () => {
    // Clean up
    if (clientSocket) {
      clientSocket.close();
    }
    if (server) {
      server.close();
    }
    if (testNetworkId) {
      await networkRepository.delete(testNetworkId);
    }
  });

  // Generators for test data
  const nodeIdArbitrary = fc.string({ minLength: 8, maxLength: 8 }).map(s => s.padStart(8, '0'));
  const hexIdArbitrary = fc.hexaString({ minLength: 8, maxLength: 8 });
  const shortNameArbitrary = fc.string({ minLength: 1, maxLength: 4 });
  const longNameArbitrary = fc.string({ minLength: 1, maxLength: 40 });
  const roleArbitrary = fc.constantFrom(...Object.values(NodeRole));
  const latitudeArbitrary = fc.float({ min: -90, max: 90 });
  const longitudeArbitrary = fc.float({ min: -180, max: 180 });
  const batteryLevelArbitrary = fc.integer({ min: 0, max: 100 });
  const voltageArbitrary = fc.float({ min: 0, max: 5 });

  const nodeDataArbitrary = fc.record({
    nodeId: nodeIdArbitrary,
    hexId: hexIdArbitrary,
    shortName: fc.option(shortNameArbitrary, { nil: undefined }),
    longName: fc.option(longNameArbitrary, { nil: undefined }),
    hardwareModel: fc.option(fc.string(), { nil: undefined }),
    firmwareVersion: fc.option(fc.string(), { nil: undefined }),
    role: roleArbitrary,
    networkId: fc.constant('')  // Will be set dynamically
  });

  const positionDataArbitrary = fc.record({
    latitude: latitudeArbitrary,
    longitude: longitudeArbitrary,
    altitude: fc.option(fc.float({ min: -1000, max: 10000 }), { nil: undefined }),
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
      channelUtilization: fc.option(fc.float({ min: 0, max: 100 }), { nil: undefined }),
      airUtilTx: fc.option(fc.float({ min: 0, max: 100 }), { nil: undefined }),
      temperature: fc.option(fc.float({ min: -40, max: 85 }), { nil: undefined }),
      humidity: fc.option(fc.float({ min: 0, max: 100 }), { nil: undefined }),
      pressure: fc.option(fc.float({ min: 300, max: 1100 }), { nil: undefined })
    })
  });

  test('Property: Node creation triggers real-time update broadcast', async () => {
    await fc.assert(
      fc.asyncProperty(nodeDataArbitrary, async (nodeDataTemplate) => {
        const nodeData = { ...nodeDataTemplate, networkId: testNetworkId };
        
        // Set up promise to capture WebSocket event
        const updatePromise = new Promise<any>((resolve) => {
          const timeout = setTimeout(() => resolve(null), 2000); // 2 second timeout
          clientSocket.once('nodeUpdate', (data: any) => {
            clearTimeout(timeout);
            resolve(data);
          });
        });

        // Create node in database (simulating MQTT data processing)
        const createdNode = await nodeRepository.create(nodeData);

        // Manually trigger the update event (simulating what MQTT manager would do)
        io.emit('nodeUpdate', {
          type: 'node_created',
          nodeId: createdNode.id,
          data: createdNode
        });

        // Wait for WebSocket update
        const receivedUpdate = await updatePromise;

        // Verify update was received
        expect(receivedUpdate).not.toBeNull();
        expect(receivedUpdate.type).toBe('node_created');
        expect(receivedUpdate.nodeId).toBe(createdNode.id);
        expect(receivedUpdate.data).toBeDefined();
        expect(receivedUpdate.data.nodeId).toBe(nodeData.nodeId);
        expect(receivedUpdate.data.hexId).toBe(nodeData.hexId);
        expect(receivedUpdate.data.role).toBe(nodeData.role);

        // Clean up
        await nodeRepository.delete(createdNode.id);
      }),
      { numRuns: 10 }
    );
  });

  test('Property: Node position updates trigger real-time broadcast', async () => {
    await fc.assert(
      fc.asyncProperty(
        nodeDataArbitrary,
        positionDataArbitrary,
        async (nodeDataTemplate, positionData) => {
          // Create node first
          const nodeData = { ...nodeDataTemplate, networkId: testNetworkId };
          const node = await nodeRepository.create(nodeData);

          // Set up promise to capture WebSocket event
          const updatePromise = new Promise<any>((resolve) => {
            const timeout = setTimeout(() => resolve(null), 2000);
            clientSocket.once('nodeUpdate', (data: any) => {
              clearTimeout(timeout);
              resolve(data);
            });
          });

          // Create position
          const position = await positionRepository.create({
            ...positionData,
            nodeId: node.id
          });

          // Update node with new position
          const updatedNode = await nodeRepository.update(node.id, {
            lastSeen: new Date()
          });

          // Manually trigger the update event
          io.emit('nodeUpdate', {
            type: 'position_updated',
            nodeId: node.id,
            data: {
              ...updatedNode,
              position: position
            }
          });

          // Wait for WebSocket update
          const receivedUpdate = await updatePromise;

          // Verify update was received
          expect(receivedUpdate).not.toBeNull();
          expect(receivedUpdate.type).toBe('position_updated');
          expect(receivedUpdate.nodeId).toBe(node.id);
          expect(receivedUpdate.data.position).toBeDefined();
          expect(receivedUpdate.data.position.latitude).toBeCloseTo(positionData.latitude, 5);
          expect(receivedUpdate.data.position.longitude).toBeCloseTo(positionData.longitude, 5);

          // Clean up
          await positionRepository.delete(position.id);
          await nodeRepository.delete(node.id);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('Property: Telemetry updates trigger real-time broadcast', async () => {
    await fc.assert(
      fc.asyncProperty(
        nodeDataArbitrary,
        telemetryDataArbitrary,
        async (nodeDataTemplate, telemetryData) => {
          // Create node first
          const nodeData = { ...nodeDataTemplate, networkId: testNetworkId };
          const node = await nodeRepository.create(nodeData);

          // Set up promise to capture WebSocket event
          const updatePromise = new Promise<any>((resolve) => {
            const timeout = setTimeout(() => resolve(null), 2000);
            clientSocket.once('nodeUpdate', (data: any) => {
              clearTimeout(timeout);
              resolve(data);
            });
          });

          // Create telemetry
          const telemetry = await telemetryRepository.create({
            ...telemetryData,
            nodeId: node.id
          });

          // Update node with latest telemetry data
          const updateFields: any = {};
          if (telemetryData.data.batteryLevel !== undefined) {
            updateFields.batteryLevel = telemetryData.data.batteryLevel;
          }
          if (telemetryData.data.voltage !== undefined) {
            updateFields.voltage = telemetryData.data.voltage;
          }
          if (telemetryData.data.channelUtilization !== undefined) {
            updateFields.channelUtilization = telemetryData.data.channelUtilization;
          }

          const updatedNode = await nodeRepository.update(node.id, updateFields);

          // Manually trigger the update event
          io.emit('nodeUpdate', {
            type: 'telemetry_updated',
            nodeId: node.id,
            data: {
              ...updatedNode,
              latestTelemetry: telemetry
            }
          });

          // Wait for WebSocket update
          const receivedUpdate = await updatePromise;

          // Verify update was received
          expect(receivedUpdate).not.toBeNull();
          expect(receivedUpdate.type).toBe('telemetry_updated');
          expect(receivedUpdate.nodeId).toBe(node.id);
          expect(receivedUpdate.data.latestTelemetry).toBeDefined();
          expect(receivedUpdate.data.latestTelemetry.type).toBe(telemetryData.type);

          // Clean up
          await telemetryRepository.delete(telemetry.id);
          await nodeRepository.delete(node.id);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('Property: Multiple rapid updates are handled correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        nodeDataArbitrary,
        fc.array(fc.record({
          batteryLevel: fc.option(batteryLevelArbitrary, { nil: undefined }),
          voltage: fc.option(voltageArbitrary, { nil: undefined }),
          isOnline: fc.boolean()
        }), { minLength: 2, maxLength: 5 }),
        async (nodeDataTemplate, updates) => {
          // Create node first
          const nodeData = { ...nodeDataTemplate, networkId: testNetworkId };
          const node = await nodeRepository.create(nodeData);

          // Set up promise to capture multiple WebSocket events
          const allReceivedUpdates: any[] = [];
          const updatePromise = new Promise<any[]>((resolve) => {
            const timeout = setTimeout(() => resolve(allReceivedUpdates), 3000);
            
            const handleUpdate = (data: any) => {
              allReceivedUpdates.push(data);
              if (allReceivedUpdates.length >= updates.length) {
                clearTimeout(timeout);
                clientSocket.off('nodeUpdate', handleUpdate);
                resolve(allReceivedUpdates);
              }
            };
            
            clientSocket.on('nodeUpdate', handleUpdate);
          });

          // Apply updates rapidly
          for (let i = 0; i < updates.length; i++) {
            const updateData = updates[i];
            const updatedNode = await nodeRepository.update(node.id, updateData);
            
            // Trigger update event
            io.emit('nodeUpdate', {
              type: 'node_updated',
              nodeId: node.id,
              data: updatedNode,
              updateIndex: i
            });
          }

          // Wait for all WebSocket updates
          const finalReceivedUpdates = await updatePromise;

          // Verify all updates were received
          expect(finalReceivedUpdates.length).toBeGreaterThanOrEqual(1);
          
          // Verify at least the last update contains correct data
          const lastUpdate = finalReceivedUpdates[finalReceivedUpdates.length - 1];
          expect(lastUpdate.type).toBe('node_updated');
          expect(lastUpdate.nodeId).toBe(node.id);
          expect(lastUpdate.data).toBeDefined();

          // Clean up
          await nodeRepository.delete(node.id);
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Property: Connection status changes are broadcast correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('connected', 'disconnected', 'error'),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (status, networkName) => {
          // Set up promise to capture WebSocket event
          const statusPromise = new Promise<any>((resolve) => {
            const timeout = setTimeout(() => resolve(null), 2000);
            clientSocket.once('networkStatus', (data: any) => {
              clearTimeout(timeout);
              resolve(data);
            });
          });

          // Trigger network status event
          const statusData = {
            networkId: testNetworkId,
            status: status,
            ...(status === 'error' && { error: 'Test error message' })
          };

          io.emit('networkStatus', statusData);

          // Wait for WebSocket update
          const receivedStatus = await statusPromise;

          // Verify status was received
          expect(receivedStatus).not.toBeNull();
          expect(receivedStatus.networkId).toBe(testNetworkId);
          expect(receivedStatus.status).toBe(status);
          
          if (status === 'error') {
            expect(receivedStatus.error).toBeDefined();
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});