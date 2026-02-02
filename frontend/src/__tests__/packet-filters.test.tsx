import { describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Unit tests for packet filtering functionality
 * Tests each filter type independently, filter combination logic, and filter state persistence
 * Requirements: 38.5, 38.6, 38.7, 38.8, 38.9, 38.10, 38.11, 38.12
 */

interface PacketFilters {
  startTime?: string;
  endTime?: string;
  fromNodeId?: string;
  toNodeId?: string;
  excludeFromNodeId?: string;
  excludeToNodeId?: string;
  gatewayId?: string;
  portnum?: number;
  hopCount?: 'any' | 'direct' | '1' | '2' | '3' | '4+';
  rssiMin?: number;
  rssiMax?: number;
  snrMin?: number;
  snrMax?: number;
  primaryChannel?: number;
  excludeGatewaySelfMessages?: boolean;
}

interface PacketData {
  id: string;
  mesh_packet_id: string;
  from_node_id: string;
  to_node_id: string | null;
  gateway_id: string;
  portnum: number;
  portnum_name: string;
  rssi: number;
  snr: number;
  hop_start: number;
  hop_limit: number;
  channel: number;
  timestamp: Date;
}

/**
 * Applies filters to a list of packets
 */
function applyFilters(packets: PacketData[], filters: PacketFilters): PacketData[] {
  return packets.filter(packet => {
    // Time range filter (Requirement 38.5)
    if (filters.startTime) {
      const startDate = new Date(filters.startTime);
      if (packet.timestamp < startDate) return false;
    }
    if (filters.endTime) {
      const endDate = new Date(filters.endTime);
      if (packet.timestamp > endDate) return false;
    }

    // From node filter (Requirement 38.6)
    if (filters.fromNodeId && packet.from_node_id !== filters.fromNodeId) {
      return false;
    }

    // To node filter (Requirement 38.6)
    if (filters.toNodeId && packet.to_node_id !== filters.toNodeId) {
      return false;
    }

    // Exclude from node filter (Requirement 38.6)
    if (filters.excludeFromNodeId && packet.from_node_id === filters.excludeFromNodeId) {
      return false;
    }

    // Exclude to node filter (Requirement 38.6)
    if (filters.excludeToNodeId && packet.to_node_id === filters.excludeToNodeId) {
      return false;
    }

    // Gateway filter (Requirement 38.7)
    if (filters.gatewayId && packet.gateway_id !== filters.gatewayId) {
      return false;
    }

    // Port number filter (Requirement 38.8)
    if (filters.portnum !== undefined && packet.portnum !== filters.portnum) {
      return false;
    }

    // Hop count filter (Requirement 38.9)
    if (filters.hopCount && filters.hopCount !== 'any') {
      const hopCount = packet.hop_start - packet.hop_limit;
      
      switch (filters.hopCount) {
        case 'direct':
          if (hopCount !== 0) return false;
          break;
        case '1':
          if (hopCount !== 1) return false;
          break;
        case '2':
          if (hopCount !== 2) return false;
          break;
        case '3':
          if (hopCount !== 3) return false;
          break;
        case '4+':
          if (hopCount < 4) return false;
          break;
      }
    }

    // RSSI range filter (Requirement 38.10)
    if (filters.rssiMin !== undefined && packet.rssi < filters.rssiMin) {
      return false;
    }
    if (filters.rssiMax !== undefined && packet.rssi > filters.rssiMax) {
      return false;
    }

    // SNR range filter (Requirement 38.10)
    if (filters.snrMin !== undefined && packet.snr < filters.snrMin) {
      return false;
    }
    if (filters.snrMax !== undefined && packet.snr > filters.snrMax) {
      return false;
    }

    // Primary channel filter (Requirement 38.11)
    if (filters.primaryChannel !== undefined && packet.channel !== filters.primaryChannel) {
      return false;
    }

    // Exclude gateway self messages (Requirement 38.12)
    if (filters.excludeGatewaySelfMessages) {
      if (packet.from_node_id === packet.gateway_id) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Serializes filters to URL parameters
 */
function filtersToUrlParams(filters: PacketFilters): URLSearchParams {
  const params = new URLSearchParams();
  
  if (filters.startTime) params.set('startTime', filters.startTime);
  if (filters.endTime) params.set('endTime', filters.endTime);
  if (filters.fromNodeId) params.set('fromNodeId', filters.fromNodeId);
  if (filters.toNodeId) params.set('toNodeId', filters.toNodeId);
  if (filters.excludeFromNodeId) params.set('excludeFromNodeId', filters.excludeFromNodeId);
  if (filters.excludeToNodeId) params.set('excludeToNodeId', filters.excludeToNodeId);
  if (filters.gatewayId) params.set('gatewayId', filters.gatewayId);
  if (filters.portnum !== undefined) params.set('portnum', filters.portnum.toString());
  if (filters.hopCount) params.set('hopCount', filters.hopCount);
  if (filters.rssiMin !== undefined) params.set('rssiMin', filters.rssiMin.toString());
  if (filters.rssiMax !== undefined) params.set('rssiMax', filters.rssiMax.toString());
  if (filters.snrMin !== undefined) params.set('snrMin', filters.snrMin.toString());
  if (filters.snrMax !== undefined) params.set('snrMax', filters.snrMax.toString());
  if (filters.primaryChannel !== undefined) params.set('primaryChannel', filters.primaryChannel.toString());
  if (filters.excludeGatewaySelfMessages) params.set('excludeGatewaySelfMessages', 'true');
  
  return params;
}

/**
 * Parses filters from URL parameters
 */
function urlParamsToFilters(params: URLSearchParams): PacketFilters {
  const filters: PacketFilters = {};
  
  const startTime = params.get('startTime');
  if (startTime) filters.startTime = startTime;
  
  const endTime = params.get('endTime');
  if (endTime) filters.endTime = endTime;
  
  const fromNodeId = params.get('fromNodeId');
  if (fromNodeId) filters.fromNodeId = fromNodeId;
  
  const toNodeId = params.get('toNodeId');
  if (toNodeId) filters.toNodeId = toNodeId;
  
  const excludeFromNodeId = params.get('excludeFromNodeId');
  if (excludeFromNodeId) filters.excludeFromNodeId = excludeFromNodeId;
  
  const excludeToNodeId = params.get('excludeToNodeId');
  if (excludeToNodeId) filters.excludeToNodeId = excludeToNodeId;
  
  const gatewayId = params.get('gatewayId');
  if (gatewayId) filters.gatewayId = gatewayId;
  
  const portnum = params.get('portnum');
  if (portnum) filters.portnum = parseInt(portnum, 10);
  
  const hopCount = params.get('hopCount');
  if (hopCount) filters.hopCount = hopCount as PacketFilters['hopCount'];
  
  const rssiMin = params.get('rssiMin');
  if (rssiMin) filters.rssiMin = parseFloat(rssiMin);
  
  const rssiMax = params.get('rssiMax');
  if (rssiMax) filters.rssiMax = parseFloat(rssiMax);
  
  const snrMin = params.get('snrMin');
  if (snrMin) filters.snrMin = parseFloat(snrMin);
  
  const snrMax = params.get('snrMax');
  if (snrMax) filters.snrMax = parseFloat(snrMax);
  
  const primaryChannel = params.get('primaryChannel');
  if (primaryChannel) filters.primaryChannel = parseInt(primaryChannel, 10);
  
  const excludeGatewaySelfMessages = params.get('excludeGatewaySelfMessages');
  if (excludeGatewaySelfMessages === 'true') filters.excludeGatewaySelfMessages = true;
  
  return filters;
}

describe('Packet Filters', () => {
  let samplePackets: PacketData[];

  beforeEach(() => {
    samplePackets = [
      {
        id: '1',
        mesh_packet_id: 'pkt1',
        from_node_id: 'node1',
        to_node_id: 'node2',
        gateway_id: 'gw1',
        portnum: 1,
        portnum_name: 'TEXT_MESSAGE_APP',
        rssi: -80,
        snr: 5.0,
        hop_start: 3,
        hop_limit: 3,
        channel: 0,
        timestamp: new Date('2024-01-01T10:00:00Z')
      },
      {
        id: '2',
        mesh_packet_id: 'pkt2',
        from_node_id: 'node2',
        to_node_id: 'node3',
        gateway_id: 'gw2',
        portnum: 3,
        portnum_name: 'POSITION_APP',
        rssi: -75,
        snr: 8.0,
        hop_start: 5,
        hop_limit: 4,
        channel: 1,
        timestamp: new Date('2024-01-01T11:00:00Z')
      },
      {
        id: '3',
        mesh_packet_id: 'pkt3',
        from_node_id: 'node3',
        to_node_id: null,
        gateway_id: 'gw1',
        portnum: 67,
        portnum_name: 'TELEMETRY_APP',
        rssi: -90,
        snr: 2.0,
        hop_start: 7,
        hop_limit: 3,
        channel: 0,
        timestamp: new Date('2024-01-01T12:00:00Z')
      },
      {
        id: '4',
        mesh_packet_id: 'pkt4',
        from_node_id: 'gw1',
        to_node_id: 'node1',
        gateway_id: 'gw1',
        portnum: 1,
        portnum_name: 'TEXT_MESSAGE_APP',
        rssi: -70,
        snr: 10.0,
        hop_start: 3,
        hop_limit: 3,
        channel: 0,
        timestamp: new Date('2024-01-01T13:00:00Z')
      },
      {
        id: '5',
        mesh_packet_id: 'pkt5',
        from_node_id: 'node4',
        to_node_id: 'node5',
        gateway_id: 'gw3',
        portnum: 70,
        portnum_name: 'TRACEROUTE_APP',
        rssi: -85,
        snr: 4.0,
        hop_start: 7,
        hop_limit: 2,
        channel: 2,
        timestamp: new Date('2024-01-01T14:00:00Z')
      }
    ];
  });

  describe('Time Range Filter (Requirement 38.5)', () => {
    it('should filter packets by start time', () => {
      const filters: PacketFilters = {
        startTime: '2024-01-01T11:30:00Z'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toEqual(['3', '4', '5']);
    });

    it('should filter packets by end time', () => {
      const filters: PacketFilters = {
        endTime: '2024-01-01T11:30:00Z'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual(['1', '2']);
    });

    it('should filter packets by time range', () => {
      const filters: PacketFilters = {
        startTime: '2024-01-01T10:30:00Z',
        endTime: '2024-01-01T12:30:00Z'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual(['2', '3']);
    });
  });

  describe('Node Filters (Requirement 38.6)', () => {
    it('should filter packets by from node', () => {
      const filters: PacketFilters = {
        fromNodeId: 'node1'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should filter packets by to node', () => {
      const filters: PacketFilters = {
        toNodeId: 'node3'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should exclude packets from specific node', () => {
      const filters: PacketFilters = {
        excludeFromNodeId: 'node1'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(4);
      expect(filtered.map(p => p.id)).toEqual(['2', '3', '4', '5']);
    });

    it('should exclude packets to specific node', () => {
      const filters: PacketFilters = {
        excludeToNodeId: 'node1'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(4);
      expect(filtered.map(p => p.id)).toEqual(['1', '2', '3', '5']);
    });

    it('should combine from and exclude filters', () => {
      const filters: PacketFilters = {
        fromNodeId: 'node2',
        excludeToNodeId: 'node3'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('Gateway Filter (Requirement 38.7)', () => {
    it('should filter packets by gateway', () => {
      const filters: PacketFilters = {
        gatewayId: 'gw1'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toEqual(['1', '3', '4']);
    });
  });

  describe('Port Number Filter (Requirement 38.8)', () => {
    it('should filter packets by port number', () => {
      const filters: PacketFilters = {
        portnum: 1
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual(['1', '4']);
    });

    it('should filter TELEMETRY_APP packets', () => {
      const filters: PacketFilters = {
        portnum: 67
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('3');
    });
  });

  describe('Hop Count Filter (Requirement 38.9)', () => {
    it('should filter direct packets (0 hops)', () => {
      const filters: PacketFilters = {
        hopCount: 'direct'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual(['1', '4']);
    });

    it('should filter 1-hop packets', () => {
      const filters: PacketFilters = {
        hopCount: '1'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should filter 4+ hop packets', () => {
      const filters: PacketFilters = {
        hopCount: '4+'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual(['3', '5']);
    });

    it('should show all packets when hop count is "any"', () => {
      const filters: PacketFilters = {
        hopCount: 'any'
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(5);
    });
  });

  describe('RSSI/SNR Range Filters (Requirement 38.10)', () => {
    it('should filter packets by minimum RSSI', () => {
      const filters: PacketFilters = {
        rssiMin: -80
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toEqual(['1', '2', '4']);
    });

    it('should filter packets by maximum RSSI', () => {
      const filters: PacketFilters = {
        rssiMax: -80
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toEqual(['1', '3', '5']);
    });

    it('should filter packets by RSSI range', () => {
      const filters: PacketFilters = {
        rssiMin: -85,
        rssiMax: -75
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toEqual(['1', '2', '5']);
    });

    it('should filter packets by minimum SNR', () => {
      const filters: PacketFilters = {
        snrMin: 5.0
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toEqual(['1', '2', '4']);
    });

    it('should filter packets by maximum SNR', () => {
      const filters: PacketFilters = {
        snrMax: 5.0
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toEqual(['1', '3', '5']);
    });

    it('should filter packets by SNR range', () => {
      const filters: PacketFilters = {
        snrMin: 4.0,
        snrMax: 8.0
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toEqual(['1', '2', '5']);
    });
  });

  describe('Primary Channel Filter (Requirement 38.11)', () => {
    it('should filter packets by channel', () => {
      const filters: PacketFilters = {
        primaryChannel: 0
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(p => p.id)).toEqual(['1', '3', '4']);
    });

    it('should filter packets by channel 1', () => {
      const filters: PacketFilters = {
        primaryChannel: 1
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Exclude Gateway Self Messages (Requirement 38.12)', () => {
    it('should exclude messages where from_node_id equals gateway_id', () => {
      const filters: PacketFilters = {
        excludeGatewaySelfMessages: true
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(4);
      expect(filtered.map(p => p.id)).toEqual(['1', '2', '3', '5']);
    });

    it('should include all messages when filter is false', () => {
      const filters: PacketFilters = {
        excludeGatewaySelfMessages: false
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(5);
    });
  });

  describe('Filter Combination Logic', () => {
    it('should apply multiple filters with AND logic', () => {
      const filters: PacketFilters = {
        gatewayId: 'gw1',
        portnum: 1,
        rssiMin: -80
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual(['1', '4']);
    });

    it('should apply complex filter combination', () => {
      const filters: PacketFilters = {
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T13:00:00Z',
        excludeFromNodeId: 'gw1',
        hopCount: 'direct',
        rssiMin: -85
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should return empty array when no packets match all filters', () => {
      const filters: PacketFilters = {
        fromNodeId: 'node1',
        toNodeId: 'node5',
        portnum: 99
      };

      const filtered = applyFilters(samplePackets, filters);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('Filter State Persistence (URL Parameters)', () => {
    it('should serialize filters to URL parameters', () => {
      const filters: PacketFilters = {
        startTime: '2024-01-01T10:00:00Z',
        fromNodeId: 'node1',
        portnum: 1,
        hopCount: 'direct',
        rssiMin: -80,
        excludeGatewaySelfMessages: true
      };

      const params = filtersToUrlParams(filters);

      expect(params.get('startTime')).toBe('2024-01-01T10:00:00Z');
      expect(params.get('fromNodeId')).toBe('node1');
      expect(params.get('portnum')).toBe('1');
      expect(params.get('hopCount')).toBe('direct');
      expect(params.get('rssiMin')).toBe('-80');
      expect(params.get('excludeGatewaySelfMessages')).toBe('true');
    });

    it('should parse filters from URL parameters', () => {
      const params = new URLSearchParams();
      params.set('startTime', '2024-01-01T10:00:00Z');
      params.set('fromNodeId', 'node1');
      params.set('portnum', '1');
      params.set('hopCount', 'direct');
      params.set('rssiMin', '-80');
      params.set('excludeGatewaySelfMessages', 'true');

      const filters = urlParamsToFilters(params);

      expect(filters.startTime).toBe('2024-01-01T10:00:00Z');
      expect(filters.fromNodeId).toBe('node1');
      expect(filters.portnum).toBe(1);
      expect(filters.hopCount).toBe('direct');
      expect(filters.rssiMin).toBe(-80);
      expect(filters.excludeGatewaySelfMessages).toBe(true);
    });

    it('should handle empty URL parameters', () => {
      const params = new URLSearchParams();
      const filters = urlParamsToFilters(params);

      expect(Object.keys(filters)).toHaveLength(0);
    });

    it('should round-trip filters through URL parameters', () => {
      const originalFilters: PacketFilters = {
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T14:00:00Z',
        fromNodeId: 'node1',
        toNodeId: 'node2',
        gatewayId: 'gw1',
        portnum: 1,
        hopCount: '2',
        rssiMin: -90,
        rssiMax: -70,
        snrMin: 2.0,
        snrMax: 10.0,
        primaryChannel: 0,
        excludeGatewaySelfMessages: true
      };

      const params = filtersToUrlParams(originalFilters);
      const parsedFilters = urlParamsToFilters(params);

      expect(parsedFilters).toEqual(originalFilters);
    });

    it('should omit undefined filter values from URL', () => {
      const filters: PacketFilters = {
        fromNodeId: 'node1'
      };

      const params = filtersToUrlParams(filters);

      expect(params.has('fromNodeId')).toBe(true);
      expect(params.has('toNodeId')).toBe(false);
      expect(params.has('portnum')).toBe(false);
      expect(params.has('hopCount')).toBe(false);
    });
  });
});
