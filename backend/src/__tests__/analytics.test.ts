import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../services/analytics.service';
import { NodeRepository } from '../database/repositories/node.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { 
  NodeRole, 
  MessageType, 
  TelemetryType, 
  Node, 
  Message, 
  TelemetryReading 
} from '../types/database';

// Mock Prisma Client
jest.mock('@prisma/client');
jest.mock('../database/repositories/node.repository');
jest.mock('../database/repositories/message.repository');
jest.mock('../database/repositories/telemetry.repository');
jest.mock('../database/repositories/position.repository');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockDb: jest.Mocked<PrismaClient>;
  let mockNodeRepository: jest.Mocked<NodeRepository>;
  let mockMessageRepository: jest.Mocked<MessageRepository>;
  let mockTelemetryRepository: jest.Mocked<TelemetryRepository>;
  let mockPositionRepository: jest.Mocked<PositionRepository>;

  beforeEach(() => {
    mockDb = {
      $queryRaw: jest.fn(),
      node: {
        groupBy: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn()
      },
      message: {
        groupBy: jest.fn(),
        findMany: jest.fn()
      }
    } as any;
    
    analyticsService = new AnalyticsService(mockDb);
    
    // Get mocked repositories
    mockNodeRepository = (analyticsService as any).nodeRepository;
    mockMessageRepository = (analyticsService as any).messageRepository;
    mockTelemetryRepository = (analyticsService as any).telemetryRepository;
    mockPositionRepository = (analyticsService as any).positionRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('predictNodeFailures', () => {
    it('should predict node failures based on historical data', async () => {
      // Arrange
      const mockNodes = [
        {
          id: '1',
          nodeId: 'node1',
          shortName: 'Test Node 1',
          batteryLevel: 15,
          lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          telemetryReadings: [
            {
              type: TelemetryType.DEVICE_METRICS,
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
              data: { batteryLevel: 20 }
            },
            {
              type: TelemetryType.DEVICE_METRICS,
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
              data: { batteryLevel: 15 }
            }
          ],
          sentMessages: [
            {
              wantAck: true,
              routingPath: ['node1', 'node2']
            },
            {
              wantAck: true,
              routingPath: []
            }
          ]
        }
      ];

      mockNodeRepository.findMany.mockResolvedValue(mockNodes as any);

      // Act
      const predictions = await analyticsService.predictNodeFailures();

      // Assert
      expect(predictions).toHaveLength(1);
      expect(predictions[0].nodeId).toBe('node1');
      expect(predictions[0].failureRisk).toBe('HIGH');
      expect(predictions[0].riskScore).toBeGreaterThan(50);
      expect(predictions[0].recommendations).toContain('Monitor battery levels closely - declining trend detected');
      expect(predictions[0].recommendations).toContain('Check node connectivity and antenna positioning');
    });

    it('should handle nodes with insufficient data gracefully', async () => {
      // Arrange
      const mockNodes = [
        {
          id: '1',
          nodeId: 'node1',
          shortName: 'Test Node 1',
          batteryLevel: 80,
          lastSeen: new Date(),
          telemetryReadings: [],
          sentMessages: []
        }
      ];

      mockNodeRepository.findMany.mockResolvedValue(mockNodes as any);

      // Act
      const predictions = await analyticsService.predictNodeFailures();

      // Assert
      expect(predictions).toHaveLength(1);
      expect(predictions[0].failureRisk).toBe('LOW');
      expect(predictions[0].riskScore).toBeLessThan(30);
    });

    it('should calculate battery trend correctly', async () => {
      // Arrange
      const mockNodes = [
        {
          id: '1',
          nodeId: 'node1',
          shortName: 'Test Node 1',
          batteryLevel: 50,
          lastSeen: new Date(),
          telemetryReadings: [
            {
              type: TelemetryType.DEVICE_METRICS,
              timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
              data: { batteryLevel: 80 }
            },
            {
              type: TelemetryType.DEVICE_METRICS,
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
              data: { batteryLevel: 65 }
            },
            {
              type: TelemetryType.DEVICE_METRICS,
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
              data: { batteryLevel: 50 }
            }
          ],
          sentMessages: []
        }
      ];

      mockNodeRepository.findMany.mockResolvedValue(mockNodes as any);

      // Act
      const predictions = await analyticsService.predictNodeFailures();

      // Assert
      expect(predictions[0].riskFactors.batteryTrend).toBeLessThan(0); // Declining trend
      expect(predictions[0].recommendations).toContain('Monitor battery levels closely - declining trend detected');
    });
  });

  describe('detectNetworkAnomalies', () => {
    it('should detect connectivity anomalies', async () => {
      // Arrange
      const mockOfflineNodes = Array.from({ length: 15 }, (_, i) => ({
        nodeId: `node${i}`,
        isOnline: false,
        lastSeen: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      }));

      mockNodeRepository.findMany.mockResolvedValue(mockOfflineNodes as any);
      mockNodeRepository.count
        .mockResolvedValueOnce(15) // offline nodes count
        .mockResolvedValueOnce(50); // total nodes count

      // Act
      const anomalies = await analyticsService.detectNetworkAnomalies();

      // Assert
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].type).toBe('CONNECTIVITY');
      expect(anomalies[0].severity).toBe('HIGH');
      expect(anomalies[0].description).toContain('30.0%');
      expect(anomalies[0].suggestedActions).toContain('Check MQTT broker connectivity');
    });

    it('should detect performance anomalies in routing', async () => {
      // Arrange
      const mockMessages = Array.from({ length: 100 }, (_, i) => ({
        routingPath: Array.from({ length: 5 }, (_, j) => `node${j}`) // 5 hops each
      }));

      mockMessageRepository.findMany.mockResolvedValue(mockMessages as any);

      // Act
      const anomalies = await analyticsService.detectNetworkAnomalies();

      // Assert
      const performanceAnomaly = anomalies.find(a => a.type === 'PERFORMANCE');
      expect(performanceAnomaly).toBeDefined();
      expect(performanceAnomaly?.description).toContain('routing patterns');
      expect(performanceAnomaly?.suggestedActions).toContain('Review network topology');
    });

    it('should detect security anomalies in encryption', async () => {
      // Arrange
      const mockMessages = [
        ...Array.from({ length: 30 }, () => ({ encrypted: false })),
        ...Array.from({ length: 20 }, () => ({ encrypted: true }))
      ];

      mockMessageRepository.findMany.mockResolvedValue(mockMessages as any);
      mockMessageRepository.count
        .mockResolvedValueOnce(20) // encrypted count
        .mockResolvedValueOnce(30); // unencrypted count

      // Act
      const anomalies = await analyticsService.detectNetworkAnomalies();

      // Assert
      const securityAnomaly = anomalies.find(a => a.type === 'SECURITY');
      expect(securityAnomaly).toBeDefined();
      expect(securityAnomaly?.description).toContain('encryption rate');
      expect(securityAnomaly?.suggestedActions).toContain('Review encryption configuration');
    });

    it('should detect hardware anomalies with low battery', async () => {
      // Arrange
      const mockLowBatteryNodes = Array.from({ length: 5 }, (_, i) => ({
        nodeId: `node${i}`,
        batteryLevel: 5 // Critical battery level
      }));

      mockNodeRepository.findMany.mockResolvedValue(mockLowBatteryNodes as any);

      // Act
      const anomalies = await analyticsService.detectNetworkAnomalies();

      // Assert
      const hardwareAnomaly = anomalies.find(a => a.type === 'HARDWARE');
      expect(hardwareAnomaly).toBeDefined();
      expect(hardwareAnomaly?.severity).toBe('HIGH');
      expect(hardwareAnomaly?.description).toContain('Critical battery levels');
      expect(hardwareAnomaly?.suggestedActions).toContain('Replace or charge batteries immediately');
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should recommend routing optimizations for high hop counts', async () => {
      // Arrange
      const mockMessages = Array.from({ length: 100 }, () => ({
        routingPath: Array.from({ length: 4 }, (_, i) => `node${i}`) // 4 hops average
      }));

      mockMessageRepository.findMany.mockResolvedValue(mockMessages as any);

      // Act
      const optimizations = await analyticsService.generateOptimizationRecommendations();

      // Assert
      const routingOpt = optimizations.find(o => o.category === 'ROUTING');
      expect(routingOpt).toBeDefined();
      expect(routingOpt?.priority).toBe('HIGH');
      expect(routingOpt?.title).toBe('Optimize Message Routing');
      expect(routingOpt?.implementationSteps).toContain('Identify routing bottlenecks');
    });

    it('should recommend channel optimizations for high utilization', async () => {
      // Arrange
      const mockNodes = Array.from({ length: 20 }, (_, i) => ({
        nodeId: `node${i}`,
        channelUtilization: 80,
        airUtilTx: 75
      }));

      mockNodeRepository.findMany.mockResolvedValue(mockNodes as any);

      // Act
      const optimizations = await analyticsService.generateOptimizationRecommendations();

      // Assert
      const channelOpt = optimizations.find(o => o.category === 'CHANNEL_USAGE');
      expect(channelOpt).toBeDefined();
      expect(channelOpt?.priority).toBe('HIGH');
      expect(channelOpt?.title).toBe('Reduce Channel Congestion');
      expect(channelOpt?.implementationSteps).toContain('Implement message rate limiting');
    });

    it('should recommend power optimizations for low battery nodes', async () => {
      // Arrange
      const mockLowBatteryNodes = Array.from({ length: 8 }, (_, i) => ({
        nodeId: `node${i}`,
        batteryLevel: 25
      }));

      mockNodeRepository.findMany.mockResolvedValue(mockLowBatteryNodes as any);

      // Act
      const optimizations = await analyticsService.generateOptimizationRecommendations();

      // Assert
      const powerOpt = optimizations.find(o => o.category === 'POWER_MANAGEMENT');
      expect(powerOpt).toBeDefined();
      expect(powerOpt?.priority).toBe('MEDIUM');
      expect(powerOpt?.title).toBe('Optimize Power Consumption');
      expect(powerOpt?.implementationSteps).toContain('Enable power saving modes');
    });

    it('should recommend topology optimizations for low router ratio', async () => {
      // Arrange
      mockNodeRepository.count
        .mockResolvedValueOnce(50) // total nodes
        .mockResolvedValueOnce(5); // router nodes

      // Act
      const optimizations = await analyticsService.generateOptimizationRecommendations();

      // Assert
      const topologyOpt = optimizations.find(o => o.category === 'NETWORK_TOPOLOGY');
      expect(topologyOpt).toBeDefined();
      expect(topologyOpt?.priority).toBe('MEDIUM');
      expect(topologyOpt?.title).toBe('Improve Network Topology');
      expect(topologyOpt?.implementationSteps).toContain('Convert strategic client nodes to routers');
    });
  });

  describe('analyzeTrends', () => {
    it('should analyze node growth trends', async () => {
      // Arrange
      const mockDailyData = [
        { date: '2024-01-01', count: BigInt(10) },
        { date: '2024-01-02', count: BigInt(12) },
        { date: '2024-01-03', count: BigInt(15) }
      ];

      mockDb.$queryRaw.mockResolvedValue(mockDailyData);

      // Act
      const trends = await analyticsService.analyzeTrends(undefined, ['nodes']);

      // Assert
      expect(trends).toHaveLength(1);
      expect(trends[0].metric).toBe('nodes');
      expect(trends[0].trend).toBe('INCREASING');
      expect(trends[0].changeRate).toBeGreaterThan(0);
      expect(trends[0].forecast).toHaveLength(7);
    });

    it('should analyze message volume trends', async () => {
      // Arrange
      const mockDailyData = [
        { date: '2024-01-01', count: BigInt(100) },
        { date: '2024-01-02', count: BigInt(95) },
        { date: '2024-01-03', count: BigInt(90) }
      ];

      mockDb.$queryRaw.mockResolvedValue(mockDailyData);

      // Act
      const trends = await analyticsService.analyzeTrends(undefined, ['messages']);

      // Assert
      expect(trends).toHaveLength(1);
      expect(trends[0].metric).toBe('messages');
      expect(trends[0].trend).toBe('DECREASING');
      expect(trends[0].changeRate).toBeLessThan(0);
    });

    it('should generate forecasts with confidence intervals', async () => {
      // Arrange
      const mockDailyData = [
        { date: '2024-01-01', count: BigInt(10) },
        { date: '2024-01-02', count: BigInt(11) },
        { date: '2024-01-03', count: BigInt(12) }
      ];

      mockDb.$queryRaw.mockResolvedValue(mockDailyData);

      // Act
      const trends = await analyticsService.analyzeTrends(undefined, ['nodes']);

      // Assert
      const forecast = trends[0].forecast;
      expect(forecast).toHaveLength(7);
      expect(forecast[0].confidence).toBeGreaterThan(0.8); // High confidence for near-term
      expect(forecast[6].confidence).toBeLessThan(0.5); // Lower confidence for far-term
      expect(forecast.every(f => f.predictedValue >= 0)).toBe(true);
    });
  });

  describe('generateIntelligentAlerts', () => {
    it('should generate predictive alerts for high-risk nodes', async () => {
      // Arrange
      const mockNodes = [
        {
          id: '1',
          nodeId: 'node1',
          shortName: 'Critical Node',
          batteryLevel: 5,
          lastSeen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          telemetryReadings: [
            {
              type: TelemetryType.DEVICE_METRICS,
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
              data: { batteryLevel: 10 }
            },
            {
              type: TelemetryType.DEVICE_METRICS,
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
              data: { batteryLevel: 5 }
            }
          ],
          sentMessages: []
        }
      ];

      mockNodeRepository.findMany.mockResolvedValue(mockNodes as any);

      // Act
      const alerts = await analyticsService.generateIntelligentAlerts();

      // Assert
      const predictiveAlert = alerts.find(a => a.type === 'PREDICTIVE');
      expect(predictiveAlert).toBeDefined();
      expect(predictiveAlert?.severity).toBe('CRITICAL');
      expect(predictiveAlert?.title).toBe('Node Failure Risk Detected');
      expect(predictiveAlert?.nodeIds).toContain('node1');
      expect(predictiveAlert?.mlConfidence).toBeGreaterThan(0.7);
    });

    it('should generate anomaly alerts for critical issues', async () => {
      // Arrange
      // Mock high offline node count
      mockNodeRepository.findMany.mockResolvedValue(Array.from({ length: 30 }, (_, i) => ({
        nodeId: `node${i}`,
        isOnline: false
      })) as any);
      mockNodeRepository.count
        .mockResolvedValueOnce(30) // offline nodes
        .mockResolvedValueOnce(50); // total nodes

      // Act
      const alerts = await analyticsService.generateIntelligentAlerts();

      // Assert
      const anomalyAlert = alerts.find(a => a.type === 'ANOMALY');
      expect(anomalyAlert).toBeDefined();
      expect(anomalyAlert?.severity).toBe('CRITICAL');
      expect(anomalyAlert?.title).toBe('Network Anomaly Detected');
    });

    it('should generate pattern-based alerts for unusual activity', async () => {
      // Arrange
      mockMessageRepository.count
        .mockResolvedValueOnce(500); // Recent messages (high volume)

      mockDb.$queryRaw.mockResolvedValue([{ avg: 50 }]); // Historical average

      // Act
      const alerts = await analyticsService.generateIntelligentAlerts();

      // Assert
      const patternAlert = alerts.find(a => a.type === 'PATTERN');
      expect(patternAlert).toBeDefined();
      expect(patternAlert?.title).toBe('Unusual Message Activity');
      expect(patternAlert?.message).toContain('10x higher than normal');
    });

    it('should sort alerts by severity', async () => {
      // Arrange - setup data that will generate multiple alerts
      const mockNodes = [
        {
          id: '1',
          nodeId: 'node1',
          batteryLevel: 5,
          lastSeen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          telemetryReadings: [
            {
              type: TelemetryType.DEVICE_METRICS,
              timestamp: new Date(),
              data: { batteryLevel: 5 }
            }
          ],
          sentMessages: []
        }
      ];

      mockNodeRepository.findMany.mockResolvedValue(mockNodes as any);
      mockNodeRepository.count.mockResolvedValue(1);
      mockMessageRepository.count.mockResolvedValue(10);
      mockDb.$queryRaw.mockResolvedValue([{ avg: 50 }]);

      // Act
      const alerts = await analyticsService.generateIntelligentAlerts();

      // Assert
      expect(alerts.length).toBeGreaterThan(0);
      
      // Check that alerts are sorted by severity (CRITICAL first)
      const severityOrder = ['CRITICAL', 'ERROR', 'WARNING', 'INFO'];
      for (let i = 0; i < alerts.length - 1; i++) {
        const currentIndex = severityOrder.indexOf(alerts[i].severity);
        const nextIndex = severityOrder.indexOf(alerts[i + 1].severity);
        expect(currentIndex).toBeLessThanOrEqual(nextIndex);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty datasets gracefully', async () => {
      // Arrange
      mockNodeRepository.findMany.mockResolvedValue([]);
      mockMessageRepository.findMany.mockResolvedValue([]);
      mockNodeRepository.count.mockResolvedValue(0);
      mockMessageRepository.count.mockResolvedValue(0);

      // Act & Assert
      await expect(analyticsService.predictNodeFailures()).resolves.toEqual([]);
      await expect(analyticsService.detectNetworkAnomalies()).resolves.toEqual([]);
      await expect(analyticsService.generateOptimizationRecommendations()).resolves.toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockNodeRepository.findMany.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(analyticsService.predictNodeFailures()).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid date ranges', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      mockNodeRepository.findMany.mockResolvedValue([]);

      // Act
      const predictions = await analyticsService.predictNodeFailures(undefined, -1);

      // Assert - should handle negative lookAheadDays gracefully
      expect(predictions).toEqual([]);
    });

    it('should handle nodes with null/undefined telemetry data', async () => {
      // Arrange
      const mockNodes = [
        {
          id: '1',
          nodeId: 'node1',
          batteryLevel: null,
          lastSeen: null,
          telemetryReadings: [
            {
              type: TelemetryType.DEVICE_METRICS,
              data: { batteryLevel: null }
            }
          ],
          sentMessages: []
        }
      ];

      mockNodeRepository.findMany.mockResolvedValue(mockNodes as any);

      // Act
      const predictions = await analyticsService.predictNodeFailures();

      // Assert
      expect(predictions).toHaveLength(1);
      expect(predictions[0].riskScore).toBeGreaterThanOrEqual(0);
      expect(predictions[0].riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance and Accuracy', () => {
    it('should complete predictions within reasonable time for large datasets', async () => {
      // Arrange
      const largeNodeSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        nodeId: `node${i}`,
        batteryLevel: Math.random() * 100,
        lastSeen: new Date(),
        telemetryReadings: Array.from({ length: 10 }, (_, j) => ({
          type: TelemetryType.DEVICE_METRICS,
          timestamp: new Date(Date.now() - j * 60 * 60 * 1000),
          data: { batteryLevel: Math.random() * 100 }
        })),
        sentMessages: []
      }));

      mockNodeRepository.findMany.mockResolvedValue(largeNodeSet as any);

      // Act
      const startTime = Date.now();
      const predictions = await analyticsService.predictNodeFailures();
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(predictions).toHaveLength(1000);
    });

    it('should provide consistent risk scores for identical nodes', async () => {
      // Arrange
      const identicalNodes = Array.from({ length: 2 }, (_, i) => ({
        id: `${i}`,
        nodeId: `node${i}`,
        batteryLevel: 50,
        lastSeen: new Date(),
        telemetryReadings: [
          {
            type: TelemetryType.DEVICE_METRICS,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            data: { batteryLevel: 60 }
          },
          {
            type: TelemetryType.DEVICE_METRICS,
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
            data: { batteryLevel: 50 }
          }
        ],
        sentMessages: []
      }));

      mockNodeRepository.findMany.mockResolvedValue(identicalNodes as any);

      // Act
      const predictions = await analyticsService.predictNodeFailures();

      // Assert
      expect(predictions[0].riskScore).toEqual(predictions[1].riskScore);
      expect(predictions[0].failureRisk).toEqual(predictions[1].failureRisk);
    });

    it('should validate anomaly detection sensitivity', async () => {
      // Arrange - Create scenario with known anomaly
      const mockNodes = Array.from({ length: 100 }, (_, i) => ({
        nodeId: `node${i}`,
        isOnline: i < 80 // 80% online, 20% offline (should trigger anomaly)
      }));

      mockNodeRepository.findMany.mockResolvedValue(mockNodes.filter(n => !n.isOnline) as any);
      mockNodeRepository.count
        .mockResolvedValueOnce(20) // offline count
        .mockResolvedValueOnce(100); // total count

      // Act
      const anomalies = await analyticsService.detectNetworkAnomalies();

      // Assert
      const connectivityAnomaly = anomalies.find(a => a.type === 'CONNECTIVITY');
      expect(connectivityAnomaly).toBeDefined();
      expect(connectivityAnomaly?.confidence).toBeGreaterThan(0.15); // Should detect 20% offline rate
    });
  });
});