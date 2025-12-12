/**
 * **Feature: meshtastic-node-mapper, Property 9: MQTT message processing round-trip**
 * **Validates: Requirements 13.5**
 * 
 * Property-based test for MQTT message processing round-trip consistency.
 * Tests that parsing then serializing MQTT messages produces equivalent structures.
 */

import * as fc from 'fast-check';
import { 
  MessageType, 
  MessagePriority, 
  TelemetryType,
  NodeRole,
  PositionSource 
} from '../types/database';

// MQTT Message structure based on Meshtastic protocol
interface MQTTMessage {
  id?: string;
  from: string;
  to?: string;
  type: MessageType;
  payload: any;
  encrypted: boolean;
  hopLimit?: number;
  hopStart?: number;
  wantAck: boolean;
  priority: MessagePriority;
  channel: number;
  timestamp: number;
  routingPath?: string[];
  rssi?: number;
  snr?: number;
}

// Generators for property-based testing
const nodeIdGenerator = fc.string({ minLength: 8, maxLength: 8 }).map(s => `!${s.toUpperCase()}`);

const messageTypeGenerator = fc.constantFrom(...Object.values(MessageType));
const messagePriorityGenerator = fc.constantFrom(...Object.values(MessagePriority));

const positionPayloadGenerator = fc.record({
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
  altitude: fc.option(fc.integer({ min: -1000, max: 10000 })),
  precision: fc.option(fc.integer({ min: 0, max: 50 })),
  source: fc.constantFrom(...Object.values(PositionSource))
});

const telemetryPayloadGenerator = fc.record({
  type: fc.constantFrom(...Object.values(TelemetryType)),
  data: fc.oneof(
    // Device metrics
    fc.record({
      batteryLevel: fc.option(fc.integer({ min: 0, max: 100 })),
      voltage: fc.option(fc.double({ min: 0.1, max: 5, noNaN: true })),
      channelUtilization: fc.option(fc.double({ min: 0, max: 100, noNaN: true })),
      airUtilTx: fc.option(fc.double({ min: 0, max: 100, noNaN: true })),
      uptimeSeconds: fc.option(fc.integer({ min: 0, max: 1000000 }))
    }),
    // Environment metrics
    fc.record({
      temperature: fc.option(fc.double({ min: -50, max: 80, noNaN: true })),
      humidity: fc.option(fc.double({ min: 0, max: 100, noNaN: true })),
      pressure: fc.option(fc.double({ min: 800, max: 1200, noNaN: true })),
      gasResistance: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }))
    }),
    // Power metrics
    fc.record({
      ch1Voltage: fc.option(fc.double({ min: 0, max: 50, noNaN: true })),
      ch1Current: fc.option(fc.double({ min: 0, max: 10, noNaN: true })),
      ch2Voltage: fc.option(fc.double({ min: 0, max: 50, noNaN: true })),
      ch2Current: fc.option(fc.double({ min: 0, max: 10, noNaN: true }))
    })
  )
});

const textPayloadGenerator = fc.record({
  text: fc.string({ minLength: 1, maxLength: 200 })
});

const nodeInfoPayloadGenerator = fc.record({
  shortName: fc.option(fc.string({ minLength: 1, maxLength: 4 })),
  longName: fc.option(fc.string({ minLength: 1, maxLength: 40 })),
  hardwareModel: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  firmwareVersion: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  role: fc.constantFrom(...Object.values(NodeRole))
});

const payloadGenerator = fc.oneof(
  positionPayloadGenerator,
  telemetryPayloadGenerator,
  textPayloadGenerator,
  nodeInfoPayloadGenerator,
  fc.record({}) // Empty payload for some message types
);

const mqttMessageGenerator = fc.record({
  id: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  from: nodeIdGenerator,
  to: fc.option(nodeIdGenerator, { nil: undefined }),
  type: messageTypeGenerator,
  payload: payloadGenerator,
  encrypted: fc.boolean(),
  hopLimit: fc.option(fc.integer({ min: 1, max: 7 }), { nil: undefined }),
  hopStart: fc.option(fc.integer({ min: 1, max: 7 }), { nil: undefined }),
  wantAck: fc.boolean(),
  priority: messagePriorityGenerator,
  channel: fc.integer({ min: 0, max: 7 }),
  timestamp: fc.integer({ min: 1000000000, max: 2000000000 }),
  routingPath: fc.option(fc.array(nodeIdGenerator, { minLength: 1, maxLength: 7 }), { nil: undefined }),
  rssi: fc.option(fc.integer({ min: -120, max: -30 }), { nil: undefined }),
  snr: fc.option(fc.double({ min: -20, max: 20, noNaN: true }), { nil: undefined })
});

// Import the actual MQTT service for testing
import { MQTTService } from '../services/mqtt.service';

