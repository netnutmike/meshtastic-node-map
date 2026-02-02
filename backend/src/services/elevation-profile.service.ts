/**
 * Elevation Profile Service
 * Provides elevation data fetching, Fresnel zone calculation, and obstruction detection
 * Requirements: 40.7, 40.11, 40.12
 */

import { logger } from '../utils/logger';
import { DistanceCalculationService } from './distance-calculation.service';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

const distanceService = new DistanceCalculationService();

export interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevation: number;
  distanceKm: number;
}

export interface ElevationProfile {
  points: ElevationPoint[];
  totalDistanceKm: number;
  minElevation: number;
  maxElevation: number;
  elevationGain: number;
}

export interface FresnelZone {
  distanceKm: number;
  elevation: number;
  fresnelRadius: number;
  clearance: number;
  isObstructed: boolean;
}

export interface ObstructionAnalysis {
  hasObstructions: boolean;
  obstructedPoints: FresnelZone[];
  clearancePercentage: number;
  minClearance: number;
}

export interface ElevationConfig {
  enabled: boolean;
  apiUrl: string;
  maxSamplePoints: number;
}

class ElevationProfileService {
  private config: ElevationConfig = {
    enabled: true,
    apiUrl: 'https://api.open-elevation.com/api/v1/lookup',
    maxSamplePoints: 100
  };

  constructor() {
    this.loadConfiguration();
  }

  /**
   * Load configuration from app.yml
   */
  private loadConfiguration(): void {
    try {
      // Try multiple possible config paths
      const possiblePaths = [
        path.join(process.cwd(), 'config/app.yml'),
        path.join(process.cwd(), '../config/app.yml'),
        path.join(__dirname, '../../config/app.yml'),
        path.join(__dirname, '../../../config/app.yml')
      ];

      let configPath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          configPath = testPath;
          break;
        }
      }

      if (!configPath) {
        logger.warn('Could not find app.yml configuration file, using defaults');
        return;
      }

