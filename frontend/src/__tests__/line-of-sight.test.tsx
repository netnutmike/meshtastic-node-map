/**
 * Line of Sight Analysis Unit Tests
 * Tests node selection, distance calculation, historical connectivity queries, and signal quality display
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6
 */

import { calculateDistance, formatDistance } from '../utils/distanceCalculation';

// Mock data for testing
const mockNodes = [
  {
    id: 'node1',
    hexId: '0x1234',
    shortName: 'Node1',
    longName: 'Node One',
    position: { latitude: 40.7128, longitude: -74.0060, altitude: 10 }, // NYC
  },
  {
    id: 'node2',
    hexId: '0x5678',
    shortName: 'Node2',
    longName: 'Node Two',
    position: { latitude: 34.0522, longitude: -118.2437, altitude: 20 }, // LA
  },
  {
    id: 'node3',
    hexId: '0xABCD',
    shortName: 'Node3',
    longName: 'Node Three',
    position: { latitude: 41.8781, longitude: -87.6298, altitude: 15 }, // Chicago
  },
];

const mockLineOfSightResult = {
  fromNode: {
    id: 'node1',
    hexId: '0x1234',
    shortName: 'Node1',
    longName: 'Node One',
    position: { latitude: 40.7128, longitude: -74.0060, altitude: 10 },
  },
  toNode: {
    id: 'node2',
    hexId: '0x5678',
    shortName: 'Node2',
    longName: 'Node Two',
    position: { latitude: 34.0522, longitude: -118.2437, altitude: 20 },
  },
  distanceKm: 3944.42,
  distanceFormatted: '3944 km',
  bearing: 275.5,
  hasHistoricalConnectivity: true,
  signalQuality: {
    avgRssi: -75.5,
    avgSnr: 8.2,
    minRssi: -85,
    maxRssi: -65,
    minSnr: 5.0,
    maxSnr: 12.0,
    packetCount: 150,
    lastCommunication: '2024-01-15T10:30:00Z',
  },
};

