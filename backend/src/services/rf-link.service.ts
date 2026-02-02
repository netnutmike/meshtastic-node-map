/**
 * RF Link Service
 * Aggregates RF links from both traceroute and packet sources
 * Requirements: 34.1, 34.2, 34.3, 34.11, 34.12, 34.13, 34.14
 */

import { logger } from '../utils/logger';
import { TracerouteLinkService, RFLink } from './traceroute-link.service';
import { PacketLinkService } from './packet-link.service';

export class RFLinkService {
  private tracerouteLinkService: TracerouteLinkService;
  private packetLinkService: PacketLinkService;
  private cache: Map<string, { links: RFLink[]; timestamp: number }>;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.tracerouteLinkService = new TracerouteLinkService();
    this.packetLinkService = new PacketLinkService();
    this.cache = new Map();
  }

  /**
   * Get all RF links (traceroute + packet links)
   * @param hours Number of hours to look back (default 24, max 336 for 14 days)
   * @param mergeBidirectional Whether to merge bidirectional links (default true)
   */
  async getAllRFLinks(hours: number = 24, mergeBidirectional: boolean = true): Promise<{
    traceroute_links: RFLink[];
    packet_links: RFLink[];
    all_links: RFLink[];
  }> {
    try {
      // Validate hours parameter
      const validHours = Math.min(Math.max(1, hours), 336); // Max 14 days
      
      // Check cache
      const cacheKey = `rf-links-${validHours}-${mergeBidirectional}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        logger.info('Returning cached RF links');
        return this.formatResponse(cached.links, mergeBidirectional);
      }

      logger.info(`Fetching RF links for last ${validHours} hours`);

      // Extract links from both sources in parallel
      const [tracerouteLinks, packetLinks] = await Promise.all([
        this.tracerouteLinkService.extractTracerouteLinks(validHours, 2000),
        this.packetLinkService.extractPacketLinks(validHours, 5000)
      ]);

      // Merge links
      let allLinks: RFLink[];
      if (mergeBidirectional) {
        const mergedTraceroute = this.tracerouteLinkService.mergeBidirectionalLinks(tracerouteLinks);
        allLinks = this.packetLinkService.mergeWithTracerouteLinks(packetLinks, mergedTraceroute);
      } else {
        allLinks = this.packetLinkService.mergeWithTracerouteLinks(packetLinks, tracerouteLinks);
      }

      // Cache the results
      this.cache.set(cacheKey, {
        links: allLinks,
        timestamp: Date.now()
      });

      // Clean old cache entries
      this.cleanCache();

      logger.info(`Retrieved ${allLinks.length} total RF links (${tracerouteLinks.length} traceroute, ${packetLinks.length} packet)`);

      return this.formatResponse(allLinks, mergeBidirectional);
    } catch (error) {
      logger.error('Error getting RF links:', error);
      throw error;
    }
  }

  /**
   * Format response with separate arrays for each link type
   */
  private formatResponse(allLinks: RFLink[], mergeBidirectional: boolean): {
    traceroute_links: RFLink[];
    packet_links: RFLink[];
    all_links: RFLink[];
  } {
    const tracerouteLinks = allLinks.filter(link => link.link_type === 'traceroute');
    const packetLinks = allLinks.filter(link => link.link_type === 'packet');

    return {
      traceroute_links: tracerouteLinks,
      packet_links: packetLinks,
      all_links: allLinks
    };
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
    logger.info('RF link cache cleared');
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

export const rfLinkService = new RFLinkService();
