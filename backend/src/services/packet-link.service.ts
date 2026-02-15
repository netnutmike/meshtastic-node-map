/**
 * Packet Link Service
 * Detects 0-hop packets (hop_start = hop_limit) to identify direct RF receptions
 * Requirements: 34.1, 34.2, 34.3, 34.11, 34.12, 34.13, 34.14
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { RFLink } from './traceroute-link.service';

const prisma = new PrismaClient();

export class PacketLinkService {
  /**
   * Extract RF links from 0-hop packets (direct receptions)
   * @param hours Number of hours to look back (default 24)
   * @param limit Maximum number of packets to process (default 5000)
   */
  async extractPacketLinks(hours: number = 24, limit: number = 5000): Promise<RFLink[]> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 3600 * 1000);

      // Query packets where hop_start = hop_limit (0-hop packets)
      // This indicates direct RF reception without any hops
      const directPackets = await prisma.$queryRaw<any[]>`
        SELECT 
          id,
          "fromNodeId" as from_node_id,
          "toNodeId" as to_node_id,
          timestamp,
          rssi,
          snr,
          "hopStart" as hop_start,
          "hopLimit" as hop_limit,
          topic
        FROM messages
        WHERE timestamp >= ${cutoffTime}
          AND "hopStart" IS NOT NULL
          AND "hopLimit" IS NOT NULL
          AND "hopStart" = "hopLimit"
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      logger.info(`Processing ${directPackets.length} 0-hop packets for RF link extraction`);

      // Extract gateway_id from topic if available
      const linkMap = new Map<string, RFLink>();

      for (const packet of directPackets) {
        // Extract gateway from MQTT topic (format: msh/<region>/<area>/<hop>/e/<channel>/<gateway_id>)
        const gatewayId = this.extractGatewayFromTopic(packet.topic);
        
        if (!gatewayId || !packet.from_node_id) {
          continue;
        }

        // Create link between sender and gateway
        const linkKey = this.getLinkKey(packet.from_node_id, gatewayId);
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
            from_node_id: packet.from_node_id,
            to_node_id: gatewayId,
            link_type: 'packet',
            packet_count: 1,
            avg_rssi: packet.rssi || 0,
            avg_snr: packet.snr || 0,
            last_seen: packet.timestamp,
            success_rate: 0, // Will be calculated later
            is_bidirectional: false
          });
        }
      }

      // Calculate success rates
      const links = Array.from(linkMap.values());
      this.calculateSuccessRates(links);

      logger.info(`Extracted ${links.length} RF links from 0-hop packets`);
      return links;
    } catch (error) {
      logger.error('Error extracting packet links:', error);
      throw error;
    }
  }

  /**
   * Extract gateway ID from MQTT topic
   * Format: msh/<region>/<area>/<hop>/e/<channel>/<gateway_id>
   */
  private extractGatewayFromTopic(topic: string | null): string | null {
    if (!topic) {
      return null;
    }

    try {
      const parts = topic.split('/');
      
      // Expected format: msh/<region>/<area>/<hop>/e/<channel>/<gateway_id>
      if (parts.length >= 7 && parts[0] === 'msh') {
        const gatewayId = parts[6];
        // Validate gateway ID format (should start with !)
        if (gatewayId && gatewayId.startsWith('!')) {
          return gatewayId;
        }
      }

      // Alternative format: msh/<region>/<channel>/<gateway_id>
      if (parts.length >= 4 && parts[0] === 'msh') {
        const gatewayId = parts[parts.length - 1];
        if (gatewayId && gatewayId.startsWith('!')) {
          return gatewayId;
        }
      }

      return null;
    } catch (error) {
      logger.warn('Error extracting gateway from topic:', error);
      return null;
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
   * Merge packet links with traceroute links
   */
  mergeWithTracerouteLinks(packetLinks: RFLink[], tracerouteLinks: RFLink[]): RFLink[] {
    const mergedMap = new Map<string, RFLink>();

    // Add all traceroute links first
    for (const link of tracerouteLinks) {
      const key = this.getLinkKey(link.from_node_id, link.to_node_id);
      mergedMap.set(key, { ...link });
    }

    // Add or merge packet links
    for (const link of packetLinks) {
      const key = this.getLinkKey(link.from_node_id, link.to_node_id);
      const existing = mergedMap.get(key);

      if (existing) {
        // If traceroute link exists, keep it (more reliable)
        // But update last_seen if packet link is more recent
        if (link.last_seen > existing.last_seen) {
          existing.last_seen = link.last_seen;
        }
      } else {
        // Add new packet link
        mergedMap.set(key, { ...link });
      }
    }

    return Array.from(mergedMap.values());
  }
}

export const packetLinkService = new PacketLinkService();
