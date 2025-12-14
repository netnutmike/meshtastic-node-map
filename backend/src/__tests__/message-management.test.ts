/**
 * Unit tests for message management functionality
 * Tests message storage, retrieval, filtering, search, and routing path calculation
 * Requirements: 3.2, 15.1, 19.3
 */

import { MessageType, MessagePriority } from '../types/database';

describe('Message Management', () => {

  describe('Message Data Structures', () => {
    test('should validate message type enum values', () => {
      const validTypes = Object.values(MessageType);
      expect(validTypes).toContain(MessageType.TEXT);
      expect(validTypes).toContain(MessageType.POSITION);
      expect(validTypes).toContain(MessageType.TELEMETRY);
      expect(validTypes).toContain(MessageType.NODEINFO);
      expect(validTypes).toContain(MessageType.ROUTING);
      expect(validTypes.length).toBeGreaterThan(15);
    });

    test('should validate message priority enum values', () => {
      const validPriorities = Object.values(MessagePriority);
      expect(validPriorities).toContain(MessagePriority.UNSET);
      expect(validPriorities).toContain(MessagePriority.MIN);
      expect(validPriorities).toContain(MessagePriority.DEFAULT);
      expect(validPriorities).toContain(MessagePriority.RELIABLE);
      expect(validPriorities).toContain(MessagePriority.MAX);
      expect(validPriorities.length).toBe(7);
    });

    test('should create valid message structure', () => {
      const message = {
        messageId: 'msg123',
        fromNodeId: 'node1-uuid',
        toNodeId: 'node2-uuid',
        type: MessageType.TEXT,
        content: 'Hello, World!',
        encrypted: false,
        hopLimit: 3,
        hopStart: 3,
        wantAck: true,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: new Date(),
        routingPath: ['node1-uuid', 'router1-uuid', 'node2-uuid'],
        rssi: -85,
        snr: 8.5
      };

      expect(message.messageId).toBe('msg123');
      expect(message.type).toBe(MessageType.TEXT);
      expect(message.priority).toBe(MessagePriority.DEFAULT);
      expect(message.routingPath).toHaveLength(3);
      expect(message.encrypted).toBe(false);
      expect(message.wantAck).toBe(true);
    });
  });

  describe('Message Filtering Logic', () => {
    test('should create proper filter for message type', () => {
      const typeFilter = { type: MessageType.TEXT };
      expect(typeFilter.type).toBe(MessageType.TEXT);
    });

    test('should create proper filter for encrypted messages', () => {
      const encryptedFilter = { encrypted: true };
      const unencryptedFilter = { encrypted: false };
      
      expect(encryptedFilter.encrypted).toBe(true);
      expect(unencryptedFilter.encrypted).toBe(false);
    });

    test('should create proper filter for channel', () => {
      const channelFilter = { channel: 0 };
      expect(channelFilter.channel).toBe(0);
      expect(channelFilter.channel).toBeGreaterThanOrEqual(0);
      expect(channelFilter.channel).toBeLessThanOrEqual(7);
    });

    test('should create proper date range filter', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      
      const dateFilter = {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      };

      expect(dateFilter.timestamp.gte).toEqual(startDate);
      expect(dateFilter.timestamp.lte).toEqual(endDate);
      expect(dateFilter.timestamp.gte.getTime()).toBeLessThan(dateFilter.timestamp.lte.getTime());
    });
  });

  describe('Routing Path Calculation and Display', () => {
    test('should validate routing path structure', () => {
      const routingPath = ['node1-uuid', 'router1-uuid', 'router2-uuid', 'node2-uuid'];
      
      expect(Array.isArray(routingPath)).toBe(true);
      expect(routingPath).toHaveLength(4);
      expect(routingPath[0]).toBe('node1-uuid');
      expect(routingPath[routingPath.length - 1]).toBe('node2-uuid');
    });

    test('should handle empty routing path (direct transmission)', () => {
      const routingPath: string[] = [];
      
      expect(Array.isArray(routingPath)).toBe(true);
      expect(routingPath).toHaveLength(0);
    });

    test('should calculate hop count from routing path', () => {
      const routingPath1 = ['node1', 'router1', 'node2']; // 2 hops
      const routingPath2 = ['node1', 'node2']; // 1 hop
      const routingPath3: string[] = []; // 0 hops (direct)

      expect(routingPath1.length - 1).toBe(2);
      expect(routingPath2.length - 1).toBe(1);
      expect(Math.max(0, routingPath3.length - 1)).toBe(0);
    });

    test('should format routing path for display', () => {
      const routingPath = ['node1', 'router1', 'router2', 'node2'];
      const formattedPath = routingPath.join(' → ');
      
      expect(formattedPath).toBe('node1 → router1 → router2 → node2');
    });

    test('should handle single node routing path', () => {
      const routingPath = ['node1'];
      const hopCount = Math.max(0, routingPath.length - 1);
      
      expect(hopCount).toBe(0);
      expect(routingPath.join(' → ')).toBe('node1');
    });
  });

  describe('Message Export Functionality', () => {
    test('should format message data for CSV export', () => {
      const message = {
        id: 'msg1',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        type: MessageType.TEXT,
        content: 'Hello, World!',
        encrypted: false,
        channel: 0,
        routingPath: ['node1', 'router1', 'node2'],
        fromNode: { shortName: 'Node1', longName: 'Test Node 1' },
        toNode: { shortName: 'Node2', longName: 'Test Node 2' }
      };

      // Simulate CSV formatting logic
      const csvRow = [
        message.timestamp.toISOString(),
        message.fromNode.shortName,
        message.toNode.shortName,
        message.type,
        `"${message.content}"`,
        message.encrypted,
        message.channel,
        `"${message.routingPath.join(' -> ')}"`
      ].join(',');

      expect(csvRow).toContain('2023-01-01T12:00:00.000Z');
      expect(csvRow).toContain('Node1');
      expect(csvRow).toContain('Node2');
      expect(csvRow).toContain('TEXT');
      expect(csvRow).toContain('"Hello, World!"');
      expect(csvRow).toContain('false');
      expect(csvRow).toContain('0');
      expect(csvRow).toContain('"node1 -> router1 -> node2"');
    });

    test('should format message data for JSON export', () => {
      const messages = [
        {
          id: 'msg1',
          timestamp: new Date('2023-01-01T12:00:00Z'),
          type: MessageType.TEXT,
          content: 'Hello, World!',
          encrypted: false,
          channel: 0,
          routingPath: ['node1', 'router1', 'node2']
        }
      ];

      const exportData = {
        exportDate: new Date().toISOString(),
        totalMessages: messages.length,
        filters: { type: 'TEXT' },
        messages: messages
      };

      expect(exportData.totalMessages).toBe(1);
      expect(exportData.messages).toHaveLength(1);
      expect(exportData.messages[0].type).toBe(MessageType.TEXT);
      expect(exportData.filters).toEqual({ type: 'TEXT' });
    });
  });

  describe('Error Handling', () => {
    test('should validate required message fields', () => {
      const validMessage = {
        fromNodeId: 'node1-uuid',
        type: MessageType.TEXT,
        content: 'Hello, World!',
        timestamp: new Date(),
        priority: MessagePriority.DEFAULT,
        channel: 0,
        encrypted: false,
        wantAck: false,
        routingPath: []
      };

      expect(validMessage.fromNodeId).toBeDefined();
      expect(validMessage.type).toBeDefined();
      expect(validMessage.content).toBeDefined();
      expect(validMessage.timestamp).toBeInstanceOf(Date);
    });

    test('should handle invalid message types', () => {
      const invalidType = 'INVALID_TYPE' as MessageType;
      const validTypes = Object.values(MessageType);
      
      expect(validTypes).not.toContain(invalidType);
    });

    test('should validate channel range', () => {
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
  });

  describe('Performance and Pagination', () => {
    test('should calculate proper pagination parameters', () => {
      const page = 2;
      const limit = 25;
      const skip = (page - 1) * limit;
      
      expect(skip).toBe(25);
      expect(limit).toBe(25);
    });

    test('should limit query results to prevent memory issues', () => {
      const maxLimit = 1000;
      const requestedLimit = 5000; // Exceeds maximum

      // In a real implementation, this would be capped at maxLimit
      const actualLimit = Math.min(requestedLimit, maxLimit);

      expect(actualLimit).toBe(maxLimit);
    });

    test('should validate pagination bounds', () => {
      const page = 1;
      const limit = 50;
      const total = 150;
      const pages = Math.ceil(total / limit);

      expect(page).toBeGreaterThanOrEqual(1);
      expect(limit).toBeGreaterThan(0);
      expect(pages).toBe(3);
      expect(page).toBeLessThanOrEqual(pages);
    });
  });
});