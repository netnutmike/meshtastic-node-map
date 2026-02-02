/**
 * Distance Display Unit Tests
 * Tests distance label rendering, multi-hop distance calculation, and scatter plot generation
 * Requirements: 39.10, 39.11, 39.15
 */

// Mock data for testing
const mockNodes = [
  {
    id: 'node1',
    shortName: 'Node1',
    position: { latitude: 40.7128, longitude: -74.0060 }, // NYC
  },
  {
    id: 'node2',
    shortName: 'Node2',
    position: { latitude: 34.0522, longitude: -118.2437 }, // LA
  },
  {
    id: 'node3',
    shortName: 'Node3',
    position: { latitude: 41.8781, longitude: -87.6298 }, // Chicago
  },
];

const mockLinks = [
  {
    from_node_id: 'node1',
    to_node_id: 'node2',
    link_type: 'traceroute' as const,
    packet_count: 50,
    avg_rssi: -75,
    avg_snr: 8.5,
    success_rate: 85,
  },
  {
    from_node_id: 'node2',
    to_node_id: 'node3',
    link_type: 'packet' as const,
    packet_count: 30,
    avg_rssi: -80,
    avg_snr: 6.2,
    success_rate: 70,
  },
];

describe('Distance Display', () => {
  describe('Distance Label Rendering', () => {
    it('should format distance correctly for short distances (<1km)', () => {
      const distanceKm = 0.5;
      const formatted = formatDistance(distanceKm);
      expect(formatted).toBe('500 m');
    });

    it('should format distance correctly for medium distances (1-10km)', () => {
      const distanceKm = 5.678;
      const formatted = formatDistance(distanceKm);
      expect(formatted).toBe('5.68 km');
    });

    it('should format distance correctly for long distances (>100km)', () => {
      const distanceKm = 150.789;
      const formatted = formatDistance(distanceKm);
      expect(formatted).toBe('151 km');
    });

    it('should calculate distance between two nodes', () => {
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

    it('should generate distance label for RF link', () => {
      const link = mockLinks[0];
      const fromNode = mockNodes[0];
      const toNode = mockNodes[1];

      const label = generateDistanceLabel(link, fromNode, toNode);
      
      expect(label).toContain('km');
      expect(label.length).toBeGreaterThan(0);
    });

    it('should handle missing position data gracefully', () => {
      const nodeWithoutPosition = { id: 'node4', shortName: 'Node4' };
      const link = { ...mockLinks[0], from_node_id: 'node4' };

      const label = generateDistanceLabel(link, nodeWithoutPosition as any, mockNodes[1]);
      
      expect(label).toBe('');
    });
  });

  describe('Multi-hop Distance Calculation', () => {
    it('should calculate total path distance for 2-hop route', () => {
      const path = [mockNodes[0], mockNodes[1]];
      const totalDistance = calculatePathDistance(path);

      // NYC to LA
      expect(totalDistance).toBeGreaterThan(3900);
      expect(totalDistance).toBeLessThan(4000);
    });

    it('should calculate total path distance for 3-hop route', () => {
      const path = [mockNodes[0], mockNodes[1], mockNodes[2]];
      const totalDistance = calculatePathDistance(path);

      // NYC -> LA -> Chicago
      expect(totalDistance).toBeGreaterThan(5800); // Sum of both hops
      expect(totalDistance).toBeLessThan(7000); // Adjusted upper bound
    });

    it('should return 0 for single node path', () => {
      const path = [mockNodes[0]];
      const totalDistance = calculatePathDistance(path);

      expect(totalDistance).toBe(0);
    });

    it('should return 0 for empty path', () => {
      const path: any[] = [];
      const totalDistance = calculatePathDistance(path);

      expect(totalDistance).toBe(0);
    });

    it('should format multi-hop distance correctly', () => {
      const path = [mockNodes[0], mockNodes[1], mockNodes[2]];
      const totalDistance = calculatePathDistance(path);
      const formatted = formatDistance(totalDistance);

      expect(formatted).toContain('km');
      // "km" contains "m" so we check it ends with "km" instead
      expect(formatted).toMatch(/\d+ km$/);
    });
  });

  describe('Scatter Plot Generation', () => {
    it('should generate scatter plot data points', () => {
      const scatterData = generateScatterPlotData(mockLinks, mockNodes);

      expect(scatterData).toHaveLength(2);
      expect(scatterData[0]).toHaveProperty('distance');
      expect(scatterData[0]).toHaveProperty('rssi');
      expect(scatterData[0]).toHaveProperty('snr');
    });

    it('should calculate distance for each link in scatter plot', () => {
      const scatterData = generateScatterPlotData(mockLinks, mockNodes);

      scatterData.forEach(point => {
        expect(point.distance).toBeGreaterThan(0);
        expect(typeof point.distance).toBe('number');
      });
    });

    it('should include signal quality metrics in scatter plot', () => {
      const scatterData = generateScatterPlotData(mockLinks, mockNodes);

      scatterData.forEach(point => {
        expect(point.rssi).toBeLessThan(0); // RSSI is negative
        expect(point.snr).toBeGreaterThan(0); // SNR is positive
      });
    });

    it('should filter out links with missing position data', () => {
      const linksWithMissing = [
        ...mockLinks,
        {
          from_node_id: 'node_missing',
          to_node_id: 'node2',
          link_type: 'traceroute' as const,
          packet_count: 10,
          avg_rssi: -70,
          avg_snr: 5,
          success_rate: 60,
        },
      ];

      const scatterData = generateScatterPlotData(linksWithMissing, mockNodes);

      // Should only include the 2 valid links
      expect(scatterData).toHaveLength(2);
    });

    it('should sort scatter plot data by distance', () => {
      const scatterData = generateScatterPlotData(mockLinks, mockNodes);
      const sortedData = sortScatterDataByDistance(scatterData);

      for (let i = 0; i < sortedData.length - 1; i++) {
        expect(sortedData[i].distance).toBeLessThanOrEqual(sortedData[i + 1].distance);
      }
    });

    it('should generate chart configuration for distance vs RSSI', () => {
      const scatterData = generateScatterPlotData(mockLinks, mockNodes);
      const chartConfig = generateDistanceVsRSSIChart(scatterData);

      expect(chartConfig).toHaveProperty('type', 'scatter');
      expect(chartConfig).toHaveProperty('data');
      expect(chartConfig).toHaveProperty('options');
      expect(chartConfig.data.datasets).toHaveLength(1);
    });

    it('should generate chart configuration for distance vs SNR', () => {
      const scatterData = generateScatterPlotData(mockLinks, mockNodes);
      const chartConfig = generateDistanceVsSNRChart(scatterData);

      expect(chartConfig).toHaveProperty('type', 'scatter');
      expect(chartConfig).toHaveProperty('data');
      expect(chartConfig).toHaveProperty('options');
      expect(chartConfig.data.datasets).toHaveLength(1);
    });
  });

  describe('Performance with Many Links', () => {
    it('should handle 100 links efficiently', () => {
      const manyLinks = Array.from({ length: 100 }, (_, i) => ({
        from_node_id: `node${i}`,
        to_node_id: `node${i + 1}`,
        link_type: 'traceroute' as const,
        packet_count: 10 + i,
        avg_rssi: -70 - i * 0.1,
        avg_snr: 5 + i * 0.05,
        success_rate: 80 - i * 0.1,
      }));

      const manyNodes = Array.from({ length: 101 }, (_, i) => ({
        id: `node${i}`,
        shortName: `Node${i}`,
        position: {
          latitude: 40 + i * 0.01,
          longitude: -74 + i * 0.01,
        },
      }));

      const startTime = performance.now();
      const scatterData = generateScatterPlotData(manyLinks, manyNodes);
      const endTime = performance.now();

      expect(scatterData).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle 1000 links efficiently', () => {
      const manyLinks = Array.from({ length: 1000 }, (_, i) => ({
        from_node_id: `node${i}`,
        to_node_id: `node${i + 1}`,
        link_type: 'packet' as const,
        packet_count: 10 + i,
        avg_rssi: -70 - (i % 30),
        avg_snr: 5 + (i % 10),
        success_rate: 80 - (i % 50),
      }));

      const manyNodes = Array.from({ length: 1001 }, (_, i) => ({
        id: `node${i}`,
        shortName: `Node${i}`,
        position: {
          latitude: 40 + (i % 10) * 0.1,
          longitude: -74 + (i % 10) * 0.1,
        },
      }));

      const startTime = performance.now();
      const scatterData = generateScatterPlotData(manyLinks, manyNodes);
      const endTime = performance.now();

      expect(scatterData).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(500); // Should complete in <500ms
    });
  });
});

// Helper functions to be implemented in the actual component

function formatDistance(distanceKm: number): string {
  if (distanceKm < 0.01) {
    return `${Math.round(distanceKm * 1000)} m`;
  } else if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(2)} km`;
  } else if (distanceKm < 100) {
    return `${distanceKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceKm)} km`;
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_KM = 6371.0;
  
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  
  const lat1Rad = toRadians(lat1);
  const lon1Rad = toRadians(lon1);
  const lat2Rad = toRadians(lat2);
  const lon2Rad = toRadians(lon2);

  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

function generateDistanceLabel(link: any, fromNode: any, toNode: any): string {
  if (!fromNode?.position || !toNode?.position) {
    return '';
  }

  const distance = calculateDistance(
    fromNode.position.latitude,
    fromNode.position.longitude,
    toNode.position.latitude,
    toNode.position.longitude
  );

  return formatDistance(distance);
}

function calculatePathDistance(path: any[]): number {
  if (path.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    if (!path[i].position || !path[i + 1].position) {
      continue;
    }

    const distance = calculateDistance(
      path[i].position.latitude,
      path[i].position.longitude,
      path[i + 1].position.latitude,
      path[i + 1].position.longitude
    );
    totalDistance += distance;
  }

  return totalDistance;
}

interface ScatterDataPoint {
  distance: number;
  rssi: number;
  snr: number;
  linkType: string;
  fromNode: string;
  toNode: string;
}

function generateScatterPlotData(links: any[], nodes: any[]): ScatterDataPoint[] {
  const scatterData: ScatterDataPoint[] = [];

  links.forEach(link => {
    const fromNode = nodes.find(n => n.id === link.from_node_id);
    const toNode = nodes.find(n => n.id === link.to_node_id);

    if (!fromNode?.position || !toNode?.position) {
      return;
    }

    const distance = calculateDistance(
      fromNode.position.latitude,
      fromNode.position.longitude,
      toNode.position.latitude,
      toNode.position.longitude
    );

    scatterData.push({
      distance,
      rssi: link.avg_rssi,
      snr: link.avg_snr,
      linkType: link.link_type,
      fromNode: fromNode.shortName || fromNode.id,
      toNode: toNode.shortName || toNode.id,
    });
  });

  return scatterData;
}

function sortScatterDataByDistance(data: ScatterDataPoint[]): ScatterDataPoint[] {
  return [...data].sort((a, b) => a.distance - b.distance);
}

function generateDistanceVsRSSIChart(data: ScatterDataPoint[]) {
  return {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Distance vs RSSI',
          data: data.map(point => ({ x: point.distance, y: point.rssi })),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
      ],
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Distance (km)',
          },
        },
        y: {
          title: {
            display: true,
            text: 'RSSI (dBm)',
          },
        },
      },
    },
  };
}

function generateDistanceVsSNRChart(data: ScatterDataPoint[]) {
  return {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Distance vs SNR',
          data: data.map(point => ({ x: point.distance, y: point.snr })),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
        },
      ],
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Distance (km)',
          },
        },
        y: {
          title: {
            display: true,
            text: 'SNR (dB)',
          },
        },
      },
    },
  };
}
