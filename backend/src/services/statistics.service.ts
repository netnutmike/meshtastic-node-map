import { PrismaClient } from '@prisma/client';
import { NodeRepository } from '../database/repositories/node.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { NetworkRepository } from '../database/repositories/network.repository';
import { 
  NodeRole, 
  MessageType, 
  MessagePriority, 
  TelemetryType,
  Node,
  Message 
} from '../types/database';
import { logger } from '../utils/logger';

export interface NetworkStatistics {
  overview: {
    totalNodes: number;
    onlineNodes: number;
    offlineNodes: number;
    mqttConnectedNodes: number;
    totalMessages: number;
    totalNetworks: number;
    lastUpdated: Date;
  };
  nodeBreakdown: {
    byRole: Record<NodeRole, number>;
    byHardware: Record<string, number>;
    byFirmware: Record<string, number>;
    byStatus: {
      online: number;
      offline: number;
      mqttConnected: number;
      mqttDisconnected: number;
    };
  };
  messageBreakdown: {
    byType: Record<MessageType, number>;
    byPriority: Record<MessagePriority, number>;
    byEncryption: {
      encrypted: number;
      unencrypted: number;
    };
    byRouting: {
      directMessages: number;
      routedMessages: number;
      averageHops: number;
    };
  };
  networkUtilization: {
    totalChannelUtilization: number;
    averageChannelUtilization: number;
    totalAirUtilization: number;
    averageAirUtilization: number;
    messagesPerHour: number;
    messagesPerDay: number;
  };
  timeRangeStats: {
    last24Hours: {
      newNodes: number;
      totalMessages: number;
      uniqueActiveNodes: number;
    };
    last7Days: {
      newNodes: number;
      totalMessages: number;
      uniqueActiveNodes: number;
    };
    last30Days: {
      newNodes: number;
      totalMessages: number;
      uniqueActiveNodes: number;
    };
  };
}

export interface NodeTypeDistribution {
  role: NodeRole;
  count: number;
  percentage: number;
  averageBattery?: number;
  averageChannelUtilization?: number;
}

export interface MessageAnalytics {
  totalMessages: number;
  messagesByType: Array<{
    type: MessageType;
    count: number;
    percentage: number;
  }>;
  encryptionBreakdown: {
    encrypted: { count: number; percentage: number };
    unencrypted: { count: number; percentage: number };
  };
  routingAnalysis: {
    directMessages: number;
    routedMessages: number;
    averageHops: number;
    maxHops: number;
    hopDistribution: Record<number, number>;
  };
  temporalAnalysis: {
    messagesPerHour: Array<{ hour: number; count: number }>;
    messagesPerDay: Array<{ date: string; count: number }>;
  };
}

export interface UtilizationReport {
  networkWide: {
    averageChannelUtilization: number;
    averageAirUtilization: number;
    peakChannelUtilization: number;
    peakAirUtilization: number;
  };
  byNode: Array<{
    nodeId: string;
    shortName?: string;
    channelUtilization?: number;
    airUtilization?: number;
    batteryLevel?: number;
    lastSeen?: Date;
  }>;
  utilizationHeatmap?: Array<{
    latitude: number;
    longitude: number;
    utilization: number;
    nodeCount: number;
  }>;
}

export interface ExportFormat {
  format: 'csv' | 'json' | 'pdf';
  data: any;
  filename: string;
}

export class StatisticsService {
  private db: PrismaClient;
  private nodeRepository: NodeRepository;
  private messageRepository: MessageRepository;
  private telemetryRepository: TelemetryRepository;
  private positionRepository: PositionRepository;
  private networkRepository: NetworkRepository;

  constructor(db: PrismaClient) {
    this.db = db;
    this.nodeRepository = new NodeRepository();
    this.messageRepository = new MessageRepository();
    this.telemetryRepository = new TelemetryRepository();
    this.positionRepository = new PositionRepository();
    this.networkRepository = new NetworkRepository();
  }

