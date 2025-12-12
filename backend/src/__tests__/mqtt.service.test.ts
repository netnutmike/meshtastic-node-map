/**
 * Unit tests for MQTT Service
 * Tests MQTT connection establishment and recovery, message parsing, and error handling
 * Requirements: 13.1, 13.5
 */

import { MQTTService, MQTTConnectionConfig, MeshtasticMQTTMessage } from '../services/mqtt.service';
import { MessageType, MessagePriority, TelemetryType, NodeRole, PositionSource } from '../types/database';

// Mock the mqtt library
jest.mock('mqtt', () => ({
  connect: jest.fn()
}));

describe('MQTT Service Unit Tests', () => {
  let mqttService: MQTTService;
  let mockMqttClient: any;
  let config: MQTTConnectionConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock MQTT client
    mockMqttClient = {
      on: jest.fn(),
      subscribe: jest.fn(),
      end: jest.fn(),
      connected: true
    };

    // Mock mqtt.connect to return our mock client
    const mqtt = require('mqtt');
    mqtt.connect.mockReturnValue(mockMqttClient);

    config = {
      brokerUrl: 'mqtt://localhost:1883',
      username: 'testuser',
      password: 'testpass',
      clientId: 'test-client',
      topics: ['msh/+/+/+', 'test/topic'],
      reconnectPeriod: 1000,
      connectTimeout: 5000,
      keepalive: 30
    };

    mqttService = new MQTTService(config);
  });

  describe('Connection Management', () => {
    test('should connect to MQTT broker with correct configuration', async () => {
      // Set up mock to simulate successful connection
      mockMqttClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      const mqtt = require('mqtt');
      
      await mqttService.connect();

      expect(mqtt.connect).toHaveBeenCalledWith(config.brokerUrl, expect.objectContaining({
        clientId: config.clientId,
        username: config.username,
        password: config.password,
        reconnectPeriod: config.reconnectPeriod,
        connectTimeout: config.connectTimeout,
        keepalive: config.keepalive,
        clean: true,
        rejectUnauthorized: false
      }));
    });

    test('should handle connection errors', async () => {
      const testError = new Error('Connection failed');
      
      mockMqttClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          // Call error callback immediately
          callback(testError);
        }
      });

      await expect(mqttService.connect()).rejects.toThrow('Connection failed');
    });

    test('should subscribe to configured topics on connection', async () => {
      mockMqttClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      mockMqttClient.subscribe.mockImplementation((topic: string, options: any, callback: Function) => {
        callback(null);
      });

      await mqttService.connect();

      expect(mockMqttClient.subscribe).toHaveBeenCalledTimes(config.topics.length);
      config.topics.forEach(topic => {
        expect(mockMqttClient.subscribe).toHaveBeenCalledWith(topic, { qos: 0 }, expect.any(Function));
      });
    });

    test('should handle subscription errors', async () => {
      const subscriptionError = new Error('Subscription failed');
      
      mockMqttClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      mockMqttClient.subscribe.mockImplementation((topic: string, options: any, callback: Function) => {
        callback(subscriptionError);
      });

      // Should not throw, but should log error
      await expect(mqttService.connect()).resolves.toBeUndefined();
    });

    test('should disconnect gracefully', async () => {
      mockMqttClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      mockMqttClient.end.mockImplementation((force: boolean, options: any, callback: Function) => {
        callback();
      });

      await mqttService.connect();
      await mqttService.disconnect();

      expect(mockMqttClient.end).toHaveBeenCalledWith(false, {}, expect.any(Function));
    });

    test('should return correct connection status', async () => {
      expect(mqttService.isClientConnected()).toBe(false);

      mockMqttClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      await mqttService.connect();
      expect(mqttService.isClientConnected()).toBe(true);
    });
  });

  describe('Message Parsing', () => {
    test('should parse valid MQTT message', () => {
      const validMessage = {
        from: '!12345678',
        type: MessageType.TEXT,
        payload: { text: 'Hello World' },
        encrypted: false,
        wantAck: true,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200
      };

      const messageStr = JSON.stringify(validMessage);
      const parsed = mqttService.parseRawMessage(messageStr);

      expect(parsed).toBeTruthy();
      expect(parsed!.from).toBe(validMessage.from);
      expect(parsed!.type).toBe(validMessage.type);
      expect(parsed!.payload).toEqual(validMessage.payload);
    });

    test('should reject message with invalid from field', () => {
      const invalidMessage = {
        type: MessageType.TEXT,
        payload: { text: 'Hello World' },
        encrypted: false,
        wantAck: true,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200
      };

      const messageStr = JSON.stringify(invalidMessage);
      const parsed = mqttService.parseRawMessage(messageStr);

      expect(parsed).toBeNull();
    });

    test('should reject message with invalid message type', () => {
      const invalidMessage = {
        from: '!12345678',
        type: 'INVALID_TYPE',
        payload: { text: 'Hello World' },
        encrypted: false,
        wantAck: true,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200
      };

      const messageStr = JSON.stringify(invalidMessage);
      const parsed = mqttService.parseRawMessage(messageStr);

      expect(parsed).toBeNull();
    });

    test('should reject message with invalid channel', () => {
      const invalidMessage = {
        from: '!12345678',
        type: MessageType.TEXT,
        payload: { text: 'Hello World' },
        encrypted: false,
        wantAck: true,
        priority: MessagePriority.DEFAULT,
        channel: 10, // Invalid channel (should be 0-7)
        timestamp: 1640995200
      };

      const messageStr = JSON.stringify(invalidMessage);
      const parsed = mqttService.parseRawMessage(messageStr);

      expect(parsed).toBeNull();
    });

    test('should handle malformed JSON', () => {
      const malformedJson = '{ invalid json }';
      const parsed = mqttService.parseRawMessage(malformedJson);

      expect(parsed).toBeNull();
    });

    test('should parse different message types correctly', () => {
      const messageTypes = [
        MessageType.TEXT,
        MessageType.POSITION,
        MessageType.TELEMETRY,
        MessageType.NODEINFO,
        MessageType.ROUTING
      ];

      messageTypes.forEach(type => {
        const message = {
          from: '!12345678',
          type,
          payload: {},
          encrypted: false,
          wantAck: false,
          priority: MessagePriority.DEFAULT,
          channel: 0,
          timestamp: 1640995200
        };

        const messageStr = JSON.stringify(message);
        const parsed = mqttService.parseRawMessage(messageStr);

        expect(parsed).toBeTruthy();
        expect(parsed!.type).toBe(type);
      });
    });
  });

  describe('Message Serialization', () => {
    test('should serialize valid message', () => {
      const message: MeshtasticMQTTMessage = {
        from: '!12345678',
        type: MessageType.TEXT,
        payload: { text: 'Hello World' },
        encrypted: false,
        wantAck: true,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200
      };

      const serialized = mqttService.serializeMessage(message);
      const parsed = JSON.parse(serialized);

      expect(parsed.from).toBe(message.from);
      expect(parsed.type).toBe(message.type);
      expect(parsed.payload).toEqual(message.payload);
      expect(parsed.encrypted).toBe(message.encrypted);
      expect(parsed.wantAck).toBe(message.wantAck);
      expect(parsed.priority).toBe(message.priority);
      expect(parsed.channel).toBe(message.channel);
      expect(parsed.timestamp).toBe(message.timestamp);
    });

    test('should handle optional fields correctly', () => {
      const messageWithOptionals: MeshtasticMQTTMessage = {
        id: 'msg123',
        from: '!12345678',
        to: '!87654321',
        type: MessageType.TEXT,
        payload: { text: 'Hello World' },
        encrypted: false,
        hopLimit: 3,
        hopStart: 3,
        wantAck: true,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200,
        routingPath: ['!12345678', '!87654321'],
        rssi: -85,
        snr: 8.5
      };

      const serialized = mqttService.serializeMessage(messageWithOptionals);
      const parsed = JSON.parse(serialized);

      expect(parsed.id).toBe(messageWithOptionals.id);
      expect(parsed.to).toBe(messageWithOptionals.to);
      expect(parsed.hopLimit).toBe(messageWithOptionals.hopLimit);
      expect(parsed.hopStart).toBe(messageWithOptionals.hopStart);
      expect(parsed.routingPath).toEqual(messageWithOptionals.routingPath);
      expect(parsed.rssi).toBe(messageWithOptionals.rssi);
      expect(parsed.snr).toBe(messageWithOptionals.snr);
    });

    test('should clean NaN values', () => {
      const messageWithNaN: MeshtasticMQTTMessage = {
        from: '!12345678',
        type: MessageType.TELEMETRY,
        payload: {
          temperature: NaN,
          humidity: 50,
          pressure: NaN
        },
        encrypted: false,
        wantAck: false,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200,
        snr: NaN
      };

      const serialized = mqttService.serializeMessage(messageWithNaN);
      const parsed = JSON.parse(serialized);

      expect(parsed.payload.temperature).toBeNull();
      expect(parsed.payload.humidity).toBe(50);
      expect(parsed.payload.pressure).toBeNull();
      expect(parsed.snr).toBeUndefined(); // NaN SNR should be excluded
    });

    test('should exclude undefined values', () => {
      const messageWithUndefined: MeshtasticMQTTMessage = {
        from: '!12345678',
        type: MessageType.TEXT,
        payload: { text: 'Hello' },
        encrypted: false,
        wantAck: false,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200,
        id: undefined,
        to: undefined,
        hopLimit: undefined
      };

      const serialized = mqttService.serializeMessage(messageWithUndefined);
      const parsed = JSON.parse(serialized);

      expect(parsed.id).toBeUndefined();
      expect(parsed.to).toBeUndefined();
      expect(parsed.hopLimit).toBeUndefined();
      expect('id' in parsed).toBe(false);
      expect('to' in parsed).toBe(false);
      expect('hopLimit' in parsed).toBe(false);
    });

    test('should throw error for invalid message structure', () => {
      const invalidMessage = {
        type: MessageType.TEXT,
        payload: { text: 'Hello' },
        encrypted: false,
        wantAck: false,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200
      } as any;

      expect(() => mqttService.serializeMessage(invalidMessage)).toThrow('Invalid from field');
    });
  });

  describe('Message Parsing Integration', () => {
    test('should parse complete message with all data types', () => {
      const topic = 'msh/US/2/e/LongFast/!12345678';
      const messageStr = JSON.stringify({
        from: '!12345678',
        type: MessageType.NODEINFO,
        payload: {
          shortName: 'TEST',
          longName: 'Test Node',
          hardwareModel: 'TBEAM',
          firmwareVersion: '2.2.0',
          role: NodeRole.ROUTER
        },
        encrypted: false,
        wantAck: false,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200
      });

      const parsedData = mqttService.parseMessage(topic, messageStr);

      expect(parsedData).toBeTruthy();
      expect(parsedData!.nodeId).toBe('!12345678');
      expect(parsedData!.nodeUpdate).toBeTruthy();
      expect(parsedData!.nodeUpdate!.shortName).toBe('TEST');
      expect(parsedData!.nodeUpdate!.longName).toBe('Test Node');
      expect(parsedData!.nodeUpdate!.hardwareModel).toBe('TBEAM');
    });

    test('should parse position message', () => {
      const topic = 'msh/US/2/e/LongFast/!12345678';
      const messageStr = JSON.stringify({
        from: '!12345678',
        type: MessageType.POSITION,
        payload: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 50,
          precision: 5,
          source: PositionSource.GPS
        },
        encrypted: false,
        wantAck: false,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200
      });

      const parsedData = mqttService.parseMessage(topic, messageStr);

      expect(parsedData).toBeTruthy();
      expect(parsedData!.position).toBeTruthy();
      expect(parsedData!.position!.latitude).toBe(37.7749);
      expect(parsedData!.position!.longitude).toBe(-122.4194);
      expect(parsedData!.position!.altitude).toBe(50);
      expect(parsedData!.position!.source).toBe(PositionSource.GPS);
    });

    test('should parse telemetry message', () => {
      const topic = 'msh/US/2/e/LongFast/!12345678';
      const messageStr = JSON.stringify({
        from: '!12345678',
        type: MessageType.TELEMETRY,
        payload: {
          batteryLevel: 85,
          voltage: 4.1,
          channelUtilization: 12.5,
          airUtilTx: 8.3,
          temperature: 25.5,
          humidity: 60
        },
        encrypted: false,
        wantAck: false,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200
      });

      const parsedData = mqttService.parseMessage(topic, messageStr);

      expect(parsedData).toBeTruthy();
      expect(parsedData!.telemetry).toBeTruthy();
      expect(parsedData!.telemetry!.type).toBe(TelemetryType.DEVICE_METRICS);
      expect(parsedData!.telemetry!.data).toEqual({
        batteryLevel: 85,
        voltage: 4.1,
        channelUtilization: 12.5,
        airUtilTx: 8.3,
        uptimeSeconds: undefined
      });
    });

    test('should parse text message', () => {
      const topic = 'msh/US/2/e/LongFast/!12345678';
      const messageStr = JSON.stringify({
        id: 'msg123',
        from: '!12345678',
        to: '!87654321',
        type: MessageType.TEXT,
        payload: { text: 'Hello World' },
        encrypted: false,
        hopLimit: 3,
        hopStart: 3,
        wantAck: true,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: 1640995200,
        routingPath: ['!12345678', '!87654321'],
        rssi: -85,
        snr: 8.5
      });

      const parsedData = mqttService.parseMessage(topic, messageStr);

      expect(parsedData).toBeTruthy();
      expect(parsedData!.message).toBeTruthy();
      expect(parsedData!.message!.type).toBe(MessageType.TEXT);
      expect(parsedData!.message!.content).toEqual({ text: 'Hello World' });
      expect(parsedData!.message!.fromNodeId).toBe('!12345678');
      expect(parsedData!.message!.toNodeId).toBe('!87654321');
    });

    test('should handle parsing errors gracefully', () => {
      const topic = 'msh/US/2/e/LongFast/!12345678';
      const invalidMessageStr = '{ invalid json }';

      // The parseMessage method should throw an error for invalid JSON
      expect(() => mqttService.parseMessage(topic, invalidMessageStr)).toThrow();
    });
  });

  describe('Statistics and Status', () => {
    test('should return correct statistics', () => {
      const stats = mqttService.getStats();

      expect(stats).toEqual({
        connected: false,
        reconnectAttempts: 0,
        brokerUrl: config.brokerUrl,
        topics: config.topics
      });
    });

    test('should update statistics after connection', async () => {
      mockMqttClient.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
      });

      await mqttService.connect();
      const stats = mqttService.getStats();

      expect(stats.connected).toBe(true);
      expect(stats.reconnectAttempts).toBe(0);
    });
  });
});