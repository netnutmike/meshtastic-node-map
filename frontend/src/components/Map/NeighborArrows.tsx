import React, { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Node, NodeNeighbor } from '../../store/slices/nodeSlice';

// Calculate signal strength color based on RSSI
const getSignalStrengthColor = (rssi?: number): string => {
  if (!rssi) return '#666666'; // Gray for unknown signal
  
  // RSSI typically ranges from -30 (excellent) to -120 (very poor)
  if (rssi >= -50) return '#4caf50';      // Green - Excellent
  if (rssi >= -70) return '#8bc34a';      // Light Green - Good  
  if (rssi >= -85) return '#ffeb3b';      // Yellow - Fair
  if (rssi >= -100) return '#ff9800';     // Orange - Poor
  return '#f44336';                       // Red - Very Poor
};

// Calculate line opacity based on signal quality
const getSignalOpacity = (rssi?: number, snr?: number): number => {
  if (!rssi) return 0.5;
  
  // Higher RSSI = more opaque line
  const normalizedRssi = Math.max(0, Math.min(1, (rssi + 120) / 90)); // Normalize -120 to -30 range
  return Math.max(0.3, normalizedRssi);
};

// Calculate line weight based on hop count (closer neighbors = thicker lines)
const getLineWeight = (hopCount: number): number => {
  return Math.max(2, 6 - hopCount); // 1 hop = 5px, 2 hops = 4px, etc.
};

interface NeighborArrowsProps {
  // No props needed - component reads from Redux store
}

const NeighborArrows: React.FC<NeighborArrowsProps> = () => {
  const { 
    nodes, 
    neighborVisualizationActive, 
    neighborVisualizationNodeId, 
    neighborVisualizationDirection 
  } = useSelector((state: RootState) => state.nodes);

  // Calculate neighbor connections to display
  const neighborConnections = useMemo(() => {
    if (!neighborVisualizationActive || !neighborVisualizationNodeId) {
      return [];
    }

    const sourceNode = nodes.find(node => node.id === neighborVisualizationNodeId);
    if (!sourceNode || !sourceNode.position) {
      return [];
    }

    const connections: Array<{
      from: { lat: number; lng: number; node: Node };
      to: { lat: number; lng: number; node: Node };
      neighbor: NodeNeighbor;
      color: string;
      opacity: number;
      weight: number;
    }> = [];

    if (neighborVisualizationDirection === 'heard-us') {
      // Show nodes that heard us (outgoing connections)
      sourceNode.neighbors?.forEach(neighbor => {
        const targetNode = nodes.find(node => node.id === neighbor.neighborId);
        if (targetNode && targetNode.position) {
          connections.push({
            from: {
              lat: sourceNode.position!.latitude,
              lng: sourceNode.position!.longitude,
              node: sourceNode
            },
            to: {
              lat: targetNode.position.latitude,
              lng: targetNode.position.longitude,
              node: targetNode
            },
            neighbor,
            color: getSignalStrengthColor(neighbor.rssi),
            opacity: getSignalOpacity(neighbor.rssi, neighbor.snr),
            weight: getLineWeight(neighbor.hopCount)
          });
        }
      });
    } else if (neighborVisualizationDirection === 'we-heard') {
      // Show nodes that we heard (incoming connections)
      nodes.forEach(node => {
        if (node.neighbors && node.position) {
          node.neighbors.forEach(neighbor => {
            if (neighbor.neighborId === sourceNode.id) {
              connections.push({
                from: {
                  lat: node.position!.latitude,
                  lng: node.position!.longitude,
                  node: node
                },
                to: {
                  lat: sourceNode.position!.latitude,
                  lng: sourceNode.position!.longitude,
                  node: sourceNode
                },
                neighbor,
                color: getSignalStrengthColor(neighbor.rssi),
                opacity: getSignalOpacity(neighbor.rssi, neighbor.snr),
                weight: getLineWeight(neighbor.hopCount)
              });
            }
          });
        }
      });
    }

    return connections;
  }, [
    nodes, 
    neighborVisualizationActive, 
    neighborVisualizationNodeId, 
    neighborVisualizationDirection
  ]);

  if (!neighborVisualizationActive || neighborConnections.length === 0) {
    return null;
  }

  return (
    <>
      {neighborConnections.map((connection, index) => (
        <Polyline
          key={`neighbor-arrow-${index}`}
          positions={[
            [connection.from.lat, connection.from.lng],
            [connection.to.lat, connection.to.lng]
          ]}
          color={connection.color}
          weight={connection.weight}
          opacity={connection.opacity}
          dashArray={connection.neighbor.hopCount > 1 ? '5, 5' : undefined} // Dashed for multi-hop
        >
          <Tooltip>
            <div style={{ fontSize: '12px' }}>
              <strong>
                {connection.from.node.shortName} → {connection.to.node.shortName}
              </strong>
              <br />
              {connection.neighbor.rssi && (
                <>RSSI: {connection.neighbor.rssi} dBm<br /></>
              )}
              {connection.neighbor.snr && (
                <>SNR: {connection.neighbor.snr} dB<br /></>
              )}
              Hops: {connection.neighbor.hopCount}
              <br />
              Last Heard: {new Date(connection.neighbor.lastHeard).toLocaleString()}
            </div>
          </Tooltip>
        </Polyline>
      ))}
    </>
  );
};

export default NeighborArrows;