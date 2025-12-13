import React, { useMemo, useEffect, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { useSelector, useDispatch } from 'react-redux';
import L from 'leaflet';
import { RootState } from '../../store';
import { Node, openDetailsPanel, closeDetailsPanel } from '../../store/slices/nodeSlice';
import NodeDetailsPanel from '../NodeDetailsPanel';

// Create custom icons for different node states with enhanced styling
const createNodeIcon = (status: 'online' | 'disconnected' | 'offline', isAnimated: boolean = false) => {
  const colors = {
    online: '#4caf50',      // Green
    disconnected: '#2196f3', // Blue  
    offline: '#f44336',     // Red
  };

  const animationClass = isAnimated ? 'node-marker-pulse' : '';

  return L.divIcon({
    className: `custom-node-marker ${animationClass}`,
    html: `<div class="node-marker-container">
      <div class="node-marker-dot" style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: ${colors[status]};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
      "></div>
      ${isAnimated ? '<div class="node-marker-pulse-ring"></div>' : ''}
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// Add CSS for animations
const addNodeMarkerStyles = () => {
  if (document.getElementById('node-marker-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'node-marker-styles';
  style.textContent = `
    .node-marker-container {
      position: relative;
      width: 16px;
      height: 16px;
    }
    
    .node-marker-pulse .node-marker-dot:hover {
      transform: scale(1.2);
    }
    
    .node-marker-pulse-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      border: 2px solid #4caf50;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: pulse-ring 2s infinite;
      opacity: 0.6;
    }
    
    @keyframes pulse-ring {
      0% {
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 0.8;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.4;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.5);
        opacity: 0;
      }
    }
    
    .leaflet-marker-icon.custom-node-marker {
      background: transparent !important;
      border: none !important;
    }
    

  `;
  document.head.appendChild(style);
};

const getNodeStatus = (node: Node): 'online' | 'disconnected' | 'offline' => {
  if (!node.isOnline) return 'offline';
  if (!node.mqttConnected) return 'disconnected';
  return 'online';
};

// Check if a node was recently updated (within last 5 minutes)
const isRecentlyUpdated = (node: Node): boolean => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const lastSeen = new Date(node.lastSeen);
  return lastSeen > fiveMinutesAgo;
};

const NodeMarkers: React.FC = () => {
  const dispatch = useDispatch();
  const { nodes, selectedNodeId, detailsPanelOpen } = useSelector((state: RootState) => state.nodes);
  const { showNodes, animationsEnabled } = useSelector((state: RootState) => state.map);
  const map = useMap();
  const prevNodesRef = useRef<Node[]>([]);

  // Add styles on component mount
  useEffect(() => {
    addNodeMarkerStyles();
  }, []);

  // Handle real-time position updates with smooth animations
  useEffect(() => {
    const prevNodes = prevNodesRef.current;
    const currentNodes = nodes.filter(node => node.position);

    // Check for position updates and animate if needed
    currentNodes.forEach(currentNode => {
      const prevNode = prevNodes.find(n => n.id === currentNode.id);
      if (prevNode && prevNode.position && currentNode.position) {
        const prevPos = [prevNode.position.latitude, prevNode.position.longitude];
        const currentPos = [currentNode.position.latitude, currentNode.position.longitude];
        
        // If position changed significantly (more than ~10 meters), it's a real update
        const distance = map.distance(prevPos as [number, number], currentPos as [number, number]);
        if (distance > 10) {
          // Position updated - this would trigger re-render with animation
          console.log(`Node ${currentNode.shortName} position updated by ${distance.toFixed(1)}m`);
        }
      }
    });

    prevNodesRef.current = currentNodes;
  }, [nodes, map]);

  // Memoize filtered and processed nodes for performance
  const processedNodes = useMemo(() => {
    return nodes
      .filter(node => node.position) // Only show nodes with valid position data
      .map(node => {
        const status = getNodeStatus(node);
        const isRecent = isRecentlyUpdated(node);
        const shouldAnimate = animationsEnabled && isRecent;
        const icon = createNodeIcon(status, shouldAnimate);
        
        return {
          ...node,
          status,
          isRecent,
          icon,
        };
      });
  }, [nodes, animationsEnabled]);

  // Get the selected node for the details panel
  const selectedNode = selectedNodeId ? nodes.find(node => node.id === selectedNodeId) || null : null;

  if (!showNodes) return null;

  return (
    <>
      {processedNodes.map(node => (
        <Marker
          key={node.id}
          position={[node.position!.latitude, node.position!.longitude]}
          icon={node.icon}
        >
          <Popup maxWidth={300} minWidth={250}>
            <div style={{ minWidth: '200px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '8px',
                borderBottom: '1px solid #eee',
                paddingBottom: '8px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: node.status === 'online' ? '#4caf50' : 
                                   node.status === 'disconnected' ? '#2196f3' : '#f44336',
                  marginRight: '8px',
                  border: '2px solid white',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }} />
                <h4 style={{ margin: 0, flex: 1 }}>{node.longName || node.shortName}</h4>
                {node.isRecent && (
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#4caf50', 
                    fontWeight: 'bold' 
                  }}>
                    LIVE
                  </span>
                )}
              </div>
              
              <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                <p style={{ margin: '4px 0' }}><strong>Short Name:</strong> {node.shortName}</p>
                <p style={{ margin: '4px 0' }}><strong>ID:</strong> {node.id}</p>
                <p style={{ margin: '4px 0' }}><strong>Hex ID:</strong> {node.hexId}</p>
                <p style={{ margin: '4px 0' }}><strong>Hardware:</strong> {node.hardwareModel}</p>
                <p style={{ margin: '4px 0' }}><strong>Role:</strong> {node.role}</p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Status:</strong> 
                  <span style={{ 
                    color: node.status === 'online' ? '#4caf50' : 
                           node.status === 'disconnected' ? '#2196f3' : '#f44336',
                    fontWeight: 'bold',
                    marginLeft: '4px'
                  }}>
                    {node.status.toUpperCase()}
                  </span>
                </p>
                
                {node.batteryLevel !== undefined && node.batteryLevel !== null && (
                  <p style={{ margin: '4px 0' }}>
                    <strong>Battery:</strong> 
                    <span style={{ 
                      color: node.batteryLevel > 50 ? '#4caf50' : 
                             node.batteryLevel > 20 ? '#ff9800' : '#f44336',
                      fontWeight: 'bold',
                      marginLeft: '4px'
                    }}>
                      {node.batteryLevel}%
                    </span>
                  </p>
                )}
                
                {node.voltage !== undefined && node.voltage !== null && !isNaN(node.voltage) && (
                  <p style={{ margin: '4px 0' }}><strong>Voltage:</strong> {node.voltage.toFixed(2)}V</p>
                )}
                
                {node.channelUtilization !== undefined && node.channelUtilization !== null && (
                  <p style={{ margin: '4px 0' }}>
                    <strong>Channel Util:</strong> {node.channelUtilization}%
                  </p>
                )}
                
                {node.airUtilTx !== undefined && node.airUtilTx !== null && (
                  <p style={{ margin: '4px 0' }}>
                    <strong>Air Utilization:</strong> {node.airUtilTx}%
                  </p>
                )}
                
                {node.position?.altitude && (
                  <p style={{ margin: '4px 0' }}><strong>Altitude:</strong> {node.position.altitude}m</p>
                )}
                
                {node.position?.precision !== undefined && node.position?.precision !== null && (
                  <p style={{ margin: '4px 0' }}><strong>GPS Precision:</strong> ±{node.position.precision}m</p>
                )}
                
                <div style={{ 
                  marginTop: '8px', 
                  paddingTop: '8px', 
                  borderTop: '1px solid #eee',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <p style={{ margin: '2px 0' }}>
                    <strong>Last Seen:</strong> {new Date(node.lastSeen).toLocaleString()}
                  </p>
                  <p style={{ margin: '2px 0' }}>
                    <strong>Last Heard:</strong> {new Date(node.lastHeard).toLocaleString()}
                  </p>
                  <p style={{ margin: '2px 0' }}>
                    <strong>Position:</strong> {node.position!.latitude.toFixed(6)}, {node.position!.longitude.toFixed(6)}
                  </p>
                </div>

                {/* Action Buttons - Requirements 2.2, 2.3, 2.4 */}
                <div style={{ 
                  marginTop: '12px', 
                  paddingTop: '8px', 
                  borderTop: '1px solid #eee',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <button
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(openDetailsPanel(node.id));
                    }}
                  >
                    Show Full Details
                  </button>
                  
                  <button
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement neighbor visualization functionality
                      console.log('Show Neighbors That Heard Us for node:', node.id);
                    }}
                  >
                    Show Neighbors That Heard Us
                  </button>
                  
                  <button
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement reverse neighbor visualization functionality
                      console.log('Show Neighbors That We Heard for node:', node.id);
                    }}
                  >
                    Show Neighbors That We Heard
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      
      <NodeDetailsPanel
        node={selectedNode}
        isOpen={detailsPanelOpen}
        onClose={() => dispatch(closeDetailsPanel())}
      />
    </>
  );
};

export default NodeMarkers;