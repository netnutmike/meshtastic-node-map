/**
 * Unit tests for Line of Sight Analysis Service
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6
 */

import { lineOfSightService } from '../services/line-of-sight.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    node: {
      findUnique: jest.fn()
    },
    message: {
      findMany: jest.fn()
    }
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('LineOfSightService', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('analyzeLine', () => {
    test('should calculate distance between two nodes with positions', async () => {
      // Mock nodes with positions
      mockPrisma.node.findUnique
        .mockResolvedValueOnce({
          id: 'node1',
          hexId: '0x1234',
          shortName: 'Node1',
          longName: 'Node One',
          positions: [{
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 10,
            timestamp: new Date()
          }]
        })
        .mockResolvedValueOnce({
          id: 'node2',
          hexId: '0x5678',
          shortName: 'Node2',
          longName: 'Node Two',
          positions: [{
            latitude: 40.7589,
            longitude: -73.9851,
            altitude: 20,
            timestamp: new Date()
          }]
        });

      // Mock no historical connectivity
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await lineOfSightService.analyzeLine({
        fromNodeId: 'node1',
        toNodeId: 'node2'
      });

      expect(result.fromNode.id).toBe('node1');
      expect(result.toNode.id).toBe('node2');
      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.distanceFormatted).toBeTruthy();
      expect(result.bearing).toBeGreaterThanOrEqual(0);
      expect(result.bearing).toBeLessThan(360);
      expect(result.hasHistoricalConnectivity).toBe(false);
      expect(result.signalQuality).toBeNull();
    });

    test('should detect historical connectivity between nodes', async () => {
      // Mock nodes with positions
      mockPrisma.node.findUnique
        .mockResolvedValueOnce({
          id: 'node1',
          hexId: '0x1234',
          shortName: 'Node1',
          longName: 'Node One',
          positions: [{
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 10,
            timestamp: new Date()
          }]
        })
        .mockResolvedValueOnce({
          id: 'node2',
          hexId: '0x5678',
          shortName: 'Node2',
          longName: 'Node Two',
          positions: [{
            latitude: 40.7589,
            longitude: -73.9851,
            altitude: 20,
            timestamp: new Date()
          }]
        });

      // Mock historical connectivity
      mockPrisma.message.findMany.mockResolvedValue([
        {
          rssi: -75,
          snr: 8.5,
          timestamp: new Date('2024-01-01T12:00:00Z')
        },
        {
          rssi: -80,
          snr: 6.0,
          timestamp: new Date('2024-01-01T11:00:00Z')
        },
        {
          rssi: -70,
          snr: 10.0,
          timestamp: new Date('2024-01-01T10:00:00Z')
        }
      ]);

      const result = await lineOfSightService.analyzeLine({
        fromNodeId: 'node1',
        toNodeId: 'node2'
      });

      expect(result.hasHistoricalConnectivity).toBe(true);
      expect(result.signalQuality).not.toBeNull();
      expect(result.signalQuality?.avgRssi).toBeCloseTo(-75, 0);
      expect(result.signalQuality?.avgSnr).toBeCloseTo(8.2, 0);
      expect(result.signalQuality?.minRssi).toBe(-80);
      expect(result.signalQuality?.maxRssi).toBe(-70);
      expect(result.signalQuality?.minSnr).toBe(6.0);
      expect(result.signalQuality?.maxSnr).toBe(10.0);
      expect(result.signalQuality?.packetCount).toBe(3);
    });

    test('should handle nodes without positions', async () => {
      // Mock nodes without positions
      mockPrisma.node.findUnique
        .mockResolvedValueOnce({
          id: 'node1',
          hexId: '0x1234',
          shortName: 'Node1',
          longName: 'Node One',
          positions: []
        })
        .mockResolvedValueOnce({
          id: 'node2',
          hexId: '0x5678',
          shortName: 'Node2',
          longName: 'Node Two',
          positions: []
        });

      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await lineOfSightService.analyzeLine({
        fromNodeId: 'node1',
        toNodeId: 'node2'
      });

      expect(result.fromNode.position).toBeNull();
      expect(result.toNode.position).toBeNull();
      expect(result.distanceKm).toBe(0);
      expect(result.distanceFormatted).toBe('N/A');
      expect(result.bearing).toBe(0);
    });

    test('should throw error for non-existent from node', async () => {
      mockPrisma.node.findUnique.mockResolvedValueOnce(null);

      await expect(
        lineOfSightService.analyzeLine({
          fromNodeId: 'nonexistent',
          toNodeId: 'node2'
        })
      ).rejects.toThrow('Node not found: nonexistent');
    });

    test('should throw error for non-existent to node', async () => {
      mockPrisma.node.findUnique
        .mockResolvedValueOnce({
          id: 'node1',
          hexId: '0x1234',
          shortName: 'Node1',
          longName: 'Node One',
          positions: []
        })
        .mockResolvedValueOnce(null);

      await expect(
        lineOfSightService.analyzeLine({
          fromNodeId: 'node1',
          toNodeId: 'nonexistent'
        })
      ).rejects.toThrow('Node not found: nonexistent');
    });

    test('should calculate correct bearing for north direction', async () => {
      // Mock nodes: node1 south of node2 (bearing should be ~0 degrees)
      mockPrisma.node.findUnique
        .mockResolvedValueOnce({
          id: 'node1',
          hexId: '0x1234',
          shortName: 'Node1',
          longName: 'Node One',
          positions: [{
            latitude: 40.0,
            longitude: -74.0,
            altitude: 10,
            timestamp: new Date()
          }]
        })
        .mockResolvedValueOnce({
          id: 'node2',
          hexId: '0x5678',
          shortName: 'Node2',
          longName: 'Node Two',
          positions: [{
            latitude: 41.0,
            longitude: -74.0,
            altitude: 20,
            timestamp: new Date()
          }]
        });

      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await lineOfSightService.analyzeLine({
        fromNodeId: 'node1',
        toNodeId: 'node2'
      });

      // Bearing should be close to 0 (north)
      expect(result.bearing).toBeGreaterThanOrEqual(0);
      expect(result.bearing).toBeLessThan(10);
    });

    test('should calculate correct bearing for east direction', async () => {
      // Mock nodes: node1 west of node2 (bearing should be ~90 degrees)
      mockPrisma.node.findUnique
        .mockResolvedValueOnce({
          id: 'node1',
          hexId: '0x1234',
          shortName: 'Node1',
          longName: 'Node One',
          positions: [{
            latitude: 40.0,
            longitude: -75.0,
            altitude: 10,
            timestamp: new Date()
          }]
        })
        .mockResolvedValueOnce({
          id: 'node2',
          hexId: '0x5678',
          shortName: 'Node2',
          longName: 'Node Two',
          positions: [{
            latitude: 40.0,
            longitude: -74.0,
            altitude: 20,
            timestamp: new Date()
          }]
        });

      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await lineOfSightService.analyzeLine({
        fromNodeId: 'node1',
        toNodeId: 'node2'
      });

      // Bearing should be close to 90 (east)
      expect(result.bearing).toBeGreaterThan(80);
      expect(result.bearing).toBeLessThan(100);
    });

    test('should query historical connectivity in both directions', async () => {
      // Mock nodes
      mockPrisma.node.findUnique
        .mockResolvedValueOnce({
          id: 'node1',
          hexId: '0x1234',
          shortName: 'Node1',
          longName: 'Node One',
          positions: [{
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 10,
            timestamp: new Date()
          }]
        })
        .mockResolvedValueOnce({
          id: 'node2',
          hexId: '0x5678',
          shortName: 'Node2',
          longName: 'Node Two',
          positions: [{
            latitude: 40.7589,
            longitude: -73.9851,
            altitude: 20,
            timestamp: new Date()
          }]
        });

      mockPrisma.message.findMany.mockResolvedValue([]);

      await lineOfSightService.analyzeLine({
        fromNodeId: 'node1',
        toNodeId: 'node2'
      });

      // Verify that the query checks both directions (A->B and B->A)
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                fromNodeId: 'node1',
                toNodeId: 'node2'
              }),
              expect.objectContaining({
                fromNodeId: 'node2',
                toNodeId: 'node1'
              })
            ])
          })
        })
      );
    });

    test('should handle packets with null RSSI/SNR values', async () => {
      // Mock nodes
      mockPrisma.node.findUnique
        .mockResolvedValueOnce({
          id: 'node1',
          hexId: '0x1234',
          shortName: 'Node1',
          longName: 'Node One',
          positions: [{
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 10,
            timestamp: new Date()
          }]
        })
        .mockResolvedValueOnce({
          id: 'node2',
          hexId: '0x5678',
          shortName: 'Node2',
          longName: 'Node Two',
          positions: [{
            latitude: 40.7589,
            longitude: -73.9851,
            altitude: 20,
            timestamp: new Date()
          }]
        });

      // Mock packets with some null values
      mockPrisma.message.findMany.mockResolvedValue([
        {
          rssi: -75,
          snr: 8.5,
          timestamp: new Date()
        },
        {
          rssi: null,
          snr: null,
          timestamp: new Date()
        }
      ]);

      const result = await lineOfSightService.analyzeLine({
        fromNodeId: 'node1',
        toNodeId: 'node2'
      });

      // Should still calculate stats from valid packets
      expect(result.hasHistoricalConnectivity).toBe(true);
      expect(result.signalQuality?.packetCount).toBe(2);
      expect(result.signalQuality?.avgRssi).toBe(-75);
      expect(result.signalQuality?.avgSnr).toBe(8.5);
    });
  });
});
