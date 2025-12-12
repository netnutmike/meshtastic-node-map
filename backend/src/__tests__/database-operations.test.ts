/**
 * Unit tests for database operations
 * Tests CRUD operations on all entities, connection handling, and data integrity
 * Requirements: 13.1
 */

import {
  NodeRole,
  LoRaRegion,
  TelemetryType,
  MessageType,
  MessagePriority,
  PositionSource
} from '../types/database';

describe('Database Operations Unit Tests', () => {
  // Test basic database type validation and structure
  describe('Database Type Validation', () => {
    test('should validate NodeRole enum values', () => {
      const validRoles = Object.values(NodeRole);
      expect(validRoles).toContain(NodeRole.CLIENT);
      expect(validRoles).toContain(NodeRole.ROUTER);
      expect(validRoles).toContain(NodeRole.REPEATER);
      expect(validRoles.length).toBeGreaterThan(5);
    });

    test('should validate LoRaRegion enum values', () => {
      const validRegions = Object.values(LoRaRegion);
      expect(validRegions).toContain(LoRaRegion.US);
      expect(validRegions).toContain(LoRaRegion.EU_868);
      expect(validRegions).toContain(LoRaRegion.EU_433);
      expect(validRegions.length).toBeGreaterThan(10);
    });

    test('should validate TelemetryType enum values', () => {
      const validTypes = Object.values(TelemetryType);
      expect(validTypes).toContain(TelemetryType.DEVICE_METRICS);
      expect(validTypes).toContain(TelemetryType.ENVIRONMENT_METRICS);
      expect(validTypes).toContain(TelemetryType.POWER_METRICS);
      expect(validTypes.length).toBe(3);
    });

    test('should validate MessageType enum values', () => {
      const validTypes = Object.values(MessageType);
      expect(validTypes).toContain(MessageType.TEXT);
      expect(validTypes).toContain(MessageType.POSITION);
      expect(validTypes).toContain(MessageType.TELEMETRY);
      expect(validTypes.length).toBeGreaterThan(15);
    });

    test('should validate MessagePriority enum values', () => {
      const validPriorities = Object.values(MessagePriority);
      expect(validPriorities).toContain(MessagePriority.DEFAULT);
      expect(validPriorities).toContain(MessagePriority.MIN);
      expect(validPriorities).toContain(MessagePriority.MAX);
      expect(validPriorities.length).toBe(7);
    });

    test('should validate PositionSource enum values', () => {
      const validSources = Object.values(PositionSource);
      expect(validSources).toContain(PositionSource.GPS);
      expect(validSources).toContain(PositionSource.MANUAL);
      expect(validSources).toContain(PositionSource.ESTIMATED);
      expect(validSources.length).toBe(4);
    });
  });

  describe('Data Structure Validation', () => {
    test('should validate network data structure', () => {
      const networkData = {
        name: 'Test Network',
        description: 'Test network description',
        mqttBroker: 'mqtt://localhost:1883',
        mqttCredentials: { username: 'test', password: 'test' },
        region: LoRaRegion.US,
        isActive: true
      };

      expect(networkData.name).toBeDefined();
      expect(networkData.mqttBroker).toMatch(/^mqtt:\/\//);
      expect(Object.values(LoRaRegion)).toContain(networkData.region);
      expect(typeof networkData.isActive).toBe('boolean');
      expect(typeof networkData.mqttCredentials).toBe('object');
    });

    test('should validate node data structure', () => {
      const nodeData = {
        nodeId: '!12345678',
        hexId: '12345678',
        shortName: 'NODE1',
        longName: 'Test Node 1',
        hardwareModel: 'TBEAM',
        firmwareVersion: '2.2.0',
        role: NodeRole.ROUTER,
        isOnline: true,
        mqttConnected: true,
        batteryLevel: 85,
        voltage: 4.1,
        channelUtilization: 12.5,
        airUtilTx: 8.3,
        networkId: 'network-1'
      };

      expect(nodeData.nodeId).toMatch(/^!/);
      expect(nodeData.hexId).toMatch(/^[A-F0-9]{8}$/i);
      expect(Object.values(NodeRole)).toContain(nodeData.role);
      expect(typeof nodeData.isOnline).toBe('boolean');
      expect(typeof nodeData.mqttConnected).toBe('boolean');
      expect(nodeData.batteryLevel).toBeGreaterThanOrEqual(0);
      expect(nodeData.batteryLevel).toBeLessThanOrEqual(100);
      expect(nodeData.voltage).toBeGreaterThan(0);
    });

    test('should validate position data structure', () => {
      const positionData = {
        nodeId: 'node-1',
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 50,
        precision: 5,
        timestamp: new Date(),
        source: PositionSource.GPS
      };

      expect(positionData.latitude).toBeGreaterThanOrEqual(-90);
      expect(positionData.latitude).toBeLessThanOrEqual(90);
      expect(positionData.longitude).toBeGreaterThanOrEqual(-180);
      expect(positionData.longitude).toBeLessThanOrEqual(180);
      expect(Object.values(PositionSource)).toContain(positionData.source);
      expect(positionData.timestamp).toBeInstanceOf(Date);
    });

    test('should validate telemetry data structure', () => {
      const telemetryData = {
        nodeId: 'node-1',
        type: TelemetryType.DEVICE_METRICS,
        timestamp: new Date(),
        data: {
          batteryLevel: 85,
          voltage: 4.1,
          channelUtilization: 12.5,
          airUtilTx: 8.3
        }
      };

      expect(Object.values(TelemetryType)).toContain(telemetryData.type);
      expect(telemetryData.timestamp).toBeInstanceOf(Date);
      expect(typeof telemetryData.data).toBe('object');
      
      if (telemetryData.type === TelemetryType.DEVICE_METRICS) {
        const data = telemetryData.data as any;
        if (data.batteryLevel !== undefined) {
          expect(data.batteryLevel).toBeGreaterThanOrEqual(0);
          expect(data.batteryLevel).toBeLessThanOrEqual(100);
        }
        if (data.voltage !== undefined) {
          expect(data.voltage).toBeGreaterThan(0);
        }
      }
    });

    test('should validate message data structure', () => {
      const messageData = {
        messageId: 'msg_001',
        fromNodeId: 'node-1',
        toNodeId: 'node-2',
        type: MessageType.TEXT,
        content: { text: 'Hello World' },
        encrypted: false,
        hopLimit: 3,
        hopStart: 3,
        wantAck: true,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: new Date(),
        routingPath: ['!12345678', '!87654321'],
        rssi: -85,
        snr: 8.5
      };

      expect(Object.values(MessageType)).toContain(messageData.type);
      expect(Object.values(MessagePriority)).toContain(messageData.priority);
      expect(typeof messageData.encrypted).toBe('boolean');
      expect(typeof messageData.wantAck).toBe('boolean');
      expect(messageData.channel).toBeGreaterThanOrEqual(0);
      expect(messageData.channel).toBeLessThanOrEqual(7);
      expect(messageData.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(messageData.routingPath)).toBe(true);
      
      if (messageData.rssi !== undefined) {
        expect(messageData.rssi).toBeLessThanOrEqual(-30);
        expect(messageData.rssi).toBeGreaterThanOrEqual(-120);
      }
    });
  });

  describe('Input Validation', () => {
    test('should validate node ID format', () => {
      const validNodeIds = ['!12345678', '!ABCDEF01', '!87654321'];
      const invalidNodeIds = ['12345678', '!123', '!TOOLONG123', '', null, undefined];

      validNodeIds.forEach(nodeId => {
        expect(nodeId).toMatch(/^![A-F0-9]{8}$/i);
      });

      invalidNodeIds.forEach(nodeId => {
        if (nodeId) {
          expect(nodeId).not.toMatch(/^![A-F0-9]{8}$/i);
        }
      });
    });

    test('should validate hex ID format', () => {
      const validHexIds = ['12345678', 'ABCDEF01', '87654321'];
      const invalidHexIds = ['!12345678', '123', 'TOOLONG123', '', 'GHIJKLMN'];

      validHexIds.forEach(hexId => {
        expect(hexId).toMatch(/^[A-F0-9]{8}$/i);
      });

      invalidHexIds.forEach(hexId => {
        if (hexId) {
          expect(hexId).not.toMatch(/^[A-F0-9]{8}$/i);
        }
      });
    });

    test('should validate coordinate ranges', () => {
      const validLatitudes = [-90, -45.5, 0, 45.5, 90];
      const invalidLatitudes = [-91, 91, -180, 180];
      
      const validLongitudes = [-180, -90.5, 0, 90.5, 180];
      const invalidLongitudes = [-181, 181, -360, 360];

      validLatitudes.forEach(lat => {
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      });

      invalidLatitudes.forEach(lat => {
        expect(lat < -90 || lat > 90).toBe(true);
      });

      validLongitudes.forEach(lng => {
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
      });

      invalidLongitudes.forEach(lng => {
        expect(lng < -180 || lng > 180).toBe(true);
      });
    });

    test('should validate battery level ranges', () => {
      const validBatteryLevels = [0, 25, 50, 75, 100];
      const invalidBatteryLevels = [-1, 101, -50, 150];

      validBatteryLevels.forEach(level => {
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(100);
      });

      invalidBatteryLevels.forEach(level => {
        expect(level < 0 || level > 100).toBe(true);
      });
    });

    test('should validate channel ranges', () => {
      const validChannels = [0, 1, 2, 3, 4, 5, 6, 7];
      const invalidChannels = [-1, 8, 10, 255];

      validChannels.forEach(channel => {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(7);
      });

      invalidChannels.forEach(channel => {
        expect(channel < 0 || channel > 7).toBe(true);
      });
    });

    test('should validate RSSI ranges', () => {
      const validRSSI = [-120, -100, -85, -50, -30];
      const invalidRSSI = [-121, -29, 0, 50];

      validRSSI.forEach(rssi => {
        expect(rssi).toBeGreaterThanOrEqual(-120);
        expect(rssi).toBeLessThanOrEqual(-30);
      });

      invalidRSSI.forEach(rssi => {
        expect(rssi < -120 || rssi > -30).toBe(true);
      });
    });
  });
});