// Helper function to normalize messages for comparison
function normalizeMessage(message: MQTTMessage): MQTTMessage {
  const normalized: MQTTMessage = {
    from: message.from,
    type: message.type,
    payload: message.payload || {},
    encrypted: message.encrypted,
    wantAck: message.wantAck,
    priority: message.priority,
    channel: message.channel,
    timestamp: message.timestamp
  };
  
  // Only include optional fields if they exist and are not undefined
  if (message.id !== undefined) normalized.id = message.id;
  if (message.to !== undefined) normalized.to = message.to;
  if (message.hopLimit !== undefined) normalized.hopLimit = message.hopLimit;
  if (message.hopStart !== undefined) normalized.hopStart = message.hopStart;
  if (message.routingPath !== undefined) normalized.routingPath = message.routingPath;
  if (message.rssi !== undefined) normalized.rssi = message.rssi;
  if (message.snr !== undefined) normalized.snr = message.snr;
  
  return normalized;
}

// Helper function for deep equality comparison
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

describe('MQTT Message Processing Round-trip Property Tests', () => {
  let mqttService: MQTTService;

  beforeAll(() => {
    // Create a mock MQTT service for testing
    mqttService = new MQTTService({
      brokerUrl: 'mqtt://localhost:1883',
      topics: ['test/topic']
    });
  });

  test('Property 9: MQTT message processing round-trip', () => {
    fc.assert(
      fc.property(mqttMessageGenerator, (originalMessage) => {
        // Normalize the original message to handle undefined values
        const normalizedOriginal = normalizeMessage(originalMessage);
        
        // Serialize the message using the actual MQTT service
        const serialized = mqttService.serializeMessage(normalizedOriginal);
        
        // Parse the serialized message back using the actual MQTT service
        const parsed = mqttService.parseRawMessage(serialized);
        
        if (!parsed) {
          return false; // Parse failed
        }
        
        // Normalize the parsed message
        const normalizedParsed = normalizeMessage(parsed);
        
        // The round-trip should preserve the message structure
        const isEqual = deepEqual(normalizedOriginal, normalizedParsed);
        
        if (!isEqual) {
          console.log('Original:', JSON.stringify(normalizedOriginal, null, 2));
          console.log('Parsed:', JSON.stringify(normalizedParsed, null, 2));
          console.log('Serialized:', serialized);
        }
        
        return isEqual;
      }),
      { 
        numRuns: 100,
        verbose: true
      }
    );
  });

  test('Property 9 - Edge case: Empty payload handling', () => {
    fc.assert(
      fc.property(
        fc.record({
          from: nodeIdGenerator,
          type: messageTypeGenerator,
          encrypted: fc.boolean(),
          wantAck: fc.boolean(),
          priority: messagePriorityGenerator,
          channel: fc.integer({ min: 0, max: 7 }),
          timestamp: fc.integer({ min: 1000000000, max: 2000000000 })
        }),
        (messageBase) => {
          const messageWithEmptyPayload: MQTTMessage = {
            ...messageBase,
            payload: {}
          };
          
          const serialized = mqttService.serializeMessage(messageWithEmptyPayload);
          const parsed = mqttService.parseRawMessage(serialized);
          
          if (!parsed) {
            return false;
          }
          
          return deepEqual(
            normalizeMessage(messageWithEmptyPayload),
            normalizeMessage(parsed)
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 9 - Edge case: Maximum field values', () => {
    const maxMessage: MQTTMessage = {
      id: 'a'.repeat(20),
      from: '!FFFFFFFF',
      to: '!EEEEEEEE',
      type: MessageType.TEXT,
      payload: { text: 'x'.repeat(200) },
      encrypted: true,
      hopLimit: 7,
      hopStart: 7,
      wantAck: true,
      priority: MessagePriority.MAX,
      channel: 7,
      timestamp: 2000000000,
      routingPath: ['!AAAAAAAA', '!BBBBBBBB', '!CCCCCCCC', '!DDDDDDDD', '!EEEEEEEE', '!FFFFFFFF', '!11111111'],
      rssi: -30,
      snr: 20
    };
    
    const serialized = mqttService.serializeMessage(maxMessage);
    const parsed = mqttService.parseRawMessage(serialized);
    
    expect(parsed).toBeTruthy();
    expect(deepEqual(normalizeMessage(maxMessage), normalizeMessage(parsed!))).toBe(true);
  });

  test('Property 9 - Edge case: Minimum field values', () => {
    const minMessage: MQTTMessage = {
      from: '!00000000',
      type: MessageType.TEXT,
      payload: { text: 'a' },
      encrypted: false,
      hopLimit: 1,
      hopStart: 1,
      wantAck: false,
      priority: MessagePriority.MIN,
      channel: 0,
      timestamp: 1000000000,
      routingPath: ['!00000000'],
      rssi: -120,
      snr: -20
    };
    
    const serialized = mqttService.serializeMessage(minMessage);
    const parsed = mqttService.parseRawMessage(serialized);
    
    expect(parsed).toBeTruthy();
    expect(deepEqual(normalizeMessage(minMessage), normalizeMessage(parsed!))).toBe(true);
  });
});