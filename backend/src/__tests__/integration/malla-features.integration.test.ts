/**
 * Malla Features Backend Integration Tests
 * 
 * Tests complete backend workflows for Malla-inspired features:
 * - RF link detection and aggregation
 * - Distance calculations
 * - Line-of-sight analysis
 * - Gateway comparison
 * - Dashboard statistics
 * - Data retention and cleanup
 * 
 * Task: 69.1 Write integration tests for user workflows
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { app } from '../../index';

describe('Malla Features Backend Integration Tests', () => {
  let prisma: PrismaClient;
  let redisClient: any;
  
  const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/test_meshtastic';
  const TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6380';

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL
        }
      }
    });

    redisClient = createClient({ url: TEST_REDIS_URL });
    await redisClient.connect();
  });

  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit();
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

  describe('RF Link Detection Workflow', () => {
    it('should detect RF links from traceroute packets', async () => {
      // Create test network
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      // Create test nodes
      const node1 = await prisma.node.create({
        data: {
          nodeId: '123456789',
          hexId: '75bcd15',
          shortName: 'NODE1',
          longName: 'Test Node 1',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      const node2 = await prisma.node.create({
        data: {
          nodeId: '987654321',
          hexId: '3ade68b1',
          shortName: 'NODE2',
          longName: 'Test Node 2',
          hardwareModel: 'HELTEC_V3',
          role: 'CLIENT',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      // Add positions
      await prisma.position.createMany({
        data: [
          {
            nodeId: node1.id,
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 10,
            timestamp: new Date()
          },
          {
            nodeId: node2.id,
            latitude: 40.7589,
            longitude: -73.9851,
            altitude: 25,
            timestamp: new Date()
          }
        ]
      });

      // Create traceroute message
      await prisma.message.create({
        data: {
          meshPacketId: 'trace_001',
          fromNodeId: node1.id,
          toNodeId: node2.id,
          portnum: 41, // TRACEROUTE_APP
          portnumName: 'TRACEROUTE_APP',
          gatewayId: 'gateway_1',
          rssi: -85,
          snr: 8.5,
          hopLimit: 3,
          hopStart: 3,
          rxTime: new Date(),
          payload: JSON.stringify({
            route: [node1.nodeId, node2.nodeId]
          })
        }
      });

      // Query RF links
      const response = await request(app)
        .get('/api/map/links?hours=24')
        .expect(200);

      expect(response.body.traceroute_links).toBeDefined();
      expect(response.body.traceroute_links.length).toBeGreaterThan(0);
      
      const link = response.body.traceroute_links[0];
      expect(link.from_node_id).toBe(node1.nodeId);
      expect(link.to_node_id).toBe(node2.nodeId);
      expect(link.link_type).toBe('traceroute');
      expect(link.avg_rssi).toBe(-85);
      expect(link.avg_snr).toBe(8.5);
    });

    it('should detect 0-hop packet links', async () => {
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      const node1 = await prisma.node.create({
        data: {
          nodeId: '123456789',
          hexId: '75bcd15',
          shortName: 'NODE1',
          longName: 'Test Node 1',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      const gateway = await prisma.node.create({
        data: {
          nodeId: 'gateway_1',
          hexId: 'gw1',
          shortName: 'GW1',
          longName: 'Gateway 1',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      // Create 0-hop packet (hop_start = hop_limit)
      await prisma.message.create({
        data: {
          meshPacketId: 'pkt_001',
          fromNodeId: node1.id,
          toNodeId: gateway.id,
          portnum: 1,
          portnumName: 'TEXT_MESSAGE_APP',
          gatewayId: gateway.nodeId,
          rssi: -75,
          snr: 10.5,
          hopLimit: 3,
          hopStart: 3, // 0-hop packet
          rxTime: new Date()
        }
      });

      const response = await request(app)
        .get('/api/map/links?hours=24')
        .expect(200);

      expect(response.body.packet_links).toBeDefined();
      expect(response.body.packet_links.length).toBeGreaterThan(0);
      
      const link = response.body.packet_links[0];
      expect(link.from_node_id).toBe(node1.nodeId);
      expect(link.to_node_id).toBe(gateway.nodeId);
      expect(link.link_type).toBe('packet');
    });

    it('should cache RF links for performance', async () => {
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      // First request - should hit database
      const response1 = await request(app)
        .get('/api/map/links?hours=24')
        .expect(200);

      // Second request - should hit cache
      const startTime = Date.now();
      const response2 = await request(app)
        .get('/api/map/links?hours=24')
        .expect(200);
      const endTime = Date.now();

      // Cached response should be faster (< 50ms)
      expect(endTime - startTime).toBeLessThan(50);
      
      // Responses should be identical
      expect(response1.body).toEqual(response2.body);
    });
  });

  describe('Distance Calculation Workflow', () => {
    it('should calculate distances for RF links', async () => {
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      const node1 = await prisma.node.create({
        data: {
          nodeId: '123456789',
          hexId: '75bcd15',
          shortName: 'NODE1',
          longName: 'Test Node 1',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      const node2 = await prisma.node.create({
        data: {
          nodeId: '987654321',
          hexId: '3ade68b1',
          shortName: 'NODE2',
          longName: 'Test Node 2',
          hardwareModel: 'HELTEC_V3',
          role: 'CLIENT',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      // Add positions (approximately 8.5 km apart)
      await prisma.position.createMany({
        data: [
          {
            nodeId: node1.id,
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 10,
            timestamp: new Date()
          },
          {
            nodeId: node2.id,
            latitude: 40.7589,
            longitude: -73.9851,
            altitude: 25,
            timestamp: new Date()
          }
        ]
      });

      // Create message to establish link
      await prisma.message.create({
        data: {
          meshPacketId: 'trace_001',
          fromNodeId: node1.id,
          toNodeId: node2.id,
          portnum: 41,
          portnumName: 'TRACEROUTE_APP',
          gatewayId: 'gateway_1',
          rssi: -85,
          snr: 8.5,
          hopLimit: 3,
          hopStart: 3,
          rxTime: new Date(),
          payload: JSON.stringify({
            route: [node1.nodeId, node2.nodeId]
          })
        }
      });

      // Query longest links
      const response = await request(app)
        .get('/api/links/longest?min_distance=1&min_snr=-20')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      
      const link = response.body[0];
      expect(link.distance_km).toBeGreaterThan(8);
      expect(link.distance_km).toBeLessThan(9);
      expect(link.from_node.shortName).toBe('NODE1');
      expect(link.to_node.shortName).toBe('NODE2');
    });
  });

  describe('Line-of-Sight Analysis Workflow', () => {
    it('should analyze line-of-sight between two nodes', async () => {
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      const node1 = await prisma.node.create({
        data: {
          nodeId: '123456789',
          hexId: '75bcd15',
          shortName: 'NODE1',
          longName: 'Test Node 1',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      const node2 = await prisma.node.create({
        data: {
          nodeId: '987654321',
          hexId: '3ade68b1',
          shortName: 'NODE2',
          longName: 'Test Node 2',
          hardwareModel: 'HELTEC_V3',
          role: 'CLIENT',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      await prisma.position.createMany({
        data: [
          {
            nodeId: node1.id,
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 10,
            timestamp: new Date()
          },
          {
            nodeId: node2.id,
            latitude: 40.7589,
            longitude: -73.9851,
            altitude: 25,
            timestamp: new Date()
          }
        ]
      });

      // Create messages between nodes
      await prisma.message.createMany({
        data: [
          {
            meshPacketId: 'msg_001',
            fromNodeId: node1.id,
            toNodeId: node2.id,
            portnum: 1,
            portnumName: 'TEXT_MESSAGE_APP',
            gatewayId: 'gateway_1',
            rssi: -85,
            snr: 8.5,
            hopLimit: 3,
            hopStart: 3,
            rxTime: new Date()
          },
          {
            meshPacketId: 'msg_002',
            fromNodeId: node1.id,
            toNodeId: node2.id,
            portnum: 1,
            portnumName: 'TEXT_MESSAGE_APP',
            gatewayId: 'gateway_1',
            rssi: -87,
            snr: 7.8,
            hopLimit: 3,
            hopStart: 3,
            rxTime: new Date()
          }
        ]
      });

      const response = await request(app)
        .get(`/api/line-of-sight?from=${node1.nodeId}&to=${node2.nodeId}`)
        .expect(200);

      expect(response.body.from_node).toBeDefined();
      expect(response.body.to_node).toBeDefined();
      expect(response.body.distance_km).toBeGreaterThan(8);
      expect(response.body.bearing).toBeDefined();
      expect(response.body.connectivity).toBeDefined();
      expect(response.body.connectivity.packet_count).toBe(2);
      expect(response.body.connectivity.avg_rssi).toBeCloseTo(-86, 0);
      expect(response.body.connectivity.avg_snr).toBeCloseTo(8.15, 1);
    });
  });

  describe('Gateway Comparison Workflow', () => {
    it('should compare two gateways', async () => {
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      const gateway1 = await prisma.node.create({
        data: {
          nodeId: 'gateway_1',
          hexId: 'gw1',
          shortName: 'GW1',
          longName: 'Gateway 1',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      const gateway2 = await prisma.node.create({
        data: {
          nodeId: 'gateway_2',
          hexId: 'gw2',
          shortName: 'GW2',
          longName: 'Gateway 2',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      const sourceNode = await prisma.node.create({
        data: {
          nodeId: '123456789',
          hexId: '75bcd15',
          shortName: 'SOURCE',
          longName: 'Source Node',
          hardwareModel: 'TBEAM',
          role: 'CLIENT',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      // Create common packets received by both gateways
      const baseTime = new Date();
      await prisma.message.createMany({
        data: [
          {
            meshPacketId: 'common_001',
            fromNodeId: sourceNode.id,
            toNodeId: gateway1.id,
            portnum: 1,
            portnumName: 'TEXT_MESSAGE_APP',
            gatewayId: gateway1.nodeId,
            rssi: -85,
            snr: 8.5,
            hopLimit: 3,
            hopStart: 3,
            rxTime: baseTime
          },
          {
            meshPacketId: 'common_001',
            fromNodeId: sourceNode.id,
            toNodeId: gateway2.id,
            portnum: 1,
            portnumName: 'TEXT_MESSAGE_APP',
            gatewayId: gateway2.nodeId,
            rssi: -80,
            snr: 10.2,
            hopLimit: 3,
            hopStart: 3,
            rxTime: new Date(baseTime.getTime() + 5000) // 5 seconds later
          }
        ]
      });

      const response = await request(app)
        .get(`/api/gateways/compare?gateway1=${gateway1.nodeId}&gateway2=${gateway2.nodeId}`)
        .expect(200);

      expect(response.body.gateway1).toBeDefined();
      expect(response.body.gateway2).toBeDefined();
      expect(response.body.commonPackets).toBeGreaterThan(0);
      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.rssi_diff_avg).toBeCloseTo(5, 0);
      expect(response.body.statistics.snr_diff_avg).toBeCloseTo(1.7, 1);
    });
  });

  describe('Dashboard Statistics Workflow', () => {
    it('should generate comprehensive dashboard statistics', async () => {
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      // Create multiple nodes
      const nodes = await Promise.all([
        prisma.node.create({
          data: {
            nodeId: '111111111',
            hexId: 'node1',
            shortName: 'N1',
            longName: 'Node 1',
            hardwareModel: 'TBEAM',
            role: 'ROUTER',
            isOnline: true,
            mqttConnected: true,
            networkId: network.id,
            lastSeen: new Date(),
            lastHeard: new Date()
          }
        }),
        prisma.node.create({
          data: {
            nodeId: '222222222',
            hexId: 'node2',
            shortName: 'N2',
            longName: 'Node 2',
            hardwareModel: 'HELTEC_V3',
            role: 'CLIENT',
            isOnline: true,
            mqttConnected: true,
            networkId: network.id,
            lastSeen: new Date(),
            lastHeard: new Date()
          }
        }),
        prisma.node.create({
          data: {
            nodeId: '333333333',
            hexId: 'node3',
            shortName: 'N3',
            longName: 'Node 3',
            hardwareModel: 'TBEAM',
            role: 'ROUTER',
            isOnline: false,
            mqttConnected: false,
            networkId: network.id,
            lastSeen: new Date(Date.now() - 7200000), // 2 hours ago
            lastHeard: new Date(Date.now() - 7200000)
          }
        })
      ]);

      // Create messages
      await prisma.message.createMany({
        data: [
          {
            meshPacketId: 'msg_001',
            fromNodeId: nodes[0].id,
            toNodeId: nodes[1].id,
            portnum: 1,
            portnumName: 'TEXT_MESSAGE_APP',
            gatewayId: 'gateway_1',
            rssi: -85,
            snr: 8.5,
            hopLimit: 3,
            hopStart: 3,
            rxTime: new Date()
          },
          {
            meshPacketId: 'msg_002',
            fromNodeId: nodes[1].id,
            toNodeId: nodes[0].id,
            portnum: 3,
            portnumName: 'POSITION_APP',
            gatewayId: 'gateway_1',
            rssi: -82,
            snr: 9.2,
            hopLimit: 3,
            hopStart: 3,
            rxTime: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.totalNodes).toBe(3);
      expect(response.body.activeNodes).toBe(2);
      expect(response.body.totalMessages).toBe(2);
      expect(response.body.charts).toBeDefined();
      expect(response.body.charts.networkActivity).toBeDefined();
      expect(response.body.charts.nodeActivity).toBeDefined();
    });

    it('should cache dashboard statistics', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      // Second request - should be cached
      const startTime = Date.now();
      const response2 = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);
      const endTime = Date.now();

      // Cached response should be very fast (< 50ms)
      expect(endTime - startTime).toBeLessThan(50);
      
      expect(response1.body).toEqual(response2.body);
    });
  });

  describe('Data Retention and Cleanup Workflow', () => {
    it('should clean up old messages', async () => {
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      const node = await prisma.node.create({
        data: {
          nodeId: '123456789',
          hexId: '75bcd15',
          shortName: 'NODE1',
          longName: 'Test Node 1',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      // Create old messages (older than retention period)
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      await prisma.message.createMany({
        data: [
          {
            meshPacketId: 'old_001',
            fromNodeId: node.id,
            portnum: 1,
            portnumName: 'TEXT_MESSAGE_APP',
            gatewayId: 'gateway_1',
            rssi: -85,
            snr: 8.5,
            hopLimit: 3,
            hopStart: 3,
            rxTime: oldDate
          },
          {
            meshPacketId: 'old_002',
            fromNodeId: node.id,
            portnum: 1,
            portnumName: 'TEXT_MESSAGE_APP',
            gatewayId: 'gateway_1',
            rssi: -87,
            snr: 7.8,
            hopLimit: 3,
            hopStart: 3,
            rxTime: oldDate
          }
        ]
      });

      // Create recent message
      await prisma.message.create({
        data: {
          meshPacketId: 'recent_001',
          fromNodeId: node.id,
          portnum: 1,
          portnumName: 'TEXT_MESSAGE_APP',
          gatewayId: 'gateway_1',
          rssi: -85,
          snr: 8.5,
          hopLimit: 3,
          hopStart: 3,
          rxTime: new Date()
        }
      });

      // Trigger cleanup
      const response = await request(app)
        .post('/api/admin/cleanup')
        .send({ retention_days: 7 })
        .expect(200);

      expect(response.body.deleted).toBeDefined();
      expect(response.body.deleted.messages).toBe(2);

      // Verify old messages were deleted
      const remainingMessages = await prisma.message.findMany();
      expect(remainingMessages.length).toBe(1);
      expect(remainingMessages[0].meshPacketId).toBe('recent_001');
    });

    it('should preserve traceroute packets longer', async () => {
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      const node = await prisma.node.create({
        data: {
          nodeId: '123456789',
          hexId: '75bcd15',
          shortName: 'NODE1',
          longName: 'Test Node 1',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          mqttConnected: true,
          networkId: network.id,
          lastSeen: new Date(),
          lastHeard: new Date()
        }
      });

      // Create old traceroute (10 days old, but should be preserved)
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      await prisma.message.create({
        data: {
          meshPacketId: 'trace_001',
          fromNodeId: node.id,
          portnum: 41, // TRACEROUTE_APP
          portnumName: 'TRACEROUTE_APP',
          gatewayId: 'gateway_1',
          rssi: -85,
          snr: 8.5,
          hopLimit: 3,
          hopStart: 3,
          rxTime: oldDate,
          payload: JSON.stringify({ route: [node.nodeId] })
        }
      });

      // Trigger cleanup with 7-day retention
      const response = await request(app)
        .post('/api/admin/cleanup')
        .send({ retention_days: 7 })
        .expect(200);

      // Traceroute should still exist (longer retention)
      const traceroutes = await prisma.message.findMany({
        where: { portnum: 41 }
      });
      expect(traceroutes.length).toBe(1);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent RF link queries efficiently', async () => {
      const network = await prisma.network.create({
        data: {
          name: 'Test Network',
          mqttBroker: 'mqtt://test:1883',
          mqttCredentials: {},
          region: 'US',
          isActive: true
        }
      });

      // Create test data
      const nodes = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          prisma.node.create({
            data: {
              nodeId: `node_${i}`,
              hexId: `hex_${i}`,
              shortName: `N${i}`,
              longName: `Node ${i}`,
              hardwareModel: 'TBEAM',
              role: 'ROUTER',
              isOnline: true,
              mqttConnected: true,
              networkId: network.id,
              lastSeen: new Date(),
              lastHeard: new Date()
            }
          })
        )
      );

      // Make concurrent requests
      const startTime = Date.now();
      const promises = Array.from({ length: 20 }, () =>
        request(app).get('/api/map/links?hours=24')
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle 20 concurrent requests in under 2 seconds
      expect(totalTime).toBeLessThan(2000);
      console.log(`Handled 20 concurrent RF link queries in ${totalTime}ms`);
    });
  });
});
