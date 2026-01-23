import React, { useMemo, useEffect } from 'react';
import { CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Node } from '../../store/slices/nodeSlice';

interface NodeClustersProps {
  nodes: any[]; // Processed nodes with position
  onClusterClick?: (nodeIds: string[]) => void;
}

interface Cluster {
  lat: number;
  lng: number;
  count: number;
  nodes: any[];
  nodeIds: Set<string>;
}

// Grid-based clustering algorithm
const clusterNodes = (nodes: any[], zoom: number, mapBounds: any): { clusters: Cluster[], clusteredNodeIds: Set<string> } => {
  // Don't cluster at zoom level 12 and higher - only show clusters at zoom 11 and lower
  if (zoom >= 12) {
    return { clusters: [], clusteredNodeIds: new Set() };
  }

  // Calculate grid size based on zoom level (in degrees)
  // Lower zoom = larger grid cells = more clustering
  const gridSize = zoom <= 6 ? 5 : zoom <= 8 ? 2 : zoom <= 10 ? 1 : zoom <= 12 ? 0.3 : 0.1;

  const grid: { [key: string]: Cluster } = {};
  const clusteredNodeIds = new Set<string>();

  // Only cluster nodes that are visible on the map
  const visibleNodes = nodes.filter(node => {
    if (!node.position || !mapBounds) return false;
    const { latitude, longitude } = node.position;
    return (
      latitude >= mapBounds.getSouth() &&
      latitude <= mapBounds.getNorth() &&
      longitude >= mapBounds.getWest() &&
      longitude <= mapBounds.getEast()
    );
  });

  visibleNodes.forEach(node => {
    if (!node.position) return;

    // Round coordinates to grid
    const gridLat = Math.floor(node.position.latitude / gridSize) * gridSize;
    const gridLng = Math.floor(node.position.longitude / gridSize) * gridSize;
    const key = `${gridLat},${gridLng}`;

    if (!grid[key]) {
      grid[key] = {
        lat: 0,
        lng: 0,
        count: 0,
        nodes: [],
        nodeIds: new Set(),
      };
    }

    grid[key].count++;
    grid[key].nodes.push(node);
    grid[key].nodeIds.add(node.id);
  });

  // Calculate centroid for each cluster and filter out single-node clusters
  const clusters = Object.values(grid)
    .filter(cluster => cluster.count > 1) // Only clusters with 2+ nodes
    .map(cluster => {
      // Calculate centroid (average position)
      const sumLat = cluster.nodes.reduce((sum, n) => sum + n.position.latitude, 0);
      const sumLng = cluster.nodes.reduce((sum, n) => sum + n.position.longitude, 0);
      
      cluster.lat = sumLat / cluster.count;
      cluster.lng = sumLng / cluster.count;
      
      // Add all node IDs to the clustered set
      cluster.nodeIds.forEach(id => clusteredNodeIds.add(id));
      
      return cluster;
    });

  return { clusters, clusteredNodeIds };
};

// Add CSS for cluster styling
const addClusterStyles = () => {
  if (document.getElementById('node-cluster-styles')) return;

  const style = document.createElement('style');
  style.id = 'node-cluster-styles';
  style.textContent = `
    .cluster-marker-small {
      background-color: rgba(110, 204, 57, 0.8);
      border: 3px solid rgba(181, 226, 140, 0.9);
    }
    
    .cluster-marker-medium {
      background-color: rgba(240, 194, 12, 0.8);
      border: 3px solid rgba(241, 211, 87, 0.9);
    }
    
    .cluster-marker-large {
      background-color: rgba(241, 128, 23, 0.8);
      border: 3px solid rgba(253, 156, 115, 0.9);
    }
    
    .cluster-tooltip {
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
    
    .cluster-tooltip::before {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
};

const NodeClusters: React.FC<NodeClustersProps> = ({ nodes, onClusterClick }) => {
  const map = useMap();
  const [zoom, setZoom] = React.useState(map.getZoom());
  const [mapBounds, setMapBounds] = React.useState(map.getBounds());

  useEffect(() => {
    addClusterStyles();
  }, []);

  // Update zoom level and bounds when map changes
  useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
      setMapBounds(map.getBounds());
    },
    moveend: () => {
      setMapBounds(map.getBounds());
    },
  });

  // Calculate clusters based on current zoom and bounds
  const { clusters, clusteredNodeIds } = useMemo(() => {
    const result = clusterNodes(nodes, zoom, mapBounds);
    // Removed excessive logging - only cluster click events are logged now
    return result;
  }, [nodes, zoom, mapBounds]);

  // Don't render anything at zoom level 12 and higher
  if (zoom >= 12) {
    return null;
  }

  return (
    <>
      {clusters.map((cluster, index) => {
        // Determine cluster size and styling
        let radius = 18;
        let className = 'cluster-marker-small';

        if (cluster.count >= 100) {
          radius = 30;
          className = 'cluster-marker-large';
        } else if (cluster.count >= 10) {
          radius = 24;
          className = 'cluster-marker-medium';
        }

        return (
          <CircleMarker
            key={`cluster-${index}-${cluster.lat}-${cluster.lng}`}
            center={[cluster.lat, cluster.lng]}
            radius={radius}
            pathOptions={{
              fillColor: 'transparent',
              fillOpacity: 0,
              color: 'transparent',
              weight: 0,
            }}
            className={className}
            eventHandlers={{
              click: () => {
                const nodeIdsArray = Array.from(cluster.nodeIds);
                console.log('=== CLUSTER CLICKED ===');
                console.log('Cluster count:', cluster.count);
                console.log('Node IDs in cluster:', nodeIdsArray);
                console.log('Current zoom:', zoom);
                console.log('Target zoom:', Math.max(12, zoom + 2));
                console.log('Cluster center:', cluster.lat, cluster.lng);
                console.log('Individual nodes in cluster:');
                cluster.nodes.forEach((node, idx) => {
                  console.log(`  ${idx + 1}. ${node.shortName || node.id} - Lat: ${node.position.latitude}, Lng: ${node.position.longitude}`);
                });
                console.log('=======================');
                
                // Zoom in to level 12 or higher to ensure nodes are visible
                const targetZoom = Math.max(12, zoom + 2);
                map.setView([cluster.lat, cluster.lng], Math.min(targetZoom, 18));
                if (onClusterClick) {
                  onClusterClick(nodeIdsArray);
                }
              },
            }}
          >
            <Tooltip
              permanent
              direction="center"
              className="cluster-tooltip"
              offset={[0, 0]}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: `${radius * 2}px`,
                  height: `${radius * 2}px`,
                  borderRadius: '50%',
                  fontSize: radius > 20 ? '14px' : '12px',
                  fontWeight: 'bold',
                  color: 'white',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                className={className}
              >
                {cluster.count}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
};

// Export the clusteredNodeIds so NodeMarkers can hide them
export const useNodeClusters = (nodes: any[], zoom: number, mapBounds: any) => {
  return useMemo(() => {
    if (zoom >= 12) {
      return new Set<string>();
    }
    const { clusteredNodeIds } = clusterNodes(nodes, zoom, mapBounds);
    return clusteredNodeIds;
  }, [nodes, zoom, mapBounds]);
};

export default NodeClusters;
