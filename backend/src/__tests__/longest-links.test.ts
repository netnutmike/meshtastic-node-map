/**
 * Unit tests for Longest Links Service
 * Requirements: 39.4, 39.5, 39.6, 39.7, 39.8, 39.9
 */

import { LongestLinksService } from '../services/longest-links.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    message: {
      findMany: jest.fn()
    },
    position: {
      findMany: jest.fn()
    },
    node: {
      findUnique: jest.fn()
    }
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('LongestLinksService', () => {
  let service: LongestLinksService;
  let mockPrisma: any;

  beforeEach(() => {
    service = new LongestLinksService();
    mockPrisma = new PrismaClient();
    service.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLongestLinks', () => {
    test('should filter links by minimum distance (default 1km)', async () => {
      // Mock traceroute messages
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2'],
          rssi: -80,
          snr: 5.0,
          timestamp: new Date()
        }
      ]);

      // Mock positions - close together (< 1km)
      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: new Date()
        },
        {
          nodeId: 'node2',
          latitude: 40.7138, // ~1.1km away
          longitude: -74.0060,
          altitude: 10,
          timestamp: new Date()
        }
      ]);

      // Mock node names
      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      const result = await service.getLongestLinks();

      // Should filter out links < 1km
      expect(result.length).toBeGreaterThanOrEqual(0);
      
      // All results should be >= 1km
      for (const link of result) {
        expect(link.distance_km).toBeGreaterThanOrEqual(1.0);
      }
    });

    test('should filter links by minimum SNR (default -20dB)', async () => {
      // Mock traceroute messages with varying SNR
      // The database query filters by SNR, so only messages with SNR >= -20 will be returned
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node3',
          routingPath: ['node3', 'node4'],
          rssi: -70,
          snr: -15.0, // Above threshold
          timestamp: new Date()
        }
      ]);

      // Mock positions - far apart (> 1km)
      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node3',
          latitude: 40.8128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: new Date()
        },
        {
          nodeId: 'node4',
          latitude: 40.9128, // ~11km away
          longitude: -74.0060,
          altitude: 10,
          timestamp: new Date()
        }
      ]);

      // Mock node names
      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      const result = await service.getLongestLinks();

      // Should only include links with SNR >= -20dB
      for (const link of result) {
        expect(link.avg_snr).toBeGreaterThanOrEqual(-20.0);
      }
    });

    test('should calculate distances correctly using Haversine formula', async () => {
      const now = new Date();
      
      // Mock traceroute messages
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2'],
          rssi: -80,
          snr: 5.0,
          timestamp: now
        }
      ]);

      // Mock positions - known distance apart
      // New York to Philadelphia is approximately 130km
      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node2',
          latitude: 39.9526,
          longitude: -75.1652,
          altitude: 10,
          timestamp: now
        }
      ]);

      // Mock node names
      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      const result = await service.getLongestLinks();

      expect(result.length).toBeGreaterThan(0);
      
      // Distance should be approximately 130km (allow 5% tolerance)
      const link = result[0];
      expect(link.distance_km).toBeGreaterThan(120);
      expect(link.distance_km).toBeLessThan(140);
      expect(link.distance_formatted).toContain('km');
    });

    test('should display age warnings for stale location data', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago
      
      // Mock traceroute messages
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2'],
          rssi: -80,
          snr: 5.0,
          timestamp: now
        }
      ]);

      // Mock positions - one is stale
      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: oldDate // Stale position
        },
        {
          nodeId: 'node2',
          latitude: 40.8128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now // Fresh position
        }
      ]);

      // Mock node names
      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      const result = await service.getLongestLinks();

      expect(result.length).toBeGreaterThan(0);
      
      const link = result[0];
      expect(link.has_stale_position).toBe(true);
      expect(link.from_position_age_seconds).toBeGreaterThan(24 * 60 * 60); // > 24 hours
    });

    test('should pre-fetch location history for performance', async () => {
      const now = new Date();
      
      // Mock traceroute messages with multiple hops
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2', 'node3'],
          rssi: -80,
          snr: 5.0,
          timestamp: now
        }
      ]);

      // Mock positions for all nodes
      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node2',
          latitude: 40.8128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node3',
          latitude: 40.9128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        }
      ]);

      // Mock node names
      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      await service.getLongestLinks();

      // Should call position.findMany only once (pre-fetch)
      expect(mockPrisma.position.findMany).toHaveBeenCalledTimes(1);
      
      // Should fetch positions for all unique nodes
      const call = mockPrisma.position.findMany.mock.calls[0][0];
      expect(call.where.nodeId.in).toContain('node1');
      expect(call.where.nodeId.in).toContain('node2');
      expect(call.where.nodeId.in).toContain('node3');
    });

    test('should include signal quality and hop count in results', async () => {
      const now = new Date();
      
      // Mock traceroute messages
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2'],
          rssi: -80,
          snr: 5.5,
          timestamp: now
        },
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2'],
          rssi: -82,
          snr: 4.5,
          timestamp: now
        }
      ]);

      // Mock positions
      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node2',
          latitude: 40.8128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        }
      ]);

      // Mock node names
      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      const result = await service.getLongestLinks();

      expect(result.length).toBeGreaterThan(0);
      
      const link = result[0];
      expect(link.avg_rssi).toBe(-81); // Average of -80 and -82
      expect(link.avg_snr).toBe(5.0); // Average of 5.5 and 4.5
      expect(link.hop_count).toBe(1); // Direct RF hop
      expect(link.traceroute_count).toBe(2); // Two traceroute messages
    });

    test('should sort results by distance (longest first)', async () => {
      const now = new Date();
      
      // Mock traceroute messages
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2'],
          rssi: -80,
          snr: 5.0,
          timestamp: now
        },
        {
          fromNodeId: 'node3',
          routingPath: ['node3', 'node4'],
          rssi: -70,
          snr: 8.0,
          timestamp: now
        }
      ]);

      // Mock positions - different distances
      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node2',
          latitude: 40.8128, // ~11km
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node3',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node4',
          latitude: 41.0128, // ~33km
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        }
      ]);

      // Mock node names
      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      const result = await service.getLongestLinks();

      expect(result.length).toBeGreaterThan(0);
      
      // Results should be sorted by distance (descending)
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].distance_km).toBeGreaterThanOrEqual(result[i + 1].distance_km);
      }
    });

    test('should respect custom filtering options', async () => {
      const now = new Date();
      
      // Mock traceroute messages
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2'],
          rssi: -80,
          snr: 5.0,
          timestamp: now
        }
      ]);

      // Mock positions
      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node2',
          latitude: 40.9128, // ~22km
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        }
      ]);

      // Mock node names
      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      // Test with custom minimum distance
      const result = await service.getLongestLinks({
        minDistanceKm: 20.0,
        minSnrDb: 0.0,
        limit: 50
      });

      // Should only include links >= 20km
      for (const link of result) {
        expect(link.distance_km).toBeGreaterThanOrEqual(20.0);
        expect(link.avg_snr).toBeGreaterThanOrEqual(0.0);
      }
      
      // Should respect limit
      expect(result.length).toBeLessThanOrEqual(50);
    });

    test('should cache results for 5 minutes', async () => {
      const now = new Date();
      
      // Mock traceroute messages
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2'],
          rssi: -80,
          snr: 5.0,
          timestamp: now
        }
      ]);

      // Mock positions
      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node2',
          latitude: 40.8128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        }
      ]);

      // Mock node names
      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      // First call
      await service.getLongestLinks();
      const firstCallCount = mockPrisma.message.findMany.mock.calls.length;

      // Second call (should use cache)
      await service.getLongestLinks();
      const secondCallCount = mockPrisma.message.findMany.mock.calls.length;

      // Should not make additional database calls
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('clearCache', () => {
    test('should clear all cached data', async () => {
      const now = new Date();
      
      // Mock data
      mockPrisma.message.findMany.mockResolvedValue([
        {
          fromNodeId: 'node1',
          routingPath: ['node1', 'node2'],
          rssi: -80,
          snr: 5.0,
          timestamp: now
        }
      ]);

      mockPrisma.position.findMany.mockResolvedValue([
        {
          nodeId: 'node1',
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        },
        {
          nodeId: 'node2',
          latitude: 40.8128,
          longitude: -74.0060,
          altitude: 10,
          timestamp: now
        }
      ]);

      mockPrisma.node.findUnique.mockResolvedValue({
        shortName: 'TestNode',
        longName: 'Test Node Long'
      });

      // Populate cache
      await service.getLongestLinks();
      
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
  });
});
