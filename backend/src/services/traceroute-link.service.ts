/**
 * Traceroute Link Service
 * Extracts RF hops from TRACEROUTE_APP packets and aggregates link statistics
 * Requirements: 34.1, 34.2, 34.3, 34.11, 34.12, 34.13, 34.14
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface RFLink {
  from_node_id: string;
  to_node_id: string;
  link_type: 'traceroute' | 'packet';
  packet_count: number;
  avg_rssi: number;
  avg_snr: number;
  last_seen: Date;
  success_rate: number;
  is_bidirectional: boolean;
}

export interface TraceroutePacket {
  id: string;
  from_node_id: string;
  timestamp: Date;
  rssi: number | null;
  snr: number | null;
  raw_payload: any;
}

export class TracerouteLinkService {
  /**
   * Extract RF links from traceroute packets
   * @param hours Number of hours to look back (default 24)
   * @param limit Maximum number of packets to process (default 2000)
   */
  async extractTracerouteLinks(hours: number = 24, limit: number = 2000): Promise<RFLink[]> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 3600 * 1000);

      // Query traceroute packets from the database
      const traceroutePackets = await prisma.message.findMany({
        where: {
          type: 'TRACEROUTE_APP',
          timestamp: {
            gte: cutoffTime
          }
        },
        select: {
          id: true,
          fromNodeId: true,
          timestamp: true,
          rssi: true,
          snr: true,
          content: true,
          routingPath: true
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      });

      logger.info(`Processing ${traceroutePackets.length} traceroute packets for RF link extraction`);

      // Extract links from traceroute packets
      const linkMap = new Map<string, RFLink>();

      for (const packet of traceroutePackets) {
        const route = this.extractRouteFromPacket(packet);
        
        if (!route || route.length < 2) {
          continue;
        }

        // Extract consecutive pairs as RF hops
        for (let i = 0; i < route.length - 1; i++) {
          const fromNode = route[i];
          const toNode = route[i + 1];

          if (!fromNode || !toNode) {
            continue;
          }

          const linkKey = this.getLinkKey(fromNode, toNode);
          const existing = linkMap.get(linkKey);

          if (existing) {
            // Update existing link statistics
            const totalCount = existing.packet_count + 1;
            existing.avg_rssi = this.updateAverage(
              existing.avg_rssi,
              packet.rssi || 0,
              existing.packet_count,
              totalCount
            );
            existing.avg_snr = this.updateAverage(
              existing.avg_snr,
              packet.snr || 0,
              existing.packet_count,
              totalCount
            );
            existing.packet_count = totalCount;
            existing.last_seen = packet.timestamp > existing.last_seen ? packet.timestamp : existing.last_seen;
          } else {
            // Create new link
            linkMap.set(linkKey, {
              from_node_id: fromNode,
              to_node_id: toNode,
              link_type: 'traceroute',
              packet_count: 1,
              avg_rssi: packet.rssi || 0,
              avg_snr: packet.snr || 0,
              last_seen: packet.timestamp,
              success_rate: 0, // Will be calculated later
              is_bidirectional: false // Will be determined during merging
            });
          }
        }
      }

      // Calculate success rates and check for bidirectional links
      const links = Array.from(linkMap.values());
      this.calculateSuccessRates(links);
      this.markBidirectionalLinks(links);

      logger.info(`Extracted ${links.length} RF links from traceroute packets`);
      return links;
    } catch (error) {
      logger.error('Error extracting traceroute links:', error);
      throw error;
    }
  }

  /**
   * Extract route nodes from a traceroute packet
   */
  private extractRouteFromPacket(packet: any): string[] {
    try {
      // Try to extract from routingPath first
      if (packet.routingPath && Array.isArray(packet.routingPath) && packet.routingPath.length > 0) {
        return packet.routingPath;
      }

      // Try to extract from content.route_nodes
      if (packet.content && typeof packet.content === 'object') {
        const content = packet.content as any;
        
        if (content.route_nodes && Array.isArray(content.route_nodes)) {
          return content.route_nodes;
        }

        if (content.route && Array.isArray(content.route)) {
          return content.route;
        }
      }

      // Fallback: create route from fromNodeId
      if (packet.fromNodeId) {
        return [packet.fromNodeId];
      }

      return [];
    } catch (error) {
      logger.warn('Error extracting route from packet:', error);
      return [];
    }
  }

  /**
   * Generate a bidirectional link key (always same for A↔B)
   */
  private getLinkKey(node1: string, node2: string): string {
    return node1 < node2 ? `${node1}-${node2}` : `${node2}-${node1}`;
  }

  /**
   * Update running average
   */
  private updateAverage(
    currentAvg: number,
    newValue: number,
    currentCount: number,
    newCount: number
  ): number {
    if (newCount === 0) return currentAvg;
    return (currentAvg * currentCount + newValue) / newCount;
  }

  /**
   * Calculate success rate for each link
   * Formula: min(100, max(10, packet_count * 10))
   */
  private calculateSuccessRates(links: RFLink[]): void {
    for (const link of links) {
      link.success_rate = Math.min(100, Math.max(10, link.packet_count * 10));
    }
  }

  /**
   * Mark bidirectional links
   */
  private markBidirectionalLinks(links: RFLink[]): void {
    const linkKeys = new Set<string>();
    
    // First pass: collect all link keys
    for (const link of links) {
      const key = this.getLinkKey(link.from_node_id, link.to_node_id);
      linkKeys.add(key);
    }

    // Second pass: mark bidirectional
    for (const link of links) {
      const reverseKey = this.getLinkKey(link.to_node_id, link.from_node_id);
      link.is_bidirectional = linkKeys.has(reverseKey);
    }
  }

  /**
   * Merge bidirectional links into single entries
   */
  mergeBidirectionalLinks(links: RFLink[]): RFLink[] {
    const mergedMap = new Map<string, RFLink>();

    for (const link of links) {
      const key = this.getLinkKey(link.from_node_id, link.to_node_id);
      const existing = mergedMap.get(key);

      if (existing) {
        // Merge statistics
        const totalCount = existing.packet_count + link.packet_count;
        existing.avg_rssi = this.updateAverage(
          existing.avg_rssi,
          link.avg_rssi,
          existing.packet_count,
          totalCount
        );
        existing.avg_snr = this.updateAverage(
          existing.avg_snr,
          link.avg_snr,
          existing.packet_count,
          totalCount
        );
        existing.packet_count = totalCount;
        existing.last_seen = link.last_seen > existing.last_seen ? link.last_seen : existing.last_seen;
        existing.success_rate = Math.min(100, Math.max(10, totalCount * 10));
        existing.is_bidirectional = true;
      } else {
        mergedMap.set(key, { ...link });
      }
    }

    return Array.from(mergedMap.values());
  }
}

export const tracerouteLinkService = new TracerouteLinkService();
