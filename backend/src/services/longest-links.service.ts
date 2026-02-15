/**
 * Longest Links Service
 * Analyzes RF links to find the longest successful connections
 * Requirements: 39.4, 39.5, 39.6, 39.7, 39.8, 39.9
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { DistanceCalculationService, Position } from './distance-calculation.service';

const prisma = new PrismaClient();

export interface LongestLinkResult {
  from_node_id: string;
  from_node_name: string;
  to_node_id: string;
  to_node_name: string;
  distance_km: number;
  distance_formatted: string;
  avg_snr: number;
  avg_rssi: number;
  hop_count: number;
  traceroute_count: number;
  last_seen: Date;
  from_position_age_seconds: number;
  to_position_age_seconds: number;
  has_stale_position: boolean;
}

export interface LongestLinksOptions {
  minDistanceKm?: number;
  minSnrDb?: number;
  maxAgeSeconds?: number;
  limit?: number;
}

export class LongestLinksService {
  private distanceService: DistanceCalculationService;
  private cache: Map<string, { links: LongestLinkResult[]; timestamp: number }>;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_MIN_DISTANCE_KM = 1.0;
  private readonly DEFAULT_MIN_SNR_DB = -20.0;
  private readonly DEFAULT_MAX_AGE_SECONDS = 86400; // 24 hours
  private readonly DEFAULT_LIMIT = 100;

  constructor() {
    this.distanceService = new DistanceCalculationService();
    this.cache = new Map();
  }

  /**
   * Get longest RF links with distance calculations
   * @param options Filtering options
   * @returns Array of longest links with distance and signal quality
   */
  async getLongestLinks(options: LongestLinksOptions = {}): Promise<LongestLinkResult[]> {
    try {
      const minDistanceKm = options.minDistanceKm ?? this.DEFAULT_MIN_DISTANCE_KM;
      const minSnrDb = options.minSnrDb ?? this.DEFAULT_MIN_SNR_DB;
      const maxAgeSeconds = options.maxAgeSeconds ?? this.DEFAULT_MAX_AGE_SECONDS;
      const limit = options.limit ?? this.DEFAULT_LIMIT;

      // Check cache
      const cacheKey = `longest-links-${minDistanceKm}-${minSnrDb}-${maxAgeSeconds}-${limit}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        logger.info('Returning cached longest links');
        return cached.links;
      }

      logger.info(`Calculating longest links (minDistance: ${minDistanceKm}km, minSNR: ${minSnrDb}dB)`);

      // Get all traceroute messages from the last 24 hours
      const cutoffTime = new Date(Date.now() - maxAgeSeconds * 1000);
      
      const tracerouteMessages = await prisma.message.findMany({
        where: {
          type: 'TRACEROUTE_APP',
          timestamp: {
            gte: cutoffTime
          },
          snr: {
            gte: minSnrDb
          }
        },
        select: {
          fromNodeId: true,
          routingPath: true,
          rssi: true,
          snr: true,
          timestamp: true
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 2000 // Limit for performance
      });

      logger.info(`Found ${tracerouteMessages.length} traceroute messages`);

      // Extract RF hops from traceroute messages
      const hopMap = new Map<string, {
        from_node_id: string;
        to_node_id: string;
        rssi_sum: number;
        snr_sum: number;
        count: number;
        last_seen: Date;
      }>();

      for (const message of tracerouteMessages) {
        const routingPath = message.routingPath || [];
        
        // Extract consecutive pairs as RF hops
        for (let i = 0; i < routingPath.length - 1; i++) {
          const fromNodeId = routingPath[i];
          const toNodeId = routingPath[i + 1];
          
          // Create bidirectional key (always sort to merge A->B and B->A)
          const key = [fromNodeId, toNodeId].sort().join('->');
          
          const existing = hopMap.get(key);
          if (existing) {
            existing.rssi_sum += message.rssi || 0;
            existing.snr_sum += message.snr || 0;
            existing.count += 1;
            if (message.timestamp > existing.last_seen) {
              existing.last_seen = message.timestamp;
            }
          } else {
            hopMap.set(key, {
              from_node_id: fromNodeId,
              to_node_id: toNodeId,
              rssi_sum: message.rssi || 0,
              snr_sum: message.snr || 0,
              count: 1,
              last_seen: message.timestamp
            });
          }
        }
      }

      logger.info(`Extracted ${hopMap.size} unique RF hops`);

      // Get all unique node IDs
      const nodeIds = new Set<string>();
      for (const hop of hopMap.values()) {
        nodeIds.add(hop.from_node_id);
        nodeIds.add(hop.to_node_id);
      }

      // Pre-fetch location history for all nodes
      const nodePositions = await this.fetchLocationHistory(Array.from(nodeIds));

      // Calculate distances for each hop
      const linksWithDistance: LongestLinkResult[] = [];

      for (const [key, hop] of hopMap.entries()) {
        const fromPositions = nodePositions.get(hop.from_node_id);
        const toPositions = nodePositions.get(hop.to_node_id);

        if (!fromPositions || fromPositions.length === 0 || !toPositions || toPositions.length === 0) {
          continue; // Skip if no position data
        }

        // Find positions closest to the last_seen timestamp
        const fromPosition = this.distanceService.findClosestPosition(fromPositions, hop.last_seen);
        const toPosition = this.distanceService.findClosestPosition(toPositions, hop.last_seen);

        if (!fromPosition || !toPosition) {
          continue;
        }

        // Calculate distance
        const distanceResult = this.distanceService.calculateDistanceBetweenPositions(
          fromPosition,
          toPosition
        );

        // Filter by minimum distance
        if (distanceResult.distanceKm < minDistanceKm) {
          continue;
        }

        // Calculate position ages
        const now = Date.now();
        const fromPositionAge = fromPosition.timestamp 
          ? (now - fromPosition.timestamp.getTime()) / 1000 
          : Infinity;
        const toPositionAge = toPosition.timestamp 
          ? (now - toPosition.timestamp.getTime()) / 1000 
          : Infinity;

        // Check if positions are stale
        const hasStalePosition = this.distanceService.isPositionStale(fromPosition, maxAgeSeconds) ||
                                 this.distanceService.isPositionStale(toPosition, maxAgeSeconds);

        // Get node names
        const fromNode = await prisma.node.findUnique({
          where: { id: hop.from_node_id },
          select: { shortName: true, longName: true }
        });

        const toNode = await prisma.node.findUnique({
          where: { id: hop.to_node_id },
          select: { shortName: true, longName: true }
        });

        linksWithDistance.push({
          from_node_id: hop.from_node_id,
          from_node_name: fromNode?.shortName || fromNode?.longName || hop.from_node_id,
          to_node_id: hop.to_node_id,
          to_node_name: toNode?.shortName || toNode?.longName || hop.to_node_id,
          distance_km: distanceResult.distanceKm,
          distance_formatted: distanceResult.distanceFormatted,
          avg_snr: hop.snr_sum / hop.count,
          avg_rssi: hop.rssi_sum / hop.count,
          hop_count: 1, // Direct RF hop
          traceroute_count: hop.count,
          last_seen: hop.last_seen,
          from_position_age_seconds: fromPositionAge,
          to_position_age_seconds: toPositionAge,
          has_stale_position: hasStalePosition
        });
      }

      // Sort by distance (longest first) and limit
      linksWithDistance.sort((a, b) => b.distance_km - a.distance_km);
      const result = linksWithDistance.slice(0, limit);

      // Cache the results
      this.cache.set(cacheKey, {
        links: result,
        timestamp: Date.now()
      });

      // Clean old cache entries
      this.cleanCache();

      logger.info(`Calculated ${result.length} longest links`);

      return result;
    } catch (error) {
      logger.error('Error calculating longest links:', error);
      throw error;
    }
  }

  /**
   * Fetch location history for multiple nodes
   * @param nodeIds Array of node IDs
   * @returns Map of node ID to positions
   */
  private async fetchLocationHistory(nodeIds: string[]): Promise<Map<string, Position[]>> {
    const positionMap = new Map<string, Position[]>();

    // Fetch positions for all nodes in one query
    const positions = await prisma.position.findMany({
      where: {
        nodeId: {
          in: nodeIds
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: nodeIds.length * 10 // Get up to 10 positions per node
    });

    // Group positions by node ID
    for (const position of positions) {
      const existing = positionMap.get(position.nodeId) || [];
      existing.push({
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.altitude || undefined,
        timestamp: position.timestamp
      });
      positionMap.set(position.nodeId, existing);
    }

    // Cache in distance service for potential reuse
    for (const [nodeId, positions] of positionMap.entries()) {
      this.distanceService.cacheLocationHistory(nodeId, positions);
    }

    return positionMap;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL_MS) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.distanceService.clearCache();
    logger.info('Longest links cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; oldestEntry: number | null } {
    const now = Date.now();
    let oldestEntry: number | null = null;

    for (const value of this.cache.values()) {
      const age = now - value.timestamp;
      if (oldestEntry === null || age > oldestEntry) {
        oldestEntry = age;
      }
    }

    return {
      entries: this.cache.size,
      oldestEntry
    };
  }
}

export const longestLinksService = new LongestLinksService();
