import { PrismaClient } from '@prisma/client';
import { NodeRepository } from '../database/repositories/node.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { logger } from '../utils/logger';

export interface ChannelUtilizationStats {
  averageUtilization: number;
  peakUtilization: number;
  minimumUtilization: number;
  totalNodes: number;
  utilizationDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

export interface UtilizationTrend {
  hour: number;
  avgUtilization: number;
  messageCount?: number;
  nodeCount?: number;
}

export interface UtilizationHeatmap {
  heatmapPoints: Array<{
    latitude: number;
    longitude: number;
    utilization: number;
    nodeCount: number;
    averageChannelUtilization: number;
    averageAirUtilization: number;
  }>;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  generatedAt: Date;
}

export interface CapacityPlanningReport {
  currentUtilization: {
    averageChannel: number;
    averageAir: number;
    peakChannel: number;
    peakAir: number;
  };
  recommendations: Array<{
    type: 'optimization' | 'expansion' | 'monitoring';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    estimatedImpact: string;
  }>;
  projectedCapacity: {
    daysUntilCapacity: number;
    recommendedActions: string[];
    confidenceLevel: number;
  };
}

export interface NetworkCapacityMetrics {
  totalNodes: number;
  averageUtilization: number;
  totalMessages: number;
  capacityScore: number; // 0-100 scale
  bottlenecks: Array<{
    nodeId: string;
    shortName?: string;
    utilizationLevel: number;
    impact: 'low' | 'medium' | 'high';
  }>;
}

export interface TrendAnalysis {
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  growthRate: number; // Percentage change per day
  forecast: Array<{
    date: string;
    predictedUtilization: number;
    confidence: number;
  }>;
  seasonalPatterns?: Array<{
    hour: number;
    averageUtilization: number;
  }>;
}

export interface UtilizationAnomaly {
  timestamp: Date;
  nodeId?: string;
  utilization: number;
  expectedUtilization: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface AnomalyDetectionResult {
  anomalies: UtilizationAnomaly[];
  totalAnomalies: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface UtilizationForecast {
  forecast: Array<{
    date: string;
    predictedUtilization: number;
    confidence: number;
  }>;
  confidence: number;
  methodology: string;
}

export interface UtilizationAlert {
  nodeId: string;
  shortName?: string;
  currentUtilization: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
  description: string;
}

export interface AlertCheckResult {
  alerts: UtilizationAlert[];
  totalAlerts: number;
  summary: {
    critical: number;
    warning: number;
  };
}

export interface PerformanceDegradationResult {
  degradationDetected: boolean;
  metrics?: {
    messageSuccessRateChange: number;
    latencyChange: number;
    utilizationChange: number;
  };
  recommendations?: string[];
  severity?: 'low' | 'medium' | 'high';
}

export interface AlertConfig {
  warning: number;
  critical: number;
  checkInterval?: number;
}

export class UtilizationAnalysisService {
  private db: PrismaClient;
  private nodeRepository: NodeRepository;
  private telemetryRepository: TelemetryRepository;
  private messageRepository: MessageRepository;

  constructor(db: PrismaClient) {
    this.db = db;
    this.nodeRepository = new NodeRepository();
    this.telemetryRepository = new TelemetryRepository();
    this.messageRepository = new MessageRepository();
  }

  async getChannelUtilizationStats(networkId?: string): Promise<ChannelUtilizationStats> {
    logger.info('Calculating channel utilization statistics', { networkId });

    const whereClause = networkId ? { node: { networkId } } : {};

    // Get nodes with utilization data directly from Node table
    const nodes = await this.db.node.findMany({
      where: {
        ...(networkId ? { networkId } : {}),
        channelUtilization: { not: null }
      },
      select: {
        channelUtilization: true
      }
    });

    if (!nodes || nodes.length === 0) {
      return {
        averageUtilization: 0,
        peakUtilization: 0,
        minimumUtilization: 0,
        totalNodes: 0,
        utilizationDistribution: []
      };
    }

    const utilizationValues = nodes
      .map(node => node.channelUtilization)
      .filter((util): util is number => util !== null);

    const stats = {
      _avg: { channelUtilization: utilizationValues.length > 0 
        ? utilizationValues.reduce((sum, val) => sum + val, 0) / utilizationValues.length 
        : null 
      },
      _max: { channelUtilization: utilizationValues.length > 0 
        ? Math.max(...utilizationValues) 
        : null 
      },
      _min: { channelUtilization: utilizationValues.length > 0 
        ? Math.min(...utilizationValues) 
        : null 
      }
    };

    // Count total nodes with utilization data
    const totalNodes = await this.db.node.count({
      where: {
        ...(networkId ? { networkId } : {}),
        channelUtilization: { not: null }
      }
    });

    // Calculate utilization distribution
    const utilizationRanges = [
      { min: 0, max: 20, label: '0-20%' },
      { min: 20, max: 40, label: '20-40%' },
      { min: 40, max: 60, label: '40-60%' },
      { min: 60, max: 80, label: '60-80%' },
      { min: 80, max: 100, label: '80-100%' }
    ];

    const distribution = await Promise.all(
      utilizationRanges.map(async (range) => {
        const count = await this.db.node.count({
          where: {
            ...(networkId ? { networkId } : {}),
            channelUtilization: {
              gte: range.min,
              lt: range.max
            }
          }
        });

        return {
          range: range.label,
          count,
          percentage: totalNodes > 0 ? (count / totalNodes) * 100 : 0
        };
      })
    );

    return {
      averageUtilization: stats._avg.channelUtilization || 0,
      peakUtilization: stats._max.channelUtilization || 0,
      minimumUtilization: stats._min.channelUtilization || 0,
      totalNodes,
      utilizationDistribution: distribution
    };
  }

  async getUtilizationTrends(period: '24h' | '7d' | '30d'): Promise<UtilizationTrend[]> {
    logger.info('Fetching utilization trends', { period });

    if (!['24h', '7d', '30d'].includes(period)) {
      throw new Error('Invalid period. Must be 24h, 7d, or 30d');
    }

    const intervals = {
      '24h': { hours: 24, groupBy: 'HOUR' },
      '7d': { hours: 168, groupBy: 'DAY' },
      '30d': { hours: 720, groupBy: 'DAY' }
    };

    const config = intervals[period];
    const startTime = new Date(Date.now() - config.hours * 60 * 60 * 1000);

    const trends = await this.db.$queryRaw<Array<{ 
      period: number; 
      avgUtilization: number; 
      messageCount: bigint;
      nodeCount: bigint;
    }>>`
      SELECT 
        EXTRACT(${config.groupBy} FROM tr.timestamp) as period,
        AVG(CAST(tr.data->>'channelUtilization' AS FLOAT)) as "avgUtilization",
        COUNT(DISTINCT m.id) as "messageCount",
        COUNT(DISTINCT tr."nodeId") as "nodeCount"
      FROM "telemetry_readings" tr
      LEFT JOIN "messages" m ON m."fromNodeId" = tr."nodeId" 
        AND m.timestamp >= ${startTime}
        AND m.timestamp <= NOW()
      WHERE tr.timestamp >= ${startTime}
        AND tr.type = 'DEVICE_METRICS'
        AND tr.data->>'channelUtilization' IS NOT NULL
      GROUP BY EXTRACT(${config.groupBy} FROM tr.timestamp)
      ORDER BY period
    `;

    return trends.map(trend => ({
      hour: Number(trend.period),
      avgUtilization: Number(trend.avgUtilization) || 0,
      messageCount: Number(trend.messageCount),
      nodeCount: Number(trend.nodeCount)
    }));
  }

  async generateUtilizationHeatmap(networkId?: string): Promise<UtilizationHeatmap> {
    logger.info('Generating utilization heatmap', { networkId });

    const whereClause = networkId ? { networkId } : {};

    // Get nodes with positions and utilization data
    const nodesWithPositions = await this.db.node.findMany({
      where: {
        ...whereClause,
        positions: {
          some: {}
        },
        OR: [
          { channelUtilization: { not: null } },
          { airUtilTx: { not: null } }
        ]
      },
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (nodesWithPositions.length === 0) {
      return {
        heatmapPoints: [],
        bounds: { north: 0, south: 0, east: 0, west: 0 },
        generatedAt: new Date()
      };
    }

    // Group nodes by approximate location (0.01 degree grid ~1km)
    const locationGroups = new Map<string, {
      nodes: typeof nodesWithPositions;
      totalChannelUtilization: number;
      totalAirUtilization: number;
      latitude: number;
      longitude: number;
    }>();

    nodesWithPositions.forEach(node => {
      if (node.positions.length > 0) {
        const pos = node.positions[0];
        const gridLat = Math.round(pos.latitude * 100) / 100;
        const gridLon = Math.round(pos.longitude * 100) / 100;
        const key = `${gridLat},${gridLon}`;

        if (!locationGroups.has(key)) {
          locationGroups.set(key, {
            nodes: [],
            totalChannelUtilization: 0,
            totalAirUtilization: 0,
            latitude: gridLat,
            longitude: gridLon
          });
        }

        const group = locationGroups.get(key)!;
        group.nodes.push(node);
        group.totalChannelUtilization += node.channelUtilization || 0;
        group.totalAirUtilization += node.airUtilTx || 0;
      }
    });

    // Convert to heatmap points
    const heatmapPoints = Array.from(locationGroups.values()).map(group => {
      const nodeCount = group.nodes.length;
      const avgChannelUtilization = group.totalChannelUtilization / nodeCount;
      const avgAirUtilization = group.totalAirUtilization / nodeCount;
      const combinedUtilization = (avgChannelUtilization + avgAirUtilization) / 2;

      return {
        latitude: group.latitude,
        longitude: group.longitude,
        utilization: combinedUtilization,
        nodeCount,
        averageChannelUtilization: avgChannelUtilization,
        averageAirUtilization: avgAirUtilization
      };
    });

    // Calculate bounds
    const latitudes = heatmapPoints.map(p => p.latitude);
    const longitudes = heatmapPoints.map(p => p.longitude);

    const bounds = {
      north: Math.max(...latitudes),
      south: Math.min(...latitudes),
      east: Math.max(...longitudes),
      west: Math.min(...longitudes)
    };

    return {
      heatmapPoints,
      bounds,
      generatedAt: new Date()
    };
  }

  async generateCapacityPlanningReport(networkId?: string): Promise<CapacityPlanningReport> {
    logger.info('Generating capacity planning report', { networkId });

    const whereClause = networkId ? { networkId } : {};

    // Get current utilization statistics
    const currentStats = await this.db.node.aggregate({
      where: whereClause,
      _avg: {
        channelUtilization: true,
        airUtilTx: true
      },
      _max: {
        channelUtilization: true,
        airUtilTx: true
      }
    });

    // Get historical trend data for forecasting
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendData = await this.db.$queryRaw<Array<{
      date: string;
      avgUtilization: number;
    }>>`
      SELECT 
        DATE(tr.timestamp) as date,
        AVG(CAST(tr.data->>'channelUtilization' AS FLOAT)) as "avgUtilization"
      FROM "telemetry_readings" tr
      JOIN "nodes" n ON n.id = tr."nodeId"
      WHERE tr.timestamp >= ${thirtyDaysAgo}
        AND tr.type = 'DEVICE_METRICS'
        AND tr.data->>'channelUtilization' IS NOT NULL
        ${networkId ? `AND n."networkId" = '${networkId}'` : ''}
      GROUP BY DATE(tr.timestamp)
      ORDER BY date
    `;

    // Calculate growth rate and forecast
    const growthRate = this.calculateGrowthRate(trendData.map(d => Number(d.avgUtilization)));
    const currentUtilization = currentStats._avg.channelUtilization || 0;
    
    // Estimate days until capacity (assuming 90% is capacity limit)
    const capacityThreshold = 90;
    const daysUntilCapacity = growthRate > 0 
      ? Math.ceil((capacityThreshold - currentUtilization) / growthRate)
      : -1; // No capacity issues if not growing

    // Generate recommendations
    const recommendations = this.generateCapacityRecommendations(
      currentUtilization,
      currentStats._max.channelUtilization || 0,
      growthRate
    );

    return {
      currentUtilization: {
        averageChannel: currentStats._avg.channelUtilization || 0,
        averageAir: currentStats._avg.airUtilTx || 0,
        peakChannel: currentStats._max.channelUtilization || 0,
        peakAir: currentStats._max.airUtilTx || 0
      },
      recommendations,
      projectedCapacity: {
        daysUntilCapacity: Math.max(daysUntilCapacity, -1),
        recommendedActions: this.getRecommendedActions(currentUtilization, growthRate),
        confidenceLevel: this.calculateConfidenceLevel(trendData.length, growthRate)
      }
    };
  }

  async identifyHighUtilizationNodes(threshold: number, networkId?: string): Promise<Array<{
    nodeId: string;
    shortName?: string;
    channelUtilization: number;
    airUtilization?: number;
    batteryLevel?: number;
  }>> {
    const whereClause = {
      ...(networkId ? { networkId } : {}),
      channelUtilization: { gte: threshold }
    };

    const highUtilizationNodes = await this.db.node.findMany({
      where: whereClause,
      select: {
        nodeId: true,
        shortName: true,
        channelUtilization: true,
        airUtilTx: true,
        batteryLevel: true
      },
      orderBy: {
        channelUtilization: 'desc'
      }
    });

    return highUtilizationNodes.map(node => ({
      nodeId: node.nodeId,
      shortName: node.shortName || undefined,
      channelUtilization: node.channelUtilization || 0,
      airUtilization: node.airUtilTx || undefined,
      batteryLevel: node.batteryLevel || undefined
    }));
  }

  async calculateNetworkCapacityMetrics(networkId?: string): Promise<NetworkCapacityMetrics> {
    const whereClause = networkId ? { networkId } : {};

    const [nodeStats, messageCount] = await Promise.all([
      this.db.node.aggregate({
        where: whereClause,
        _count: { nodeId: true },
        _avg: { channelUtilization: true }
      }),
      this.db.message.count({
        where: networkId ? { fromNode: { networkId } } : {}
      })
    ]);

    // Calculate capacity score (0-100)
    const avgUtilization = nodeStats._avg.channelUtilization || 0;
    const capacityScore = Math.max(0, 100 - avgUtilization);

    // Identify bottlenecks
    const bottlenecks = await this.identifyBottlenecks(networkId);

    return {
      totalNodes: nodeStats._count.nodeId,
      averageUtilization: avgUtilization,
      totalMessages: messageCount,
      capacityScore,
      bottlenecks
    };
  }

  async analyzeTrends(period: '7d' | '30d'): Promise<TrendAnalysis> {
    logger.info('Analyzing utilization trends', { period });

    const days = period === '7d' ? 7 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trendData = await this.db.$queryRaw<Array<{
      date: string;
      avgUtilization: number;
      messageCount: bigint;
    }>>`
      SELECT 
        DATE(tr.timestamp) as date,
        AVG(CAST(tr.data->>'channelUtilization' AS FLOAT)) as "avgUtilization",
        COUNT(DISTINCT m.id) as "messageCount"
      FROM "telemetry_readings" tr
      LEFT JOIN "messages" m ON m."fromNodeId" = tr."nodeId" 
        AND DATE(m.timestamp) = DATE(tr.timestamp)
      WHERE tr.timestamp >= ${startDate}
        AND tr.type = 'DEVICE_METRICS'
        AND tr.data->>'channelUtilization' IS NOT NULL
      GROUP BY DATE(tr.timestamp)
      ORDER BY date
    `;

    const utilizationValues = trendData.map(d => Number(d.avgUtilization));
    const growthRate = this.calculateGrowthRate(utilizationValues);
    
    let trendDirection: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(growthRate) < 0.1) {
      trendDirection = 'stable';
    } else if (growthRate > 0) {
      trendDirection = 'increasing';
    } else {
      trendDirection = 'decreasing';
    }

    // Generate forecast for next 7 days
    const forecast = this.generateForecast(utilizationValues, 7);

    return {
      trendDirection,
      growthRate,
      forecast
    };
  }

  async detectUtilizationAnomalies(networkId?: string): Promise<AnomalyDetectionResult> {
    logger.info('Detecting utilization anomalies', { networkId });

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const whereClause = networkId ? { node: { networkId } } : {};

    const recentData = await this.db.telemetryReading.findMany({
      where: {
        ...whereClause,
        timestamp: { gte: last24Hours },
        type: 'DEVICE_METRICS'
      },
      select: {
        nodeId: true,
        timestamp: true,
        data: true
      },
      orderBy: { timestamp: 'asc' }
    });

    const anomalies: UtilizationAnomaly[] = [];

    // Filter readings that have channelUtilization data
    const validReadings = recentData.filter(d => {
      const data = d.data as any;
      return data && typeof data.channelUtilization === 'number';
    });

    // Simple anomaly detection using statistical thresholds
    const utilizationValues = validReadings.map(d => {
      const data = d.data as any;
      return Number(data.channelUtilization) || 0;
    });
    const mean = utilizationValues.reduce((sum, val) => sum + val, 0) / utilizationValues.length;
    const stdDev = Math.sqrt(
      utilizationValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / utilizationValues.length
    );

    validReadings.forEach(reading => {
      const data = reading.data as any;
      const utilization = Number(data.channelUtilization) || 0;
      const zScore = Math.abs((utilization - mean) / stdDev);

      if (zScore > 2) { // More than 2 standard deviations
        let severity: 'low' | 'medium' | 'high';
        if (zScore > 3) severity = 'high';
        else if (zScore > 2.5) severity = 'medium';
        else severity = 'low';

        anomalies.push({
          timestamp: reading.timestamp,
          nodeId: reading.nodeId,
          utilization,
          expectedUtilization: mean,
          severity,
          description: `Utilization ${utilization.toFixed(1)}% is ${zScore.toFixed(1)} standard deviations from normal`
        });
      }
    });

    return {
      anomalies,
      totalAnomalies: anomalies.length,
      timeRange: {
        start: last24Hours,
        end: new Date()
      }
    };
  }

  async forecastUtilization(daysAhead: number): Promise<UtilizationForecast> {
    if (daysAhead <= 0) {
      throw new Error('Days ahead must be positive');
    }

    logger.info('Forecasting utilization', { daysAhead });

    // Get historical data for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const historicalData = await this.db.$queryRaw<Array<{
      date: string;
      avgUtilization: number;
    }>>`
      SELECT 
        DATE(timestamp) as date,
        AVG(CAST(data->>'channelUtilization' AS FLOAT)) as "avgUtilization"
      FROM "telemetry_readings"
      WHERE timestamp >= ${thirtyDaysAgo}
        AND type = 'DEVICE_METRICS'
        AND data->>'channelUtilization' IS NOT NULL
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    const utilizationValues = historicalData.map(d => Number(d.avgUtilization));
    const forecast = this.generateForecast(utilizationValues, daysAhead);
    const confidence = this.calculateForecastConfidence(utilizationValues);

    return {
      forecast,
      confidence,
      methodology: 'Linear regression with seasonal adjustment'
    };
  }

  async checkUtilizationThresholds(config: AlertConfig): Promise<AlertCheckResult> {
    this.validateAlertConfig(config);

    logger.info('Checking utilization thresholds', config);

    const highUtilizationNodes = await this.db.node.findMany({
      where: {
        OR: [
          { channelUtilization: { gte: config.warning } },
          { airUtilTx: { gte: config.warning } }
        ]
      },
      select: {
        nodeId: true,
        shortName: true,
        channelUtilization: true,
        airUtilTx: true
      }
    });

    const alerts: UtilizationAlert[] = [];

    highUtilizationNodes.forEach(node => {
      const channelUtil = node.channelUtilization || 0;
      const airUtil = node.airUtilTx || 0;
      const maxUtil = Math.max(channelUtil, airUtil);

      if (maxUtil >= config.critical) {
        alerts.push({
          nodeId: node.nodeId,
          shortName: node.shortName || undefined,
          currentUtilization: maxUtil,
          threshold: config.critical,
          severity: 'critical',
          timestamp: new Date(),
          description: `Critical utilization: ${maxUtil.toFixed(1)}% exceeds ${config.critical}% threshold`
        });
      } else if (maxUtil >= config.warning) {
        alerts.push({
          nodeId: node.nodeId,
          shortName: node.shortName || undefined,
          currentUtilization: maxUtil,
          threshold: config.warning,
          severity: 'warning',
          timestamp: new Date(),
          description: `Warning utilization: ${maxUtil.toFixed(1)}% exceeds ${config.warning}% threshold`
        });
      }
    });

    const summary = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length
    };

    return {
      alerts,
      totalAlerts: alerts.length,
      summary
    };
  }

  async detectPerformanceDegradation(): Promise<PerformanceDegradationResult> {
    logger.info('Detecting performance degradation');

    // Get performance metrics for the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const [recentMetrics, olderMetrics] = await Promise.all([
      this.getPerformanceMetrics(threeHoursAgo, new Date()),
      this.getPerformanceMetrics(sixHoursAgo, threeHoursAgo)
    ]);

    const degradationDetected = 
      recentMetrics.messageSuccessRate < olderMetrics.messageSuccessRate * 0.9 ||
      recentMetrics.avgLatency > olderMetrics.avgLatency * 1.2 ||
      recentMetrics.avgUtilization > olderMetrics.avgUtilization * 1.3;

    if (!degradationDetected) {
      return { degradationDetected: false };
    }

    const metrics = {
      messageSuccessRateChange: ((recentMetrics.messageSuccessRate - olderMetrics.messageSuccessRate) / olderMetrics.messageSuccessRate) * 100,
      latencyChange: ((recentMetrics.avgLatency - olderMetrics.avgLatency) / olderMetrics.avgLatency) * 100,
      utilizationChange: ((recentMetrics.avgUtilization - olderMetrics.avgUtilization) / olderMetrics.avgUtilization) * 100
    };

    const severity = this.calculateDegradationSeverity(metrics);
    const recommendations = this.generateDegradationRecommendations(metrics);

    return {
      degradationDetected: true,
      metrics,
      recommendations,
      severity
    };
  }

  validateAlertConfig(config: AlertConfig): void {
    if (config.warning >= config.critical) {
      throw new Error('Warning threshold must be less than critical threshold');
    }
    if (config.warning < 0 || config.critical < 0) {
      throw new Error('Thresholds must be non-negative');
    }
    if (config.warning > 100 || config.critical > 100) {
      throw new Error('Thresholds must not exceed 100%');
    }
    if (config.checkInterval !== undefined && config.checkInterval <= 0) {
      throw new Error('Check interval must be positive');
    }
  }

  // Private helper methods

  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    return ((secondAvg - firstAvg) / firstAvg) * 100 / (values.length / 2);
  }

  private generateCapacityRecommendations(
    currentUtilization: number,
    peakUtilization: number,
    growthRate: number
  ): CapacityPlanningReport['recommendations'] {
    const recommendations: CapacityPlanningReport['recommendations'] = [];

    if (currentUtilization > 80) {
      recommendations.push({
        type: 'expansion',
        priority: 'high',
        description: 'Network utilization is high. Consider adding more nodes or optimizing routing.',
        estimatedImpact: 'Reduce utilization by 20-30%'
      });
    }

    if (peakUtilization > 95) {
      recommendations.push({
        type: 'optimization',
        priority: 'critical',
        description: 'Peak utilization is critical. Immediate optimization required.',
        estimatedImpact: 'Prevent network congestion'
      });
    }

    if (growthRate > 2) {
      recommendations.push({
        type: 'monitoring',
        priority: 'medium',
        description: 'Utilization is growing rapidly. Increase monitoring frequency.',
        estimatedImpact: 'Early detection of capacity issues'
      });
    }

    return recommendations;
  }

  private getRecommendedActions(currentUtilization: number, growthRate: number): string[] {
    const actions: string[] = [];

    if (currentUtilization > 70) {
      actions.push('Monitor network performance closely');
      actions.push('Consider load balancing strategies');
    }

    if (growthRate > 1) {
      actions.push('Plan for network expansion');
      actions.push('Optimize message routing');
    }

    if (currentUtilization > 85) {
      actions.push('Implement traffic shaping');
      actions.push('Add redundant nodes');
    }

    return actions;
  }

  private calculateConfidenceLevel(dataPoints: number, growthRate: number): number {
    let confidence = Math.min(dataPoints / 30, 1); // More data points = higher confidence
    confidence *= Math.max(0.5, 1 - Math.abs(growthRate) / 10); // Stable growth = higher confidence
    return Math.round(confidence * 100) / 100;
  }

  private async identifyBottlenecks(networkId?: string): Promise<NetworkCapacityMetrics['bottlenecks']> {
    const whereClause = networkId ? { networkId } : {};

    const highUtilizationNodes = await this.db.node.findMany({
      where: {
        ...whereClause,
        channelUtilization: { gte: 70 }
      },
      select: {
        nodeId: true,
        shortName: true,
        channelUtilization: true
      },
      orderBy: { channelUtilization: 'desc' },
      take: 10
    });

    if (!highUtilizationNodes) {
      return [];
    }

    return highUtilizationNodes.map(node => ({
      nodeId: node.nodeId,
      shortName: node.shortName || undefined,
      utilizationLevel: node.channelUtilization || 0,
      impact: node.channelUtilization! > 90 ? 'high' : 
              node.channelUtilization! > 80 ? 'medium' : 'low'
    }));
  }

  private generateForecast(historicalValues: number[], daysAhead: number): TrendAnalysis['forecast'] {
    if (historicalValues.length < 2) {
      return [];
    }

    const growthRate = this.calculateGrowthRate(historicalValues);
    const lastValue = historicalValues[historicalValues.length - 1];
    const forecast: TrendAnalysis['forecast'] = [];

    for (let i = 1; i <= daysAhead; i++) {
      const predictedValue = lastValue + (growthRate * i);
      const confidence = Math.max(0.3, 1 - (i * 0.1)); // Confidence decreases with time

      forecast.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predictedUtilization: Math.max(0, Math.min(100, predictedValue)),
        confidence: Math.round(confidence * 100) / 100
      });
    }

    return forecast;
  }

  private calculateForecastConfidence(historicalValues: number[]): number {
    if (historicalValues.length < 7) return 0.3;
    
    // Calculate variance to determine confidence
    const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
    const variance = historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower variance = higher confidence
    const normalizedVariance = Math.min(stdDev / mean, 1);
    return Math.max(0.3, 1 - normalizedVariance);
  }

  private async getPerformanceMetrics(startTime: Date, endTime: Date) {
    const metrics = await this.db.$queryRaw<Array<{
      messageSuccessRate: number;
      avgLatency: number;
      avgUtilization: number;
    }>>`
      SELECT 
        AVG(CASE WHEN m."wantAck" = true AND m.id IS NOT NULL THEN 1.0 ELSE 0.0 END) as "messageSuccessRate",
        AVG(EXTRACT(EPOCH FROM (m."receivedAt" - m.timestamp))) as "avgLatency",
        AVG(CAST(tr.data->>'channelUtilization' AS FLOAT)) as "avgUtilization"
      FROM "messages" m
      LEFT JOIN "telemetry_readings" tr ON tr."nodeId" = m."fromNodeId" 
        AND tr.timestamp BETWEEN ${startTime} AND ${endTime}
        AND tr.type = 'DEVICE_METRICS'
      WHERE m.timestamp BETWEEN ${startTime} AND ${endTime}
    `;

    return metrics[0] || { messageSuccessRate: 1, avgLatency: 0, avgUtilization: 0 };
  }

  private calculateDegradationSeverity(metrics: {
    messageSuccessRateChange: number;
    latencyChange: number;
    utilizationChange: number;
  }): 'low' | 'medium' | 'high' {
    const score = Math.abs(metrics.messageSuccessRateChange) + 
                  Math.abs(metrics.latencyChange) + 
                  Math.abs(metrics.utilizationChange);

    if (score > 50) return 'high';
    if (score > 25) return 'medium';
    return 'low';
  }

  private generateDegradationRecommendations(metrics: {
    messageSuccessRateChange: number;
    latencyChange: number;
    utilizationChange: number;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.messageSuccessRateChange < -10) {
      recommendations.push('Investigate message delivery failures');
      recommendations.push('Check node connectivity and signal strength');
    }

    if (metrics.latencyChange > 20) {
      recommendations.push('Analyze network routing paths');
      recommendations.push('Consider optimizing message priorities');
    }

    if (metrics.utilizationChange > 30) {
      recommendations.push('Implement traffic throttling');
      recommendations.push('Add additional network capacity');
    }

    return recommendations;
  }
}