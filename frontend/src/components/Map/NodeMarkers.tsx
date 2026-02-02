import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { RootState } from '../../store';
import { Node, openDetailsPanel, closeDetailsPanel, activateNeighborVisualization, deactivateNeighborVisualization } from '../../store/slices/nodeSlice';
import NodeDetailsPanel from '../NodeDetailsPanel';
import NeighborArrows from './NeighborArrows';
import NodeClusters, { useNodeClusters } from './NodeClusters';
import { getHardwareName } from '../../utils/hardwareModels';
import { computeNodesWithinHops, RFLink } from '../../utils/hopDepthCalculation';
import { apiService } from '../../services/api';

// Create custom icons for different node states with enhanced styling and age-based effects
const createNodeIcon = (
  status: 'online' | 'disconnected' | 'offline', 
  isAnimated: boolean = false, 
  ageOpacity: number = 1.0,
  isOld: boolean = false,
  viewMode: 'nodes' | 'nodeTypes' | 'bandwidthUtilization' = 'nodes',
  node?: Node
) => {
  let colors = {
    online: '#4caf50',      // Green
    disconnected: '#2196f3', // Blue  
    offline: '#f44336',     // Red
  };

  // Adjust colors based on view mode (Requirements 8.4, 8.5)
  if (viewMode === 'nodeTypes' && node) {
    const typeColors = {
      'ROUTER': '#9c27b0',     // Purple
      'REPEATER': '#ff5722',   // Deep Orange
      'CLIENT': '#00bcd4',     // Cyan
      'CLIENT_MUTE': '#607d8b', // Blue Grey
      'CLIENT_HIDDEN': '#795548', // Brown
      'TRACKER': '#ff9800',    // Orange
      'SENSOR': '#4caf50',     // Green
      'TAK': '#e91e63',        // Pink
      'TAK_TRACKER': '#f44336', // Red
      'TELEMETRY_REQUEST': '#3f51b5', // Indigo
    };
    const nodeColor = typeColors[node.role as keyof typeof typeColors] || '#9e9e9e';
    colors = { online: nodeColor, disconnected: nodeColor, offline: nodeColor };
  } else if (viewMode === 'bandwidthUtilization' && node) {
    // Color based on channel utilization
    const utilization = node.channelUtilization || 0;
    let utilizationColor = '#4caf50'; // Green for low utilization
    
    if (utilization > 75) {
      utilizationColor = '#f44336'; // Red for high utilization
    } else if (utilization > 50) {
      utilizationColor = '#ff9800'; // Orange for medium utilization
    } else if (utilization > 25) {
      utilizationColor = '#ffeb3b'; // Yellow for moderate utilization
    }
    
    colors = { online: utilizationColor, disconnected: utilizationColor, offline: utilizationColor };
  }

  const animationClass = isAnimated ? 'node-marker-pulse' : '';
  const ageClass = isOld ? 'node-marker-old' : '';

  return L.divIcon({
    className: `custom-node-marker ${animationClass} ${ageClass}`,
    html: `<div class="node-marker-container">
      <div class="node-marker-dot" style="
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: ${colors[status]};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        opacity: ${ageOpacity};
        ${isOld ? 'filter: grayscale(0.3);' : ''}
      "></div>
      ${isAnimated ? '<div class="node-marker-pulse-ring"></div>' : ''}
      ${isOld ? '<div class="node-marker-age-indicator"></div>' : ''}
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Add CSS for animations and age-based styling
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
    
    .node-marker-old .node-marker-dot:hover {
      transform: scale(1.1);
      filter: grayscale(0.1) !important;
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
    
    .node-marker-age-indicator {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 6px;
      height: 6px;
      background-color: #ff9800;
      border: 1px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
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
    
    @keyframes age-fade {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
      100% {
        opacity: 1;
      }
    }
    
    .node-marker-old {
      animation: age-fade 3s ease-in-out infinite;
    }
    
    .leaflet-marker-icon.custom-node-marker {
      background: transparent !important;
      border: none !important;
    }
    
    .node-label-tooltip {
      background-color: rgba(255, 255, 255, 0.95) !important;
      border: 1px solid #ccc !important;
      border-radius: 4px !important;
      padding: 2px 6px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #333 !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
      white-space: nowrap !important;
    }
    
    .node-label-tooltip::before {
      border-right-color: #ccc !important;
    }
  `;
  document.head.appendChild(style);
};

const getNodeStatus = (node: Node, nodesOfflineAge: number, nodesDisconnectedAge: number): 'online' | 'disconnected' | 'offline' => {
  if (!node.lastSeen) return 'offline';
  
  const ageSeconds = (Date.now() - new Date(node.lastSeen).getTime()) / 1000;
  
  // Offline if last seen is older than offline threshold
  if (ageSeconds > nodesOfflineAge) {
    return 'offline';
  }
  
  // Disconnected if MQTT not connected or last seen is older than disconnected threshold
  if (!node.mqttConnected || ageSeconds > nodesDisconnectedAge) {
    return 'disconnected';
  }
  
  // Online if within thresholds and MQTT connected
  return 'online';
};

// Check if a node was recently updated (within last 5 minutes)
const isRecentlyUpdated = (node: Node): boolean => {
  if (!node.lastSeen) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const lastSeen = new Date(node.lastSeen);
  return lastSeen > fiveMinutesAgo;
};

const NodeMarkers: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    nodes, 
    selectedNodeId, 
    detailsPanelOpen,
    returnPath,
    neighborVisualizationActive,
    neighborVisualizationNodeId 
  } = useSelector((state: RootState) => state.nodes);
  const {
    showNodes,
    showNodeLabels,
    animationsEnabled,
    nodeDisplayMode,
    viewMode,
    showRFLinks,
    hopDepthFilter,
    selectedNodeForHopFilter,
  } = useSelector((state: RootState) => state.map);
  const { showAll, nodesMaxAge, nodesOfflineAge, nodesDisconnectedAge } = useSelector((state: RootState) => state.settings);
  const map = useMap();
  const prevNodesRef = useRef<Node[]>([]);
  const [zoom, setZoom] = React.useState(map.getZoom());
  const [mapBounds, setMapBounds] = React.useState(map.getBounds());
  const [rfLinks, setRfLinks] = useState<RFLink[]>([]);

  // Add styles on component mount
  useEffect(() => {
    addNodeMarkerStyles();
  }, []);

  // Fetch RF links for hop depth filtering
  useEffect(() => {
    const fetchLinks = async () => {
      if (!showRFLinks || !selectedNodeForHopFilter || hopDepthFilter === null) {
        return;
      }

      try {
        const response = await apiService.getRFLinks({ hours: 24 });
        if (response.data) {
          setRfLinks(response.data.all_links);
        }
      } catch (error) {
        console.error('Failed to fetch RF links for hop depth filtering:', error);
      }
    };

    fetchLinks();
  }, [showRFLinks, selectedNodeForHopFilter, hopDepthFilter]);

  // Compute visible nodes based on hop depth filter
  const visibleNodeIdsFromHopFilter = useMemo(() => {
    if (!showRFLinks || !selectedNodeForHopFilter || hopDepthFilter === null || rfLinks.length === 0) {
      return null; // No filter active
    }

    return computeNodesWithinHops(selectedNodeForHopFilter, hopDepthFilter, rfLinks);
  }, [showRFLinks, selectedNodeForHopFilter, hopDepthFilter, rfLinks]);

  // Track zoom and bounds changes
  useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
      setMapBounds(map.getBounds());
    },
    moveend: () => {
      setMapBounds(map.getBounds());
    },
  });

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
    const filtered = nodes
      .filter(node => node.position) // Only show nodes with valid position data
      .filter(node => {
        // Hop depth filtering (Requirements 34.8, 34.9)
        if (visibleNodeIdsFromHopFilter) {
          return visibleNodeIdsFromHopFilter.has(node.id);
        }
        return true;
      })
      .filter(node => {
        // Node display mode filtering (Requirements 8.2)
        if (nodeDisplayMode === 'none') {
          return false; // Hide all nodes
        }
        
        if (nodeDisplayMode === 'routers') {
          return node.role === 'ROUTER' || node.role === 'REPEATER';
        }
        
        // For 'all' and 'clustered' modes, show all nodes (clustering handled by map layer)
        return true;
      })
      .filter(node => {
        // Age-based filtering logic (Requirements 13.4)
        if (showAll) {
          return true; // Show all nodes when showAll is enabled
        }
        
        // Apply age filtering when showAll is disabled
        if (!node.lastSeen) {
          return false; // Hide nodes without lastSeen timestamp
        }
        
        const nodeAgeSeconds = (Date.now() - new Date(node.lastSeen).getTime()) / 1000;
        return nodeAgeSeconds <= nodesMaxAge;
      })
      .map(node => {
        const status = getNodeStatus(node, nodesOfflineAge, nodesDisconnectedAge);
        const isRecent = isRecentlyUpdated(node);
        const shouldAnimate = animationsEnabled && isRecent;
        
        // Calculate age-based visual effects
        let ageOpacity = 1.0;
        let isOld = false;
        
        if (node.lastSeen) {
          const nodeAgeSeconds = (Date.now() - new Date(node.lastSeen).getTime()) / 1000;
          const ageRatio = nodeAgeSeconds / nodesMaxAge;
          
          // Nodes older than 75% of max age are considered "old"
          isOld = ageRatio > 0.75;
          
          // Gradually reduce opacity as nodes get older (minimum 0.6 opacity)
          if (ageRatio > 0.5) {
            ageOpacity = Math.max(0.6, 1.0 - (ageRatio - 0.5) * 0.8);
          }
        }
        
        const icon = createNodeIcon(status, shouldAnimate, ageOpacity, isOld, viewMode, node);
        
        return {
          ...node,
          status,
          isRecent,
          isOld,
          ageOpacity,
          icon,
        };
      });
    
    return filtered;
  }, [
    nodes,
    animationsEnabled,
    showAll,
    nodesMaxAge,
    nodesOfflineAge,
    nodesDisconnectedAge,
    nodeDisplayMode,
    viewMode,
    visibleNodeIdsFromHopFilter,
  ]);

  // Get clustered node IDs to hide individual markers
  const clusteredNodeIds = useNodeClusters(processedNodes, zoom, mapBounds);

  // Filter out nodes that are part of clusters
  const visibleNodes = useMemo(() => {
    const baseNodes = processedNodes.filter(node => !clusteredNodeIds.has(node.id));
    
    // Detect and handle co-located nodes (nodes at the exact same position)
    const positionMap = new Map<string, any[]>();
    
    baseNodes.forEach(node => {
      const key = `${node.position!.latitude.toFixed(7)},${node.position!.longitude.toFixed(7)}`;
      if (!positionMap.has(key)) {
        positionMap.set(key, []);
      }
      positionMap.get(key)!.push(node);
    });
    
    // For co-located nodes, offset them slightly in a circle pattern
    const result: any[] = [];
    positionMap.forEach((nodesAtPosition, posKey) => {
      if (nodesAtPosition.length === 1) {
        // Single node at this position - no offset needed
        result.push(nodesAtPosition[0]);
      } else {
        // Multiple nodes at same position - offset them in a circle
        const offsetDistance = 0.00005; // ~5 meters at this latitude
        nodesAtPosition.forEach((node, index) => {
          const angle = (index / nodesAtPosition.length) * 2 * Math.PI;
          const offsetLat = Math.cos(angle) * offsetDistance;
          const offsetLng = Math.sin(angle) * offsetDistance;
          
          result.push({
            ...node,
            position: {
              ...node.position,
              latitude: node.position!.latitude + offsetLat,
              longitude: node.position!.longitude + offsetLng,
            },
            isColocated: true,
            colocatedCount: nodesAtPosition.length,
          });
        });
      }
    });
    
    return result;
  }, [processedNodes, clusteredNodeIds]);

  // Get the selected node for the details panel
  const selectedNode = selectedNodeId ? nodes.find(node => node.id === selectedNodeId) || null : null;

  if (!showNodes) {
    return null;
  }

  // Removed excessive logging - only cluster click events are logged now

  return (
    <>
      <NodeClusters nodes={processedNodes} />
      
      {visibleNodes.map(node => (
        <Marker
          key={node.id}
          position={[node.position!.latitude, node.position!.longitude]}
          icon={node.icon}
        >
          {showNodeLabels && (
            <Tooltip 
              permanent 
              direction="right" 
              offset={[12, 0]}
              className="node-label-tooltip"
            >
              {node.shortName || node.longName}
            </Tooltip>
          )}
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
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  opacity: node.ageOpacity || 1.0
                }} />
                <h4 style={{ margin: 0, flex: 1 }}>{node.longName || node.shortName}</h4>
                {node.isRecent && (
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#4caf50', 
                    fontWeight: 'bold',
                    marginRight: '4px'
                  }}>
                    LIVE
                  </span>
                )}
                {node.isOld && (
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#ff9800', 
                    fontWeight: 'bold',
                    backgroundColor: '#fff3e0',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    border: '1px solid #ffcc02'
                  }}>
                    OLD
                  </span>
                )}
              </div>
              
              <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                <p style={{ margin: '4px 0' }}><strong>Short Name:</strong> {node.shortName}</p>
                {node.longName && (
                  <p style={{ margin: '4px 0' }}><strong>Long Name:</strong> {node.longName}</p>
                )}
                <p style={{ margin: '4px 0' }}><strong>Hex ID:</strong> {node.hexId}</p>
                <p style={{ margin: '4px 0' }}><strong>Hardware:</strong> {getHardwareName(node.hardwareModel)}</p>
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
                    <strong>Last Seen:</strong> {node.lastSeen ? new Date(node.lastSeen).toLocaleString() : 'Never'}
                    {node.lastSeen && (() => {
                      const ageSeconds = (Date.now() - new Date(node.lastSeen).getTime()) / 1000;
                      const ageMinutes = Math.floor(ageSeconds / 60);
                      const ageHours = Math.floor(ageMinutes / 60);
                      const ageDays = Math.floor(ageHours / 24);
                      
                      let ageText = '';
                      let ageColor = '#666';
                      
                      if (ageDays > 0) {
                        ageText = ` (${ageDays}d ago)`;
                        ageColor = '#f44336';
                      } else if (ageHours > 0) {
                        ageText = ` (${ageHours}h ago)`;
                        ageColor = ageHours > 12 ? '#ff9800' : '#666';
                      } else if (ageMinutes > 0) {
                        ageText = ` (${ageMinutes}m ago)`;
                        ageColor = '#4caf50';
                      } else {
                        ageText = ' (just now)';
                        ageColor = '#4caf50';
                      }
                      
                      return (
                        <span style={{ color: ageColor, fontWeight: 'bold' }}>
                          {ageText}
                        </span>
                      );
                    })()}
                  </p>
                  <p style={{ margin: '2px 0' }}>
                    <strong>Last Heard:</strong> {node.lastHeard ? new Date(node.lastHeard).toLocaleString() : 'Never'}
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
                      dispatch(openDetailsPanel({ nodeId: node.id }));
                    }}
                  >
                    Show Full Details
                  </button>
                  
                  <button
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: neighborVisualizationActive && neighborVisualizationNodeId === node.id ? '#2e7d32' : '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (neighborVisualizationActive && neighborVisualizationNodeId === node.id) {
                        dispatch(deactivateNeighborVisualization());
                      } else {
                        dispatch(activateNeighborVisualization({ nodeId: node.id, direction: 'heard-us' }));
                      }
                    }}
                  >
                    {neighborVisualizationActive && neighborVisualizationNodeId === node.id ? 'Hide' : 'Show'} Neighbors That Heard Us
                  </button>
                  
                  <button
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: neighborVisualizationActive && neighborVisualizationNodeId === node.id ? '#e65100' : '#ff9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (neighborVisualizationActive && neighborVisualizationNodeId === node.id) {
                        dispatch(deactivateNeighborVisualization());
                      } else {
                        dispatch(activateNeighborVisualization({ nodeId: node.id, direction: 'we-heard' }));
                      }
                    }}
                  >
                    {neighborVisualizationActive && neighborVisualizationNodeId === node.id ? 'Hide' : 'Show'} Neighbors That We Heard
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* Neighbor visualization arrows */}
      <NeighborArrows />
      
      <NodeDetailsPanel
        node={selectedNode}
        isOpen={detailsPanelOpen}
        onClose={() => {
          dispatch(closeDetailsPanel());
          if (returnPath) {
            navigate(returnPath);
          }
        }}
      />
    </>
  );
};

export default NodeMarkers;