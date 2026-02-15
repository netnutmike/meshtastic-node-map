/**
 * Unit tests for Gateway Comparison Service
 * Requirements: 41.2, 41.3, 41.4, 41.9, 41.14
 */

import { GatewayComparisonService } from '../services/gateway-comparison.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    $queryRawUnsafe: jest.fn()
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('GatewayComparisonService', () => {
  let service: GatewayComparisonService;
  let mockPrisma: any;

  beforeEach(() => {
    service = new GatewayComparisonService();
    mockPrisma = new PrismaClient();
    service.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('compareGateways', () => {
    test('should find common packets using INNER JOIN on (mesh_packet_id, from_node_id, hop_limit)', async () => {
      const now = new Date();
      
      // Mock common packets
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: new Date(now.getTime() + 5000), // 5 seconds later
          time_diff_seconds: 5,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      const result = await service.compareGateways('!abc123', '!def456');

      expect(result.common_packets.length).toBe(1);
      expect(result.common_packets[0].mesh_packet_id).toBe('packet1');
      expect(result.common_packets[0].from_node_id).toBe('node1');
      expect(result.common_packets[0].hop_limit).toBe(3);
      
      // Verify the SQL query was called
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      
      // Check that the query uses INNER JOIN
      expect(sqlQuery).toContain('INNER JOIN');
      expect(sqlQuery).toContain('m1.message_id = m2.message_id');
      expect(sqlQuery).toContain('m1.from_node_id = m2.from_node_id');
      expect(sqlQuery).toContain('m1.hop_limit = m2.hop_limit');
    });

    test('should filter packets within 30 seconds of each other', async () => {
      const now = new Date();
      
      // Mock packets with various time differences
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: new Date(now.getTime() + 15000), // 15 seconds
          time_diff_seconds: 15,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet2',
          from_node_id: 'node2',
          hop_limit: 3,
          gateway1_rssi: -75,
          gateway1_snr: 6.0,
          gateway1_timestamp: now,
          gateway2_rssi: -78,
          gateway2_snr: 5.5,
          gateway2_timestamp: new Date(now.getTime() + 29000), // 29 seconds
          time_diff_seconds: 29,
          rssi_diff: -3,
          snr_diff: -0.5
        }
      ]);

      const result = await service.compareGateways('!abc123', '!def456');

      // All packets should be within 30 seconds
      for (const packet of result.common_packets) {
        expect(Math.abs(packet.time_diff_seconds)).toBeLessThanOrEqual(30);
      }
      
      // Verify the SQL query includes the 30-second filter
      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlQuery).toContain('ABS(EXTRACT(EPOCH FROM (m2.timestamp - m1.timestamp))) <= 30');
    });

    test('should filter to same hop_limit to exclude retransmissions', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      await service.compareGateways('!abc123', '!def456');

      // Verify the SQL query filters by same hop_limit
      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlQuery).toContain('m1.hop_limit = m2.hop_limit');
    });

    test('should calculate signal quality differences (RSSI, SNR)', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet2',
          from_node_id: 'node2',
          hop_limit: 3,
          gateway1_rssi: -70,
          gateway1_snr: 8.0,
          gateway1_timestamp: now,
          gateway2_rssi: -75,
          gateway2_snr: 7.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      const result = await service.compareGateways('!abc123', '!def456');

      // Check that differences are calculated
      expect(result.common_packets[0].rssi_diff).toBe(-5);
      expect(result.common_packets[0].snr_diff).toBe(-1.0);
      expect(result.common_packets[1].rssi_diff).toBe(-5);
      expect(result.common_packets[1].snr_diff).toBe(-1.0);
    });

    test('should compute statistics (average, min, max, std dev)', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet2',
          from_node_id: 'node2',
          hop_limit: 3,
          gateway1_rssi: -70,
          gateway1_snr: 8.0,
          gateway1_timestamp: now,
          gateway2_rssi: -75,
          gateway2_snr: 7.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet3',
          from_node_id: 'node3',
          hop_limit: 3,
          gateway1_rssi: -90,
          gateway1_snr: 3.0,
          gateway1_timestamp: now,
          gateway2_rssi: -88,
          gateway2_snr: 3.5,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: 2,
          snr_diff: 0.5
        }
      ]);

      const result = await service.compareGateways('!abc123', '!def456');

      // Check statistics
      expect(result.statistics.packet_count).toBe(3);
      expect(result.statistics.unique_sources).toBe(3);
      
      // Average RSSI diff: (-5 + -5 + 2) / 3 = -2.67
      expect(result.statistics.rssi_diff_avg).toBeCloseTo(-2.67, 1);
      
      // Min/Max RSSI diff
      expect(result.statistics.rssi_diff_min).toBe(-5);
      expect(result.statistics.rssi_diff_max).toBe(2);
      
      // Average SNR diff: (-1.0 + -1.0 + 0.5) / 3 = -0.5
      expect(result.statistics.snr_diff_avg).toBeCloseTo(-0.5, 1);
      
      // Min/Max SNR diff
      expect(result.statistics.snr_diff_min).toBe(-1.0);
      expect(result.statistics.snr_diff_max).toBe(0.5);
      
      // Standard deviation should be calculated
      expect(result.statistics.rssi_diff_stddev).toBeGreaterThan(0);
      expect(result.statistics.snr_diff_stddev).toBeGreaterThan(0);
    });

    test('should cache gateway statistics for 5 minutes', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      // First call
      await service.compareGateways('!abc123', '!def456');
      const firstCallCount = mockPrisma.$queryRawUnsafe.mock.calls.length;

      // Second call (should use cache)
      await service.compareGateways('!abc123', '!def456');
      const secondCallCount = mockPrisma.$queryRawUnsafe.mock.calls.length;

      // Should not make additional database calls
      expect(secondCallCount).toBe(firstCallCount);
      
      // Verify cache has entries
      const stats = service.getCacheStats();
      expect(stats.entries).toBeGreaterThan(0);
    });

    test('should handle time range filters', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endTime = now;
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.compareGateways('!abc123', '!def456', {
        startTime,
        endTime
      });

      // Verify the SQL query includes time filters
      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlQuery).toContain('m1.timestamp >=');
      expect(sqlQuery).toContain('m1.timestamp <=');
    });

    test('should handle source node filter', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.compareGateways('!abc123', '!def456', {
        sourceNodeId: 'node1'
      });

      // Verify the SQL query includes source node filter
      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlQuery).toContain("m1.from_node_id = 'node1'");
    });

    test('should handle empty results', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.compareGateways('!abc123', '!def456');

      expect(result.common_packets.length).toBe(0);
      expect(result.statistics.packet_count).toBe(0);
      expect(result.statistics.avg_rssi).toBe(0);
      expect(result.statistics.avg_snr).toBe(0);
      expect(result.statistics.unique_sources).toBe(0);
    });

    test('should extract gateway IDs from topic format', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      // Test with gateway IDs that start with !
      await service.compareGateways('!abc123', '!def456');

      // Verify the SQL query uses the gateway IDs without the ! prefix
      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlQuery).toContain('abc123');
      expect(sqlQuery).toContain('def456');
    });

    test('should limit results to 1000 packets', async () => {
      const now = new Date();
      
      // Mock a large number of packets
      const manyPackets = Array.from({ length: 1500 }, (_, i) => ({
        mesh_packet_id: `packet${i}`,
        from_node_id: `node${i}`,
        hop_limit: 3,
        gateway1_rssi: -80,
        gateway1_snr: 5.0,
        gateway1_timestamp: now,
        gateway2_rssi: -85,
        gateway2_snr: 4.0,
        gateway2_timestamp: now,
        time_diff_seconds: 0,
        rssi_diff: -5,
        snr_diff: -1.0
      }));
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue(manyPackets.slice(0, 1000));

      await service.compareGateways('!abc123', '!def456');

      // Verify the SQL query includes LIMIT 1000
      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlQuery).toContain('LIMIT 1000');
    });

    test('should calculate unique sources correctly', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet2',
          from_node_id: 'node1', // Same source
          hop_limit: 3,
          gateway1_rssi: -70,
          gateway1_snr: 8.0,
          gateway1_timestamp: now,
          gateway2_rssi: -75,
          gateway2_snr: 7.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet3',
          from_node_id: 'node2', // Different source
          hop_limit: 3,
          gateway1_rssi: -90,
          gateway1_snr: 3.0,
          gateway1_timestamp: now,
          gateway2_rssi: -88,
          gateway2_snr: 3.5,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: 2,
          snr_diff: 0.5
        }
      ]);

      const result = await service.compareGateways('!abc123', '!def456');

      // Should count 2 unique sources (node1 and node2)
      expect(result.statistics.unique_sources).toBe(2);
    });
  });

  describe('Filtering Functionality (Requirements 41.11, 41.12)', () => {
    test('should apply time range filters correctly', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endTime = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.compareGateways('!abc123', '!def456', {
        startTime,
        endTime
      });

      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      
      // Verify both start and end time filters are in the query
      expect(sqlQuery).toContain('m1.timestamp >=');
      expect(sqlQuery).toContain('m1.timestamp <=');
      expect(sqlQuery).toContain(startTime.toISOString());
      expect(sqlQuery).toContain(endTime.toISOString());
    });

    test('should apply only start time filter when end time is not provided', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.compareGateways('!abc123', '!def456', {
        startTime
      });

      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      
      // Verify only start time filter is in the query
      expect(sqlQuery).toContain('m1.timestamp >=');
      expect(sqlQuery).toContain(startTime.toISOString());
    });

    test('should apply only end time filter when start time is not provided', async () => {
      const now = new Date();
      const endTime = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.compareGateways('!abc123', '!def456', {
        endTime
      });

      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      
      // Verify only end time filter is in the query
      expect(sqlQuery).toContain('m1.timestamp <=');
      expect(sqlQuery).toContain(endTime.toISOString());
    });

    test('should filter by specific source node', async () => {
      const now = new Date();
      const sourceNodeId = '!abc123';
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: sourceNodeId,
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      const result = await service.compareGateways('!gw1', '!gw2', {
        sourceNodeId
      });

      // Verify the SQL query includes source node filter
      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlQuery).toContain(`m1.from_node_id = '${sourceNodeId}'`);
      
      // Verify all returned packets are from the specified source
      expect(result.common_packets.length).toBe(1);
      expect(result.common_packets[0].from_node_id).toBe(sourceNodeId);
    });

    test('should combine time range and source node filters', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const endTime = now;
      const sourceNodeId = '!node123';
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.compareGateways('!gw1', '!gw2', {
        startTime,
        endTime,
        sourceNodeId
      });

      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      
      // Verify all filters are in the query
      expect(sqlQuery).toContain('m1.timestamp >=');
      expect(sqlQuery).toContain('m1.timestamp <=');
      expect(sqlQuery).toContain(`m1.from_node_id = '${sourceNodeId}'`);
    });

    test('should handle filtering with no matching packets', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const endTime = now;
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.compareGateways('!gw1', '!gw2', {
        startTime,
        endTime,
        sourceNodeId: 'nonexistent'
      });

      expect(result.common_packets.length).toBe(0);
      expect(result.statistics.packet_count).toBe(0);
    });
  });

  describe('Gateway Statistics Display (Requirement 41.13)', () => {
    test('should display packet count per gateway', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet2',
          from_node_id: 'node2',
          hop_limit: 3,
          gateway1_rssi: -70,
          gateway1_snr: 8.0,
          gateway1_timestamp: now,
          gateway2_rssi: -75,
          gateway2_snr: 7.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      const result = await service.compareGateways('!gw1', '!gw2');

      expect(result.statistics.packet_count).toBe(2);
    });

    test('should calculate average signal quality per gateway', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet2',
          from_node_id: 'node2',
          hop_limit: 3,
          gateway1_rssi: -70,
          gateway1_snr: 9.0,
          gateway1_timestamp: now,
          gateway2_rssi: -75,
          gateway2_snr: 8.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      const result = await service.compareGateways('!gw1', '!gw2');

      // Average RSSI for gateway1: (-80 + -70) / 2 = -75
      expect(result.statistics.avg_rssi).toBe(-75);
      
      // Average SNR for gateway1: (5.0 + 9.0) / 2 = 7.0
      expect(result.statistics.avg_snr).toBe(7.0);
    });

    test('should count unique source nodes', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet2',
          from_node_id: 'node1', // Duplicate source
          hop_limit: 3,
          gateway1_rssi: -70,
          gateway1_snr: 8.0,
          gateway1_timestamp: now,
          gateway2_rssi: -75,
          gateway2_snr: 7.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        },
        {
          mesh_packet_id: 'packet3',
          from_node_id: 'node2', // Unique source
          hop_limit: 3,
          gateway1_rssi: -90,
          gateway1_snr: 3.0,
          gateway1_timestamp: now,
          gateway2_rssi: -88,
          gateway2_snr: 3.5,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: 2,
          snr_diff: 0.5
        },
        {
          mesh_packet_id: 'packet4',
          from_node_id: 'node3', // Unique source
          hop_limit: 3,
          gateway1_rssi: -85,
          gateway1_snr: 6.0,
          gateway1_timestamp: now,
          gateway2_rssi: -82,
          gateway2_snr: 6.5,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: 3,
          snr_diff: 0.5
        }
      ]);

      const result = await service.compareGateways('!gw1', '!gw2');

      // Should count 3 unique sources (node1, node2, node3)
      expect(result.statistics.unique_sources).toBe(3);
    });

    test('should provide complete statistics for dashboard display', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      const result = await service.compareGateways('!gw1', '!gw2');

      // Verify all required statistics are present
      expect(result.statistics).toHaveProperty('packet_count');
      expect(result.statistics).toHaveProperty('avg_rssi');
      expect(result.statistics).toHaveProperty('avg_snr');
      expect(result.statistics).toHaveProperty('unique_sources');
      expect(result.statistics).toHaveProperty('rssi_diff_avg');
      expect(result.statistics).toHaveProperty('rssi_diff_min');
      expect(result.statistics).toHaveProperty('rssi_diff_max');
      expect(result.statistics).toHaveProperty('rssi_diff_stddev');
      expect(result.statistics).toHaveProperty('snr_diff_avg');
      expect(result.statistics).toHaveProperty('snr_diff_min');
      expect(result.statistics).toHaveProperty('snr_diff_max');
      expect(result.statistics).toHaveProperty('snr_diff_stddev');
    });
  });

  describe('Performance with Large Datasets (Requirement 41.15)', () => {
    test('should handle 1000 packets efficiently', async () => {
      const now = new Date();
      
      // Generate 1000 mock packets
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        mesh_packet_id: `packet${i}`,
        from_node_id: `node${i % 100}`, // 100 unique sources
        hop_limit: 3,
        gateway1_rssi: -80 + (i % 40) - 20, // Range: -100 to -60
        gateway1_snr: 5.0 + (i % 10) - 5, // Range: 0 to 10
        gateway1_timestamp: new Date(now.getTime() + i * 1000),
        gateway2_rssi: -85 + (i % 40) - 20,
        gateway2_snr: 4.0 + (i % 10) - 5,
        gateway2_timestamp: new Date(now.getTime() + i * 1000 + 500),
        time_diff_seconds: 0.5,
        rssi_diff: -5,
        snr_diff: -1.0
      }));
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue(largeDataset);

      const startTime = Date.now();
      const result = await service.compareGateways('!gw1', '!gw2');
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify all packets are processed
      expect(result.common_packets.length).toBe(1000);
      
      // Verify statistics are calculated correctly
      expect(result.statistics.packet_count).toBe(1000);
      expect(result.statistics.unique_sources).toBe(100);
      
      // Performance check: should complete in reasonable time (< 1 second)
      expect(executionTime).toBeLessThan(1000);
    });

    test('should cache large datasets to improve subsequent queries', async () => {
      const now = new Date();
      
      // Generate 500 mock packets
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        mesh_packet_id: `packet${i}`,
        from_node_id: `node${i % 50}`,
        hop_limit: 3,
        gateway1_rssi: -80,
        gateway1_snr: 5.0,
        gateway1_timestamp: now,
        gateway2_rssi: -85,
        gateway2_snr: 4.0,
        gateway2_timestamp: now,
        time_diff_seconds: 0,
        rssi_diff: -5,
        snr_diff: -1.0
      }));
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue(largeDataset);

      // First call - should query database
      const startTime1 = Date.now();
      await service.compareGateways('!gw1', '!gw2');
      const endTime1 = Date.now();
      const firstCallTime = endTime1 - startTime1;

      // Second call - should use cache
      const startTime2 = Date.now();
      await service.compareGateways('!gw1', '!gw2');
      const endTime2 = Date.now();
      const secondCallTime = endTime2 - startTime2;

      // Second call should be significantly faster (cached)
      expect(secondCallTime).toBeLessThan(firstCallTime);
      
      // Verify only one database call was made
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    });

    test('should handle statistics calculation for large datasets', async () => {
      const now = new Date();
      
      // Generate 1000 packets with varying signal quality
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        mesh_packet_id: `packet${i}`,
        from_node_id: `node${i % 100}`,
        hop_limit: 3,
        gateway1_rssi: -80 + Math.sin(i) * 20, // Varying RSSI
        gateway1_snr: 5.0 + Math.cos(i) * 5, // Varying SNR
        gateway1_timestamp: now,
        gateway2_rssi: -85 + Math.sin(i) * 20,
        gateway2_snr: 4.0 + Math.cos(i) * 5,
        gateway2_timestamp: now,
        time_diff_seconds: 0,
        rssi_diff: -5,
        snr_diff: -1.0
      }));
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue(largeDataset);

      const result = await service.compareGateways('!gw1', '!gw2');

      // Verify statistics are calculated
      expect(result.statistics.packet_count).toBe(1000);
      expect(result.statistics.rssi_diff_avg).toBeDefined();
      expect(result.statistics.rssi_diff_stddev).toBeDefined();
      expect(result.statistics.snr_diff_avg).toBeDefined();
      expect(result.statistics.snr_diff_stddev).toBeDefined();
      
      // Verify min/max are within expected ranges
      expect(result.statistics.rssi_diff_min).toBeLessThanOrEqual(result.statistics.rssi_diff_max);
      expect(result.statistics.snr_diff_min).toBeLessThanOrEqual(result.statistics.snr_diff_max);
    });

    test('should respect 1000 packet limit for performance', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.compareGateways('!gw1', '!gw2');

      const sqlQuery = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      
      // Verify query includes LIMIT 1000
      expect(sqlQuery).toContain('LIMIT 1000');
    });

    test('should handle memory efficiently with large result sets', async () => {
      const now = new Date();
      
      // Generate 1000 packets
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        mesh_packet_id: `packet${i}`,
        from_node_id: `node${i % 100}`,
        hop_limit: 3,
        gateway1_rssi: -80,
        gateway1_snr: 5.0,
        gateway1_timestamp: now,
        gateway2_rssi: -85,
        gateway2_snr: 4.0,
        gateway2_timestamp: now,
        time_diff_seconds: 0,
        rssi_diff: -5,
        snr_diff: -1.0
      }));
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue(largeDataset);

      // Check memory usage before
      const memBefore = process.memoryUsage().heapUsed;
      
      const result = await service.compareGateways('!gw1', '!gw2');
      
      // Check memory usage after
      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = (memAfter - memBefore) / 1024 / 1024; // Convert to MB

      // Verify result is complete
      expect(result.common_packets.length).toBe(1000);
      
      // Memory increase should be reasonable (< 50MB for 1000 packets)
      expect(memIncrease).toBeLessThan(50);
    });
  });

  describe('clearCache', () => {
    test('should clear all cached data', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      // Populate cache
      await service.compareGateways('!abc123', '!def456');
      
      // Clear cache
      service.clearCache();
      
      // Get cache stats
      const stats = service.getCacheStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    test('should return cache statistics', async () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('oldestEntry');
      expect(typeof stats.entries).toBe('number');
    });

    test('should track oldest entry timestamp', async () => {
      const now = new Date();
      
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          mesh_packet_id: 'packet1',
          from_node_id: 'node1',
          hop_limit: 3,
          gateway1_rssi: -80,
          gateway1_snr: 5.0,
          gateway1_timestamp: now,
          gateway2_rssi: -85,
          gateway2_snr: 4.0,
          gateway2_timestamp: now,
          time_diff_seconds: 0,
          rssi_diff: -5,
          snr_diff: -1.0
        }
      ]);

      // Populate cache
      await service.compareGateways('!abc123', '!def456');
      
      const stats = service.getCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.oldestEntry).not.toBeNull();
      expect(typeof stats.oldestEntry).toBe('number');
    });
  });
});
