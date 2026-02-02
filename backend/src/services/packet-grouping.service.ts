import { logger } from '../utils/logger';

/**
 * Packet Grouping Service
 * Provides functionality to group packets by composite key and calculate aggregated statistics
 * Requirements: 38.1, 38.2, 38.3, 38.4
 */

export interface PacketData {
  id: string;
  mesh_packet_id: string;
  from_node_id: string;
  to_node_id: string | null;
  portnum: number;
  portnum_name: string;
  gateway_id: string;
  rssi: number;
  snr: number;
  hop_start: number;
  hop_limit: number;
  timestamp: Date;
  relay_node_id?: string;
}

export interface GroupedPacket {
  mesh_packet_id: string;
  from_node_id: string;
  to_node_id: string | null;
  portnum: number;
  portnum_name: string;
  gateway_count: number;
  gateway_list: string[];
  rssi_min: number;
  rssi_max: number;
  snr_min: number;
  snr_max: number;
  hop_count_min: number;
  hop_count_max: number;
  reception_count: number;
  relay_nodes_formatted: string;
  first_seen: Date;
  last_seen: Date;
}

export class PacketGroupingService {
  /**
   * Groups packets by (mesh_packet_id, from_node_id, to_node_id, portnum, portnum_name)
   * and calculates aggregated statistics
   * 
   * @param packets - Array of packet data to group
   * @returns Array of grouped packets with aggregated statistics
   */
  groupPackets(packets: PacketData[]): GroupedPacket[] {
    logger.debug(`Grouping ${packets.length} packets`);
    
    const groups = new Map<string, PacketData[]>();

    // Group packets by composite key
    for (const packet of packets) {
      const key = this.getGroupKey(packet);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(packet);
    }

    logger.debug(`Created ${groups.size} packet groups`);

    // Calculate aggregated statistics for each group
    const result: GroupedPacket[] = [];
    
    for (const [key, groupPackets] of groups.entries()) {
      const grouped = this.aggregateGroup(key, groupPackets);
      result.push(grouped);
    }

    // Sort by last_seen descending (most recent first)
    return result.sort((a, b) => b.last_seen.getTime() - a.last_seen.getTime());
  }

  /**
   * Generates a composite key for grouping packets
   * Format: mesh_packet_id|from_node_id|to_node_id|portnum|portnum_name
   */
  private getGroupKey(packet: PacketData): string {
    return `${packet.mesh_packet_id}|${packet.from_node_id}|${packet.to_node_id || 'broadcast'}|${packet.portnum}|${packet.portnum_name}`;
  }

  /**
   * Aggregates statistics for a group of packets
   */
  private aggregateGroup(key: string, groupPackets: PacketData[]): GroupedPacket {
    const [mesh_packet_id, from_node_id, to_node_id_str, portnum_str, portnum_name] = key.split('|');
    const to_node_id = to_node_id_str === 'broadcast' ? null : to_node_id_str;
    const portnum = parseInt(portnum_str, 10);

    // Get unique gateways
    const gateways = new Set(groupPackets.map(p => p.gateway_id));
    
    // Calculate RSSI/SNR ranges
    const rssiValues = groupPackets
      .map(p => p.rssi)
      .filter(v => v !== null && v !== undefined && !isNaN(v));
    const snrValues = groupPackets
      .map(p => p.snr)
      .filter(v => v !== null && v !== undefined && !isNaN(v));
    
    // Calculate hop counts (hop_start - hop_limit)
    const hopCounts = groupPackets.map(p => p.hop_start - p.hop_limit);
    
    // Format relay nodes with occurrence counts
    const relayNodesFormatted = this.formatRelayNodes(groupPackets);

    // Get timestamps
    const timestamps = groupPackets.map(p => p.timestamp.getTime());
    
    return {
      mesh_packet_id,
      from_node_id,
      to_node_id,
      portnum,
      portnum_name,
      gateway_count: gateways.size,
      gateway_list: Array.from(gateways).sort(),
      rssi_min: rssiValues.length > 0 ? Math.min(...rssiValues) : 0,
      rssi_max: rssiValues.length > 0 ? Math.max(...rssiValues) : 0,
      snr_min: snrValues.length > 0 ? Math.min(...snrValues) : 0,
      snr_max: snrValues.length > 0 ? Math.max(...snrValues) : 0,
      hop_count_min: hopCounts.length > 0 ? Math.min(...hopCounts) : 0,
      hop_count_max: hopCounts.length > 0 ? Math.max(...hopCounts) : 0,
      reception_count: groupPackets.length,
      relay_nodes_formatted: relayNodesFormatted,
      first_seen: new Date(Math.min(...timestamps)),
      last_seen: new Date(Math.max(...timestamps))
    };
  }

  /**
   * Formats relay nodes with occurrence counts
   * Example: "0x12, 0x34*2, 0x56*3"
   */
  private formatRelayNodes(groupPackets: PacketData[]): string {
    const relayNodes = groupPackets
      .map(p => p.relay_node_id)
      .filter(id => id !== null && id !== undefined) as string[];
    
    if (relayNodes.length === 0) {
      return '';
    }

    const relayNodeCounts = new Map<string, number>();
    for (const nodeId of relayNodes) {
      relayNodeCounts.set(nodeId, (relayNodeCounts.get(nodeId) || 0) + 1);
    }
    
    // Format as "0x12, 0x34*2, 0x56*3"
    return Array.from(relayNodeCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([nodeId, count]) => count > 1 ? `${nodeId}*${count}` : nodeId)
      .join(', ');
  }
}