  async getNetworkStatistics(networkId?: string, timeRange?: { start: Date; end: Date }): Promise<NetworkStatistics> {
    logger.info('Generating network statistics', { networkId, timeRange });

    const whereClause = networkId ? { networkId } : {};
    const timeFilter = timeRange ? {
      createdAt: {
        gte: timeRange.start,
        lte: timeRange.end
      }
    } : {};

    // Overview statistics
    const [
      totalNodes,
      onlineNodes,
      mqttConnectedNodes,
      totalMessages,
      totalNetworks
    ] = await Promise.all([
      this.nodeRepository.count({ where: whereClause }),
      this.nodeRepository.count({ where: { ...whereClause, isOnline: true } }),
      this.nodeRepository.count({ where: { ...whereClause, mqttConnected: true } }),
      this.messageRepository.count({ where: networkId ? { fromNode: { networkId } } : {} }),
      this.networkRepository.count()
    ]);

    // Node breakdown by role
    const nodesByRole = await this.db.node.groupBy({
      by: ['role'],
      where: whereClause,
      _count: { role: true }
    });

    const roleBreakdown = nodesByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<NodeRole, number>);

    // Node breakdown by hardware
    const nodesByHardware = await this.db.node.groupBy({
      by: ['hardwareModel'],
      where: { ...whereClause, hardwareModel: { not: null } },
      _count: { hardwareModel: true }
    });

    const hardwareBreakdown = nodesByHardware.reduce((acc, item) => {
      if (item.hardwareModel) {
        acc[item.hardwareModel] = item._count.hardwareModel;
      }
      return acc;
    }, {} as Record<string, number>);

    // Node breakdown by firmware
    const nodesByFirmware = await this.db.node.groupBy({
      by: ['firmwareVersion'],
      where: { ...whereClause, firmwareVersion: { not: null } },
      _count: { firmwareVersion: true }
    });

    const firmwareBreakdown = nodesByFirmware.reduce((acc, item) => {
      if (item.firmwareVersion) {
        acc[item.firmwareVersion] = item._count.firmwareVersion;
      }
      return acc;
    }, {} as Record<string, number>);

    // Message breakdown by type
    const messagesByType = await this.db.message.groupBy({
      by: ['type'],
      where: networkId ? { fromNode: { networkId } } : {},
      _count: { type: true }
    });

