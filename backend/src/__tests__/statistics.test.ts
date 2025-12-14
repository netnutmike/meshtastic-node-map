import { StatisticsService } from '../services/statistics.service';
import { 
  NodeRole, 
  MessageType, 
  MessagePriority 
} from '../types/database';

describe('StatisticsService', () => {
  let statisticsService: StatisticsService;
  let mockDb: any;

  beforeEach(() => {
    // Create mock database with proper jest mock functions
    mockDb = {
      node: {
        groupBy: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      },
      message: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      },
      telemetryReading: {
        count: jest.fn()
      },
      position: {
        count: jest.fn()
      },
      network: {
        count: jest.fn()
      },
      $queryRaw: jest.fn()
    };

    // Initialize service
    statisticsService = new StatisticsService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('StatisticsService Core Functionality', () => {
    it('should be instantiated correctly', () => {
      expect(statisticsService).toBeDefined();
      expect(typeof statisticsService.getNetworkStatistics).toBe('function');
      expect(typeof statisticsService.getNodeTypeDistribution).toBe('function');
      expect(typeof statisticsService.getMessageAnalytics).toBe('function');
      expect(typeof statisticsService.getUtilizationReport).toBe('function');
      expect(typeof statisticsService.exportStatistics).toBe('function');
    });

    it('should handle export statistics with different formats', async () => {
      // Mock the service methods with proper types
      const mockStats = {
        overview: { 
          totalNodes: 100, 
          onlineNodes: 85, 
          offlineNodes: 15, 
          mqttConnectedNodes: 90, 
          totalMessages: 5000, 
          totalNetworks: 3, 
          lastUpdated: new Date() 
        },
        nodeBreakdown: { 
          byRole: {} as Record<NodeRole, number>, 
          byHardware: {} as Record<string, number>, 
          byFirmware: {} as Record<string, number>, 
          byStatus: { online: 85, offline: 15, mqttConnected: 90, mqttDisconnected: 10 } 
        },
        messageBreakdown: { 
          byType: {} as Record<MessageType, number>, 
          byPriority: {} as Record<MessagePriority, number>, 
          byEncryption: { encrypted: 1200, unencrypted: 3800 }, 
          byRouting: { directMessages: 2000, routedMessages: 3000, averageHops: 1.5 } 
        },
        networkUtilization: { 
          totalChannelUtilization: 1550, 
          averageChannelUtilization: 15.5, 
          totalAirUtilization: 820, 
          averageAirUtilization: 8.2, 
          messagesPerHour: 100, 
          messagesPerDay: 2400 
        },
        timeRangeStats: { 
          last24Hours: { newNodes: 10, totalMessages: 100, uniqueActiveNodes: 15 }, 
          last7Days: { newNodes: 25, totalMessages: 500, uniqueActiveNodes: 30 }, 
          last30Days: { newNodes: 40, totalMessages: 2000, uniqueActiveNodes: 50 } 
        }
      };

      jest.spyOn(statisticsService, 'getNetworkStatistics').mockResolvedValue(mockStats);

      const result = await statisticsService.exportStatistics('json', 'network');

      expect(result).toBeDefined();
      expect(result.format).toBe('json');
      expect(result.data).toBeDefined();
      expect(result.filename).toMatch(/network-statistics-\d{4}-\d{2}-\d{2}\.json/);
    });

    it('should throw error for invalid export type', async () => {
      await expect(
        statisticsService.exportStatistics('json', 'invalid' as any)
      ).rejects.toThrow('Invalid export type');
    });

    it('should calculate node type distribution correctly', async () => {
      // Mock database responses
      mockDb.node.groupBy.mockResolvedValue([
        { 
          role: NodeRole.ROUTER, 
          _count: { role: 20 },
          _avg: { batteryLevel: 85.5, channelUtilization: 12.3 }
        },
        { 
          role: NodeRole.CLIENT, 
          _count: { role: 80 },
          _avg: { batteryLevel: 78.2, channelUtilization: 8.7 }
        }
      ]);

      // Mock the repository count method
      const mockNodeRepository = {
        count: jest.fn().mockResolvedValue(100)
      };
      (statisticsService as any).nodeRepository = mockNodeRepository;

      const result = await statisticsService.getNodeTypeDistribution();

      expect(result).toHaveLength(2);
      
      const routerStats = result.find(r => r.role === NodeRole.ROUTER);
      expect(routerStats).toBeDefined();
      expect(routerStats!.count).toBe(20);
      expect(routerStats!.percentage).toBe(20);
      expect(routerStats!.averageBattery).toBe(85.5);

      const clientStats = result.find(r => r.role === NodeRole.CLIENT);
      expect(clientStats).toBeDefined();
      expect(clientStats!.count).toBe(80);
      expect(clientStats!.percentage).toBe(80);
    });

    it('should handle empty node data gracefully', async () => {
      mockDb.node.groupBy.mockResolvedValue([]);
      const mockNodeRepository = {
        count: jest.fn().mockResolvedValue(0)
      };
      (statisticsService as any).nodeRepository = mockNodeRepository;

      const result = await statisticsService.getNodeTypeDistribution();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      const mockNodeRepository = {
        count: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      (statisticsService as any).nodeRepository = mockNodeRepository;

      await expect(statisticsService.getNodeTypeDistribution()).rejects.toThrow('Database connection failed');
    });
  });
});