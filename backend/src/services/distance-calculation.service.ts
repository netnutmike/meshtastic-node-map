/**
 * Distance Calculation Service
 * Implements Haversine formula for calculating distances between geographic coordinates
 * Requirements: 39.1, 39.2, 39.3, 39.13, 39.14
 */

export interface Position {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: Date;
}

export interface DistanceResult {
  distanceKm: number;
  distanceFormatted: string;
}

export class DistanceCalculationService {
  // Earth's radius in kilometers
  private static readonly EARTH_RADIUS_KM = 6371.0;

  // Location history cache for performance
  private locationCache: Map<string, Position[]> = new Map();

  /**
   * Calculate distance between two geographic coordinates using Haversine formula
   * @param lat1 Latitude of first point in decimal degrees
   * @param lon1 Longitude of first point in decimal degrees
   * @param lat2 Latitude of second point in decimal degrees
   * @param lon2 Longitude of second point in decimal degrees
   * @returns Distance in kilometers
   */
  public calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Convert degrees to radians
    const lat1Rad = this.toRadians(lat1);
    const lon1Rad = this.toRadians(lon1);
    const lat2Rad = this.toRadians(lat2);
    const lon2Rad = this.toRadians(lon2);

    // Haversine formula
    const dLat = lat2Rad - lat1Rad;
    const dLon = lon2Rad - lon1Rad;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = DistanceCalculationService.EARTH_RADIUS_KM * c;

    return distance;
  }

  /**
   * Calculate distance between two positions
   * @param pos1 First position
   * @param pos2 Second position
   * @returns Distance result with formatted string
   */
  public calculateDistanceBetweenPositions(
    pos1: Position,
    pos2: Position
  ): DistanceResult {
    const distanceKm = this.calculateDistance(
      pos1.latitude,
      pos1.longitude,
      pos2.latitude,
      pos2.longitude
    );

    return {
      distanceKm,
      distanceFormatted: this.formatDistance(distanceKm),
    };
  }

  /**
   * Format distance with appropriate precision
   * @param distanceKm Distance in kilometers
   * @returns Formatted distance string
   */
  public formatDistance(distanceKm: number): string {
    if (distanceKm < 0.01) {
      // Less than 10 meters - show in meters with no decimals
      return `${Math.round(distanceKm * 1000)} m`;
    } else if (distanceKm < 1) {
      // Less than 1 km - show in meters with no decimals
      return `${Math.round(distanceKm * 1000)} m`;
    } else if (distanceKm < 10) {
      // Less than 10 km - show 2 decimal places
      return `${distanceKm.toFixed(2)} km`;
    } else if (distanceKm < 100) {
      // Less than 100 km - show 1 decimal place
      return `${distanceKm.toFixed(1)} km`;
    } else {
      // 100 km or more - show no decimal places
      return `${Math.round(distanceKm)} km`;
    }
  }

  /**
   * Convert degrees to radians
   * @param degrees Angle in degrees
   * @returns Angle in radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Cache location history for a node
   * @param nodeId Node identifier
   * @param positions Array of positions for the node
   */
  public cacheLocationHistory(nodeId: string, positions: Position[]): void {
    this.locationCache.set(nodeId, positions);
  }

  /**
   * Get cached location history for a node
   * @param nodeId Node identifier
   * @returns Array of positions or undefined if not cached
   */
  public getCachedLocationHistory(nodeId: string): Position[] | undefined {
    return this.locationCache.get(nodeId);
  }

  /**
   * Clear location history cache
   */
  public clearCache(): void {
    this.locationCache.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  public getCacheStats(): { entries: number; nodes: string[] } {
    return {
      entries: this.locationCache.size,
      nodes: Array.from(this.locationCache.keys()),
    };
  }

  /**
   * Find position closest to a given timestamp
   * @param positions Array of positions
   * @param targetTime Target timestamp
   * @returns Closest position or undefined if array is empty
   */
  public findClosestPosition(
    positions: Position[],
    targetTime: Date
  ): Position | undefined {
    if (positions.length === 0) {
      return undefined;
    }

    let closestPosition = positions[0];
    let minTimeDiff = Math.abs(
      (closestPosition.timestamp?.getTime() || 0) - targetTime.getTime()
    );

    for (const position of positions) {
      const timeDiff = Math.abs(
        (position.timestamp?.getTime() || 0) - targetTime.getTime()
      );
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestPosition = position;
      }
    }

    return closestPosition;
  }

  /**
   * Calculate total path distance for multi-hop routes
   * @param positions Array of positions representing the path
   * @returns Total distance in kilometers
   */
  public calculatePathDistance(positions: Position[]): number {
    if (positions.length < 2) {
      return 0;
    }

    let totalDistance = 0;

    for (let i = 0; i < positions.length - 1; i++) {
      const distance = this.calculateDistance(
        positions[i].latitude,
        positions[i].longitude,
        positions[i + 1].latitude,
        positions[i + 1].longitude
      );
      totalDistance += distance;
    }

    return totalDistance;
  }

  /**
   * Check if position data is stale
   * @param position Position to check
   * @param maxAgeSeconds Maximum age in seconds
   * @returns True if position is stale
   */
  public isPositionStale(position: Position, maxAgeSeconds: number): boolean {
    if (!position.timestamp) {
      return true;
    }

    const ageSeconds =
      (Date.now() - position.timestamp.getTime()) / 1000;
    return ageSeconds > maxAgeSeconds;
  }
}
