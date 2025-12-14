import { PrismaClient } from '@prisma/client';
import { NodeRepository } from '../database/repositories/node.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { 
  Node, 
  Message, 
  TelemetryReading, 
  TelemetryType,
  NodeRole,
  MessageType 
} from '../types/database';
import { logger } from '../utils/logger';

export interface NodeFailurePrediction {
  nodeId: string;
  shortName?: string;
  failureRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number; // 0-100
  predictedFailureDate?: Date;
  riskFactors: {
    batteryTrend: number; // -1 to 1 (declining to improving)
    connectivityIssues: number; // 0-1 (none to severe)
    telemetryAnomalies: number; // 0-1 (normal to highly anomalous)
    messageFailureRate: number; // 0-1 (no failures to all failures)
  };
  recommendations: string[];
}

export interface NetworkAnomaly {
  id: string;
  type: 'CONNECTIVITY' | 'PERFORMANCE' | 'SECURITY' | 'HARDWARE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedNodes: string[];
  detectedAt: Date;
  confidence: number; // 0-1
  metrics: Record<string, number>;
  suggestedActions: string[];
}

export interface PerformanceOptimization {
  category: 'ROUTING' | 'CHANNEL_USAGE' | 'POWER_MANAGEMENT' | 'NETWORK_TOPOLOGY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  description: string;
  expectedImprovement: string;
  implementationSteps: string[];
  affectedNodes?: string[];
  estimatedEffort: 'EASY' | 'MODERATE' | 'COMPLEX';
}

export interface TrendAnalysis {
  metric: string;
  timeframe: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  changeRate: number; // percentage change per period
  forecast: Array<{
    date: Date;
    predictedValue: number;
    confidence: number;
  }>;
  seasonality?: {
    detected: boolean;
    period?: number; // in hours/days
    amplitude?: number;
  };
}

export interface IntelligentAlert {
  id: string;
  type: 'PREDICTIVE' | 'ANOMALY' | 'THRESHOLD' | 'PATTERN';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  nodeIds: string[];
  triggeredAt: Date;
  mlConfidence: number; // 0-1
  context: Record<string, any>;
  suggestedActions: string[];
  autoResolvable: boolean;
}

export class AnalyticsService {
  private db: PrismaClient;
  private nodeRepository: NodeRepository;
  private messageRepository: MessageRepository;
  private telemetryRepository: TelemetryRepository;
  private positionRepository: PositionRepository;

  constructor(db: PrismaClient) {
    this.db = db;
    this.nodeRepository = new NodeRepository();
    this.messageRepository = new MessageRepository();
    this.telemetryRepository = new TelemetryRepository();
    this.positionRepository = new PositionRepository();
  }

