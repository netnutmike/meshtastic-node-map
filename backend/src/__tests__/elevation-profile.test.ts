/**
 * Elevation Profile Service Tests
 * Tests elevation data fetching, Fresnel zone calculation, and obstruction detection
 * Requirements: 40.7, 40.11, 40.12
 */

import { elevationProfileService, ElevationPoint, FresnelZone } from '../services/elevation-profile.service';

describe('ElevationProfileService', () => {
  describe('Elevation Data Fetching', () => {
    it('should fetch elevation data for a path between two points', async () => {
      // Test coordinates: San Francisco to Oakland
      const lat1 = 37.7749;
      const lon1 = -122.4194;
      const lat2 = 37.8044;
      const lon2 = -122.2712;

      const profile = await elevationProfileService.getElevationProfile(
        lat1,
        lon1,
        lat2,
        lon2,
        10 // 10 sample points
      );

      expect(profile).toBeDefined();
      expect(profile.points).toHaveLength(10);
      expect(profile.points[0].latitude).toBeCloseTo(lat1, 4);
      expect(profile.points[0].longitude).toBeCloseTo(lon1, 4);
      expect(profile.points[9].latitude).toBeCloseTo(lat2, 4);
      expect(profile.points[9].longitude).toBeCloseTo(lon2, 4);

      // All points should have elevation data
      profile.points.forEach(point => {
        expect(point.elevation).toBeDefined();
        expect(typeof point.elevation).toBe('number');
        expect(point.distanceKm).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle invalid coordinates gracefully', async () => {
      const lat1 = 91; // Invalid latitude
      const lon1 = -122.4194;
      const lat2 = 37.8044;
      const lon2 = -122.2712;

      await expect(
        elevationProfileService.getElevationProfile(lat1, lon1, lat2, lon2, 10)
      ).rejects.toThrow();
    });

    it('should interpolate points along the path correctly', async () => {
      const lat1 = 37.7749;
      const lon1 = -122.4194;
      const lat2 = 37.8044;
      const lon2 = -122.2712;

      const profile = await elevationProfileService.getElevationProfile(
        lat1,
        lon1,
        lat2,
        lon2,
        5
      );

      // Distances should be monotonically increasing
      for (let i = 1; i < profile.points.length; i++) {
        expect(profile.points[i].distanceKm).toBeGreaterThan(
          profile.points[i - 1].distanceKm
        );
      }

      // First point should be at distance 0
      expect(profile.points[0].distanceKm).toBe(0);

      // Last point should be at total distance
      expect(profile.points[profile.points.length - 1].distanceKm).toBeCloseTo(
        profile.totalDistanceKm,
        2
      );
    });

    it('should handle elevation API failures gracefully', async () => {
      // Mock a failure scenario
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

      const lat1 = 37.7749;
      const lon1 = -122.4194;
      const lat2 = 37.8044;
      const lon2 = -122.2712;

      await expect(
        elevationProfileService.getElevationProfile(lat1, lon1, lat2, lon2, 10)
      ).rejects.toThrow();

      global.fetch = originalFetch;
    });
  });

  describe('Fresnel Zone Calculation', () => {
    it('should calculate first Fresnel zone radius correctly', () => {
      // Test at 915 MHz (typical Meshtastic frequency)
      const frequencyMHz = 915;
      const distanceKm = 10;
      const d1Km = 5; // Midpoint

      const radius = elevationProfileService.calculateFresnelZoneRadius(
        frequencyMHz,
        distanceKm,
        d1Km
      );

      expect(radius).toBeGreaterThan(0);
      expect(typeof radius).toBe('number');

      // Fresnel zone radius should be reasonable (typically 10-50 meters for these parameters)
      expect(radius).toBeGreaterThan(5);
      expect(radius).toBeLessThan(100);
    });

    it('should calculate maximum Fresnel zone radius at midpoint', () => {
      const frequencyMHz = 915;
      const distanceKm = 10;

      // Calculate at different points along the path
      const radiusStart = elevationProfileService.calculateFresnelZoneRadius(
        frequencyMHz,
        distanceKm,
        0.1
      );
      const radiusMid = elevationProfileService.calculateFresnelZoneRadius(
        frequencyMHz,
        distanceKm,
        5
      );
      const radiusEnd = elevationProfileService.calculateFresnelZoneRadius(
        frequencyMHz,
        distanceKm,
        9.9
      );

      // Midpoint should have the largest radius
      expect(radiusMid).toBeGreaterThan(radiusStart);
      expect(radiusMid).toBeGreaterThan(radiusEnd);
    });

    it('should handle different frequencies correctly', () => {
      const distanceKm = 10;
      const d1Km = 5;

      // Lower frequency should have larger Fresnel zone
      const radius433 = elevationProfileService.calculateFresnelZoneRadius(433, distanceKm, d1Km);
      const radius915 = elevationProfileService.calculateFresnelZoneRadius(915, distanceKm, d1Km);

      expect(radius433).toBeGreaterThan(radius915);
    });

    it('should calculate Fresnel zone clearance for elevation profile', () => {
      const points: ElevationPoint[] = [
        { latitude: 37.7749, longitude: -122.4194, elevation: 10, distanceKm: 0 },
        { latitude: 37.7800, longitude: -122.4000, elevation: 50, distanceKm: 5 },
        { latitude: 37.7850, longitude: -122.3800, elevation: 30, distanceKm: 10 },
        { latitude: 37.7900, longitude: -122.3600, elevation: 20, distanceKm: 15 },
        { latitude: 37.8044, longitude: -122.2712, elevation: 15, distanceKm: 20 }
      ];

      const frequencyMHz = 915;
      const totalDistanceKm = 20;

      const clearance = elevationProfileService.calculateFresnelClearance(
        points,
        frequencyMHz,
        totalDistanceKm
      );

      expect(clearance).toBeDefined();
      expect(clearance.length).toBe(points.length);

      clearance.forEach((point, index) => {
        expect(point.distanceKm).toBe(points[index].distanceKm);
        expect(point.elevation).toBe(points[index].elevation);
        expect(typeof point.fresnelRadius).toBe('number');
        expect(typeof point.clearance).toBe('number');
        expect(typeof point.isObstructed).toBe('boolean');
      });
    });
  });

  describe('Obstruction Detection', () => {
    it('should detect terrain obstructions in line of sight', () => {
      // Create a profile with an obvious obstruction
      const points: ElevationPoint[] = [
        { latitude: 37.7749, longitude: -122.4194, elevation: 100, distanceKm: 0 },
        { latitude: 37.7800, longitude: -122.4000, elevation: 150, distanceKm: 5 },
        { latitude: 37.7850, longitude: -122.3800, elevation: 200, distanceKm: 10 }, // Peak
        { latitude: 37.7900, longitude: -122.3600, elevation: 150, distanceKm: 15 },
        { latitude: 37.8044, longitude: -122.2712, elevation: 100, distanceKm: 20 }
      ];

      const frequencyMHz = 915;
      const totalDistanceKm = 20;

      const clearance = elevationProfileService.calculateFresnelClearance(
        points,
        frequencyMHz,
        totalDistanceKm
      );

      // The peak in the middle should likely be obstructed
      const obstructedPoints = clearance.filter(p => p.isObstructed);
      expect(obstructedPoints.length).toBeGreaterThan(0);
    });

    it('should not detect obstructions for clear line of sight', () => {
      // Create a profile with clear line of sight (elevated endpoints, valley in middle)
      const points: ElevationPoint[] = [
        { latitude: 37.7749, longitude: -122.4194, elevation: 200, distanceKm: 0 },
        { latitude: 37.7800, longitude: -122.4000, elevation: 100, distanceKm: 5 },
        { latitude: 37.7850, longitude: -122.3800, elevation: 50, distanceKm: 10 },
        { latitude: 37.7900, longitude: -122.3600, elevation: 100, distanceKm: 15 },
        { latitude: 37.8044, longitude: -122.2712, elevation: 200, distanceKm: 20 }
      ];

      const frequencyMHz = 915;
      const totalDistanceKm = 20;

      const clearance = elevationProfileService.calculateFresnelClearance(
        points,
        frequencyMHz,
        totalDistanceKm
      );

      // Valley terrain with elevated endpoints should have good clearance
      const obstructedPoints = clearance.filter(p => p.isObstructed);
      expect(obstructedPoints.length).toBe(0);
    });

    it('should calculate line-of-sight elevation correctly', () => {
      const startElevation = 100;
      const endElevation = 200;
      const totalDistance = 20;
      const currentDistance = 10; // Midpoint

      const losElevation = elevationProfileService.calculateLineOfSightElevation(
        startElevation,
        endElevation,
        totalDistance,
        currentDistance
      );

      // At midpoint, should be halfway between start and end
      expect(losElevation).toBeCloseTo(150, 1);
    });

    it('should identify obstructions based on Fresnel zone clearance', () => {
      const points: ElevationPoint[] = [
        { latitude: 37.7749, longitude: -122.4194, elevation: 100, distanceKm: 0 },
        { latitude: 37.7800, longitude: -122.4000, elevation: 120, distanceKm: 5 },
        { latitude: 37.7850, longitude: -122.3800, elevation: 180, distanceKm: 10 }, // High peak
        { latitude: 37.7900, longitude: -122.3600, elevation: 120, distanceKm: 15 },
        { latitude: 37.8044, longitude: -122.2712, elevation: 100, distanceKm: 20 }
      ];

      const obstructions = elevationProfileService.detectObstructions(points, 915, 20);

      expect(obstructions).toBeDefined();
      expect(obstructions.hasObstructions).toBe(true);
      expect(obstructions.obstructedPoints.length).toBeGreaterThan(0);
      expect(obstructions.clearancePercentage).toBeLessThan(100);

      // Obstructed points should have negative clearance
      obstructions.obstructedPoints.forEach(point => {
        expect(point.clearance).toBeLessThan(0);
      });
    });

    it('should calculate clearance percentage correctly', () => {
      // Create a profile with clear line of sight (elevated endpoints, valley in middle)
      const points: ElevationPoint[] = [
        { latitude: 37.7749, longitude: -122.4194, elevation: 200, distanceKm: 0 },
        { latitude: 37.7800, longitude: -122.4000, elevation: 100, distanceKm: 5 },
        { latitude: 37.7850, longitude: -122.3800, elevation: 50, distanceKm: 10 },
        { latitude: 37.7900, longitude: -122.3600, elevation: 100, distanceKm: 15 },
        { latitude: 37.8044, longitude: -122.2712, elevation: 200, distanceKm: 20 }
      ];

      const obstructions = elevationProfileService.detectObstructions(points, 915, 20);

      // Clear line of sight should have 100% clearance
      expect(obstructions.clearancePercentage).toBe(100);
      expect(obstructions.hasObstructions).toBe(false);
    });
  });

  describe('Configuration and Optional Features', () => {
    it('should respect elevation API configuration', () => {
      const config = elevationProfileService.getConfiguration();

      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(typeof config.enabled).toBe('boolean');
      expect(config.apiUrl).toBeDefined();
      expect(typeof config.apiUrl).toBe('string');
    });

    it('should handle disabled elevation service gracefully', async () => {
      // Temporarily disable the service
      const originalConfig = elevationProfileService.getConfiguration();
      elevationProfileService.setConfiguration({ ...originalConfig, enabled: false });

      const lat1 = 37.7749;
      const lon1 = -122.4194;
      const lat2 = 37.8044;
      const lon2 = -122.2712;

      await expect(
        elevationProfileService.getElevationProfile(lat1, lon1, lat2, lon2, 10)
      ).rejects.toThrow('Elevation service is disabled');

      // Restore configuration
      elevationProfileService.setConfiguration(originalConfig);
    });

    it('should allow custom API URL configuration', () => {
      const customUrl = 'https://custom-elevation-api.example.com';
      const originalConfig = elevationProfileService.getConfiguration();

      elevationProfileService.setConfiguration({
        ...originalConfig,
        apiUrl: customUrl
      });

      const config = elevationProfileService.getConfiguration();
      expect(config.apiUrl).toBe(customUrl);

      // Restore configuration
      elevationProfileService.setConfiguration(originalConfig);
    });
  });
});
