/**
 * Gateway Comparison Service
 * Compares signal quality between two gateways for common packets
 * Requirements: 41.2, 41.3, 41.4, 41.9, 41.14
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface CommonPacket {
  mesh_packet_id: string;
  from_node_id: string;
  hop_limit: number;
  gateway1_rssi: number;
  gateway1_snr: number;
  gateway1_timestamp: Date;
  gateway2_rssi: number;
  gateway2_snr: number;
  gateway2_timestamp: Date;
  time_diff_seconds: number;
  rssi_diff: number;
  snr_diff: number;
}

interface GatewayStatistics {
  packet_count: number;
  avg_rssi: number;
  avg_snr: number;
  unique_sources: number;
  rssi_diff_avg: number;
  rssi_diff_min: number;
  rssi_diff_max: number;
  rssi_diff_stddev: number;
  snr_diff_avg: number;
  snr_diff_min: number;
  snr_diff_max: number;
  snr_diff_stddev: number;
}

interface GatewayComparisonResult {
  common_packets: CommonPacket[];
  statistics: GatewayStatistics;
  gateway1_id: string;
  gateway2_id: string;
}

export class GatewayComparisonService {
  private cache: Map<string, { data: GatewayComparisonResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Compare signal quality between two gateways
   * Finds common packets and calculates statistics
   */
  async compareGateways(
    gateway1Id: string,
    gateway2Id: string,
    options: {
      startTime?: Date;
      endTime?: Date;
      sourceNodeId?: string;
    } = {}
  ): Promise<GatewayComparisonResult> {
    try {
      // Check cache
      const cacheKey = this.getCacheKey(gateway1Id, gateway2Id, options);
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        logger.info('Returning cached gateway comparison data');
        return cached.data;
      }

      logger.info(`Comparing gateways: ${gateway1Id} vs ${gateway2Id}`);

      // Extract gateway IDs from topic format (e.g., "!abc123" -> "abc123")
      const gw1 = gateway1Id.startsWith('!') ? gateway1Id.substring(1) : gateway1Id;
      const gw2 = gateway2Id.startsWith('!') ? gateway2Id.substring(1) : gateway2Id;

      // Build time range filter
      const timeFilter: any = {};
      if (options.startTime) {
        timeFilter.gte = options.startTime;
      }
      if (options.endTime) {
        timeFilter.lte = options.endTime;
      }

      // Find common packets using raw SQL for better performance
      // INNER JOIN on (mesh_packet_id, from_node_id, hop_limit)
      // Filter packets within 30 seconds of each other
      const commonPacketsQuery = `
        SELECT 
          m1.message_id as mesh_packet_id,
          m1.from_node_id,
          m1.hop_limit,
          m1.rssi as gateway1_rssi,
          m1.snr as gateway1_snr,
          m1.timestamp as gateway1_timestamp,
          m2.rssi as gateway2_rssi,
          m2.snr as gateway2_snr,
          m2.timestamp as gateway2_timestamp,
          EXTRACT(EPOCH FROM (m2.timestamp - m1.timestamp)) as time_diff_seconds,
          (m2.rssi - m1.rssi) as rssi_diff,
          (m2.snr - m1.snr) as snr_diff
        FROM messages m1
        INNER JOIN messages m2 
          ON m1.message_id = m2.message_id 
          AND m1.from_node_id = m2.from_node_id 
          AND m1.hop_limit = m2.hop_limit
        WHERE 
          m1.topic LIKE '%/${gw1}%'
          AND m2.topic LIKE '%/${gw2}%'
          AND m1.rssi IS NOT NULL
          AND m2.rssi IS NOT NULL
          AND m1.snr IS NOT NULL
          AND m2.snr IS NOT NULL
          AND ABS(EXTRACT(EPOCH FROM (m2.timestamp - m1.timestamp))) <= 30
          ${options.startTime ? `AND m1.timestamp >= '${options.startTime.toISOString()}'` : ''}
          ${options.endTime ? `AND m1.timestamp <= '${options.endTime.toISOString()}'` : ''}
          ${options.sourceNodeId ? `AND m1.from_node_id = '${options.sourceNodeId}'` : ''}
        ORDER BY m1.timestamp DESC
        LIMIT 1000
      `;

      const commonPackets = await prisma.$queryRawUnsafe<CommonPacket[]>(commonPacketsQuery);

      logger.info(`Found ${commonPackets.length} common packets between gateways`);

      // Calculate statistics
      const statistics = this.calculateStatistics(commonPackets);

      const result: GatewayComparisonResult = {
        common_packets: commonPackets,
        statistics,
        gateway1_id: gateway1Id,
        gateway2_id: gateway2Id
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      logger.error('Error comparing gateways:', error);
      throw error;
    }
  }

  /**
   * Calculate statistics for common packets
   */
  private calculateStatistics(packets: CommonPacket[]): GatewayStatistics {
    if (packets.length === 0) {
      return {
        packet_count: 0,
        avg_rssi: 0,
        avg_snr: 0,
        unique_sources: 0,
        rssi_diff_avg: 0,
        rssi_diff_min: 0,
        rssi_diff_max: 0,
        rssi_diff_stddev: 0,
        snr_diff_avg: 0,
        snr_diff_min: 0,
        snr_diff_max: 0,
        snr_diff_stddev: 0
      };
    }

    // Calculate averages
    const rssiDiffs = packets.map(p => p.rssi_diff);
    const snrDiffs = packets.map(p => p.snr_diff);
    const gateway1Rssi = packets.map(p => p.gateway1_rssi);
    const gateway1Snr = packets.map(p => p.gateway1_snr);

    const rssiDiffAvg = this.average(rssiDiffs);
    const snrDiffAvg = this.average(snrDiffs);

    // Calculate standard deviations
    const rssiDiffStddev = this.standardDeviation(rssiDiffs, rssiDiffAvg);
    const snrDiffStddev = this.standardDeviation(snrDiffs, snrDiffAvg);

    // Count unique sources
    const uniqueSources = new Set(packets.map(p => p.from_node_id)).size;

    return {
      packet_count: packets.length,
      avg_rssi: this.average(gateway1Rssi),
      avg_snr: this.average(gateway1Snr),
      unique_sources: uniqueSources,
      rssi_diff_avg: rssiDiffAvg,
      rssi_diff_min: Math.min(...rssiDiffs),
      rssi_diff_max: Math.max(...rssiDiffs),
      rssi_diff_stddev: rssiDiffStddev,
      snr_diff_avg: snrDiffAvg,
      snr_diff_min: Math.min(...snrDiffs),
      snr_diff_max: Math.max(...snrDiffs),
      snr_diff_stddev: snrDiffStddev
    };
  }

  /**
   * Calculate average of an array of numbers
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = this.average(squaredDiffs);
    return Math.sqrt(variance);
  }

  /**
   * Generate cache key for gateway comparison
   */
  private getCacheKey(
    gateway1Id: string,
    gateway2Id: string,
    options: {
      startTime?: Date;
      endTime?: Date;
      sourceNodeId?: string;
    }
  ): string {
    const parts = [
      gateway1Id,
      gateway2Id,
      options.startTime?.toISOString() || 'no-start',
      options.endTime?.toISOString() || 'no-end',
      options.sourceNodeId || 'no-source'
    ];
    return parts.join('|');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Gateway comparison cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; oldestEntry: number | null } {
    let oldestTimestamp: number | null = null;
    
    for (const entry of this.cache.values()) {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      entries: this.cache.size,
      oldestEntry: oldestTimestamp
    };
  }
}