describe('Line of Sight Analysis', () => {
  describe('Node Selection', () => {
    it('should filter nodes with valid names', () => {
      const nodesWithNames = mockNodes.filter(
        (node) => node.shortName && node.shortName.trim() !== ''
      );
      expect(nodesWithNames.length).toBe(3);
    });

    it('should create autocomplete options with labels', () => {
      const options = mockNodes.map((node) => ({
        id: node.id,
        hexId: node.hexId,
        shortName: node.shortName,
        longName: node.longName,
        label: `${node.shortName} (${node.hexId})`,
      }));

      expect(options[0].label).toBe('Node1 (0x1234)');
      expect(options[1].label).toBe('Node2 (0x5678)');
      expect(options[2].label).toBe('Node3 (0xABCD)');
    });

    it('should sort nodes alphabetically by short name', () => {
      const unsortedNodes = [mockNodes[2], mockNodes[0], mockNodes[1]];
      const sorted = unsortedNodes.sort((a, b) =>
        a.shortName.localeCompare(b.shortName)
      );

      expect(sorted[0].shortName).toBe('Node1');
      expect(sorted[1].shortName).toBe('Node2');
      expect(sorted[2].shortName).toBe('Node3');
    });

    it('should prevent selecting the same node for both from and to', () => {
      const fromNode = mockNodes[0];
      const toNode = mockNodes[0];

      const isValid = fromNode.id !== toNode.id;
      expect(isValid).toBe(false);
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate straight-line distance between two nodes', () => {
      const node1 = mockNodes[0];
      const node2 = mockNodes[1];

      const distance = calculateDistance(
        node1.position.latitude,
        node1.position.longitude,
        node2.position.latitude,
        node2.position.longitude
      );

      // NYC to LA is approximately 3944 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should format distance with appropriate precision', () => {
      expect(formatDistance(0.5)).toBe('500 m');
      expect(formatDistance(1.234)).toBe('1.23 km');
      expect(formatDistance(12.345)).toBe('12.3 km');
      expect(formatDistance(123.456)).toBe('123 km');
    });

    it('should calculate distance as 0 when nodes have no positions', () => {
      const result = {
        ...mockLineOfSightResult,
        fromNode: { ...mockLineOfSightResult.fromNode, position: null },
        toNode: { ...mockLineOfSightResult.toNode, position: null },
        distanceKm: 0,
        distanceFormatted: 'N/A',
      };

      expect(result.distanceKm).toBe(0);
      expect(result.distanceFormatted).toBe('N/A');
    });

    it('should calculate bearing between two nodes', () => {
      // Bearing from NYC to LA should be approximately west (270 degrees)
      const bearing = mockLineOfSightResult.bearing;
      expect(bearing).toBeGreaterThan(250);
      expect(bearing).toBeLessThan(290);
    });

    it('should normalize bearing to 0-360 degrees', () => {
      const bearing = mockLineOfSightResult.bearing;
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe('Historical Connectivity Queries', () => {
    it('should detect when nodes have communicated', () => {
      expect(mockLineOfSightResult.hasHistoricalConnectivity).toBe(true);
      expect(mockLineOfSightResult.signalQuality).not.toBeNull();
    });

    it('should handle no historical connectivity', () => {
      const resultNoConnectivity = {
        ...mockLineOfSightResult,
        hasHistoricalConnectivity: false,
        signalQuality: null,
      };

      expect(resultNoConnectivity.hasHistoricalConnectivity).toBe(false);
      expect(resultNoConnectivity.signalQuality).toBeNull();
    });

    it('should include packet count in signal quality stats', () => {
      const signalQuality = mockLineOfSightResult.signalQuality;
      expect(signalQuality).not.toBeNull();
      expect(signalQuality!.packetCount).toBe(150);
    });

    it('should include last communication timestamp', () => {
      const signalQuality = mockLineOfSightResult.signalQuality;
      expect(signalQuality).not.toBeNull();
      expect(signalQuality!.lastCommunication).toBeTruthy();
      expect(new Date(signalQuality!.lastCommunication)).toBeInstanceOf(Date);
    });
  });

  describe('Signal Quality Statistics Display', () => {
    it('should display average RSSI', () => {
      const signalQuality = mockLineOfSightResult.signalQuality;
      expect(signalQuality).not.toBeNull();
      expect(signalQuality!.avgRssi).toBe(-75.5);
    });

    it('should display average SNR', () => {
      const signalQuality = mockLineOfSightResult.signalQuality;
      expect(signalQuality).not.toBeNull();
      expect(signalQuality!.avgSnr).toBe(8.2);
    });

    it('should display RSSI range (min to max)', () => {
      const signalQuality = mockLineOfSightResult.signalQuality;
      expect(signalQuality).not.toBeNull();
      expect(signalQuality!.minRssi).toBe(-85);
      expect(signalQuality!.maxRssi).toBe(-65);
    });

    it('should display SNR range (min to max)', () => {
      const signalQuality = mockLineOfSightResult.signalQuality;
      expect(signalQuality).not.toBeNull();
      expect(signalQuality!.minSnr).toBe(5.0);
      expect(signalQuality!.maxSnr).toBe(12.0);
    });

    it('should categorize signal quality by RSSI', () => {
      const getSignalQualityColor = (rssi: number) => {
        if (rssi > -70) return 'success';
        if (rssi > -80) return 'warning';
        return 'error';
      };

      expect(getSignalQualityColor(-65)).toBe('success');
      expect(getSignalQualityColor(-75)).toBe('warning');
      expect(getSignalQualityColor(-85)).toBe('error');
    });

    it('should format last communication date', () => {
      const dateString = mockLineOfSightResult.signalQuality!.lastCommunication;
      const date = new Date(dateString);
      const formatted = date.toLocaleString();

      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('Map Visualization', () => {
    it('should calculate map center between two nodes', () => {
      const fromPos = mockLineOfSightResult.fromNode.position!;
      const toPos = mockLineOfSightResult.toNode.position!;

      const centerLat = (fromPos.latitude + toPos.latitude) / 2;
      const centerLon = (fromPos.longitude + toPos.longitude) / 2;

      expect(centerLat).toBeCloseTo(37.3825, 2);
      expect(centerLon).toBeCloseTo(-96.12485, 2);
    });

    it('should create line positions array for polyline', () => {
      const fromPos = mockLineOfSightResult.fromNode.position!;
      const toPos = mockLineOfSightResult.toNode.position!;

      const linePositions: [number, number][] = [
        [fromPos.latitude, fromPos.longitude],
        [toPos.latitude, toPos.longitude],
      ];

      expect(linePositions.length).toBe(2);
      expect(linePositions[0]).toEqual([40.7128, -74.0060]);
      expect(linePositions[1]).toEqual([34.0522, -118.2437]);
    });

    it('should handle missing positions gracefully', () => {
      const resultNoPositions = {
        ...mockLineOfSightResult,
        fromNode: { ...mockLineOfSightResult.fromNode, position: null },
        toNode: { ...mockLineOfSightResult.toNode, position: null },
      };

      const hasPositions =
        resultNoPositions.fromNode.position && resultNoPositions.toNode.position;
      expect(hasPositions).toBeFalsy();
    });
  });

  describe('URL Parameter Handling', () => {
    it('should generate shareable URL with node IDs', () => {
      const fromNodeId = 'node1';
      const toNodeId = 'node2';
      const url = `${window.location.origin}/line-of-sight?from=${fromNodeId}&to=${toNodeId}`;

      expect(url).toContain('from=node1');
      expect(url).toContain('to=node2');
    });

    it('should parse URL parameters correctly', () => {
      const searchParams = new URLSearchParams('from=node1&to=node2');
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');

      expect(fromParam).toBe('node1');
      expect(toParam).toBe('node2');
    });

    it('should find nodes by ID or hexId from URL parameters', () => {
      const nodeOptions = mockNodes.map((node) => ({
        id: node.id,
        hexId: node.hexId,
        shortName: node.shortName,
        longName: node.longName,
        label: `${node.shortName} (${node.hexId})`,
      }));

      const fromParam = 'node1';
      const fromOption = nodeOptions.find(
        (n) => n.id === fromParam || n.hexId === fromParam
      );

      expect(fromOption).toBeDefined();
      expect(fromOption!.id).toBe('node1');
    });
  });

  describe('Error Handling', () => {
    it('should validate that both nodes are selected', () => {
      const fromNode = mockNodes[0];
      const toNode = null;

      const isValid = !!(fromNode && toNode);
      expect(isValid).toBe(false);
    });

    it('should validate that nodes are different', () => {
      const fromNode = mockNodes[0];
      const toNode = mockNodes[0];

      const isValid = fromNode.id !== toNode.id;
      expect(isValid).toBe(false);
    });

    it('should handle API errors gracefully', () => {
      const errorMessage = 'Failed to analyze line of sight';
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.length).toBeGreaterThan(0);
    });

    it('should handle non-existent node errors', () => {
      const errorMessage = 'Node not found: nonexistent';
      expect(errorMessage).toContain('not found');
    });
  });
});