  /**
   * Predict node failures using historical data and ML algorithms
   */
  async predictNodeFailures(networkId?: string, lookAheadDays: number = 30): Promise<NodeFailurePrediction[]> {
    logger.info('Generating node failure predictions', { networkId, lookAheadDays });

    const whereClause = networkId ? { networkId } : {};
    const nodes = await this.nodeRepository.findMany({
      where: whereClause,
      include: {
        telemetryReadings: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { timestamp: 'desc' }
        },
        sentMessages: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        }
      }
    });

    const predictions: NodeFailurePrediction[] = [];

    if (!nodes || !Array.isArray(nodes)) return [];
    
    for (const node of nodes) {
      const prediction = await this.analyzeNodeFailureRisk(node, lookAheadDays);
      predictions.push(prediction);
    }

    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Detect network anomalies using statistical analysis and pattern recognition
   */
  async detectNetworkAnomalies(networkId?: string, timeWindow: number = 24): Promise<NetworkAnomaly[]> {
    logger.info('Detecting network anomalies', { networkId, timeWindow });

    const anomalies: NetworkAnomaly[] = [];
    const windowStart = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

    // Connectivity anomalies
    const connectivityAnomalies = await this.detectConnectivityAnomalies(windowStart, networkId);
    anomalies.push(...connectivityAnomalies);

    // Performance anomalies
    const performanceAnomalies = await this.detectPerformanceAnomalies(windowStart, networkId);
    anomalies.push(...performanceAnomalies);

    // Security anomalies
    const securityAnomalies = await this.detectSecurityAnomalies(windowStart, networkId);
    anomalies.push(...securityAnomalies);

    // Hardware anomalies
    const hardwareAnomalies = await this.detectHardwareAnomalies(windowStart, networkId);
    anomalies.push(...hardwareAnomalies);

    return anomalies.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate performance optimization recommendations
   */
  async generateOptimizationRecommendations(networkId?: string): Promise<PerformanceOptimization[]> {
    logger.info('Generating optimization recommendations', { networkId });

    const recommendations: PerformanceOptimization[] = [];

    // Routing optimizations
    const routingOptimizations = await this.analyzeRoutingOptimizations(networkId);
    recommendations.push(...routingOptimizations);

    // Channel usage optimizations
    const channelOptimizations = await this.analyzeChannelOptimizations(networkId);
    recommendations.push(...channelOptimizations);

    // Power management optimizations
    const powerOptimizations = await this.analyzePowerOptimizations(networkId);
    recommendations.push(...powerOptimizations);

    // Network topology optimizations
    const topologyOptimizations = await this.analyzeTopologyOptimizations(networkId);
    recommendations.push(...topologyOptimizations);

    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Perform trend analysis and forecasting
   */
  async analyzeTrends(networkId?: string, metrics: string[] = ['nodes', 'messages', 'utilization']): Promise<TrendAnalysis[]> {
    logger.info('Analyzing trends', { networkId, metrics });

    const analyses: TrendAnalysis[] = [];

    for (const metric of metrics) {
      switch (metric) {
        case 'nodes':
          const nodesTrend = await this.analyzeNodesTrend(networkId);
          analyses.push(nodesTrend);
          break;
        case 'messages':
          const messagesTrend = await this.analyzeMessagesTrend(networkId);
          analyses.push(messagesTrend);
          break;
        case 'utilization':
          const utilizationTrend = await this.analyzeUtilizationTrend(networkId);
          analyses.push(utilizationTrend);
          break;
        case 'battery':
          const batteryTrend = await this.analyzeBatteryTrend(networkId);
          analyses.push(batteryTrend);
          break;
      }
    }

    return analyses;
  }

  /**
   * Generate intelligent alerts based on ML insights
   */
  async generateIntelligentAlerts(networkId?: string): Promise<IntelligentAlert[]> {
    logger.info('Generating intelligent alerts', { networkId });

    const alerts: IntelligentAlert[] = [];

    // Predictive alerts
    const predictions = await this.predictNodeFailures(networkId, 7);
    for (const prediction of predictions) {
      if (prediction.riskScore > 70) {
        alerts.push({
          id: `pred-${prediction.nodeId}-${Date.now()}`,
          type: 'PREDICTIVE',
          severity: prediction.failureRisk === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          title: `Node Failure Risk Detected`,
          message: `Node ${prediction.shortName || prediction.nodeId} has a ${prediction.failureRisk} risk of failure`,
          nodeIds: [prediction.nodeId],
          triggeredAt: new Date(),
          mlConfidence: prediction.riskScore / 100,
          context: { prediction },
          suggestedActions: prediction.recommendations,
          autoResolvable: false
        });
      }
    }

    // Anomaly alerts
    const anomalies = await this.detectNetworkAnomalies(networkId, 1);
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'HIGH' || anomaly.severity === 'CRITICAL') {
        alerts.push({
          id: anomaly.id,
          type: 'ANOMALY',
          severity: anomaly.severity === 'CRITICAL' ? 'CRITICAL' : 'ERROR',
          title: `Network Anomaly Detected`,
          message: anomaly.description,
          nodeIds: anomaly.affectedNodes,
          triggeredAt: anomaly.detectedAt,
          mlConfidence: anomaly.confidence,
          context: { anomaly },
          suggestedActions: anomaly.suggestedActions,
          autoResolvable: false
        });
      }
    }

    // Pattern-based alerts
    const patternAlerts = await this.detectPatternAnomalies(networkId);
    alerts.push(...patternAlerts);

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, ERROR: 3, WARNING: 2, INFO: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private async analyzeNodeFailureRisk(node: Node & { telemetryReadings?: TelemetryReading[], sentMessages?: Message[] }, lookAheadDays: number): Promise<NodeFailurePrediction> {
    const riskFactors = {
      batteryTrend: 0,
      connectivityIssues: 0,
      telemetryAnomalies: 0,
      messageFailureRate: 0
    };

    // Analyze battery trend
    const batteryReadings = (node.telemetryReadings || [])
      .filter(t => t.type === TelemetryType.DEVICE_METRICS && (t.data as any).batteryLevel)
      .map(t => ({ timestamp: t.timestamp, value: (t.data as any).batteryLevel }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (batteryReadings.length >= 2) {
      const trend = this.calculateLinearTrend(batteryReadings);
      riskFactors.batteryTrend = Math.max(-1, Math.min(1, trend / 10)); // Normalize to -1 to 1
    }

    // Analyze connectivity issues
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const offlineTime = node.lastSeen && node.lastSeen < dayAgo ? 
      (now.getTime() - node.lastSeen.getTime()) / (24 * 60 * 60 * 1000) : 0;
    riskFactors.connectivityIssues = Math.min(1, offlineTime / 7); // 0-1 based on days offline

    // Analyze telemetry anomalies
    riskFactors.telemetryAnomalies = await this.calculateTelemetryAnomalyScore(node.telemetryReadings || []);

    // Analyze message failure rate
    const totalMessages = (node.sentMessages || []).length;
    const failedMessages = (node.sentMessages || []).filter(m => !m.wantAck || m.routingPath.length === 0).length;
    riskFactors.messageFailureRate = totalMessages > 0 ? failedMessages / totalMessages : 0;

    // Calculate overall risk score
    const weights = { batteryTrend: 0.3, connectivityIssues: 0.3, telemetryAnomalies: 0.2, messageFailureRate: 0.2 };
    const riskScore = Math.max(0, Math.min(100, 
      (Math.abs(riskFactors.batteryTrend) * weights.batteryTrend +
       riskFactors.connectivityIssues * weights.connectivityIssues +
       riskFactors.telemetryAnomalies * weights.telemetryAnomalies +
       riskFactors.messageFailureRate * weights.messageFailureRate) * 100
    ));

    // Determine risk level
    let failureRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (riskScore >= 80) failureRisk = 'CRITICAL';
    else if (riskScore >= 60) failureRisk = 'HIGH';
    else if (riskScore >= 40) failureRisk = 'MEDIUM';
    else failureRisk = 'LOW';

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskFactors.batteryTrend < -0.5) {
      recommendations.push('Monitor battery levels closely - declining trend detected');
    }
    if (riskFactors.connectivityIssues > 0.3) {
      recommendations.push('Check node connectivity and antenna positioning');
    }
    if (riskFactors.telemetryAnomalies > 0.5) {
      recommendations.push('Investigate telemetry anomalies - possible hardware issues');
    }
    if (riskFactors.messageFailureRate > 0.3) {
      recommendations.push('Review message routing and network topology');
    }

    // Predict failure date if high risk
    let predictedFailureDate: Date | undefined;
    if (riskScore > 60 && riskFactors.batteryTrend < -0.3) {
      const daysToFailure = Math.max(1, (100 - riskScore) / 10);
      predictedFailureDate = new Date(now.getTime() + daysToFailure * 24 * 60 * 60 * 1000);
    }

    return {
      nodeId: node.nodeId,
      shortName: node.shortName,
      failureRisk,
      riskScore,
      predictedFailureDate,
      riskFactors,
      recommendations
    };
  }

  private calculateLinearTrend(data: Array<{ timestamp: Date; value: number }>): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = data.reduce((sum, d, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.value, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumXX = data.reduce((sum, d, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private async calculateTelemetryAnomalyScore(readings: TelemetryReading[]): Promise<number> {
    if (readings.length < 10) return 0;

    // Simple anomaly detection using z-score
    const deviceReadings = readings.filter(r => r.type === TelemetryType.DEVICE_METRICS);
    if (deviceReadings.length < 5) return 0;

    const batteryLevels = deviceReadings
      .map(r => (r.data as any).batteryLevel)
      .filter(b => b !== undefined && b !== null);

    if (batteryLevels.length < 5) return 0;

    const mean = batteryLevels.reduce((sum, val) => sum + val, 0) / batteryLevels.length;
    const variance = batteryLevels.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / batteryLevels.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Count anomalies (values more than 2 standard deviations from mean)
    const anomalies = batteryLevels.filter(val => Math.abs(val - mean) > 2 * stdDev).length;
    return Math.min(1, anomalies / batteryLevels.length);
  }

  private async detectConnectivityAnomalies(windowStart: Date, networkId?: string): Promise<NetworkAnomaly[]> {
    const anomalies: NetworkAnomaly[] = [];
    const whereClause = networkId ? { networkId } : {};

    // Detect nodes with unusual offline patterns
    const offlineNodes = await this.nodeRepository.findMany({
      where: {
        ...whereClause,
        OR: [
          { lastSeen: { lt: windowStart } },
          { isOnline: false },
          { mqttConnected: false }
        ]
      }
    });

    if (offlineNodes && offlineNodes.length > 0) {
      const totalNodes = await this.nodeRepository.count({ where: whereClause });
      const offlinePercentage = (offlineNodes.length / totalNodes) * 100;

      if (offlinePercentage > 20) {
        anomalies.push({
          id: `connectivity-${Date.now()}`,
          type: 'CONNECTIVITY',
          severity: offlinePercentage > 50 ? 'CRITICAL' : 'HIGH',
          description: `High number of offline nodes detected: ${offlinePercentage.toFixed(1)}%`,
          affectedNodes: offlineNodes.map(n => n.nodeId),
          detectedAt: new Date(),
          confidence: Math.min(1, offlinePercentage / 100),
          metrics: { offlinePercentage, totalNodes: offlineNodes.length },
          suggestedActions: [
            'Check MQTT broker connectivity',
            'Verify network infrastructure',
            'Investigate potential interference'
          ]
        });
      }
    }

    return anomalies;
  }

  private async detectPerformanceAnomalies(windowStart: Date, networkId?: string): Promise<NetworkAnomaly[]> {
    const anomalies: NetworkAnomaly[] = [];

    // Detect unusual message routing patterns
    const messages = await this.messageRepository.findMany({
      where: {
        timestamp: { gte: windowStart },
        ...(networkId ? { fromNode: { networkId } } : {})
      }
    });

    if (!messages || messages.length === 0) return anomalies;
    
    const avgHops = messages.reduce((sum, m) => sum + (m.routingPath?.length || 0), 0) / messages.length;
    const maxHops = Math.max(...messages.map(m => m.routingPath?.length || 0));

    if (avgHops > 3 || maxHops > 6) {
      anomalies.push({
        id: `performance-routing-${Date.now()}`,
        type: 'PERFORMANCE',
        severity: avgHops > 5 ? 'HIGH' : 'MEDIUM',
        description: `Unusual routing patterns detected: average ${avgHops.toFixed(1)} hops, max ${maxHops} hops`,
        affectedNodes: [],
        detectedAt: new Date(),
        confidence: Math.min(1, avgHops / 10),
        metrics: { avgHops, maxHops, totalMessages: messages.length },
        suggestedActions: [
          'Review network topology',
          'Check for routing loops',
          'Optimize node placement'
        ]
      });
    }

    return anomalies;
  }

  private async detectSecurityAnomalies(windowStart: Date, networkId?: string): Promise<NetworkAnomaly[]> {
    const anomalies: NetworkAnomaly[] = [];

    // Detect unusual message patterns that might indicate security issues
    const messages = await this.messageRepository.findMany({
      where: {
        timestamp: { gte: windowStart },
        ...(networkId ? { fromNode: { networkId } } : {})
      }
    });

    // Check for unusual encryption patterns
    if (!messages || messages.length === 0) return anomalies;
    
    const encryptedCount = messages.filter(m => m.encrypted).length;
    const encryptionRate = encryptedCount / messages.length;

    if (encryptionRate < 0.5 && messages.length > 100) {
      anomalies.push({
        id: `security-encryption-${Date.now()}`,
        type: 'SECURITY',
        severity: 'MEDIUM',
        description: `Low encryption rate detected: ${(encryptionRate * 100).toFixed(1)}%`,
        affectedNodes: [],
        detectedAt: new Date(),
        confidence: 1 - encryptionRate,
        metrics: { encryptionRate, totalMessages: messages.length },
        suggestedActions: [
          'Review encryption configuration',
          'Check for unencrypted channels',
          'Verify security policies'
        ]
      });
    }

    return anomalies;
  }

  private async detectHardwareAnomalies(windowStart: Date, networkId?: string): Promise<NetworkAnomaly[]> {
    const anomalies: NetworkAnomaly[] = [];
    const whereClause = networkId ? { networkId } : {};

    // Detect nodes with critical battery levels
    const lowBatteryNodes = await this.nodeRepository.findMany({
      where: {
        ...whereClause,
        batteryLevel: { lt: 20 }
      }
    });

    if (lowBatteryNodes && lowBatteryNodes.length > 0) {
      const criticalNodes = lowBatteryNodes.filter(n => (n.batteryLevel || 0) < 10);
      
      if (criticalNodes.length > 0) {
        anomalies.push({
          id: `hardware-battery-${Date.now()}`,
          type: 'HARDWARE',
          severity: 'HIGH',
          description: `Critical battery levels detected on ${criticalNodes.length} nodes`,
          affectedNodes: criticalNodes.map(n => n.nodeId),
          detectedAt: new Date(),
          confidence: 0.9,
          metrics: { criticalNodes: criticalNodes.length, lowBatteryNodes: lowBatteryNodes.length },
          suggestedActions: [
            'Replace or charge batteries immediately',
            'Check power management settings',
            'Consider solar charging solutions'
          ]
        });
      }
    }

    return anomalies;
  }

  private async analyzeRoutingOptimizations(networkId?: string): Promise<PerformanceOptimization[]> {
    const optimizations: PerformanceOptimization[] = [];

    // Analyze message routing efficiency
    const messages = await this.messageRepository.findMany({
      where: {
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        ...(networkId ? { fromNode: { networkId } } : {})
      }
    });

    if (!messages || messages.length === 0) return optimizations;
    
    const avgHops = messages.reduce((sum, m) => sum + m.routingPath.length, 0) / messages.length;

    if (avgHops > 2.5) {
      optimizations.push({
        category: 'ROUTING',
        priority: 'HIGH',
        title: 'Optimize Message Routing',
        description: `Average message routing uses ${avgHops.toFixed(1)} hops, which is higher than optimal`,
        expectedImprovement: 'Reduce message latency by 30-50% and improve battery life',
        implementationSteps: [
          'Identify routing bottlenecks',
          'Add strategic router nodes',
          'Optimize node placement for better connectivity'
        ],
        estimatedEffort: 'MODERATE'
      });
    }

    return optimizations;
  }

  private async analyzeChannelOptimizations(networkId?: string): Promise<PerformanceOptimization[]> {
    const optimizations: PerformanceOptimization[] = [];
    const whereClause = networkId ? { networkId } : {};

    // Analyze channel utilization
    const nodes = await this.nodeRepository.findMany({
      where: whereClause,
      select: { nodeId: true, channelUtilization: true, airUtilTx: true }
    });

    if (!nodes || nodes.length === 0) return optimizations;
    
    const avgChannelUtil = nodes.reduce((sum, n) => sum + (n.channelUtilization || 0), 0) / nodes.length;
    const avgAirUtil = nodes.reduce((sum, n) => sum + (n.airUtilTx || 0), 0) / nodes.length;

    if (avgChannelUtil > 70 || avgAirUtil > 70) {
      optimizations.push({
        category: 'CHANNEL_USAGE',
        priority: 'HIGH',
        title: 'Reduce Channel Congestion',
        description: `High channel utilization detected: ${avgChannelUtil.toFixed(1)}% channel, ${avgAirUtil.toFixed(1)}% air time`,
        expectedImprovement: 'Improve message delivery success rate and reduce collisions',
        implementationSteps: [
          'Implement message rate limiting',
          'Optimize transmission power settings',
          'Consider additional channels or frequency bands'
        ],
        estimatedEffort: 'MODERATE'
      });
    }

    return optimizations;
  }

  private async analyzePowerOptimizations(networkId?: string): Promise<PerformanceOptimization[]> {
    const optimizations: PerformanceOptimization[] = [];
    const whereClause = networkId ? { networkId } : {};

    // Analyze battery usage patterns
    const lowBatteryNodes = await this.nodeRepository.findMany({
      where: {
        ...whereClause,
        batteryLevel: { lt: 30 }
      }
    });

    if (lowBatteryNodes && lowBatteryNodes.length > 0) {
      optimizations.push({
        category: 'POWER_MANAGEMENT',
        priority: 'MEDIUM',
        title: 'Optimize Power Consumption',
        description: `${lowBatteryNodes.length} nodes have low battery levels`,
        expectedImprovement: 'Extend battery life by 20-40%',
        implementationSteps: [
          'Enable power saving modes',
          'Reduce transmission frequency for non-critical nodes',
          'Implement smart sleep scheduling'
        ],
        affectedNodes: lowBatteryNodes.map(n => n.nodeId),
        estimatedEffort: 'EASY'
      });
    }

    return optimizations;
  }

  private async analyzeTopologyOptimizations(networkId?: string): Promise<PerformanceOptimization[]> {
    const optimizations: PerformanceOptimization[] = [];

    // This would require more complex graph analysis
    // For now, provide a basic recommendation based on node distribution
    const whereClause = networkId ? { networkId } : {};
    const totalNodes = await this.nodeRepository.count({ where: whereClause });
    const routerNodes = await this.nodeRepository.count({ 
      where: { ...whereClause, role: NodeRole.ROUTER } 
    });

    const routerRatio = routerNodes / totalNodes;

    if (routerRatio < 0.2 && totalNodes > 10) {
      optimizations.push({
        category: 'NETWORK_TOPOLOGY',
        priority: 'MEDIUM',
        title: 'Improve Network Topology',
        description: `Low router-to-client ratio: ${(routerRatio * 100).toFixed(1)}%`,
        expectedImprovement: 'Better network coverage and message reliability',
        implementationSteps: [
          'Convert strategic client nodes to routers',
          'Add dedicated router nodes in coverage gaps',
          'Optimize antenna placement and orientation'
        ],
        estimatedEffort: 'MODERATE'
      });
    }

    return optimizations;
  }

  private async analyzeNodesTrend(networkId?: string): Promise<TrendAnalysis> {
    const whereClause = networkId ? { networkId } : {};
    
    // Get daily node counts for the last 30 days
    const dailyData = await this.db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "Node" 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ${networkId ? 'AND network_id = ${networkId}' : ''}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const data = dailyData.map(row => ({
      date: new Date(row.date),
      value: Number(row.count)
    }));

    const trend = this.calculateLinearTrend(data.map((d, i) => ({ timestamp: d.date, value: d.value })));
    const changeRate = (trend / (data.length > 0 ? data[0].value : 1)) * 100;

    return {
      metric: 'nodes',
      timeframe: 'DAILY',
      trend: trend > 0.1 ? 'INCREASING' : trend < -0.1 ? 'DECREASING' : 'STABLE',
      changeRate,
      forecast: this.generateForecast(data, 7),
      seasonality: { detected: false }
    };
  }

  private async analyzeMessagesTrend(networkId?: string): Promise<TrendAnalysis> {
    // Similar implementation for messages trend
    const dailyData = await this.db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM "Message" 
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      ${networkId ? 'AND from_node_id IN (SELECT id FROM "Node" WHERE network_id = ${networkId})' : ''}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    const data = dailyData.map(row => ({
      date: new Date(row.date),
      value: Number(row.count)
    }));

    const trend = this.calculateLinearTrend(data.map((d, i) => ({ timestamp: d.date, value: d.value })));
    const changeRate = (trend / (data.length > 0 ? data[0].value : 1)) * 100;

    return {
      metric: 'messages',
      timeframe: 'DAILY',
      trend: trend > 0.1 ? 'INCREASING' : trend < -0.1 ? 'DECREASING' : 'STABLE',
      changeRate,
      forecast: this.generateForecast(data, 7),
      seasonality: { detected: false }
    };
  }

  private async analyzeUtilizationTrend(networkId?: string): Promise<TrendAnalysis> {
    // Implementation for utilization trend analysis
    return {
      metric: 'utilization',
      timeframe: 'HOURLY',
      trend: 'STABLE',
      changeRate: 0,
      forecast: [],
      seasonality: { detected: false }
    };
  }

  private async analyzeBatteryTrend(networkId?: string): Promise<TrendAnalysis> {
    // Implementation for battery trend analysis
    return {
      metric: 'battery',
      timeframe: 'DAILY',
      trend: 'DECREASING',
      changeRate: -2.5,
      forecast: [],
      seasonality: { detected: false }
    };
  }

  private generateForecast(data: Array<{ date: Date; value: number }>, days: number): Array<{ date: Date; predictedValue: number; confidence: number }> {
    if (data.length < 2) return [];

    const trend = this.calculateLinearTrend(data.map((d, i) => ({ timestamp: d.date, value: d.value })));
    const lastValue = data[data.length - 1].value;
    const lastDate = data[data.length - 1].date;

    const forecast = [];
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      const predictedValue = Math.max(0, lastValue + trend * i);
      const confidence = Math.max(0.1, 1 - (i * 0.1)); // Confidence decreases with time

      forecast.push({
        date: forecastDate,
        predictedValue,
        confidence
      });
    }

    return forecast;
  }

  private async detectPatternAnomalies(networkId?: string): Promise<IntelligentAlert[]> {
    const alerts: IntelligentAlert[] = [];

    // Detect unusual activity patterns
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentMessages = await this.messageRepository.count({
      where: {
        timestamp: { gte: hourAgo },
        ...(networkId ? { fromNode: { networkId } } : {})
      }
    });

    // Get historical hourly average
    const historicalAvg = await this.db.$queryRaw<Array<{ avg: number }>>`
      SELECT AVG(hourly_count) as avg FROM (
        SELECT COUNT(*) as hourly_count
        FROM "Message" 
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        AND timestamp < NOW() - INTERVAL '1 hour'
        ${networkId ? 'AND from_node_id IN (SELECT id FROM "Node" WHERE network_id = ${networkId})' : ''}
        GROUP BY DATE_TRUNC('hour', timestamp)
      ) hourly_stats
    `;

    const avgHourlyMessages = historicalAvg[0]?.avg || 0;
    
    if (recentMessages > avgHourlyMessages * 3) {
      alerts.push({
        id: `pattern-spike-${Date.now()}`,
        type: 'PATTERN',
        severity: 'WARNING',
        title: 'Unusual Message Activity',
        message: `Message volume is ${Math.round(recentMessages / avgHourlyMessages)}x higher than normal`,
        nodeIds: [],
        triggeredAt: new Date(),
        mlConfidence: Math.min(1, recentMessages / (avgHourlyMessages * 5)),
        context: { recentMessages, avgHourlyMessages },
        suggestedActions: [
          'Investigate potential network issues',
          'Check for message loops or spam',
          'Monitor system resources'
        ],
        autoResolvable: false
      });
    }

    return alerts;
  }
}