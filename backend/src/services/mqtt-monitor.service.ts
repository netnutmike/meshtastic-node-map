/**
 * MQTT Monitor Service
 * Provides MQTT traffic monitoring, statistics, and debugging capabilities
 * Requirements: 11.1
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { MessageType, MessagePriority } from '../types/database';

export interface MQTTMessage {
  id: string;
  topic: string;
  payload: string;
  timestamp: Date;
  size: number;
  qos: number;
  retain: boolean;
  parsed?: {
    nodeId?: string;
    type?: MessageType;
    encrypted?: boolean;
    channel?: number;
    priority?: MessagePriority;
    content?: any;
  };
}

export interface MessageFilters {
  type?: MessageType;
  nodeId?: string;
  encrypted?: boolean;
  channel?: number;
  search?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface MessageQuery {
  filters: MessageFilters;
  page: number;
  limit: number;
}

export interface MessageStatistics {
  totalMessages: number;
  messagesByType: Record<MessageType, number>;
  messagesByChannel: Record<number, number>;
  encryptedMessages: number;
  unencryptedMessages: number;
  averageMessageSize: number;
  messagesPerMinute: number;
  topNodes: Array<{ nodeId: string; shortName?: string; longName?: string; count: number }>;
  timeRange: string;
}

export interface TrafficRate {
  timestamp: Date;
  messagesPerSecond: number;
  bytesPerSecond: number;
  interval: string;
}

export interface AlertConfig {
  threshold: number;
  interval: string;
  enabled: boolean;
}

export class MQTTMonitorService extends EventEmitter {
  private messages: MQTTMessage[] = [];
  private maxMessages = 10000; // Keep last 10k messages in memory
  private trafficRates: TrafficRate[] = [];
  private alertConfig: AlertConfig = {
    threshold: 100, // messages per minute
    interval: '1m',
    enabled: false
  };
  private lastAlertTime = 0;
  private alertCooldown = 60000; // 1 minute cooldown

  constructor() {
    super();
    this.startTrafficRateMonitoring();
  }

  /**
   * Add a new MQTT message to the monitor
   */
  addMessage(topic: string, payload: string, options: {
    qos?: number;
    retain?: boolean;
  } = {}): void {
    const message: MQTTMessage = {
      id: this.generateMessageId(),
      topic,
      payload,
      timestamp: new Date(),
      size: Buffer.byteLength(payload, 'utf8'),
      qos: options.qos || 0,
      retain: options.retain || false
    };

    // Try to parse the message
    try {
      const parsed = this.parseMessage(payload);
      if (parsed && Object.keys(parsed).length > 0 && parsed.nodeId) {
        message.parsed = parsed;
      }
    } catch (error) {
      logger.debug('Failed to parse MQTT message:', error);
    }

    // Add to messages array
    this.messages.unshift(message);

    // Trim to max size
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(0, this.maxMessages);
    }

    // Emit real-time event
    this.emit('message', message);

    // Check for alerts
    this.checkTrafficAlerts();

    logger.debug(`MQTT message added: ${topic} (${message.size} bytes)`);
  }

  /**
   * Get messages with filtering and pagination
   */
  async getMessages(query: MessageQuery): Promise<{ messages: MQTTMessage[]; total: number }> {
    let filteredMessages = this.messages;

    // Apply filters
    if (query.filters.type) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.parsed?.type?.toLowerCase() === query.filters.type?.toLowerCase()
      );
    }

    if (query.filters.nodeId) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.parsed?.nodeId === query.filters.nodeId
      );
    }

    if (typeof query.filters.encrypted === 'boolean') {
      filteredMessages = filteredMessages.filter(msg => 
        msg.parsed?.encrypted === query.filters.encrypted
      );
    }

    if (query.filters.channel !== undefined) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.parsed?.channel === query.filters.channel
      );
    }

    if (query.filters.search) {
      const searchLower = query.filters.search.toLowerCase();
      filteredMessages = filteredMessages.filter(msg => 
        msg.topic.toLowerCase().includes(searchLower) ||
        msg.payload.toLowerCase().includes(searchLower) ||
        (msg.parsed?.nodeId && msg.parsed.nodeId.toLowerCase().includes(searchLower))
      );
    }

    if (query.filters.dateRange) {
      if (query.filters.dateRange.start) {
        filteredMessages = filteredMessages.filter(msg => 
          msg.timestamp >= query.filters.dateRange!.start!
        );
      }
      if (query.filters.dateRange.end) {
        filteredMessages = filteredMessages.filter(msg => 
          msg.timestamp <= query.filters.dateRange!.end!
        );
      }
    }

    const total = filteredMessages.length;
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const messages = filteredMessages.slice(startIndex, endIndex);

    return { messages, total };
  }

  /**
   * Get message statistics
   */
  async getStatistics(timeRange: string): Promise<MessageStatistics> {
    const now = new Date();
    const startTime = this.getTimeRangeStart(timeRange, now);
    
    const recentMessages = this.messages.filter(msg => 
      msg.timestamp >= startTime
    );

    const messagesByType: Record<MessageType, number> = {} as any;
    const messagesByChannel: Record<number, number> = {};
    const nodeMessageCounts: Record<string, number> = {};
    let encryptedCount = 0;
    let totalSize = 0;

    // Initialize message type counts
    Object.values(MessageType).forEach(type => {
      messagesByType[type] = 0;
    });

    recentMessages.forEach(msg => {
      if (msg.parsed) {
        if (msg.parsed.type) {
          messagesByType[msg.parsed.type]++;
        }
        
        if (msg.parsed.channel !== undefined) {
          messagesByChannel[msg.parsed.channel] = (messagesByChannel[msg.parsed.channel] || 0) + 1;
        }
        
        if (msg.parsed.nodeId) {
          nodeMessageCounts[msg.parsed.nodeId] = (nodeMessageCounts[msg.parsed.nodeId] || 0) + 1;
        }
        
        if (msg.parsed.encrypted) {
          encryptedCount++;
        }
      }
      
      totalSize += msg.size;
    });

    // Get top nodes with their names from database
    const topNodeIds = Object.entries(nodeMessageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nodeId]) => nodeId);

    // Fetch node names from database
    const topNodes = await this.fetchNodeNames(topNodeIds, nodeMessageCounts);

    const timeRangeMinutes = this.getTimeRangeMinutes(timeRange);
    const messagesPerMinute = recentMessages.length / timeRangeMinutes;

    return {
      totalMessages: recentMessages.length,
      messagesByType,
      messagesByChannel,
      encryptedMessages: encryptedCount,
      unencryptedMessages: recentMessages.length - encryptedCount,
      averageMessageSize: recentMessages.length > 0 ? totalSize / recentMessages.length : 0,
      messagesPerMinute,
      topNodes,
      timeRange
    };
  }

  /**
   * Fetch node names from database
   */
  private async fetchNodeNames(
    nodeIds: string[], 
    counts: Record<string, number>
  ): Promise<Array<{ nodeId: string; shortName?: string; longName?: string; count: number }>> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const nodes = await prisma.node.findMany({
        where: {
          nodeId: {
            in: nodeIds
          }
        },
        select: {
          nodeId: true,
          shortName: true,
          longName: true
        }
      });

      await prisma.$disconnect();

      // Map nodes with their counts, filtering out nodes without shortName
      const result = nodeIds
        .map(nodeId => {
          const node = nodes.find(n => n.nodeId === nodeId);
          return {
            nodeId,
            shortName: node?.shortName || undefined,
            longName: node?.longName || undefined,
            count: counts[nodeId]
          };
        })
        .filter(node => node.shortName); // Only include nodes with a shortName

      return result;
    } catch (error) {
      logger.error('Failed to fetch node names:', error);
      // Return empty array if database query fails
      return [];
    }
  }

  /**
   * Get traffic rate data
   */
  async getTrafficRate(interval: string): Promise<TrafficRate[]> {
    const now = new Date();
    const startTime = this.getTimeRangeStart('1h', now); // Last hour of data
    
    return this.trafficRates.filter(rate => 
      rate.timestamp >= startTime && rate.interval === interval
    );
  }

  /**
   * Get detailed message information
   */
  async getMessageDetails(messageId: string): Promise<MQTTMessage | null> {
    return this.messages.find(msg => msg.id === messageId) || null;
  }

  /**
   * Configure traffic alerts
   */
  async configureAlerts(config: AlertConfig): Promise<AlertConfig> {
    this.alertConfig = { ...config };
    logger.info('MQTT traffic alerts configured:', this.alertConfig);
    return this.alertConfig;
  }

  /**
   * Get connection status for all MQTT services
   */
  async getConnectionStatus(): Promise<any> {
    // This would integrate with MQTTManagerService to get actual connection status
    return {
      totalConnections: 1, // Placeholder
      activeConnections: 1,
      messagesInBuffer: this.messages.length,
      trafficRatePoints: this.trafficRates.length,
      alertsEnabled: this.alertConfig.enabled,
      uptime: process.uptime()
    };
  }

  /**
   * Parse MQTT message payload
   */
  private parseMessage(payload: string): any {
    try {
      const parsed = JSON.parse(payload);
      
      // Extract node ID - handle both 'sender' and 'from' fields
      let nodeId: string | undefined;
      if (parsed.sender && typeof parsed.sender === 'string') {
        nodeId = parsed.sender;
      } else if (parsed.from) {
        // Convert numeric ID to hex format if needed
        if (typeof parsed.from === 'number') {
          nodeId = `!${parsed.from.toString(16).padStart(8, '0')}`;
        } else if (typeof parsed.from === 'string') {
          nodeId = parsed.from.startsWith('!') ? parsed.from : `!${parsed.from}`;
        }
      }
      
      // Extract message type - handle various formats
      let type: string | undefined;
      if (parsed.type && typeof parsed.type === 'string') {
        type = parsed.type.toUpperCase();
      }
      
      // Only return parsed data if we have the minimum required fields
      if (nodeId) {
        return {
          nodeId,
          type,
          encrypted: typeof parsed.encrypted === 'boolean' ? parsed.encrypted : false,
          channel: typeof parsed.channel === 'number' ? parsed.channel : undefined,
          priority: parsed.priority,
          content: parsed.payload || parsed
        };
      }
    } catch (error) {
      // If parsing fails, return null to indicate no parsed data
      logger.debug('Failed to parse MQTT message payload:', error);
      return null;
    }
    
    return null;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get start time for time range
   */
  private getTimeRangeStart(timeRange: string, now: Date): Date {
    const ranges: Record<string, number> = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    
    const milliseconds = ranges[timeRange] || ranges['1h'];
    return new Date(now.getTime() - milliseconds);
  }

  /**
   * Get time range in minutes
   */
  private getTimeRangeMinutes(timeRange: string): number {
    const ranges: Record<string, number> = {
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '6h': 360,
      '24h': 1440
    };
    
    return ranges[timeRange] || 60;
  }

  /**
   * Start monitoring traffic rates
   */
  private startTrafficRateMonitoring(): void {
    // Monitor every 10 seconds
    setInterval(() => {
      this.calculateTrafficRate();
    }, 10000);
  }

  /**
   * Calculate current traffic rate
   */
  private calculateTrafficRate(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const recentMessages = this.messages.filter(msg => 
      msg.timestamp >= oneMinuteAgo
    );
    
    const messagesPerSecond = recentMessages.length / 60;
    const bytesPerSecond = recentMessages.reduce((sum, msg) => sum + msg.size, 0) / 60;
    
    const trafficRate: TrafficRate = {
      timestamp: now,
      messagesPerSecond,
      bytesPerSecond,
      interval: '1m'
    };
    
    this.trafficRates.unshift(trafficRate);
    
    // Keep only last 1000 data points
    if (this.trafficRates.length > 1000) {
      this.trafficRates = this.trafficRates.slice(0, 1000);
    }
  }

  /**
   * Check for traffic alerts
   */
  private checkTrafficAlerts(): void {
    if (!this.alertConfig.enabled) return;
    
    const now = Date.now();
    if (now - this.lastAlertTime < this.alertCooldown) return;
    
    const oneMinuteAgo = new Date(now - 60000);
    const recentMessages = this.messages.filter(msg => 
      msg.timestamp >= oneMinuteAgo
    );
    
    if (recentMessages.length > this.alertConfig.threshold) {
      this.emit('trafficAlert', {
        threshold: this.alertConfig.threshold,
        actual: recentMessages.length,
        timestamp: new Date()
      });
      
      this.lastAlertTime = now;
      logger.warn(`MQTT traffic alert: ${recentMessages.length} messages in last minute (threshold: ${this.alertConfig.threshold})`);
    }
  }
}