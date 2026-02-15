import { describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Unit tests for packet grouping functionality
 * Tests grouping logic, aggregation, and relay node formatting
 * Requirements: 38.1, 38.2, 38.3, 38.4
 */

interface PacketData {
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

interface GroupedPacket {
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

/**
 * Groups packets by (mesh_packet_id, from_node_id, to_node_id, portnum, portnum_name)
 * and calculates aggregated statistics
 */
function groupPackets(packets: PacketData[]): GroupedPacket[] {
  const groups = new Map<string, PacketData[]>();

  // Group packets by composite key
  for (const packet of packets) {
    const key = `${packet.mesh_packet_id}|${packet.from_node_id}|${packet.to_node_id || 'broadcast'}|${packet.portnum}|${packet.portnum_name}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(packet);
  }

  // Calculate aggregated statistics for each group
  const result: GroupedPacket[] = [];
  
  for (const [key, groupPackets] of groups.entries()) {
    const [mesh_packet_id, from_node_id, to_node_id_str, portnum_str, portnum_name] = key.split('|');
    const to_node_id = to_node_id_str === 'broadcast' ? null : to_node_id_str;
    const portnum = parseInt(portnum_str, 10);

    // Get unique gateways
    const gateways = new Set(groupPackets.map(p => p.gateway_id));
    
    // Calculate RSSI/SNR ranges
    const rssiValues = groupPackets.map(p => p.rssi).filter(v => v !== null && v !== undefined);
    const snrValues = groupPackets.map(p => p.snr).filter(v => v !== null && v !== undefined);
    
    // Calculate hop counts (hop_start - hop_limit)
    const hopCounts = groupPackets.map(p => p.hop_start - p.hop_limit);
    
    // Format relay nodes with occurrence counts
    const relayNodes = groupPackets
      .map(p => p.relay_node_id)
      .filter(id => id !== null && id !== undefined) as string[];
    
    const relayNodeCounts = new Map<string, number>();
    for (const nodeId of relayNodes) {
      relayNodeCounts.set(nodeId, (relayNodeCounts.get(nodeId) || 0) + 1);
    }
    
    // Format as "0x12, 0x34*2, 0x56*3"
    const relayNodesFormatted = Array.from(relayNodeCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([nodeId, count]) => count > 1 ? `${nodeId}*${count}` : nodeId)
      .join(', ');

    // Get timestamps
    const timestamps = groupPackets.map(p => p.timestamp.getTime());
    
    result.push({
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
    });
  }

  return result.sort((a, b) => b.last_seen.getTime() - a.last_seen.getTime());
}

describe('Packet Grouping', () => {
  describe('groupPackets', () => {
    it('should group packets by composite key (mesh_packet_id, from_node_id, to_node_id, portnum, portnum_name)', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: '2',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw2',
          rssi: -75,
          snr: 6.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:01Z')
        },
        {
          id: '3',
          mesh_packet_id: 'pkt456',
          from_node_id: 'node3',
          to_node_id: null,
          portnum: 3,
          portnum_name: 'POSITION_APP',
          gateway_id: 'gw1',
          rssi: -70,
          snr: 8.0,
          hop_start: 5,
          hop_limit: 5,
          timestamp: new Date('2024-01-01T10:00:02Z')
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(2);
      expect(grouped[0].mesh_packet_id).toBe('pkt456');
      expect(grouped[1].mesh_packet_id).toBe('pkt123');
    });

    it('should calculate gateway count and list correctly', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: '2',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw2',
          rssi: -75,
          snr: 6.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:01Z')
        },
        {
          id: '3',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw3',
          rssi: -85,
          snr: 4.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:02Z')
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].gateway_count).toBe(3);
      expect(grouped[0].gateway_list).toEqual(['gw1', 'gw2', 'gw3']);
    });

    it('should calculate RSSI and SNR ranges correctly', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: '2',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw2',
          rssi: -75,
          snr: 8.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:01Z')
        },
        {
          id: '3',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw3',
          rssi: -90,
          snr: 3.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:02Z')
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].rssi_min).toBe(-90);
      expect(grouped[0].rssi_max).toBe(-75);
      expect(grouped[0].snr_min).toBe(3.0);
      expect(grouped[0].snr_max).toBe(8.0);
    });

    it('should calculate hop count ranges correctly', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: '2',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw2',
          rssi: -75,
          snr: 6.0,
          hop_start: 3,
          hop_limit: 2,
          timestamp: new Date('2024-01-01T10:00:01Z')
        },
        {
          id: '3',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw3',
          rssi: -85,
          snr: 4.0,
          hop_start: 3,
          hop_limit: 1,
          timestamp: new Date('2024-01-01T10:00:02Z')
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].hop_count_min).toBe(0); // 3 - 3
      expect(grouped[0].hop_count_max).toBe(2); // 3 - 1
    });

    it('should format relay nodes with occurrence counts correctly', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          relay_node_id: '0x12'
        },
        {
          id: '2',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw2',
          rssi: -75,
          snr: 6.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:01Z'),
          relay_node_id: '0x34'
        },
        {
          id: '3',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw3',
          rssi: -85,
          snr: 4.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:02Z'),
          relay_node_id: '0x34'
        },
        {
          id: '4',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw4',
          rssi: -82,
          snr: 5.5,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:03Z'),
          relay_node_id: '0x56'
        },
        {
          id: '5',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw5',
          rssi: -78,
          snr: 6.5,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:04Z'),
          relay_node_id: '0x56'
        },
        {
          id: '6',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw6',
          rssi: -81,
          snr: 5.2,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:05Z'),
          relay_node_id: '0x56'
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(1);
      // Format: "0x12, 0x34*2, 0x56*3"
      expect(grouped[0].relay_nodes_formatted).toBe('0x12, 0x34*2, 0x56*3');
    });

    it('should handle packets without relay nodes', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z')
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].relay_nodes_formatted).toBe('');
    });

    it('should calculate reception count correctly', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: '2',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw2',
          rssi: -75,
          snr: 6.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:01Z')
        },
        {
          id: '3',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw3',
          rssi: -85,
          snr: 4.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:02Z')
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].reception_count).toBe(3);
    });

    it('should handle broadcast messages (null to_node_id)', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: null,
          portnum: 3,
          portnum_name: 'POSITION_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: '2',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: null,
          portnum: 3,
          portnum_name: 'POSITION_APP',
          gateway_id: 'gw2',
          rssi: -75,
          snr: 6.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:01Z')
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].to_node_id).toBeNull();
      expect(grouped[0].gateway_count).toBe(2);
    });

    it('should sort grouped packets by last_seen descending', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: '2',
          mesh_packet_id: 'pkt456',
          from_node_id: 'node3',
          to_node_id: 'node4',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw2',
          rssi: -75,
          snr: 6.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:05Z')
        },
        {
          id: '3',
          mesh_packet_id: 'pkt789',
          from_node_id: 'node5',
          to_node_id: 'node6',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw3',
          rssi: -85,
          snr: 4.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:03Z')
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(3);
      expect(grouped[0].mesh_packet_id).toBe('pkt456'); // Most recent
      expect(grouped[1].mesh_packet_id).toBe('pkt789');
      expect(grouped[2].mesh_packet_id).toBe('pkt123'); // Oldest
    });

    it('should handle empty packet array', () => {
      const packets: PacketData[] = [];
      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(0);
    });

    it('should track first_seen and last_seen timestamps correctly', () => {
      const packets: PacketData[] = [
        {
          id: '1',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw1',
          rssi: -80,
          snr: 5.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: '2',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw2',
          rssi: -75,
          snr: 6.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:05Z')
        },
        {
          id: '3',
          mesh_packet_id: 'pkt123',
          from_node_id: 'node1',
          to_node_id: 'node2',
          portnum: 1,
          portnum_name: 'TEXT_MESSAGE_APP',
          gateway_id: 'gw3',
          rssi: -85,
          snr: 4.0,
          hop_start: 3,
          hop_limit: 3,
          timestamp: new Date('2024-01-01T10:00:03Z')
        }
      ];

      const grouped = groupPackets(packets);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].first_seen).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(grouped[0].last_seen).toEqual(new Date('2024-01-01T10:00:05Z'));
    });
  });
});
