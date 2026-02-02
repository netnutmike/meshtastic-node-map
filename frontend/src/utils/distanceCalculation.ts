/**
 * Distance Calculation Utilities
 * Provides functions for calculating and formatting distances between nodes
 * Requirements: 39.10, 39.11, 39.15
 */

export interface Position {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface ScatterDataPoint {
  distance: number;
  rssi: number;
  snr: number;
  linkType: string;
  fromNode: string;
  toNode: string;
  successRate: number;
}

const EARTH_RADIUS_KM = 6371.0;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

/**
 * Format distance with appropriate precision
 */
export function formatDistance(distanceKm: number): string {
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

/**
 * Calculate total path distance for multi-hop routes
 */
export function calculatePathDistance(positions: Position[]): number {
  if (positions.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 0; i < positions.length - 1; i++) {
    const distance = calculateDistance(
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
 * Generate scatter plot data from RF links and nodes
 */
export function generateScatterPlotData(
  links: any[],
  nodes: any[]
): ScatterDataPoint[] {
  const scatterData: ScatterDataPoint[] = [];

  links.forEach(link => {
    const fromNode = nodes.find((n: any) => n.id === link.from_node_id);
    const toNode = nodes.find((n: any) => n.id === link.to_node_id);

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
      successRate: link.success_rate,
    });
  });

  return scatterData;
}

/**
 * Sort scatter data by distance
 */
export function sortScatterDataByDistance(
  data: ScatterDataPoint[]
): ScatterDataPoint[] {
  return [...data].sort((a, b) => a.distance - b.distance);
}

/**
 * Generate Chart.js configuration for distance vs RSSI scatter plot
 */
export function generateDistanceVsRSSIChart(data: ScatterDataPoint[]) {
  return {
    type: 'scatter' as const,
    data: {
      datasets: [
        {
          label: 'Distance vs RSSI',
          data: data.map(point => ({ x: point.distance, y: point.rssi })),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Distance vs Signal Strength (RSSI)',
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const point = data[context.dataIndex];
              return [
                `Distance: ${formatDistance(point.distance)}`,
                `RSSI: ${point.rssi.toFixed(1)} dBm`,
                `From: ${point.fromNode}`,
                `To: ${point.toNode}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Distance (km)',
          },
          beginAtZero: true,
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

/**
 * Generate Chart.js configuration for distance vs SNR scatter plot
 */
export function generateDistanceVsSNRChart(data: ScatterDataPoint[]) {
  return {
    type: 'scatter' as const,
    data: {
      datasets: [
        {
          label: 'Distance vs SNR',
          data: data.map(point => ({ x: point.distance, y: point.snr })),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Distance vs Signal-to-Noise Ratio (SNR)',
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const point = data[context.dataIndex];
              return [
                `Distance: ${formatDistance(point.distance)}`,
                `SNR: ${point.snr.toFixed(1)} dB`,
                `From: ${point.fromNode}`,
                `To: ${point.toNode}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Distance (km)',
          },
          beginAtZero: true,
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
