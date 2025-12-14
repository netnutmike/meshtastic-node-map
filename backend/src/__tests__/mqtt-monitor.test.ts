/**
 * MQTT Monitor Service Tests
 * Tests message capture, filtering, statistics, and real-time updates
 * Requirements: 11.1
 */

import { MQTTMonitorService, MessageFilters, MessageQuery } from '../services/mqtt-monitor.service';
import { MessageType, MessagePriority } from '../types/database';

describe('MQTTMonitorService', () => {
  let mqttMonitorService: MQTTMonitorService;

  beforeEach(() => {
    mqttMonitorService = new MQTTMonitorService();
  });

  afterEach(() => {
    mqttMonitorService.removeAllListeners();
  });

  describe('Message Capture and Display', () => {
    test('should capture and store MQTT messages', () => {
      const topic = 'msh/US/2/c/LongFast/!12345678';
      const payload = JSON.stringify({
        from: '!12345678',
        type: MessageType.TEXT,
        payload: 'Hello World',
        encrypted: false,
        wantAck: false,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: Date.now() / 1000
      });

      mqttMonitorService.addMessage(topic, payload);

      const query: MessageQuery = {
        filters: {},
        page: 1,
        limit: 10
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].topic).toBe(topic);
        expect(result.messages[0].payload).toBe(payload);
        expect(result.messages[0].parsed?.nodeId).toBe('!12345678');
        expect(result.messages[0].parsed?.type).toBe(MessageType.TEXT);
      });
    });

    test('should emit real-time message events', (done) => {
      const topic = 'msh/US/2/c/LongFast/!87654321';
      const payload = JSON.stringify({
        from: '!87654321',
        type: MessageType.POSITION,
        payload: { latitude: 40.7589, longitude: -73.9851 },
        encrypted: false,
        wantAck: false,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: Date.now() / 1000
      });

      mqttMonitorService.on('message', (message) => {
        expect(message.topic).toBe(topic);
        expect(message.parsed?.type).toBe(MessageType.POSITION);
        done();
      });

      mqttMonitorService.addMessage(topic, payload);
    });

    test('should handle malformed messages gracefully', () => {
      const topic = 'msh/US/2/c/LongFast/!invalid';
      const payload = 'invalid json {';

      mqttMonitorService.addMessage(topic, payload);

      const query: MessageQuery = {
        filters: {},
        page: 1,
        limit: 10
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].parsed).toBeUndefined();
      });
    });

    test('should maintain message size limit', () => {
      // Add more messages than the limit
      for (let i = 0; i < 15000; i++) {
        const payload = JSON.stringify({
          from: `!${i.toString().padStart(8, '0')}`,
          type: MessageType.TEXT,
          payload: `Message ${i}`,
          encrypted: false,
          wantAck: false,
          priority: MessagePriority.DEFAULT,
          channel: 0,
          timestamp: Date.now() / 1000
        });
        mqttMonitorService.addMessage('test/topic', payload);
      }

      const query: MessageQuery = {
        filters: {},
        page: 1,
        limit: 15000
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages.length).toBeLessThanOrEqual(10000);
      });
    });
  });

  describe('Message Filtering', () => {
    beforeEach(() => {
      // Add test messages with different types and properties
      const testMessages = [
        {
          topic: 'msh/US/2/c/LongFast/!11111111',
          payload: JSON.stringify({
            from: '!11111111',
            type: MessageType.TEXT,
            payload: 'Hello',
            encrypted: false,
            wantAck: false,
            priority: MessagePriority.DEFAULT,
            channel: 0,
            timestamp: Date.now() / 1000
          })
        },
        {
          topic: 'msh/US/2/c/LongFast/!22222222',
          payload: JSON.stringify({
            from: '!22222222',
            type: MessageType.POSITION,
            payload: { latitude: 40.7589, longitude: -73.9851 },
            encrypted: true,
            wantAck: false,
            priority: MessagePriority.RELIABLE,
            channel: 1,
            timestamp: Date.now() / 1000
          })
        },
        {
          topic: 'msh/US/2/c/LongFast/!33333333',
          payload: JSON.stringify({
            from: '!33333333',
            type: MessageType.TELEMETRY,
            payload: { batteryLevel: 85 },
            encrypted: false,
            wantAck: true,
            priority: MessagePriority.DEFAULT,
            channel: 0,
            timestamp: Date.now() / 1000
          })
        }
      ];

      testMessages.forEach(msg => {
        mqttMonitorService.addMessage(msg.topic, msg.payload);
      });
    });

    test('should filter messages by type', () => {
      const query: MessageQuery = {
        filters: { type: MessageType.TEXT },
        page: 1,
        limit: 10
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].parsed?.type).toBe(MessageType.TEXT);
      });
    });

    test('should filter messages by node ID', () => {
      const query: MessageQuery = {
        filters: { nodeId: '!22222222' },
        page: 1,
        limit: 10
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].parsed?.nodeId).toBe('!22222222');
      });
    });

    test('should filter messages by encryption status', () => {
      const query: MessageQuery = {
        filters: { encrypted: true },
        page: 1,
        limit: 10
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].parsed?.encrypted).toBe(true);
      });
    });

    test('should filter messages by channel', () => {
      const query: MessageQuery = {
        filters: { channel: 1 },
        page: 1,
        limit: 10
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].parsed?.channel).toBe(1);
      });
    });

    test('should filter messages by search term', () => {
      const query: MessageQuery = {
        filters: { search: 'Hello' },
        page: 1,
        limit: 10
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].payload).toContain('Hello');
      });
    });

    test('should filter messages by date range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const query: MessageQuery = {
        filters: {
          dateRange: {
            start: oneHourAgo,
            end: now
          }
        },
        page: 1,
        limit: 10
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages.length).toBeGreaterThan(0);
        result.messages.forEach(msg => {
          expect(msg.timestamp.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
          expect(msg.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
        });
      });
    });

    test('should combine multiple filters', () => {
      const query: MessageQuery = {
        filters: {
          type: MessageType.POSITION,
          encrypted: true,
          channel: 1
        },
        page: 1,
        limit: 10
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages).toHaveLength(1);
        const message = result.messages[0];
        expect(message.parsed?.type).toBe(MessageType.POSITION);
        expect(message.parsed?.encrypted).toBe(true);
        expect(message.parsed?.channel).toBe(1);
      });
    });
  });

  describe('Statistics Calculations', () => {
    beforeEach(() => {
      // Add test messages for statistics
      const testMessages = [
        { type: MessageType.TEXT, encrypted: false, channel: 0, nodeId: '!11111111' },
        { type: MessageType.TEXT, encrypted: true, channel: 0, nodeId: '!11111111' },
        { type: MessageType.POSITION, encrypted: false, channel: 1, nodeId: '!22222222' },
        { type: MessageType.TELEMETRY, encrypted: false, channel: 0, nodeId: '!33333333' },
        { type: MessageType.TELEMETRY, encrypted: true, channel: 1, nodeId: '!33333333' }
      ];

      testMessages.forEach((msgData, index) => {
        const payload = JSON.stringify({
          from: msgData.nodeId,
          type: msgData.type,
          payload: `Test message ${index}`,
          encrypted: msgData.encrypted,
          wantAck: false,
          priority: MessagePriority.DEFAULT,
          channel: msgData.channel,
          timestamp: Date.now() / 1000
        });
        mqttMonitorService.addMessage('test/topic', payload);
      });
    });

    test('should calculate message statistics correctly', () => {
      return mqttMonitorService.getStatistics('1h').then(stats => {
        expect(stats.totalMessages).toBe(5);
        expect(stats.messagesByType[MessageType.TEXT]).toBe(2);
        expect(stats.messagesByType[MessageType.POSITION]).toBe(1);
        expect(stats.messagesByType[MessageType.TELEMETRY]).toBe(2);
        expect(stats.encryptedMessages).toBe(2);
        expect(stats.unencryptedMessages).toBe(3);
        expect(stats.messagesByChannel[0]).toBe(3);
        expect(stats.messagesByChannel[1]).toBe(2);
      });
    });

    test('should calculate top nodes correctly', () => {
      return mqttMonitorService.getStatistics('1h').then(stats => {
        expect(stats.topNodes).toHaveLength(3);
        
        // Find nodes in top nodes list
        const node1 = stats.topNodes.find(n => n.nodeId === '!11111111');
        const node2 = stats.topNodes.find(n => n.nodeId === '!22222222');
        const node3 = stats.topNodes.find(n => n.nodeId === '!33333333');
        
        expect(node1?.count).toBe(2);
        expect(node2?.count).toBe(1);
        expect(node3?.count).toBe(2);
      });
    });

    test('should calculate average message size', () => {
      return mqttMonitorService.getStatistics('1h').then(stats => {
        expect(stats.averageMessageSize).toBeGreaterThan(0);
        expect(typeof stats.averageMessageSize).toBe('number');
      });
    });

    test('should calculate messages per minute', () => {
      return mqttMonitorService.getStatistics('1h').then(stats => {
        expect(stats.messagesPerMinute).toBeGreaterThan(0);
        expect(typeof stats.messagesPerMinute).toBe('number');
      });
    });
  });

  describe('Traffic Rate Monitoring', () => {
    test('should track traffic rates over time', () => {
      // Add some messages to generate traffic
      for (let i = 0; i < 10; i++) {
        const payload = JSON.stringify({
          from: `!${i.toString().padStart(8, '0')}`,
          type: MessageType.TEXT,
          payload: `Message ${i}`,
          encrypted: false,
          wantAck: false,
          priority: MessagePriority.DEFAULT,
          channel: 0,
          timestamp: Date.now() / 1000
        });
        mqttMonitorService.addMessage('test/topic', payload);
      }

      return mqttMonitorService.getTrafficRate('1m').then(rates => {
        expect(Array.isArray(rates)).toBe(true);
        // Traffic rates are calculated periodically, so we might not have data immediately
        // This test mainly ensures the method works without errors
      });
    });
  });

  describe('Alert Configuration', () => {
    test('should configure traffic alerts', () => {
      const alertConfig = {
        threshold: 50,
        interval: '1m',
        enabled: true
      };

      return mqttMonitorService.configureAlerts(alertConfig).then(result => {
        expect(result.threshold).toBe(50);
        expect(result.interval).toBe('1m');
        expect(result.enabled).toBe(true);
      });
    });

    test('should emit traffic alerts when threshold exceeded', (done) => {
      const alertConfig = {
        threshold: 5,
        interval: '1m',
        enabled: true
      };

      mqttMonitorService.configureAlerts(alertConfig).then(() => {
        mqttMonitorService.on('trafficAlert', (alert) => {
          expect(alert.threshold).toBe(5);
          expect(alert.actual).toBeGreaterThan(5);
          done();
        });

        // Add messages to exceed threshold
        for (let i = 0; i < 10; i++) {
          const payload = JSON.stringify({
            from: `!${i.toString().padStart(8, '0')}`,
            type: MessageType.TEXT,
            payload: `Alert test ${i}`,
            encrypted: false,
            wantAck: false,
            priority: MessagePriority.DEFAULT,
            channel: 0,
            timestamp: Date.now() / 1000
          });
          mqttMonitorService.addMessage('test/topic', payload);
        }
      });
    });
  });

  describe('Message Details', () => {
    test('should retrieve detailed message information', () => {
      const topic = 'msh/US/2/c/LongFast/!12345678';
      const payload = JSON.stringify({
        from: '!12345678',
        type: MessageType.TEXT,
        payload: 'Detailed message',
        encrypted: false,
        wantAck: false,
        priority: MessagePriority.DEFAULT,
        channel: 0,
        timestamp: Date.now() / 1000
      });

      mqttMonitorService.addMessage(topic, payload);

      const query: MessageQuery = {
        filters: {},
        page: 1,
        limit: 1
      };

      return mqttMonitorService.getMessages(query).then(result => {
        const messageId = result.messages[0].id;
        
        return mqttMonitorService.getMessageDetails(messageId).then(details => {
          expect(details).toBeTruthy();
          expect(details?.id).toBe(messageId);
          expect(details?.topic).toBe(topic);
          expect(details?.payload).toBe(payload);
        });
      });
    });

    test('should return null for non-existent message', () => {
      return mqttMonitorService.getMessageDetails('non-existent-id').then(details => {
        expect(details).toBeNull();
      });
    });
  });

  describe('Connection Status', () => {
    test('should return connection status information', () => {
      return mqttMonitorService.getConnectionStatus().then(status => {
        expect(status).toHaveProperty('totalConnections');
        expect(status).toHaveProperty('activeConnections');
        expect(status).toHaveProperty('messagesInBuffer');
        expect(status).toHaveProperty('trafficRatePoints');
        expect(status).toHaveProperty('alertsEnabled');
        expect(status).toHaveProperty('uptime');
        expect(typeof status.uptime).toBe('number');
      });
    });
  });

  describe('Real-time Update Performance', () => {
    test('should handle high message throughput', () => {
      const startTime = Date.now();
      const messageCount = 1000;

      // Add many messages quickly
      for (let i = 0; i < messageCount; i++) {
        const payload = JSON.stringify({
          from: `!${i.toString().padStart(8, '0')}`,
          type: MessageType.TEXT,
          payload: `Performance test ${i}`,
          encrypted: i % 2 === 0,
          wantAck: false,
          priority: MessagePriority.DEFAULT,
          channel: i % 8,
          timestamp: Date.now() / 1000
        });
        mqttMonitorService.addMessage('perf/test', payload);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should process 1000 messages in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);

      const query: MessageQuery = {
        filters: {},
        page: 1,
        limit: messageCount
      };

      return mqttMonitorService.getMessages(query).then(result => {
        expect(result.messages.length).toBe(messageCount);
      });
    });

    test('should maintain performance with filtering on large dataset', () => {
      // Add a large number of messages
      for (let i = 0; i < 5000; i++) {
        const payload = JSON.stringify({
          from: `!${(i % 100).toString().padStart(8, '0')}`,
          type: i % 2 === 0 ? MessageType.TEXT : MessageType.POSITION,
          payload: `Large dataset test ${i}`,
          encrypted: i % 3 === 0,
          wantAck: false,
          priority: MessagePriority.DEFAULT,
          channel: i % 8,
          timestamp: Date.now() / 1000
        });
        mqttMonitorService.addMessage('large/test', payload);
      }

      const startTime = Date.now();

      const query: MessageQuery = {
        filters: {
          type: MessageType.TEXT,
          encrypted: true,
          channel: 0
        },
        page: 1,
        limit: 100
      };

      return mqttMonitorService.getMessages(query).then(result => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Filtering should complete quickly even with large dataset
        expect(duration).toBeLessThan(100);
        expect(result.messages.length).toBeGreaterThan(0);
        
        // Verify all results match filters
        result.messages.forEach(msg => {
          expect(msg.parsed?.type).toBe(MessageType.TEXT);
          expect(msg.parsed?.encrypted).toBe(true);
          expect(msg.parsed?.channel).toBe(0);
        });
      });
    });
  });
});