/**
 * Property-Based Tests for Distance Calculation
 * **Feature: meshtastic-node-mapper, Property: Haversine formula correctness**
 * **Validates: Requirements 39.1, 39.2**
 * 
 * Property: For any two valid geographic coordinates, the Haversine formula
 * should calculate a distance that satisfies mathematical properties of distance metrics.
 */

import * as fc from 'fast-check';
import { DistanceCalculationService, Position } from '../services/distance-calculation.service';

describe('Distance Calculation Property Tests', () => {
  const distanceService = new DistanceCalculationService();

  describe('Property: Haversine formula correctness', () => {
    test('should always return non-negative distances', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }), // lat1
          fc.float({ min: -180, max: 180, noNaN: true }), // lon1
          fc.float({ min: -90, max: 90, noNaN: true }), // lat2
          fc.float({ min: -180, max: 180, noNaN: true }), // lon2
          (lat1, lon1, lat2, lon2) => {
            const distance = distanceService.calculateDistance(lat1, lon1, lat2, lon2);
            
            // Property: Distance is always non-negative
            expect(distance).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should satisfy symmetry property (d(A,B) = d(B,A))', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }), // lat1
          fc.float({ min: -180, max: 180, noNaN: true }), // lon1
          fc.float({ min: -90, max: 90, noNaN: true }), // lat2
          fc.float({ min: -180, max: 180, noNaN: true }), // lon2
          (lat1, lon1, lat2, lon2) => {
            const distanceAB = distanceService.calculateDistance(lat1, lon1, lat2, lon2);
            const distanceBA = distanceService.calculateDistance(lat2, lon2, lat1, lon1);
            
            // Property: Distance is symmetric
            expect(distanceAB).toBeCloseTo(distanceBA, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return zero for identical coordinates', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }), // lat
          fc.float({ min: -180, max: 180, noNaN: true }), // lon
          (lat, lon) => {
            const distance = distanceService.calculateDistance(lat, lon, lat, lon);
            
            // Property: Distance from a point to itself is zero
            expect(distance).toBeCloseTo(0, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should satisfy triangle inequality (d(A,C) <= d(A,B) + d(B,C))', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }), // lat1
          fc.float({ min: -180, max: 180, noNaN: true }), // lon1
          fc.float({ min: -90, max: 90, noNaN: true }), // lat2
          fc.float({ min: -180, max: 180, noNaN: true }), // lon2
          fc.float({ min: -90, max: 90, noNaN: true }), // lat3
          fc.float({ min: -180, max: 180, noNaN: true }), // lon3
          (lat1, lon1, lat2, lon2, lat3, lon3) => {
            const distanceAB = distanceService.calculateDistance(lat1, lon1, lat2, lon2);
            const distanceBC = distanceService.calculateDistance(lat2, lon2, lat3, lon3);
            const distanceAC = distanceService.calculateDistance(lat1, lon1, lat3, lon3);
            
            // Property: Triangle inequality holds
            // Allow small epsilon for floating point errors
            expect(distanceAC).toBeLessThanOrEqual(distanceAB + distanceBC + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should calculate reasonable distances for Earth', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }), // lat1
          fc.float({ min: -180, max: 180, noNaN: true }), // lon1
          fc.float({ min: -90, max: 90, noNaN: true }), // lat2
          fc.float({ min: -180, max: 180, noNaN: true }), // lon2
          (lat1, lon1, lat2, lon2) => {
            const distance = distanceService.calculateDistance(lat1, lon1, lat2, lon2);
            
            // Property: Distance on Earth should not exceed half the circumference
            // Earth's circumference is approximately 40,075 km
            const maxDistance = 20037.5; // Half of Earth's circumference
            expect(distance).toBeLessThanOrEqual(maxDistance);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should use Earth radius of 6371.0 km', () => {
      // Test with known coordinates: North Pole to South Pole
      // This should be approximately half the circumference
      const northPole = { lat: 90, lon: 0 };
      const southPole = { lat: -90, lon: 0 };
      
      const distance = distanceService.calculateDistance(
        northPole.lat,
        northPole.lon,
        southPole.lat,
        southPole.lon
      );
      
      // Expected distance: π * R = π * 6371.0 ≈ 20015.09 km
      const expectedDistance = Math.PI * 6371.0;
      
      // Property: Distance should match expected value within 1%
      expect(distance).toBeCloseTo(expectedDistance, 0);
    });

    test('should handle edge cases at poles and equator', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(-90, 0, 90), // Special latitudes
          fc.float({ min: -180, max: 180 }), // lon1
          fc.constantFrom(-90, 0, 90), // Special latitudes
          fc.float({ min: -180, max: 180 }), // lon2
          (lat1, lon1, lat2, lon2) => {
            const distance = distanceService.calculateDistance(lat1, lon1, lat2, lon2);
            
            // Property: Distance should be finite and non-negative
            expect(isFinite(distance)).toBe(true);
            expect(distance).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle International Date Line crossing', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90 }), // lat
          fc.constantFrom(-179, 179), // Longitudes near date line
          (lat, lon1) => {
            const lon2 = -lon1; // Opposite side of date line
            
            const distance = distanceService.calculateDistance(lat, lon1, lat, lon2);
            
            // Property: Distance should be finite and reasonable
            expect(isFinite(distance)).toBe(true);
            expect(distance).toBeGreaterThanOrEqual(0);
            expect(distance).toBeLessThanOrEqual(20037.5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Distance formatting', () => {
    test('should format distances with appropriate precision', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.001), max: 20000, noNaN: true }), // Distance in km (exclude 0)
          (distanceKm) => {
            const formatted = distanceService.formatDistance(distanceKm);
            
            // Property: Formatted string should contain a number and unit
            expect(formatted).toMatch(/^[\d.]+ (m|km)$/);
            
            // Property: Should use meters for distances < 1 km
            if (distanceKm < 1) {
              expect(formatted).toContain('m');
              expect(formatted).not.toContain('km');
            } else {
              expect(formatted).toContain('km');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain precision consistency', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.001), max: 20000, noNaN: true }), // Distance in km (exclude 0)
          (distanceKm) => {
            const formatted = distanceService.formatDistance(distanceKm);
            const numericPart = parseFloat(formatted.split(' ')[0]);
            
            // Property: Numeric part should be positive
            expect(numericPart).toBeGreaterThan(0);
            
            // Property: Formatted value should be finite
            expect(isFinite(numericPart)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Path distance calculation', () => {
    test('should calculate path distance as sum of segments', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              latitude: fc.float({ min: -90, max: 90, noNaN: true }),
              longitude: fc.float({ min: -180, max: 180, noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (positions) => {
            const pathDistance = distanceService.calculatePathDistance(positions);
            
            // Property: Path distance should be non-negative
            expect(pathDistance).toBeGreaterThanOrEqual(0);
            
            // Property: Path distance should be finite
            expect(isFinite(pathDistance)).toBe(true);
            
            // Calculate sum of individual segments
            let sumOfSegments = 0;
            for (let i = 0; i < positions.length - 1; i++) {
              sumOfSegments += distanceService.calculateDistance(
                positions[i].latitude,
                positions[i].longitude,
                positions[i + 1].latitude,
                positions[i + 1].longitude
              );
            }
            
            // Property: Path distance should equal sum of segments
            expect(pathDistance).toBeCloseTo(sumOfSegments, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return zero for single position', () => {
      fc.assert(
        fc.property(
          fc.record({
            latitude: fc.float({ min: -90, max: 90 }),
            longitude: fc.float({ min: -180, max: 180 }),
          }),
          (position) => {
            const pathDistance = distanceService.calculatePathDistance([position]);
            
            // Property: Single position has zero path distance
            expect(pathDistance).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return zero for empty path', () => {
      const pathDistance = distanceService.calculatePathDistance([]);
      
      // Property: Empty path has zero distance
      expect(pathDistance).toBe(0);
    });
  });

  describe('Property: Location history caching', () => {
    test('should cache and retrieve location history', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.array(
            fc.record({
              latitude: fc.float({ min: -90, max: 90 }),
              longitude: fc.float({ min: -180, max: 180 }),
              timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (nodeId, positions) => {
            // Cache the positions
            distanceService.cacheLocationHistory(nodeId, positions);
            
            // Retrieve from cache
            const cached = distanceService.getCachedLocationHistory(nodeId);
            
            // Property: Cached data should match original
            expect(cached).toEqual(positions);
            expect(cached?.length).toBe(positions.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return undefined for uncached nodes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          (nodeId) => {
            // Clear cache first
            distanceService.clearCache();
            
            // Try to retrieve uncached node
            const cached = distanceService.getCachedLocationHistory(nodeId);
            
            // Property: Uncached node should return undefined
            expect(cached).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Position staleness check', () => {
    test('should correctly identify stale positions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 86400 }), // Age in seconds (0-24 hours)
          fc.integer({ min: 0, max: 86400 }), // Max age threshold
          (ageSeconds, maxAgeSeconds) => {
            const position: Position = {
              latitude: 0,
              longitude: 0,
              timestamp: new Date(Date.now() - ageSeconds * 1000),
            };
            
            const isStale = distanceService.isPositionStale(position, maxAgeSeconds);
            
            // Property: Position is stale if age > maxAge
            if (ageSeconds > maxAgeSeconds) {
              expect(isStale).toBe(true);
            } else {
              expect(isStale).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should treat positions without timestamp as stale', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 86400 }), // Max age threshold
          (maxAgeSeconds) => {
            const position: Position = {
              latitude: 0,
              longitude: 0,
              // No timestamp
            };
            
            const isStale = distanceService.isPositionStale(position, maxAgeSeconds);
            
            // Property: Position without timestamp is always stale
            expect(isStale).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