      logger.info(`Loading elevation config from: ${configPath}`);
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent) as any;

      if (config.elevation) {
        this.config = {
          enabled: config.elevation.enabled !== false,
          apiUrl: config.elevation.apiUrl || this.config.apiUrl,
          maxSamplePoints: config.elevation.maxSamplePoints || this.config.maxSamplePoints
        };

        logger.info(`Elevation service configured: enabled=${this.config.enabled}, apiUrl=${this.config.apiUrl}`);
      }
    } catch (error) {
      logger.error('Error loading elevation configuration:', error);
    }
  }

  /**
   * Get elevation profile between two points
   * @param lat1 Starting latitude
   * @param lon1 Starting longitude
   * @param lat2 Ending latitude
   * @param lon2 Ending longitude
   * @param samplePoints Number of points to sample along the path
   * @returns Elevation profile with points
   */
  async getElevationProfile(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    samplePoints: number = 50
  ): Promise<ElevationProfile> {
    if (!this.config.enabled) {
      throw new Error('Elevation service is disabled');
    }

    // Validate coordinates
    if (!this.isValidCoordinate(lat1, lon1) || !this.isValidCoordinate(lat2, lon2)) {
      throw new Error('Invalid coordinates provided');
    }

    // Limit sample points
    const numPoints = Math.min(samplePoints, this.config.maxSamplePoints);

    // Calculate total distance
    const totalDistance = distanceService.calculateDistanceBetweenPositions(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );

    // Generate interpolated points along the path
    const pathPoints = this.interpolatePoints(lat1, lon1, lat2, lon2, numPoints);

    // Fetch elevation data for all points
    const elevationData = await this.fetchElevationData(pathPoints);

    // Calculate distances for each point
    const points: ElevationPoint[] = elevationData.map((point, index) => {
      const distanceFromStart = distanceService.calculateDistanceBetweenPositions(
        { latitude: lat1, longitude: lon1 },
        { latitude: point.latitude, longitude: point.longitude }
      );

      return {
        latitude: point.latitude,
        longitude: point.longitude,
        elevation: point.elevation,
        distanceKm: distanceFromStart.distanceKm
      };
    });

    // Calculate elevation statistics
    const elevations = points.map(p => p.elevation);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);

    // Calculate elevation gain (sum of positive elevation changes)
    let elevationGain = 0;
    for (let i = 1; i < points.length; i++) {
      const change = points[i].elevation - points[i - 1].elevation;
      if (change > 0) {
        elevationGain += change;
      }
    }

    return {
      points,
      totalDistanceKm: totalDistance.distanceKm,
      minElevation,
      maxElevation,
      elevationGain
    };
  }

  /**
   * Calculate first Fresnel zone radius at a point
   * @param frequencyMHz Frequency in MHz
   * @param totalDistanceKm Total distance between endpoints in km
   * @param d1Km Distance from first endpoint to the point in km
   * @returns Fresnel zone radius in meters
   */
  calculateFresnelZoneRadius(
    frequencyMHz: number,
    totalDistanceKm: number,
    d1Km: number
  ): number {
    // Convert to meters
    const d1 = d1Km * 1000;
    const d2 = (totalDistanceKm - d1Km) * 1000;
    const totalDistance = totalDistanceKm * 1000;

    // Calculate wavelength in meters
    const c = 299792458; // Speed of light in m/s
    const frequencyHz = frequencyMHz * 1e6;
    const wavelength = c / frequencyHz;

    // First Fresnel zone radius formula
    // r = sqrt((wavelength * d1 * d2) / (d1 + d2))
    const radius = Math.sqrt((wavelength * d1 * d2) / totalDistance);

    return radius;
  }

  /**
   * Calculate Fresnel zone clearance for elevation profile
   * @param points Elevation profile points
   * @param frequencyMHz Frequency in MHz
   * @param totalDistanceKm Total distance in km
   * @returns Fresnel zone analysis for each point
   */
  calculateFresnelClearance(
    points: ElevationPoint[],
    frequencyMHz: number,
    totalDistanceKm: number
  ): FresnelZone[] {
    if (points.length < 2) {
      return [];
    }

    const startElevation = points[0].elevation;
    const endElevation = points[points.length - 1].elevation;

    return points.map(point => {
      // Calculate line-of-sight elevation at this point
      const losElevation = this.calculateLineOfSightElevation(
        startElevation,
        endElevation,
        totalDistanceKm,
        point.distanceKm
      );

      // Calculate Fresnel zone radius at this point
      const fresnelRadius = this.calculateFresnelZoneRadius(
        frequencyMHz,
        totalDistanceKm,
        point.distanceKm
      );

      // Calculate clearance (positive = clear, negative = obstructed)
      // For first Fresnel zone, we need 60% clearance for good signal
      // Clearance = (LOS elevation - actual terrain) - Fresnel radius
      // If clearance is negative, terrain intrudes into Fresnel zone
      const clearance = (losElevation - point.elevation) - fresnelRadius;

      return {
        distanceKm: point.distanceKm,
        elevation: point.elevation,
        fresnelRadius,
        clearance,
        isObstructed: clearance < 0
      };
    });
  }

  /**
   * Calculate line-of-sight elevation at a point
   * @param startElevation Starting elevation
   * @param endElevation Ending elevation
   * @param totalDistance Total distance
   * @param currentDistance Distance to current point
   * @returns Line-of-sight elevation at the point
   */
  calculateLineOfSightElevation(
    startElevation: number,
    endElevation: number,
    totalDistance: number,
    currentDistance: number
  ): number {
    // Linear interpolation between start and end elevations
    const ratio = currentDistance / totalDistance;
    return startElevation + (endElevation - startElevation) * ratio;
  }

  /**
   * Detect terrain obstructions in line of sight
   * @param points Elevation profile points
   * @param frequencyMHz Frequency in MHz
   * @param totalDistanceKm Total distance in km
   * @returns Obstruction analysis
   */
  detectObstructions(
    points: ElevationPoint[],
    frequencyMHz: number,
    totalDistanceKm: number
  ): ObstructionAnalysis {
    const fresnelZones = this.calculateFresnelClearance(points, frequencyMHz, totalDistanceKm);

    const obstructedPoints = fresnelZones.filter(zone => zone.isObstructed);
    const hasObstructions = obstructedPoints.length > 0;

    // Calculate clearance percentage (percentage of points with positive clearance)
    const clearPoints = fresnelZones.filter(zone => !zone.isObstructed).length;
    const clearancePercentage = (clearPoints / fresnelZones.length) * 100;

    // Find minimum clearance
    const clearances = fresnelZones.map(zone => zone.clearance);
    const minClearance = Math.min(...clearances);

    return {
      hasObstructions,
      obstructedPoints,
      clearancePercentage: Math.round(clearancePercentage * 10) / 10,
      minClearance: Math.round(minClearance * 10) / 10
    };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ElevationConfig {
    return { ...this.config };
  }

  /**
   * Set configuration
   */
  setConfiguration(config: Partial<ElevationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Interpolate points along a path
   * @param lat1 Starting latitude
   * @param lon1 Starting longitude
   * @param lat2 Ending latitude
   * @param lon2 Ending longitude
   * @param numPoints Number of points to generate
   * @returns Array of interpolated coordinates
   */
  private interpolatePoints(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    numPoints: number
  ): Array<{ latitude: number; longitude: number }> {
    const points: Array<{ latitude: number; longitude: number }> = [];

    for (let i = 0; i < numPoints; i++) {
      const ratio = i / (numPoints - 1);
      const lat = lat1 + (lat2 - lat1) * ratio;
      const lon = lon1 + (lon2 - lon1) * ratio;
      points.push({ latitude: lat, longitude: lon });
    }

    return points;
  }

  /**
   * Fetch elevation data from API
   * @param points Array of coordinates
   * @returns Array of coordinates with elevation data
   */
  private async fetchElevationData(
    points: Array<{ latitude: number; longitude: number }>
  ): Promise<ElevationPoint[]> {
    try {
      // Prepare request body
      const locations = points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude
      }));

      // Make API request
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ locations })
      });

      if (!response.ok) {
        throw new Error(`Elevation API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      // Parse response
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid elevation API response format');
      }

      return data.results.map((result: any, index: number) => ({
        latitude: result.latitude,
        longitude: result.longitude,
        elevation: result.elevation || 0,
        distanceKm: 0 // Will be calculated later
      }));
    } catch (error) {
      logger.error('Error fetching elevation data:', error);
      throw new Error('Failed to fetch elevation data');
    }
  }

  /**
   * Validate coordinate
   */
  private isValidCoordinate(lat: number, lon: number): boolean {
    return (
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180 &&
      !isNaN(lat) &&
      !isNaN(lon)
    );
  }
}

export const elevationProfileService = new ElevationProfileService();
