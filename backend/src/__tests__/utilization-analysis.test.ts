import { UtilizationAnalysisService } from '../services/utilization-analysis.service';
import { 
  NodeRole, 
  MessageType, 
  TelemetryType 
} from '../types/database';

describe('UtilizationAnalysisService', () => {
  let utilizationService: UtilizationAnalysisService;
  let mockDb: any;

  beforeEach(() => {
    // Create mock database with proper jest mock functions
    mockDb = {
      node: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn()
      },
      telemetryReading: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn()
      },
      message: {
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn()
      },
      position: {
        findMany: jest.fn()
      },
      $queryRaw: jest.fn()
    };

    // Initialize service
    utilizationService = new UtilizationAnalysisService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Channel Utilization Tracking', () => {
    it('should calculate channel utilization statistics correctly', async () => {
      // Mock node data with channel utilization
      const mockNodeData = [
        { channelUtilization: 15.5 },
        { channelUtilization: 22.3 },
        { channelUtilization: 8.7 }
      ];

      mockDb.node.findMany.mockResolvedValue(mockNodeData);
      mockDb.node.count.mockResolvedValue(3);

      const result = await utilizationService.getChannelUtilizationStats();

      expect(result).toBeDefined();
      expect(result.averageUtilization).toBeCloseTo(15.5, 1);
      expect(result.peakUtilization).toBe(22.3);
      expect(result.minimumUtilization).toBe(8.7);
      expect(result.totalNodes).toBe(3);
      expect(mockDb.node.findMany).toHaveBeenCalled();
    });

    it('should handle empty telemetry data gracefully', async () => {
      mockDb.node.findMany.mockResolvedValue([]);
      mockDb.node.count.mockResolvedValue(0);

      const result = await utilizationService.getChannelUtilizationStats();

      expect(result.averageUtilization).toBe(0);
      expect(result.peakUtilization).toBe(0);
      expect(result.minimumUtilization).toBe(0);
      expect(result.totalNodes).toBe(0);
    });

    it('should track utilization over time periods', async () => {
      const mockTimeSeriesData = [
        { period: 0, avgUtilization: 12.5, messageCount: BigInt(100), nodeCount: BigInt(5) },
        { period: 1, avgUtilization: 15.2, messageCount: BigInt(120), nodeCount: BigInt(6) },
        { period: 2, avgUtilization: 18.7, messageCount: BigInt(140), nodeCount: BigInt(7) }
      ];

      mockDb.$queryRaw.mockResolvedValue(mockTimeSeriesData);

      const result = await utilizationService.getUtilizationTrends('24h');

      expect(result).toHaveLength(3);
      expect(result[0].hour).toBe(0);
      expect(result[0].avgUtilization).toBe(12.5);
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('Utilization Heatmap Generation', () => {
    it('should generate geographic utilization heatmap correctly', async () => {
      // Mock nodes with positions and utilization data
      const mockNodesWithPositions = [
        {
          nodeId: 'node1',
          channelUtilization: 15.5,
          airUtilTx: 8.2,
          positions: [{ latitude: 40.7128, longitude: -74.0060 }]
        },
        {
          nodeId: 'node2', 
          channelUtilization: 22.3,
          airUtilTx: 12.1,
          positions: [{ latitude: 40.7589, longitude: -73.9851 }]
        }
      ];

      mockDb.node.findMany.mockResolvedValue(mockNodesWithPositions);

      const result = await utilizationService.generateUtilizationHeatmap();

      expect(result).toBeDefined();
      expect(Array.isArray(result.heatmapPoints)).toBe(true);
      expect(result.heatmapPoints.length).toBeGreaterThan(0);
      
      const firstPoint = result.heatmapPoints[0];
      expect(firstPoint).toHaveProperty('latitude');
      expect(firstPoint).toHaveProperty('longitude');
      expect(firstPoint).toHaveProperty('utilization');
      expect(firstPoint).toHaveProperty('nodeCount');
    });

    it('should handle nodes without position data', async () => {
      const mockNodesWithoutPositions = [
        {
          nodeId: 'node1',
          channelUtilization: 15.5,
          positions: []
        }
      ];

      mockDb.node.findMany.mockResolvedValue(mockNodesWithoutPositions);

      const result = await utilizationService.generateUtilizationHeatmap();

      expect(result.heatmapPoints).toHaveLength(0);
    });

    it('should cluster nearby nodes for heatmap display', async () => {
      // Mock nodes with very close positions (should be clustered)
      const mockClusteredNodes = [
        {
          nodeId: 'node1',
          channelUtilization: 15.5,
          positions: [{ latitude: 40.7128, longitude: -74.0060 }]
        },
        {
          nodeId: 'node2',
          channelUtilization: 18.2,
          positions: [{ latitude: 40.7129, longitude: -74.0061 }] // Very close
        }
      ];

      mockDb.node.findMany.mockResolvedValue(mockClusteredNodes);

      const result = await utilizationService.generateUtilizationHeatmap();

      // Should cluster nearby nodes
      expect(result.heatmapPoints.length).toBeLessThanOrEqual(mockClusteredNodes.length);
      
      if (result.heatmapPoints.length > 0) {
        const clusteredPoint = result.heatmapPoints[0];
        expect(clusteredPoint.nodeCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Capacity Planning', () => {
    it('should generate capacity planning recommendations', async () => {
      // Mock current utilization data
      mockDb.node.aggregate.mockResolvedValue({
        _avg: { channelUtilization: 75.5, airUtilTx: 45.2 },
        _max: { channelUtilization: 85.0, airUtilTx: 55.0 }
      });

      // Mock historical trend data
      const mockTrendData = [
        { date: '2024-01-01', avgUtilization: 60.0 },
        { date: '2024-01-02', avgUtilization: 65.0 },
        { date: '2024-01-03', avgUtilization: 70.0 },
        { date: '2024-01-04', avgUtilization: 75.5 }
      ];

      mockDb.$queryRaw.mockResolvedValue(mockTrendData);

      const result = await utilizationService.generateCapacityPlanningReport();

      expect(result).toBeDefined();
      expect(result.currentUtilization).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.projectedCapacity).toBeDefined();
    });

    it('should identify high utilization nodes for optimization', async () => {
      const mockHighUtilizationNodes = [
        { nodeId: 'node1', channelUtilization: 85.5, shortName: 'Router1', airUtilTx: null, batteryLevel: null },
        { nodeId: 'node2', channelUtilization: 92.3, shortName: 'Router2', airUtilTx: null, batteryLevel: null }
      ];

      mockDb.node.findMany.mockResolvedValue(mockHighUtilizationNodes);

      const result = await utilizationService.identifyHighUtilizationNodes(80.0);

      expect(result).toHaveLength(2); // Only nodes above 80% threshold
      expect(result[0].channelUtilization).toBeGreaterThan(80);
      expect(result[1].channelUtilization).toBeGreaterThan(80);
    });

    it('should calculate network capacity metrics', async () => {
      mockDb.node.aggregate.mockResolvedValue({
        _count: { nodeId: 50 },
        _avg: { channelUtilization: 65.5 }
      });

      mockDb.message.count.mockResolvedValue(10000);

      // Mock the identifyBottlenecks method
      mockDb.node.findMany.mockResolvedValue([
        { nodeId: 'node1', shortName: 'Router1', channelUtilization: 85.0 },
        { nodeId: 'node2', shortName: 'Router2', channelUtilization: 78.0 }
      ]);

      const result = await utilizationService.calculateNetworkCapacityMetrics();

      expect(result).toBeDefined();
      expect(result.totalNodes).toBe(50);
      expect(result.averageUtilization).toBe(65.5);
      expect(result.totalMessages).toBe(10000);
      expect(result.capacityScore).toBeDefined();
      expect(typeof result.capacityScore).toBe('number');
    });
  });

  describe('Performance Trend Analysis', () => {
    it('should analyze utilization trends over time', async () => {
      const mockTrendData = [
        { date: '2024-01-01', avgUtilization: 45.0, messageCount: 1000 },
        { date: '2024-01-02', avgUtilization: 50.0, messageCount: 1200 },
        { date: '2024-01-03', avgUtilization: 55.0, messageCount: 1400 },
        { date: '2024-01-04', avgUtilization: 60.0, messageCount: 1600 }
      ];

      mockDb.$queryRaw.mockResolvedValue(mockTrendData);

      const result = await utilizationService.analyzeTrends('7d');

      expect(result).toBeDefined();
      expect(result.trendDirection).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(result.trendDirection);
      expect(result.growthRate).toBeDefined();
      expect(typeof result.growthRate).toBe('number');
      expect(result.forecast).toBeDefined();
    });

    it('should detect utilization anomalies', async () => {
      const mockAnomalyData = [
        { timestamp: new Date('2024-01-01T10:00:00Z'), utilization: 45.0 },
        { timestamp: new Date('2024-01-01T11:00:00Z'), utilization: 95.0 }, // Anomaly
        { timestamp: new Date('2024-01-01T12:00:00Z'), utilization: 50.0 }
      ];

      mockDb.telemetryReading.findMany.mockResolvedValue(mockAnomalyData);

      const result = await utilizationService.detectUtilizationAnomalies();

      expect(result).toBeDefined();
      expect(Array.isArray(result.anomalies)).toBe(true);
      
      if (result.anomalies.length > 0) {
        const anomaly = result.anomalies[0];
        expect(anomaly).toHaveProperty('timestamp');
        expect(anomaly).toHaveProperty('utilization');
        expect(anomaly).toHaveProperty('severity');
      }
    });

    it('should forecast future utilization based on trends', async () => {
      const mockHistoricalData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        avgUtilization: 40 + i * 0.5 // Gradual increase
      }));

      mockDb.$queryRaw.mockResolvedValue(mockHistoricalData);

      const result = await utilizationService.forecastUtilization(7); // 7 days ahead

      expect(result).toBeDefined();
      expect(Array.isArray(result.forecast)).toBe(true);
      expect(result.forecast).toHaveLength(7);
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Utilization Alerts and Monitoring', () => {
    it('should create utilization threshold alerts', async () => {
      const mockHighUtilizationData = [
        { nodeId: 'node1', channelUtilization: 95.5, shortName: 'Router1' },
        { nodeId: 'node2', channelUtilization: 88.2, shortName: 'Router2' }
      ];

      mockDb.node.findMany.mockResolvedValue(mockHighUtilizationData);

      const result = await utilizationService.checkUtilizationThresholds({
        warning: 80,
        critical: 90
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.alerts)).toBe(true);
      
      const criticalAlerts = result.alerts.filter(alert => alert.severity === 'critical');
      const warningAlerts = result.alerts.filter(alert => alert.severity === 'warning');
      
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(warningAlerts.length).toBeGreaterThan(0);
    });

    it('should monitor network performance degradation', async () => {
      // Mock recent performance data showing degradation
      const mockPerformanceData = [
        { timestamp: new Date(), messageSuccessRate: 0.95, avgLatency: 150 },
        { timestamp: new Date(Date.now() - 3600000), messageSuccessRate: 0.85, avgLatency: 200 },
        { timestamp: new Date(Date.now() - 7200000), messageSuccessRate: 0.75, avgLatency: 250 }
      ];

      mockDb.$queryRaw.mockResolvedValue(mockPerformanceData);

      const result = await utilizationService.detectPerformanceDegradation();

      expect(result).toBeDefined();
      expect(result.degradationDetected).toBeDefined();
      expect(typeof result.degradationDetected).toBe('boolean');
      
      if (result.degradationDetected) {
        expect(result.metrics).toBeDefined();
        expect(result.recommendations).toBeDefined();
      }
    });

    it('should validate alert configuration parameters', () => {
      const validConfig = {
        warning: 75,
        critical: 90,
        checkInterval: 300
      };

      const invalidConfig = {
        warning: 95, // Warning higher than critical
        critical: 80,
        checkInterval: -1 // Invalid interval
      };

      expect(() => utilizationService.validateAlertConfig(validConfig)).not.toThrow();
      expect(() => utilizationService.validateAlertConfig(invalidConfig)).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockDb.node.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(utilizationService.generateUtilizationHeatmap()).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid input parameters', async () => {
      await expect(utilizationService.getUtilizationTrends('invalid' as any)).rejects.toThrow();
      await expect(utilizationService.forecastUtilization(-1)).rejects.toThrow();
    });

    it('should handle missing telemetry data gracefully', async () => {
      mockDb.node.findMany.mockResolvedValue([]);
      mockDb.node.count.mockResolvedValue(0);

      const result = await utilizationService.getChannelUtilizationStats();

      expect(result).toBeDefined();
      expect(result.averageUtilization).toBe(0);
      expect(result.peakUtilization).toBe(0);
      expect(result.totalNodes).toBe(0);
    });
  });
});