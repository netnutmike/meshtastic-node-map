import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface RadioRange {
  nodeId: string;
  latitude: number;
  longitude: number;
  rangeMeters: number;
  hardwareModel: string;
  transmitPower?: number;
  antennaGain?: number;
}

export interface CoverageGap {
  id: string;
  latitude: number;
  longitude: number;
  gapRadius: number;
  severity: 'low' | 'medium' | 'high';
  nearestNodes: Array<{
    nodeId: string;
    distance: number;
  }>;
}

export interface HypotheticalNode {
  id: string;
  latitude: number;
  longitude: number;
  hardwareModel: string;
  transmitPower?: number;
  antennaGain?: number;
}

export interface NetworkOptimization {
  suggestedPlacements: Array<{
    latitude: number;
    longitude: number;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    expectedImprovement: number;
  }>;
  coverageImprovement: number;
  connectivityImprovement: number;
}

export interface TerrainData {
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface LineOfSightResult {
  fromNodeId: string;
  toNodeId: string;
  hasLineOfSight: boolean;
  obstacleElevation?: number;
  fresnelZoneClearance: number;
}

export interface PerformanceEstimate {
  messageDeliveryRate: number;
  averageLatency: number;
  hopCount: number;
  signalStrength: number;
}

export class CoverageAnalysisService {
  /**
   * Calculate radio range for nodes based on hardware specifications
   */
  async calculateRadioRanges(networkId?: string): Promise<RadioRange[]> {
    logger.info('Calculating radio ranges for nodes', { networkId });

    const whereClause = networkId ? { networkId } : {};
    
    const nodes = await prisma.node.findMany({
      where: {
        ...whereClause,
        positions: {
          some: {}
        }
      },
      include: {
        positions: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      }
    });

    const ranges: RadioRange[] = [];

    for (const node of nodes) {
      if (!node.positions || node.positions.length === 0) continue;
      
      const position = node.positions[0]; // Latest position

      const range = this.calculateNodeRange(
        node.hardwareModel || 'default',
        node.transmitPower ?? undefined,
        node.antennaGain ?? undefined
      );

      ranges.push({
        nodeId: node.id,
        latitude: position.latitude,
        longitude: position.longitude,
        rangeMeters: range,
        hardwareModel: node.hardwareModel || 'default',
        transmitPower: node.transmitPower ?? undefined,
        antennaGain: node.antennaGain ?? undefined
      });
    }

    return ranges;
  }

