/**
 * Line of Sight Analysis Service
 * Provides analysis of RF connectivity potential between two nodes
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6
 */

import { PrismaClient } from '@prisma/client';
import { DistanceCalculationService, Position } from './distance-calculation.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const distanceService = new DistanceCalculationService();

export interface LineOfSightRequest {
  fromNodeId: string;
  toNodeId: string;
}

export interface SignalQualityStats {
  avgRssi: number;
  avgSnr: number;
  minRssi: number;
  maxRssi: number;
  minSnr: number;
  maxSnr: number;
  packetCount: number;
  lastCommunication: Date;
}

export interface LineOfSightResult {
  fromNode: {
    id: string;
    hexId: string;
    shortName: string;
    longName: string;
    position: Position | null;
  };
  toNode: {
    id: string;
    hexId: string;
    shortName: string;
    longName: string;
    position: Position | null;
  };
  distanceKm: number;
  distanceFormatted: string;
  bearing: number;
  hasHistoricalConnectivity: boolean;
  signalQuality: SignalQualityStats | null;
}

class LineOfSightService {
  /**
   * Analyze line of sight between two nodes
   * @param request Line of sight request with node IDs
   * @returns Line of sight analysis result
   */
  async analyzeLine(request: LineOfSightRequest): Promise<LineOfSightResult> {
    const { fromNodeId, toNodeId } = request;

    // Fetch both nodes with their positions
    const [fromNode, toNode] = await Promise.all([
      this.getNodeWithPosition(fromNodeId),
      this.getNodeWithPosition(toNodeId)
    ]);

    if (!fromNode) {
      throw new Error(`Node not found: ${fromNodeId}`);
    }

    if (!toNode) {
      throw new Error(`Node not found: ${toNodeId}`);
    }

    // Calculate distance if both nodes have positions
    let distanceKm = 0;
    let distanceFormatted = 'N/A';
    let bearing = 0;

    if (fromNode.position && toNode.position) {
      const distanceResult = distanceService.calculateDistanceBetweenPositions(
        fromNode.position,
        toNode.position
      );
      distanceKm = distanceResult.distanceKm;
      distanceFormatted = distanceResult.distanceFormatted;
      
      // Calculate bearing
      bearing = this.calculateBearing(
        fromNode.position.latitude,
        fromNode.position.longitude,
        toNode.position.latitude,
        toNode.position.longitude
      );
    }

    // Query historical packet data for connectivity
    const signalQuality = await this.getHistoricalConnectivity(fromNodeId, toNodeId);

    return {
      fromNode: {
        id: fromNode.id,
        hexId: fromNode.hexId,
        shortName: fromNode.shortName,
        longName: fromNode.longName,
        position: fromNode.position
      },
      toNode: {
        id: toNode.id,
        hexId: toNode.hexId,
        shortName: toNode.shortName,
        longName: toNode.longName,
        position: toNode.position
      },
      distanceKm,
      distanceFormatted,
      bearing,
      hasHistoricalConnectivity: signalQuality !== null,
      signalQuality
    };
  }

  /**
   * Get node with its most recent position
   * @param nodeId Node identifier
   * @returns Node with position or null
   */
  private async getNodeWithPosition(nodeId: string) {
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!node) {
      return null;
    }

    const position = node.positions.length > 0 ? {
      latitude: node.positions[0].latitude,
      longitude: node.positions[0].longitude,
      altitude: node.positions[0].altitude || undefined,
      timestamp: node.positions[0].timestamp
    } : null;

    return {
      id: node.id,
      hexId: node.hexId,
      shortName: node.shortName || 'Unknown',
      longName: node.longName || 'Unknown',
      position
    };
  }

  /**
   * Get historical connectivity statistics between two nodes
   * @param fromNodeId Source node ID
   * @param toNodeId Destination node ID
   * @returns Signal quality statistics or null if no connectivity
   */
  private async getHistoricalConnectivity(
    fromNodeId: string,
    toNodeId: string
  ): Promise<SignalQualityStats | null> {
    // Query packets where nodes communicated directly
    // Check both directions: A->B and B->A
    const packets = await prisma.message.findMany({
      where: {
        OR: [
          {
            fromNodeId: fromNodeId,
            toNodeId: toNodeId
          },
          {
            fromNodeId: toNodeId,
            toNodeId: fromNodeId
          }
        ],
        rssi: { not: null },
        snr: { not: null }
      },
      select: {
        rssi: true,
        snr: true,
        timestamp: true
      },
      orderBy: { timestamp: 'desc' },
      take: 1000 // Limit to recent packets for performance
    });

    if (packets.length === 0) {
      return null;
    }

    // Calculate statistics
    const rssiValues = packets.map(p => p.rssi!).filter(v => v !== null);
    const snrValues = packets.map(p => p.snr!).filter(v => v !== null);

    if (rssiValues.length === 0 || snrValues.length === 0) {
      return null;
    }

    const avgRssi = rssiValues.reduce((sum, val) => sum + val, 0) / rssiValues.length;
    const avgSnr = snrValues.reduce((sum, val) => sum + val, 0) / snrValues.length;
    const minRssi = Math.min(...rssiValues);
    const maxRssi = Math.max(...rssiValues);
    const minSnr = Math.min(...snrValues);
    const maxSnr = Math.max(...snrValues);

    return {
      avgRssi: Math.round(avgRssi * 10) / 10,
      avgSnr: Math.round(avgSnr * 10) / 10,
      minRssi,
      maxRssi,
      minSnr,
      maxSnr,
      packetCount: packets.length,
      lastCommunication: packets[0].timestamp
    };
  }

  /**
   * Calculate bearing (azimuth) between two points
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Bearing in degrees (0-360)
   */
  private calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    const dLon = this.toRadians(lon2 - lon1);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = Math.atan2(y, x);
    bearing = this.toDegrees(bearing);
    bearing = (bearing + 360) % 360; // Normalize to 0-360

    return Math.round(bearing * 10) / 10;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }
}

export const lineOfSightService = new LineOfSightService();
