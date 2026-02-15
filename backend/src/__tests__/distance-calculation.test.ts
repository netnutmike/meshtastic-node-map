/**
 * Unit tests for Distance Calculation Service
 * Tests distance calculation accuracy, location history caching, and distance formatting
 * Requirements: 39.1, 39.2, 39.3, 39.13, 39.14
 */

import { DistanceCalculationService, Position } from '../services/distance-calculation.service';

describe('Distance Calculation Service Unit Tests', () => {
  let distanceService: DistanceCalculationService;

  beforeEach(() => {
    distanceService = new DistanceCalculationService();
  });

  describe('Distance Calculation Accuracy', () => {
    test('should calculate distance between New York and Los Angeles', () => {
      // New York: 40.7128° N, 74.0060° W
      // Los Angeles: 34.0522° N, 118.2437° W
      const distance = distanceService.calculateDistance(
        40.7128,
        -74.0060,
        34.0522,
        -118.2437
      );

      // Expected distance is approximately 3944 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    test('should calculate distance between London and Paris', () => {
      // London: 51.5074° N, 0.1278° W
      // Paris: 48.8566° N, 2.3522° E
      const distance = distanceService.calculateDistance(
        51.5074,
        -0.1278,
        48.8566,
        2.3522
      );

      // Expected distance is approximately 344 km
      expect(distance).toBeGreaterThan(340);
      expect(distance).toBeLessThan(350);
    });

    test('should calculate distance between Sydney and Melbourne', () => {
      // Sydney: 33.8688° S, 151.2093° E
      // Melbourne: 37.8136° S, 144.9631° E
      const distance = distanceService.calculateDistance(
        -33.8688,
        151.2093,
        -37.8136,
        144.9631
      );

      // Expected distance is approximately 714 km
      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(730);
    });

    test('should return zero for same coordinates', () => {
      const distance = distanceService.calculateDistance(
        40.7128,
        -74.0060,
        40.7128,
        -74.0060
      );

      expect(distance).toBeCloseTo(0, 10);
    });

    test('should calculate short distances accurately', () => {
      // Two points 1 km apart (approximately)
      const lat1 = 40.7128;
      const lon1 = -74.0060;
      const lat2 = 40.7218; // ~1 km north
      const lon2 = -74.0060;

      const distance = distanceService.calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 1 km
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });

    test('should handle equator crossing', () => {
      // Point in northern hemisphere
      const lat1 = 10;
      const lon1 = 0;
      // Point in southern hemisphere
      const lat2 = -10;
      const lon2 = 0;

      const distance = distanceService.calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 2222 km (20 degrees at equator)
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });

    test('should handle date line crossing', () => {
      // Point west of date line
      const lat1 = 0;
      const lon1 = 179;
      // Point east of date line
      const lat2 = 0;
      const lon2 = -179;

      const distance = distanceService.calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 222 km (2 degrees at equator)
      expect(distance).toBeGreaterThan(200);
      expect(distance).toBeLessThan(250);
    });
  });

  describe('Distance Formatting', () => {
    test('should format very short distances in meters', () => {
      const formatted = distanceService.formatDistance(0.005);
      expect(formatted).toBe('5 m');
    });

    test('should format short distances in meters', () => {
      const formatted = distanceService.formatDistance(0.5);
      expect(formatted).toBe('500 m');
    });

    test('should format distances under 10 km with 2 decimals', () => {
      const formatted = distanceService.formatDistance(5.678);
      expect(formatted).toBe('5.68 km');
    });

    test('should format distances under 100 km with 1 decimal', () => {
      const formatted = distanceService.formatDistance(45.678);
      expect(formatted).toBe('45.7 km');
    });

    test('should format large distances without decimals', () => {
      const formatted = distanceService.formatDistance(345.678);
      expect(formatted).toBe('346 km');
    });

    test('should format exactly 1 km correctly', () => {
      const formatted = distanceService.formatDistance(1.0);
      expect(formatted).toBe('1.00 km');
    });

    test('should format exactly 10 km correctly', () => {
      const formatted = distanceService.formatDistance(10.0);
      expect(formatted).toBe('10.0 km');
    });

    test('should format exactly 100 km correctly', () => {
      const formatted = distanceService.formatDistance(100.0);
      expect(formatted).toBe('100 km');
    });
  });

  describe('Position-based Distance Calculation', () => {
    test('should calculate distance between two positions', () => {
      const pos1: Position = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      const pos2: Position = {
        latitude: 34.0522,
        longitude: -118.2437,
      };

      const result = distanceService.calculateDistanceBetweenPositions(pos1, pos2);

      expect(result.distanceKm).toBeGreaterThan(3900);
      expect(result.distanceKm).toBeLessThan(4000);
      expect(result.distanceFormatted).toContain('km');
    });

    test('should include formatted string in result', () => {
      const pos1: Position = {
        latitude: 51.5074,
        longitude: -0.1278,
      };

      const pos2: Position = {
        latitude: 48.8566,
        longitude: 2.3522,
      };

      const result = distanceService.calculateDistanceBetweenPositions(pos1, pos2);

      expect(result.distanceFormatted).toMatch(/^\d+(\.\d+)? km$/);
    });
  });

  describe('Location History Caching', () => {
    test('should cache location history for a node', () => {
      const nodeId = '!12345678';
      const positions: Position[] = [
        { latitude: 40.7128, longitude: -74.0060, timestamp: new Date('2024-01-01T12:00:00Z') },
        { latitude: 40.7228, longitude: -74.0160, timestamp: new Date('2024-01-01T13:00:00Z') },
      ];

      distanceService.cacheLocationHistory(nodeId, positions);

      const cached = distanceService.getCachedLocationHistory(nodeId);
      expect(cached).toEqual(positions);
    });

    test('should return undefined for uncached node', () => {
      const cached = distanceService.getCachedLocationHistory('!UNCACHED');
      expect(cached).toBeUndefined();
    });

    test('should overwrite existing cache entry', () => {
      const nodeId = '!12345678';
      const positions1: Position[] = [
        { latitude: 40.7128, longitude: -74.0060 },
      ];
      const positions2: Position[] = [
        { latitude: 51.5074, longitude: -0.1278 },
      ];

      distanceService.cacheLocationHistory(nodeId, positions1);
      distanceService.cacheLocationHistory(nodeId, positions2);

      const cached = distanceService.getCachedLocationHistory(nodeId);
      expect(cached).toEqual(positions2);
    });

    test('should clear all cache entries', () => {
      distanceService.cacheLocationHistory('!NODE1', [{ latitude: 0, longitude: 0 }]);
      distanceService.cacheLocationHistory('!NODE2', [{ latitude: 1, longitude: 1 }]);

      distanceService.clearCache();

      const stats = distanceService.getCacheStats();
      expect(stats.entries).toBe(0);
      expect(stats.nodes).toEqual([]);
    });

    test('should return cache statistics', () => {
      distanceService.clearCache();
      distanceService.cacheLocationHistory('!NODE1', [{ latitude: 0, longitude: 0 }]);
      distanceService.cacheLocationHistory('!NODE2', [{ latitude: 1, longitude: 1 }]);

      const stats = distanceService.getCacheStats();
      expect(stats.entries).toBe(2);
      expect(stats.nodes).toContain('!NODE1');
      expect(stats.nodes).toContain('!NODE2');
    });
  });

  describe('Closest Position Finding', () => {
    test('should find position closest to target time', () => {
      const positions: Position[] = [
        { latitude: 40.7128, longitude: -74.0060, timestamp: new Date('2024-01-01T12:00:00Z') },
        { latitude: 40.7228, longitude: -74.0160, timestamp: new Date('2024-01-01T13:00:00Z') },
        { latitude: 40.7328, longitude: -74.0260, timestamp: new Date('2024-01-01T14:00:00Z') },
      ];

      const targetTime = new Date('2024-01-01T13:15:00Z');
      const closest = distanceService.findClosestPosition(positions, targetTime);

      expect(closest).toBeDefined();
      expect(closest?.timestamp).toEqual(new Date('2024-01-01T13:00:00Z'));
    });

    test('should return first position if all have same timestamp', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z');
      const positions: Position[] = [
        { latitude: 40.7128, longitude: -74.0060, timestamp },
        { latitude: 40.7228, longitude: -74.0160, timestamp },
      ];

      const closest = distanceService.findClosestPosition(positions, timestamp);

      expect(closest).toBe(positions[0]);
    });

    test('should return undefined for empty array', () => {
      const closest = distanceService.findClosestPosition([], new Date());
      expect(closest).toBeUndefined();
    });

    test('should handle positions without timestamps', () => {
      const positions: Position[] = [
        { latitude: 40.7128, longitude: -74.0060 },
        { latitude: 40.7228, longitude: -74.0160 },
      ];

      const closest = distanceService.findClosestPosition(positions, new Date());

      // Should return first position since all have timestamp 0
      expect(closest).toBe(positions[0]);
    });
  });

  describe('Path Distance Calculation', () => {
    test('should calculate total distance for multi-hop path', () => {
      const positions: Position[] = [
        { latitude: 40.7128, longitude: -74.0060 }, // New York
        { latitude: 41.8781, longitude: -87.6298 }, // Chicago
        { latitude: 34.0522, longitude: -118.2437 }, // Los Angeles
      ];

      const totalDistance = distanceService.calculatePathDistance(positions);

      // NY to Chicago: ~1145 km
      // Chicago to LA: ~2800 km
      // Total: ~3945 km
      expect(totalDistance).toBeGreaterThan(3900);
      expect(totalDistance).toBeLessThan(4000);
    });

    test('should return zero for single position', () => {
      const positions: Position[] = [
        { latitude: 40.7128, longitude: -74.0060 },
      ];

      const totalDistance = distanceService.calculatePathDistance(positions);
      expect(totalDistance).toBe(0);
    });

    test('should return zero for empty array', () => {
      const totalDistance = distanceService.calculatePathDistance([]);
      expect(totalDistance).toBe(0);
    });

    test('should calculate distance for two-point path', () => {
      const positions: Position[] = [
        { latitude: 51.5074, longitude: -0.1278 }, // London
        { latitude: 48.8566, longitude: 2.3522 }, // Paris
      ];

      const totalDistance = distanceService.calculatePathDistance(positions);

      // Should be approximately 344 km
      expect(totalDistance).toBeGreaterThan(340);
      expect(totalDistance).toBeLessThan(350);
    });
  });

  describe('Position Staleness Check', () => {
    test('should identify fresh position as not stale', () => {
      const position: Position = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(Date.now() - 5000), // 5 seconds ago
      };

      const isStale = distanceService.isPositionStale(position, 60); // 60 second threshold
      expect(isStale).toBe(false);
    });

    test('should identify old position as stale', () => {
      const position: Position = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(Date.now() - 120000), // 2 minutes ago
      };

      const isStale = distanceService.isPositionStale(position, 60); // 60 second threshold
      expect(isStale).toBe(true);
    });

    test('should treat position without timestamp as stale', () => {
      const position: Position = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      const isStale = distanceService.isPositionStale(position, 60);
      expect(isStale).toBe(true);
    });

    test('should handle position exactly at threshold', () => {
      const position: Position = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(Date.now() - 60000), // Exactly 60 seconds ago
      };

      const isStale = distanceService.isPositionStale(position, 60);
      // Should be false since age equals threshold (not greater than)
      expect(isStale).toBe(false);
    });

    test('should handle different threshold values', () => {
      const position: Position = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      };

      expect(distanceService.isPositionStale(position, 1800)).toBe(true); // 30 min threshold
      expect(distanceService.isPositionStale(position, 7200)).toBe(false); // 2 hour threshold
    });
  });

  describe('Edge Cases', () => {
    test('should handle North Pole', () => {
      const distance = distanceService.calculateDistance(90, 0, 89, 0);
      expect(distance).toBeGreaterThan(0);
      expect(isFinite(distance)).toBe(true);
    });

    test('should handle South Pole', () => {
      const distance = distanceService.calculateDistance(-90, 0, -89, 0);
      expect(distance).toBeGreaterThan(0);
      expect(isFinite(distance)).toBe(true);
    });

    test('should handle longitude wrap-around', () => {
      const distance = distanceService.calculateDistance(0, -180, 0, 180);
      expect(distance).toBeCloseTo(0, 1); // Same point
    });

    test('should handle very small distances', () => {
      const distance = distanceService.calculateDistance(
        40.7128,
        -74.0060,
        40.7129,
        -74.0061
      );
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.2); // Less than 200 meters
    });
  });
});