  /**
   * Identify coverage gaps in the network
   */
  async identifyCoverageGaps(networkId?: string): Promise<CoverageGap[]> {
    logger.info('Identifying coverage gaps', { networkId });

    const ranges = await this.calculateRadioRanges(networkId);
    const gaps: CoverageGap[] = [];

    // Create a grid to analyze coverage
    const bounds = this.calculateNetworkBounds(ranges);
    const gridSize = 0.01; // ~1km grid cells
    
    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += gridSize) {
      for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += gridSize) {
        const coverage = this.calculatePointCoverage(lat, lng, ranges);
        
        if (coverage.coveringNodes.length === 0) {
          // Found a gap
          const nearestNodes = this.findNearestNodes(lat, lng, ranges, 3);
          const gapRadius = nearestNodes.length > 0 ? nearestNodes[0].distance : 10000;
          
          gaps.push({
            id: `gap_${lat.toFixed(4)}_${lng.toFixed(4)}`,
            latitude: lat,
            longitude: lng,
            gapRadius,
            severity: this.calculateGapSeverity(gapRadius, nearestNodes),
            nearestNodes
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Simulate deployment of hypothetical nodes
   */
  async simulateDeployment(
    hypotheticalNodes: HypotheticalNode[],
    networkId?: string
  ): Promise<{
    coverageImprovement: number;
    connectivityImprovement: number;
    newConnections: Array<{ from: string; to: string; distance: number }>;
  }> {
    logger.info('Simulating deployment', { 
      hypotheticalNodeCount: hypotheticalNodes.length,
      networkId 
    });

    const existingRanges = await this.calculateRadioRanges(networkId);
    
    // Calculate ranges for hypothetical nodes
    const hypotheticalRanges: RadioRange[] = hypotheticalNodes.map(node => ({
      nodeId: node.id,
      latitude: node.latitude,
      longitude: node.longitude,
      rangeMeters: this.calculateNodeRange(
        node.hardwareModel,
        node.transmitPower,
        node.antennaGain
      ),
      hardwareModel: node.hardwareModel,
      transmitPower: node.transmitPower,
      antennaGain: node.antennaGain
    }));

    const allRanges = [...existingRanges, ...hypotheticalRanges];

    // Calculate coverage before and after
    const originalCoverage = this.calculateTotalCoverage(existingRanges);
    const newCoverage = this.calculateTotalCoverage(allRanges);
    
    // Calculate connectivity improvements
    const originalConnections = this.calculateConnections(existingRanges);
    const newConnections = this.calculateConnections(allRanges);
    
    const addedConnections = newConnections.filter(conn => 
      !originalConnections.some(orig => 
        (orig.from === conn.from && orig.to === conn.to) ||
        (orig.from === conn.to && orig.to === conn.from)
      )
    );

    return {
      coverageImprovement: ((newCoverage - originalCoverage) / originalCoverage) * 100,
      connectivityImprovement: ((newConnections.length - originalConnections.length) / originalConnections.length) * 100,
      newConnections: addedConnections
    };
  }

  /**
   * Get terrain elevation data for line-of-sight calculations
   */
  async getTerrainElevation(latitude: number, longitude: number): Promise<number> {
    // In a real implementation, this would call an elevation API like USGS or SRTM
    // For now, return a mock elevation based on coordinates
    return Math.max(0, Math.sin(latitude * 0.1) * Math.cos(longitude * 0.1) * 1000);
  }

  /**
   * Calculate line-of-sight between two nodes considering terrain
   */
  async calculateLineOfSight(
    fromNodeId: string,
    toNodeId: string,
    networkId?: string
  ): Promise<LineOfSightResult> {
    logger.info('Calculating line of sight', { fromNodeId, toNodeId, networkId });

    const whereClause = networkId ? { networkId } : {};
    
    const nodes = await prisma.node.findMany({
      where: {
        ...whereClause,
        id: { in: [fromNodeId, toNodeId] },
        positions: { some: {} }
      },
      include: { 
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (nodes.length !== 2) {
      throw new Error('Both nodes must exist and have position data');
    }

    const [fromNode, toNode] = nodes;
    if (!fromNode.positions || fromNode.positions.length === 0 || !toNode.positions || toNode.positions.length === 0) {
      throw new Error('Both nodes must have position data');
    }

    const fromPosition = fromNode.positions[0];
    const toPosition = toNode.positions[0];

    // Calculate distance
    const distance = this.calculateDistance(
      fromPosition.latitude,
      fromPosition.longitude,
      toPosition.latitude,
      toPosition.longitude
    );

    // Get elevation data for both points
    const fromElevation = await this.getTerrainElevation(
      fromPosition.latitude,
      fromPosition.longitude
    );
    const toElevation = await this.getTerrainElevation(
      toPosition.latitude,
      toPosition.longitude
    );

    // Calculate Fresnel zone clearance (simplified)
    const frequency = 915e6; // 915 MHz for most Meshtastic devices
    const fresnelRadius = Math.sqrt((3e8 * distance) / (4 * frequency));
    
    // Check for obstacles along the path (simplified)
    const midpointElevation = await this.getTerrainElevation(
      (fromPosition.latitude + toPosition.latitude) / 2,
      (fromPosition.longitude + toPosition.longitude) / 2
    );

    const lineElevation = (fromElevation + toElevation) / 2;
    const clearance = lineElevation - midpointElevation;
    const hasLineOfSight = clearance > fresnelRadius;

    return {
      fromNodeId,
      toNodeId,
      hasLineOfSight,
      obstacleElevation: hasLineOfSight ? undefined : midpointElevation,
      fresnelZoneClearance: clearance / fresnelRadius
    };
  }

  /**
   * Estimate network performance for different configurations
   */
  async estimatePerformance(
    fromNodeId: string,
    toNodeId: string,
    networkId?: string
  ): Promise<PerformanceEstimate> {
    logger.info('Estimating network performance', { fromNodeId, toNodeId, networkId });

    const lineOfSight = await this.calculateLineOfSight(fromNodeId, toNodeId, networkId);
    
    const whereClause = networkId ? { networkId } : {};
    const nodes = await prisma.node.findMany({
      where: {
        ...whereClause,
        id: { in: [fromNodeId, toNodeId] },
        positions: { some: {} }
      },
      include: { 
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (nodes.length !== 2 || !nodes[0].positions || nodes[0].positions.length === 0 || !nodes[1].positions || nodes[1].positions.length === 0) {
      throw new Error('Both nodes must exist and have position data');
    }

    const fromPosition = nodes[0].positions[0];
    const toPosition = nodes[1].positions[0];

    const distance = this.calculateDistance(
      fromPosition.latitude,
      fromPosition.longitude,
      toPosition.latitude,
      toPosition.longitude
    );

    // Calculate signal strength using free space path loss
    const frequency = 915e6; // 915 MHz
    const pathLoss = 20 * Math.log10(distance) + 20 * Math.log10(frequency) + 20 * Math.log10(4 * Math.PI / 3e8);
    const transmitPower = 20; // 20 dBm typical
    const signalStrength = transmitPower - pathLoss;

    // Estimate delivery rate based on signal strength and line of sight
    let deliveryRate = 0.95; // Start with 95% for good conditions
    if (!lineOfSight.hasLineOfSight) {
      deliveryRate *= 0.7; // Reduce by 30% for no line of sight
    }
    if (signalStrength < -100) {
      deliveryRate *= Math.max(0.1, (signalStrength + 120) / 20);
    }

    // Estimate latency (simplified)
    const baseLatency = 100; // 100ms base
    const distanceLatency = distance / 1000 * 10; // 10ms per km
    const averageLatency = baseLatency + distanceLatency;

    // Estimate hop count (simplified)
    const maxRange = 10000; // 10km typical range
    const hopCount = Math.ceil(distance / maxRange);

    return {
      messageDeliveryRate: Math.max(0, Math.min(1, deliveryRate)),
      averageLatency,
      hopCount,
      signalStrength
    };
  }

  /**
   * Generate network optimization recommendations
   */
  async generateOptimizationRecommendations(networkId?: string): Promise<NetworkOptimization> {
    logger.info('Generating optimization recommendations', { networkId });

    const gaps = await this.identifyCoverageGaps(networkId);
    const ranges = await this.calculateRadioRanges(networkId);

    const suggestedPlacements = gaps
      .filter(gap => gap.severity === 'high' || gap.severity === 'medium')
      .slice(0, 10) // Limit to top 10 recommendations
      .map(gap => ({
        latitude: gap.latitude,
        longitude: gap.longitude,
        priority: gap.severity as 'high' | 'medium' | 'low',
        reason: `Coverage gap with ${gap.gapRadius.toFixed(0)}m radius to nearest node`,
        expectedImprovement: this.calculateExpectedImprovement(gap, ranges)
      }));

    // Calculate overall improvements
    const totalGaps = gaps.length;
    const highPriorityGaps = gaps.filter(g => g.severity === 'high').length;
    
    const coverageImprovement = Math.min(50, (highPriorityGaps / Math.max(1, totalGaps)) * 100);
    const connectivityImprovement = Math.min(30, suggestedPlacements.length * 5);

    return {
      suggestedPlacements,
      coverageImprovement,
      connectivityImprovement
    };
  }

  // Private helper methods

  private calculateNodeRange(
    hardwareModel: string,
    transmitPower?: number,
    antennaGain?: number
  ): number {
    // Hardware-specific range calculations
    const baseRanges: Record<string, number> = {
      'TBEAM': 10000,      // 10km
      'HELTEC_V3': 8000,   // 8km
      'TLORA_V2': 12000,   // 12km
      'TLORA_V1': 10000,   // 10km
      'LORA32_V2_1': 6000, // 6km
      'default': 8000      // 8km default
    };

    let baseRange = baseRanges[hardwareModel] || baseRanges['default'];
    
    // Adjust for transmit power (if available)
    if (transmitPower) {
      const powerFactor = Math.pow(10, (transmitPower - 20) / 20); // 20dBm reference
      baseRange *= Math.sqrt(powerFactor);
    }

    // Adjust for antenna gain (if available)
    if (antennaGain) {
      const gainFactor = Math.pow(10, antennaGain / 20);
      baseRange *= gainFactor;
    }

    return Math.round(baseRange);
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateNetworkBounds(ranges: RadioRange[]): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } {
    if (ranges.length === 0) {
      return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    }

    const lats = ranges.map(r => r.latitude);
    const lngs = ranges.map(r => r.longitude);

    return {
      minLat: Math.min(...lats) - 0.05,
      maxLat: Math.max(...lats) + 0.05,
      minLng: Math.min(...lngs) - 0.05,
      maxLng: Math.max(...lngs) + 0.05
    };
  }

  private calculatePointCoverage(lat: number, lng: number, ranges: RadioRange[]): {
    coveringNodes: string[];
    signalStrength: number;
  } {
    const coveringNodes: string[] = [];
    let maxSignalStrength = -Infinity;

    for (const range of ranges) {
      const distance = this.calculateDistance(lat, lng, range.latitude, range.longitude);
      if (distance <= range.rangeMeters) {
        coveringNodes.push(range.nodeId);
        
        // Calculate approximate signal strength
        const pathLoss = 20 * Math.log10(distance) + 20 * Math.log10(915e6) + 20 * Math.log10(4 * Math.PI / 3e8);
        const signalStrength = 20 - pathLoss; // 20dBm transmit power
        maxSignalStrength = Math.max(maxSignalStrength, signalStrength);
      }
    }

    return {
      coveringNodes,
      signalStrength: maxSignalStrength === -Infinity ? -120 : maxSignalStrength
    };
  }

  private findNearestNodes(
    lat: number,
    lng: number,
    ranges: RadioRange[],
    count: number
  ): Array<{ nodeId: string; distance: number }> {
    const distances = ranges.map(range => ({
      nodeId: range.nodeId,
      distance: this.calculateDistance(lat, lng, range.latitude, range.longitude)
    }));

    return distances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count);
  }

  private calculateGapSeverity(
    gapRadius: number,
    nearestNodes: Array<{ nodeId: string; distance: number }>
  ): 'low' | 'medium' | 'high' {
    if (gapRadius > 20000 || nearestNodes.length === 0) return 'high';
    if (gapRadius > 10000) return 'medium';
    return 'low';
  }

  private calculateTotalCoverage(ranges: RadioRange[]): number {
    // Simplified coverage calculation - in reality would use more sophisticated algorithms
    const totalArea = ranges.reduce((sum, range) => {
      return sum + Math.PI * Math.pow(range.rangeMeters, 2);
    }, 0);
    
    return totalArea / 1000000; // Convert to km²
  }

  private calculateConnections(ranges: RadioRange[]): Array<{ from: string; to: string; distance: number }> {
    const connections: Array<{ from: string; to: string; distance: number }> = [];

    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const distance = this.calculateDistance(
          ranges[i].latitude,
          ranges[i].longitude,
          ranges[j].latitude,
          ranges[j].longitude
        );

        // Check if nodes can connect (within range of each other)
        if (distance <= Math.min(ranges[i].rangeMeters, ranges[j].rangeMeters)) {
          connections.push({
            from: ranges[i].nodeId,
            to: ranges[j].nodeId,
            distance
          });
        }
      }
    }

    return connections;
  }

  private calculateExpectedImprovement(gap: CoverageGap, ranges: RadioRange[]): number {
    // Calculate expected improvement as percentage of coverage increase
    const gapArea = Math.PI * Math.pow(gap.gapRadius, 2);
    const totalCoverage = this.calculateTotalCoverage(ranges);
    
    return Math.min(25, (gapArea / 1000000) / Math.max(1, totalCoverage) * 100);
  }
}

export const coverageAnalysisService = new CoverageAnalysisService();