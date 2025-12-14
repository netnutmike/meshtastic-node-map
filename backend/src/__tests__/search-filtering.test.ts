import request from 'supertest';
import express from 'express';
import { nodeRoutes } from '../routes/nodes';
import { NodeRepository } from '../database/repositories/node.repository';

// Mock the database and dependencies
jest.mock('../database/connection');
jest.mock('../database/repositories/node.repository');
jest.mock('../middleware/auth', () => ({
  optionalAuth: (req: any, res: any, next: any) => next(),
  requirePermission: () => (req: any, res: any, next: any) => next()
}));
jest.mock('../middleware/rateLimiting', () => ({
  applyRateLimit: () => (req: any, res: any, next: any) => next()
}));
jest.mock('../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/nodes', nodeRoutes);

const mockNodeRepository = NodeRepository as jest.MockedClass<typeof NodeRepository>;

describe('Search and Filtering API', () => {
  let mockFindMany: jest.Mock;
  let mockCount: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFindMany = jest.fn();
    mockCount = jest.fn();
    
    mockNodeRepository.prototype.findMany = mockFindMany;
    mockNodeRepository.prototype.count = mockCount;
  });

  const mockNodes = [
    {
      id: '1',
      nodeId: '12345678',
      hexId: '!12345678',
      shortName: 'NODE1',
      longName: 'Test Node 1',
      hardwareModel: 'TBEAM',
      firmwareVersion: '2.3.2',
      role: 'ROUTER',
      isOnline: true,
      mqttConnected: true,
      batteryLevel: 85,
      voltage: 4.1,
      channelUtilization: 15,
      airUtilTx: 8,
      lastSeen: new Date('2024-01-15T10:00:00Z'),
      lastHeard: new Date('2024-01-15T09:55:00Z'),
      positions: [{
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: 10,
        timestamp: new Date('2024-01-15T10:00:00Z')
      }],
      telemetryReadings: [],
      network: { id: 'net1', name: 'Test Network' }
    },
    {
      id: '2',
      nodeId: '87654321',
      hexId: '!87654321',
      shortName: 'NODE2',
      longName: 'Test Node 2',
      hardwareModel: 'HELTEC_V3',
      firmwareVersion: '2.3.1',
      role: 'CLIENT',
      isOnline: false,
      mqttConnected: false,
      batteryLevel: 45,
      voltage: 3.8,
      channelUtilization: 25,
      airUtilTx: 12,
      lastSeen: new Date('2024-01-15T08:00:00Z'),
      lastHeard: new Date('2024-01-15T07:55:00Z'),
      positions: [{
        latitude: 40.7589,
        longitude: -73.9851,
        altitude: 15,
        timestamp: new Date('2024-01-15T08:00:00Z')
      }],
      telemetryReadings: [],
      network: { id: 'net1', name: 'Test Network' }
    }
  ];

  describe('GET /api/v1/nodes - Search Functionality', () => {
    test('should search nodes by text query', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/nodes')
        .query({ search: 'NODE1' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].shortName).toBe('NODE1');
      
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { shortName: { contains: 'NODE1', mode: 'insensitive' } },
            { longName: { contains: 'NODE1', mode: 'insensitive' } },
            { nodeId: { contains: 'NODE1', mode: 'insensitive' } },
            { hexId: { contains: 'NODE1', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should search nodes by long name', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({ search: 'Test Node 1' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { shortName: { contains: 'Test Node 1', mode: 'insensitive' } },
            { longName: { contains: 'Test Node 1', mode: 'insensitive' } },
            { nodeId: { contains: 'Test Node 1', mode: 'insensitive' } },
            { hexId: { contains: 'Test Node 1', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should search nodes by hex ID', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({ search: '!12345678' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { shortName: { contains: '!12345678', mode: 'insensitive' } },
            { longName: { contains: '!12345678', mode: 'insensitive' } },
            { nodeId: { contains: '!12345678', mode: 'insensitive' } },
            { hexId: { contains: '!12345678', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should handle case-insensitive search', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({ search: 'node1' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { shortName: { contains: 'node1', mode: 'insensitive' } },
            { longName: { contains: 'node1', mode: 'insensitive' } },
            { nodeId: { contains: 'node1', mode: 'insensitive' } },
            { hexId: { contains: 'node1', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('GET /api/v1/nodes - Hardware Type Filtering', () => {
    test('should filter nodes by hardware model', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({ hardwareModel: 'TBEAM' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { hardwareModel: 'TBEAM' },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('GET /api/v1/nodes - Role Filtering', () => {
    test('should filter nodes by role', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({ role: 'ROUTER' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { role: 'ROUTER' },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('GET /api/v1/nodes - Status Filtering', () => {
    test('should filter nodes by online status', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({ isOnline: 'true' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { isOnline: true },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should filter nodes by MQTT connection status', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({ mqttConnected: 'true' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { mqttConnected: true },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should filter offline nodes', async () => {
      mockFindMany.mockResolvedValue([mockNodes[1]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({ isOnline: 'false' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { isOnline: false },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('GET /api/v1/nodes - Time-based Filtering', () => {
    test('should filter nodes by last seen date range', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({
          startDate: '2024-01-15T00:00:00Z',
          endDate: '2024-01-15T23:59:59Z'
        })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          lastSeen: {
            gte: new Date('2024-01-15T00:00:00Z'),
            lte: new Date('2024-01-15T23:59:59Z')
          }
        },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should filter nodes by maximum age', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      const maxAgeHours = 24;

      await request(app)
        .get('/api/v1/nodes')
        .query({ maxAge: maxAgeHours })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          lastSeen: { gte: expect.any(Date) }
        },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should filter by minimum battery level', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({ minBattery: 80 })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { batteryLevel: { gte: 80 } },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('GET /api/v1/nodes - Filter Combination Logic', () => {
    test('should combine multiple filters correctly', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({
          search: 'NODE',
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: 'true',
          minBattery: 50
        })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { shortName: { contains: 'NODE', mode: 'insensitive' } },
            { longName: { contains: 'NODE', mode: 'insensitive' } },
            { nodeId: { contains: 'NODE', mode: 'insensitive' } },
            { hexId: { contains: 'NODE', mode: 'insensitive' } }
          ],
          hardwareModel: 'TBEAM',
          role: 'ROUTER',
          isOnline: true,
          batteryLevel: { gte: 50 }
        },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should handle empty filters', async () => {
      mockFindMany.mockResolvedValue(mockNodes);
      mockCount.mockResolvedValue(2);

      await request(app)
        .get('/api/v1/nodes')
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should apply pagination with filters', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      await request(app)
        .get('/api/v1/nodes')
        .query({
          search: 'NODE',
          page: 2,
          limit: 10
        })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { shortName: { contains: 'NODE', mode: 'insensitive' } },
            { longName: { contains: 'NODE', mode: 'insensitive' } },
            { nodeId: { contains: 'NODE', mode: 'insensitive' } },
            { hexId: { contains: 'NODE', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 10, // (page 2 - 1) * limit 10
        take: 10
      });
    });
  });

  describe('GET /api/v1/nodes - Result Count and Pagination', () => {
    test('should return correct pagination metadata', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(25); // Total count

      const response = await request(app)
        .get('/api/v1/nodes')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        pages: 3 // Math.ceil(25 / 10)
      });
    });

    test('should return applied filters in response', async () => {
      mockFindMany.mockResolvedValue([mockNodes[0]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/nodes')
        .query({ search: 'NODE1', role: 'ROUTER' })
        .expect(200);

      expect(response.body.filters).toEqual({
        search: 'NODE1',
        role: 'ROUTER',
        page: '1',
        limit: '20',
        sortBy: 'lastSeen',
        sortOrder: 'desc'
      });
    });

    test('should handle zero results', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/v1/nodes')
        .query({ search: 'NONEXISTENT' })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
      expect(response.body.pagination.pages).toBe(0);
    });
  });

  describe('GET /api/v1/nodes - Sorting', () => {
    test('should sort by different fields', async () => {
      mockFindMany.mockResolvedValue(mockNodes);
      mockCount.mockResolvedValue(2);

      await request(app)
        .get('/api/v1/nodes')
        .query({ sortBy: 'shortName', sortOrder: 'asc' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { shortName: 'asc' },
        skip: 0,
        take: 20
      });
    });

    test('should default to lastSeen desc sorting', async () => {
      mockFindMany.mockResolvedValue(mockNodes);
      mockCount.mockResolvedValue(2);

      await request(app)
        .get('/api/v1/nodes')
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { lastSeen: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });
});