    const messageTypeBreakdown = messagesByType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<MessageType, number>);

    // Message breakdown by priority
    const messagesByPriority = await this.db.message.groupBy({
      by: ['priority'],
      where: networkId ? { fromNode: { networkId } } : {},
      _count: { priority: true }
    });

    const priorityBreakdown = messagesByPriority.reduce((acc, item) => {
      acc[item.priority] = item._count.priority;
      return acc;
    }, {} as Record<MessagePriority, number>);

    // Encryption breakdown
    const [encryptedCount, unencryptedCount] = await Promise.all([
      this.messageRepository.count({ 
        where: { 
          encrypted: true,
          ...(networkId ? { fromNode: { networkId } } : {})
        } 
      }),
      this.messageRepository.count({ 
        where: { 
          encrypted: false,
          ...(networkId ? { fromNode: { networkId } } : {})
        } 
      })
    ]);

    // Routing analysis
    const routingStats = await this.calculateRoutingStatistics(networkId);

    // Utilization statistics
    const utilizationStats = await this.calculateUtilizationStatistics(networkId);

    // Time range statistics
    const timeRangeStats = await this.calculateTimeRangeStatistics(networkId);

    return {
      overview: {
        totalNodes,
        onlineNodes,
        offlineNodes: totalNodes - onlineNodes,
        mqttConnectedNodes,
        totalMessages,
        totalNetworks,
        lastUpdated: new Date()
      },
      nodeBreakdown: {
        byRole: roleBreakdown,
        byHardware: hardwareBreakdown,
        byFirmware: firmwareBreakdown,
        byStatus: {
          online: onlineNodes,
          offline: totalNodes - onlineNodes,
          mqttConnected: mqttConnectedNodes,
          mqttDisconnected: totalNodes - mqttConnectedNodes
        }
      },
      messageBreakdown: {
        byType: messageTypeBreakdown,
        byPriority: priorityBreakdown,
        byEncryption: {
          encrypted: encryptedCount,
          unencrypted: unencryptedCount
        },
        byRouting: routingStats
      },
      networkUtilization: utilizationStats,
      timeRangeStats
    };
  }

  async getNodeTypeDistribution(networkId?: string): Promise<NodeTypeDistribution[]> {
    const whereClause = networkId ? { networkId } : {};

    const nodeStats = await this.db.node.groupBy({
      by: ['role'],
      where: whereClause,
      _count: { role: true },
      _avg: {
        batteryLevel: true,
        channelUtilization: true
      }
    });

    const totalNodes = await this.nodeRepository.count({ where: whereClause });

    return nodeStats.map(stat => ({
      role: stat.role as NodeRole,
      count: stat._count.role,
      percentage: (stat._count.role / totalNodes) * 100,
      averageBattery: stat._avg.batteryLevel || undefined,
      averageChannelUtilization: stat._avg.channelUtilization || undefined
    }));
  }

  async getMessageAnalytics(networkId?: string, timeRange?: { start: Date; end: Date }): Promise<MessageAnalytics> {
    const whereClause = {
      ...(networkId ? { fromNode: { networkId } } : {}),
      ...(timeRange ? { timestamp: { gte: timeRange.start, lte: timeRange.end } } : {})
    };

    const totalMessages = await this.messageRepository.count({ where: whereClause });

    // Messages by type
    const messagesByType = await this.db.message.groupBy({
      by: ['type'],
      where: whereClause,
      _count: { type: true }
    });

    const messageTypeAnalysis = messagesByType.map(item => ({
      type: item.type as MessageType,
      count: item._count.type,
      percentage: (item._count.type / totalMessages) * 100
    }));

    // Encryption breakdown
    const [encryptedCount, unencryptedCount] = await Promise.all([
      this.messageRepository.count({ where: { ...whereClause, encrypted: true } }),
      this.messageRepository.count({ where: { ...whereClause, encrypted: false } })
    ]);

    // Routing analysis
    const routingAnalysis = await this.calculateDetailedRoutingAnalysis(whereClause);

    // Temporal analysis
    const temporalAnalysis = await this.calculateTemporalAnalysis(whereClause);

    return {
      totalMessages,
      messagesByType: messageTypeAnalysis,
      encryptionBreakdown: {
        encrypted: { count: encryptedCount, percentage: (encryptedCount / totalMessages) * 100 },
        unencrypted: { count: unencryptedCount, percentage: (unencryptedCount / totalMessages) * 100 }
      },
      routingAnalysis,
      temporalAnalysis
    };
  }

  async getUtilizationReport(networkId?: string): Promise<UtilizationReport> {
    const whereClause = networkId ? { networkId } : {};

    // Network-wide utilization
    const utilizationStats = await this.db.node.aggregate({
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

    // Per-node utilization
    const nodeUtilization = await this.nodeRepository.findMany({
      where: whereClause,
      select: {
        nodeId: true,
        shortName: true,
        channelUtilization: true,
        airUtilTx: true,
        batteryLevel: true,
        lastSeen: true
      }
    });

    // Utilization heatmap data
    const heatmapData = await this.calculateUtilizationHeatmap(networkId);

    return {
      networkWide: {
        averageChannelUtilization: utilizationStats._avg.channelUtilization || 0,
        averageAirUtilization: utilizationStats._avg.airUtilTx || 0,
        peakChannelUtilization: utilizationStats._max.channelUtilization || 0,
        peakAirUtilization: utilizationStats._max.airUtilTx || 0
      },
      byNode: nodeUtilization.map(node => ({
        nodeId: node.nodeId,
        shortName: node.shortName,
        channelUtilization: node.channelUtilization,
        airUtilization: node.airUtilTx,
        batteryLevel: node.batteryLevel,
        lastSeen: node.lastSeen
      })),
      utilizationHeatmap: heatmapData
    };
  }

  async exportStatistics(format: 'csv' | 'json' | 'pdf', type: 'network' | 'messages' | 'utilization', networkId?: string): Promise<ExportFormat> {
    let data: any;
    let filename: string;

    switch (type) {
      case 'network':
        data = await this.getNetworkStatistics(networkId);
        filename = `network-statistics-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'messages':
        data = await this.getMessageAnalytics(networkId);
        filename = `message-analytics-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'utilization':
        data = await this.getUtilizationReport(networkId);
        filename = `utilization-report-${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        throw new Error('Invalid export type');
    }

    return {
      format,
      data,
      filename: `${filename}.${format}`
    };
  }

  private async calculateRoutingStatistics(networkId?: string) {
    const whereClause = networkId ? { fromNode: { networkId } } : {};

    const messages = await this.db.message.findMany({
      where: whereClause,
      select: {
        routingPath: true
      }
    });

    const directMessages = messages.filter(m => m.routingPath.length <= 1).length;
    const routedMessages = messages.filter(m => m.routingPath.length > 1).length;
    
    const totalHops = messages.reduce((sum, m) => sum + Math.max(0, m.routingPath.length - 1), 0);
    const averageHops = routedMessages > 0 ? totalHops / messages.length : 0;

    return {
      directMessages,
      routedMessages,
      averageHops
    };
  }

  private async calculateUtilizationStatistics(networkId?: string) {
    const whereClause = networkId ? { networkId } : {};

    const stats = await this.db.node.aggregate({
      where: whereClause,
      _avg: {
        channelUtilization: true,
        airUtilTx: true
      },
      _sum: {
        channelUtilization: true,
        airUtilTx: true
      }
    });

    // Calculate messages per hour/day
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [messagesLastHour, messagesLastDay] = await Promise.all([
      this.messageRepository.count({
        where: {
          ...(networkId ? { fromNode: { networkId } } : {}),
          timestamp: { gte: oneHourAgo }
        }
      }),
      this.messageRepository.count({
        where: {
          ...(networkId ? { fromNode: { networkId } } : {}),
          timestamp: { gte: oneDayAgo }
        }
      })
    ]);

    return {
      totalChannelUtilization: stats._sum.channelUtilization || 0,
      averageChannelUtilization: stats._avg.channelUtilization || 0,
      totalAirUtilization: stats._sum.airUtilTx || 0,
      averageAirUtilization: stats._avg.airUtilTx || 0,
      messagesPerHour: messagesLastHour,
      messagesPerDay: messagesLastDay
    };
  }

  private async calculateTimeRangeStatistics(networkId?: string) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseWhere = networkId ? { networkId } : {};

    const [
      newNodes24h, messages24h, activeNodes24h,
      newNodes7d, messages7d, activeNodes7d,
      newNodes30d, messages30d, activeNodes30d
    ] = await Promise.all([
      // 24 hours
      this.nodeRepository.count({ where: { ...baseWhere, createdAt: { gte: oneDayAgo } } }),
      this.messageRepository.count({ where: { ...(networkId ? { fromNode: { networkId } } : {}), timestamp: { gte: oneDayAgo } } }),
      this.nodeRepository.count({ where: { ...baseWhere, lastSeen: { gte: oneDayAgo } } }),
      
      // 7 days
      this.nodeRepository.count({ where: { ...baseWhere, createdAt: { gte: oneWeekAgo } } }),
      this.messageRepository.count({ where: { ...(networkId ? { fromNode: { networkId } } : {}), timestamp: { gte: oneWeekAgo } } }),
      this.nodeRepository.count({ where: { ...baseWhere, lastSeen: { gte: oneWeekAgo } } }),
      
      // 30 days
      this.nodeRepository.count({ where: { ...baseWhere, createdAt: { gte: oneMonthAgo } } }),
      this.messageRepository.count({ where: { ...(networkId ? { fromNode: { networkId } } : {}), timestamp: { gte: oneMonthAgo } } }),
      this.nodeRepository.count({ where: { ...baseWhere, lastSeen: { gte: oneMonthAgo } } })
    ]);

    return {
      last24Hours: {
        newNodes: newNodes24h,
        totalMessages: messages24h,
        uniqueActiveNodes: activeNodes24h
      },
      last7Days: {
        newNodes: newNodes7d,
        totalMessages: messages7d,
        uniqueActiveNodes: activeNodes7d
      },
      last30Days: {
        newNodes: newNodes30d,
        totalMessages: messages30d,
        uniqueActiveNodes: activeNodes30d
      }
    };
  }

  private async calculateDetailedRoutingAnalysis(whereClause: any) {
    const messages = await this.db.message.findMany({
      where: whereClause,
      select: {
        routingPath: true
      }
    });

    const directMessages = messages.filter(m => m.routingPath.length <= 1).length;
    const routedMessages = messages.filter(m => m.routingPath.length > 1).length;
    
    const hopCounts = messages.map(m => Math.max(0, m.routingPath.length - 1));
    const totalHops = hopCounts.reduce((sum, hops) => sum + hops, 0);
    const averageHops = messages.length > 0 ? totalHops / messages.length : 0;
    const maxHops = Math.max(...hopCounts, 0);

    // Hop distribution
    const hopDistribution = hopCounts.reduce((acc, hops) => {
      acc[hops] = (acc[hops] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      directMessages,
      routedMessages,
      averageHops,
      maxHops,
      hopDistribution
    };
  }

  private async calculateTemporalAnalysis(whereClause: any) {
    // Messages per hour (last 24 hours)
    const messagesPerHour = await this.db.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as count
      FROM "Message" 
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      ${whereClause.fromNode ? 'AND "fromNodeId" IN (SELECT id FROM "Node" WHERE "networkId" = ${whereClause.fromNode.networkId})' : ''}
      GROUP BY EXTRACT(HOUR FROM timestamp)
      ORDER BY hour
    `;

    // Messages per day (last 30 days)
    const messagesPerDay = await this.db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM "Message" 
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      ${whereClause.fromNode ? 'AND "fromNodeId" IN (SELECT id FROM "Node" WHERE "networkId" = ${whereClause.fromNode.networkId})' : ''}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    return {
      messagesPerHour: messagesPerHour.map(row => ({
        hour: Number(row.hour),
        count: Number(row.count)
      })),
      messagesPerDay: messagesPerDay.map(row => ({
        date: row.date,
        count: Number(row.count)
      }))
    };
  }

  private async calculateUtilizationHeatmap(networkId?: string) {
    const whereClause = networkId ? { networkId } : {};

    // Get nodes with positions and utilization data
    const nodesWithPositions = await this.db.node.findMany({
      where: {
        ...whereClause,
        positions: {
          some: {}
        }
      },
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    // Group by approximate location (0.01 degree grid ~1km)
    const locationGroups = new Map<string, { nodes: any[]; totalUtilization: number }>();

    nodesWithPositions.forEach(node => {
      if (node.positions.length > 0) {
        const pos = node.positions[0];
        const gridLat = Math.round(pos.latitude * 100) / 100;
        const gridLon = Math.round(pos.longitude * 100) / 100;
        const key = `${gridLat},${gridLon}`;

        if (!locationGroups.has(key)) {
          locationGroups.set(key, { nodes: [], totalUtilization: 0 });
        }

        const group = locationGroups.get(key)!;
        group.nodes.push(node);
        group.totalUtilization += (node.channelUtilization || 0) + (node.airUtilTx || 0);
      }
    });

    return Array.from(locationGroups.entries()).map(([key, group]) => {
      const [lat, lon] = key.split(',').map(Number);
      return {
        latitude: lat,
        longitude: lon,
        utilization: group.totalUtilization / group.nodes.length,
        nodeCount: group.nodes.length
      };
    });
  }
}