import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import express, { Express } from 'express';
import analyticsRouter from '../routes/analytics';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $queryRaw: jest.fn(),
    message: {
      groupBy: jest.fn(),
      deleteMany: jest.fn()
    },
    position: {
      deleteMany: jest.fn()
    },
    telemetryReading: {
      deleteMany: jest.fn()
    },
    node: {
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    network: {
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    $disconnect: jest.fn()
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

// Mock Redis
jest.mock('redis', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    setEx: jest.fn(),
    flushAll: jest.fn(),
    quit: jest.fn(),
    on: jest.fn()
  };
  
  return {
    createClient: jest.fn(() => mockRedisClient)
  };
});

const prisma = new PrismaClient();
const redisClient = createClient({
  url: process.env.TEST_REDIS_URL || 'redis://localhost:6379'
});

// Create test app
const app: Express = express();
app.use(express.json());
app.use('/api/analytics', analyticsRouter);

describe('Dashboard API Tests', () => {
  let mockPrisma: any;
  let mockRedis: any;

  beforeAll(async () => {
    mockPrisma = prisma as any;
    mockRedis = redisClient as any;
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient.quit();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset Redis mock
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setEx.mockResolvedValue('OK');
    mockRedis.flushAll.mockResolvedValue('OK');
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.message.deleteMany();
    await prisma.position.deleteMany();
    await prisma.telemetryReading.deleteMany();
    await prisma.node.deleteMany();
    await prisma.network.deleteMany();
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should return dashboard statistics with correct structure', async () => {
      // Mock database query response
      mockPrisma.$queryRaw.mockResolvedValue([{
        node_stats: { totalNodes: 2, activeNodes24h: 1 },
        message_stats: {
          totalMessages: 2,
          gatewayDiversity: 1,
          protocolDiversity: 2,
          successfulMessages: 2,
          rssiExcellent: 1,
          rssiGood: 1,
          rssiFair: 0,
          rssiPoor: 0,
          directMessages: 1,
          routedMessages: 1,
          multihopMessages: 0
        },
        top_nodes: [
          { nodeId: 'node1', shortName: 'TN1', longName: 'Test Node 1', messageCount: 2, avgRssi: -75 }
        ],
        hourly_activity: [
          { hour: new Date(), messageCount: 2 }
        ]
      }]);

      mockPrisma.message.groupBy.mockResolvedValue([
        { type: 'TEXT', _count: { id: 1 } },
        { type: 'POSITION', _count: { id: 1 } }
      ]);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('charts');
      expect(response.body).toHaveProperty('topNodes');

      // Verify metrics
      expect(response.body.metrics).toHaveProperty('totalNodes');
      expect(response.body.metrics).toHaveProperty('activeNodes24h');
      expect(response.body.metrics).toHaveProperty('activeNodesPercentage');
      expect(response.body.metrics).toHaveProperty('gatewayDiversity');
      expect(response.body.metrics).toHaveProperty('protocolDiversity');
      expect(response.body.metrics).toHaveProperty('totalMessages');
      expect(response.body.metrics).toHaveProperty('successRate');

      // Verify charts
      expect(response.body.charts).toHaveProperty('networkActivityTrends');
      expect(response.body.charts).toHaveProperty('nodeActivityDistribution');
      expect(response.body.charts).toHaveProperty('gatewayActivityDistribution');
      expect(response.body.charts).toHaveProperty('signalQualityDistribution');
      expect(response.body.charts).toHaveProperty('messageRoutingPatterns');
      expect(response.body.charts).toHaveProperty('protocolUsage');

      // Verify arrays
      expect(Array.isArray(response.body.charts.networkActivityTrends)).toBe(true);
      expect(Array.isArray(response.body.charts.nodeActivityDistribution)).toBe(true);
      expect(Array.isArray(response.body.charts.signalQualityDistribution)).toBe(true);
      expect(Array.isArray(response.body.charts.messageRoutingPatterns)).toBe(true);
      expect(Array.isArray(response.body.charts.protocolUsage)).toBe(true);
      expect(Array.isArray(response.body.topNodes)).toBe(true);
    });

    it('should calculate statistics accurately', async () => {
      // Mock database query with specific statistics
      mockPrisma.$queryRaw.mockResolvedValue([{
        node_stats: { totalNodes: 5, activeNodes24h: 3 },
        message_stats: {
          totalMessages: 4,
          gatewayDiversity: 2,
          protocolDiversity: 4,
          successfulMessages: 4,
          rssiExcellent: 1,
          rssiGood: 1,
          rssiFair: 1,
          rssiPoor: 1,
          directMessages: 1,
          routedMessages: 2,
          multihopMessages: 1
        },
        top_nodes: [
          { nodeId: 'active-1', shortName: 'A1', longName: 'Active 1', messageCount: 2, avgRssi: -70 },
          { nodeId: 'active-2', shortName: 'A2', longName: 'Active 2', messageCount: 1, avgRssi: -80 },
          { nodeId: 'active-3', shortName: 'A3', longName: 'Active 3', messageCount: 1, avgRssi: -90 }
        ],
        hourly_activity: []
      }]);

      mockPrisma.message.groupBy.mockResolvedValue([
        { type: 'TEXT', _count: { id: 1 } },
        { type: 'POSITION', _count: { id: 1 } },
        { type: 'TELEMETRY', _count: { id: 1 } },
        { type: 'NODEINFO', _count: { id: 1 } }
      ]);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      // Verify node statistics
      expect(response.body.metrics.totalNodes).toBe(5);
      expect(response.body.metrics.activeNodes24h).toBe(3);
      expect(response.body.metrics.activeNodesPercentage).toBe(60);

      // Verify message statistics
      expect(response.body.metrics.totalMessages).toBe(4);
      expect(response.body.metrics.protocolDiversity).toBe(4);
      expect(response.body.metrics.successRate).toBe(100);

      // Verify signal quality distribution
      const signalQuality = response.body.charts.signalQualityDistribution;
      expect(signalQuality.find((s: any) => s.category.includes('Excellent')).count).toBe(1);
      expect(signalQuality.find((s: any) => s.category.includes('Good')).count).toBe(1);
      expect(signalQuality.find((s: any) => s.category.includes('Fair')).count).toBe(1);
      expect(signalQuality.find((s: any) => s.category.includes('Poor')).count).toBe(1);

      // Verify routing patterns
      const routingPatterns = response.body.charts.messageRoutingPatterns;
      expect(routingPatterns.find((r: any) => r.category.includes('Direct')).count).toBe(1);
      expect(routingPatterns.find((r: any) => r.category.includes('Routed')).count).toBe(2);
      expect(routingPatterns.find((r: any) => r.category.includes('Multi-hop')).count).toBe(1);
    });

    it('should cache results for 60 seconds', async () => {
      // Mock database query
      const mockData = [{
        node_stats: { totalNodes: 1, activeNodes24h: 1 },
        message_stats: {
          totalMessages: 0,
          gatewayDiversity: 0,
          protocolDiversity: 0,
          successfulMessages: 0,
          rssiExcellent: 0,
          rssiGood: 0,
          rssiFair: 0,
          rssiPoor: 0,
          directMessages: 0,
          routedMessages: 0,
          multihopMessages: 0
        },
        top_nodes: [],
        hourly_activity: []
      }];

      mockPrisma.$queryRaw.mockResolvedValue(mockData);
      mockPrisma.message.groupBy.mockResolvedValue([]);

      // First request - should hit database
      const response1 = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      // Verify setEx was called with 60 second TTL
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'dashboard:statistics',
        60,
        expect.any(String)
      );

      // Mock cache hit for second request
      mockRedis.get.mockResolvedValue(JSON.stringify(response1.body));

      // Second request - should hit cache
      const response2 = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      // Responses should be identical
      expect(response1.body).toEqual(response2.body);

      // Database should only be called once
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should handle empty database gracefully', async () => {
      // Mock empty database
      mockPrisma.$queryRaw.mockResolvedValue([{
        node_stats: null,
        message_stats: null,
        top_nodes: null,
        hourly_activity: null
      }]);

      mockPrisma.message.groupBy.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      // Verify all metrics are 0 or empty arrays
      expect(response.body.metrics.totalNodes).toBe(0);
      expect(response.body.metrics.activeNodes24h).toBe(0);
      expect(response.body.metrics.activeNodesPercentage).toBe(0);
      expect(response.body.metrics.totalMessages).toBe(0);
      expect(response.body.metrics.successRate).toBe(0);

      expect(response.body.charts.networkActivityTrends).toEqual([]);
      expect(response.body.topNodes).toEqual([]);
    });

    it('should return top 10 most active nodes', async () => {
      // Mock 15 nodes with varying message counts
      const topNodes = Array.from({ length: 15 }, (_, i) => ({
        nodeId: `node-${i}`,
        shortName: `N${i}`,
        longName: `Node ${i}`,
        messageCount: 15 - i,
        avgRssi: -75
      }));

      mockPrisma.$queryRaw.mockResolvedValue([{
        node_stats: { totalNodes: 15, activeNodes24h: 15 },
        message_stats: {
          totalMessages: 120,
          gatewayDiversity: 1,
          protocolDiversity: 1,
          successfulMessages: 120,
          rssiExcellent: 0,
          rssiGood: 120,
          rssiFair: 0,
          rssiPoor: 0,
          directMessages: 120,
          routedMessages: 0,
          multihopMessages: 0
        },
        top_nodes: topNodes,
        hourly_activity: []
      }]);

      mockPrisma.message.groupBy.mockResolvedValue([
        { type: 'TEXT', _count: { id: 120 } }
      ]);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      // Should return exactly 10 nodes
      expect(response.body.topNodes).toHaveLength(10);

      // Should be sorted by message count descending
      const messageCounts = response.body.topNodes.map((n: any) => n.messageCount);
      expect(messageCounts).toEqual([...messageCounts].sort((a, b) => b - a));

      // Top node should have 15 messages
      expect(response.body.topNodes[0].messageCount).toBe(15);
      expect(response.body.topNodes[0].shortName).toBe('N0');
    });

    it('should calculate node activity distribution correctly', async () => {
      // Mock nodes with different activity levels
      const topNodes = [
        { nodeId: 'very-active', shortName: 'VA', longName: 'Very Active', messageCount: 150, avgRssi: -70 },
        { nodeId: 'moderate', shortName: 'MO', longName: 'Moderate', messageCount: 50, avgRssi: -75 },
        { nodeId: 'light', shortName: 'LI', longName: 'Light', messageCount: 5, avgRssi: -80 }
      ];

      mockPrisma.$queryRaw.mockResolvedValue([{
        node_stats: { totalNodes: 4, activeNodes24h: 4 },
        message_stats: {
          totalMessages: 205,
          gatewayDiversity: 1,
          protocolDiversity: 1,
          successfulMessages: 205,
          rssiExcellent: 0,
          rssiGood: 205,
          rssiFair: 0,
          rssiPoor: 0,
          directMessages: 205,
          routedMessages: 0,
          multihopMessages: 0
        },
        top_nodes: topNodes,
        hourly_activity: []
      }]);

      mockPrisma.message.groupBy.mockResolvedValue([
        { type: 'TEXT', _count: { id: 205 } }
      ]);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      const distribution = response.body.charts.nodeActivityDistribution;
      
      // Find each category
      const veryActive = distribution.find((d: any) => d.category.includes('Very Active'));
      const moderate = distribution.find((d: any) => d.category.includes('Moderately Active'));
      const light = distribution.find((d: any) => d.category.includes('Lightly Active'));
      const inactive = distribution.find((d: any) => d.category.includes('Inactive'));

      expect(veryActive.count).toBe(1);
      expect(moderate.count).toBe(1);
      expect(light.count).toBe(1);
      expect(inactive.count).toBe(1); // 4 total nodes - 3 in topNodes = 1 inactive
    });
  });
});
