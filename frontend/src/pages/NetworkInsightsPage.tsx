import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import NavigationHeader from '../components/Layout/NavigationHeader';
import Footer from '../components/Layout/Footer';
import { MQTTMonitor } from '../components/MQTTMonitor';
import NetworkTopologyGraph from '../components/Map/NetworkTopologyGraph';
import { RootState } from '../store';
import { setNodes } from '../store/slices/nodeSlice';
import { openTopologyGraph, closeTopologyGraph } from '../store/slices/mapSlice';
import apiService from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`insights-tabpanel-${index}`}
      aria-labelledby={`insights-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const NetworkInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const topologyGraphOpen = useSelector((state: RootState) => state.map.topologyGraphOpen);
  const nodes = useSelector((state: RootState) => state.nodes.nodes);
  const [activeTab, setActiveTab] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [mqttMonitorOpen, setMqttMonitorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [traceroutes, setTraceroutes] = useState<any[]>([]);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate loads (especially in React StrictMode dev double-invoke)
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load data sequentially with longer delays to avoid rate limiting
        await loadMessages();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadNodes();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadTraceroutes();
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - only run once on mount

  const loadMessages = async () => {
    try {
      console.log('NetworkInsightsPage: Loading messages...');
      
      // Fetch all messages by making multiple paginated requests
      let allMessages: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      const pageSize = 100; // Maximum allowed by backend
      
      while (hasMorePages) {
        const response = await apiService.getMessages({
          page: currentPage,
          limit: pageSize
        });
        
        allMessages = allMessages.concat(response.data || []);
        
        // Check if there are more pages
        if (response.pagination) {
          const { page, pages } = response.pagination;
          hasMorePages = page < pages;
          currentPage++;
          console.log(`NetworkInsightsPage: Loaded messages page ${page}/${pages} (${response.data.length} messages)`);
        } else {
          hasMorePages = false;
        }
        
        // Safety check to prevent infinite loops
        if (currentPage > 100) {
          console.warn('NetworkInsightsPage: Reached maximum page limit (100), stopping pagination');
          break;
        }
      }
      
      console.log('NetworkInsightsPage: Loaded all messages:', allMessages.length);
      setMessages(allMessages);
    } catch (error) {
      console.error('NetworkInsightsPage: Failed to load messages:', error);
      setMessages([]);
    }
  };

  const loadTraceroutes = async () => {
    try {
      const response = await apiService.getTraceroutes({ maxAge: 24, limit: 100 });
      
      // Check if response.data exists, otherwise use response directly
      const data = response.data || response;
      
      if (data && (data as any).traceroutes) {
        const tracerouteData = (data as any).traceroutes;
        console.log('NetworkInsightsPage: Loaded traceroutes:', tracerouteData);
        // Log first traceroute's toNode to debug
        if (tracerouteData.length > 0) {
          console.log('NetworkInsightsPage: First traceroute toNode:', tracerouteData[0].toNode);
          console.log('NetworkInsightsPage: First traceroute hops:', tracerouteData[0].hops);
        }
        setTraceroutes(tracerouteData);
      } else {
        console.warn('NetworkInsightsPage: No traceroutes found in response');
        setTraceroutes([]);
      }
    } catch (error) {
      console.error('NetworkInsightsPage: Failed to load traceroutes:', error);
      setTraceroutes([]);
    }
  };

  const loadNodes = async () => {
    try {
      console.log('NetworkInsightsPage: Loading nodes...');
      
      // Fetch all nodes by making multiple paginated requests
      let allNodes: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      const pageSize = 100; // Maximum allowed by backend
      
      while (hasMorePages) {
        const response = await apiService.getNodes({
          page: currentPage,
          limit: pageSize,
          sortBy: 'lastSeen',
          sortOrder: 'desc'
        });
        
        allNodes = allNodes.concat(response.data || []);
        
        // Check if there are more pages
        if (response.pagination) {
          const { page, pages } = response.pagination;
          hasMorePages = page < pages;
          currentPage++;
          console.log(`NetworkInsightsPage: Loaded page ${page}/${pages} (${response.data.length} nodes)`);
        } else {
          hasMorePages = false;
        }
        
        // Safety check to prevent infinite loops
        if (currentPage > 100) {
          console.warn('NetworkInsightsPage: Reached maximum page limit (100), stopping pagination');
          break;
        }
      }
      
      console.log('NetworkInsightsPage: Loaded all nodes:', allNodes.length);
      
      // Transform API response to frontend format
      const transformedNodes = allNodes.map((node: any) => ({
        id: node.id,
        hexId: node.hexId,
        shortName: node.shortName,
        longName: node.longName,
        hardwareModel: node.hardwareModel,
        firmwareVersion: node.firmwareVersion,
        role: node.role,
        position: node.positions && node.positions.length > 0 ? {
          latitude: node.positions[0].latitude,
          longitude: node.positions[0].longitude,
          altitude: node.positions[0].altitude,
          precision: node.positions[0].precision,
        } : null,
        lastSeen: node.lastSeen,
        lastHeard: node.lastHeard,
        isOnline: node.isOnline,
        mqttConnected: node.mqttConnected,
        batteryLevel: node.batteryLevel,
        voltage: node.voltage,
        channelUtilization: node.channelUtilization,
        airUtilTx: node.airUtilTx,
        neighbors: node.neighborsFrom || [],
      }));
      
      console.log('NetworkInsightsPage: Dispatching nodes to Redux store:', transformedNodes.length);
      dispatch(setNodes(transformedNodes));
    } catch (error) {
      console.error('NetworkInsightsPage: Failed to load nodes:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleOpenMQTTMonitor = () => {
    setMqttMonitorOpen(true);
  };

  const handleCloseMQTTMonitor = () => {
    setMqttMonitorOpen(false);
  };

  const handleOpenTopology = () => {
    // Open topology graph modal on current page
    dispatch(openTopologyGraph());
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadMessages();
      await loadNodes();
      await loadTraceroutes();
    } finally {
      setIsLoading(false);
    }
  };

  // Messages Tab
  const renderMessagesTab = () => {
    // Filter for TEXT type messages only (actual chat messages)
    const chatMessages = messages.filter(m => m.type === 'TEXT');

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Chat Messages
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Showing {chatMessages.length} text messages out of {messages.length} total messages
        </Typography>
        <TableContainer component={Paper} className="responsive-table">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Sender</TableCell>
                <TableCell className="hide-mobile">Receiver</TableCell>
                <TableCell>Message</TableCell>
                <TableCell className="hide-mobile">Topic</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chatMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">
                      No text messages available
                      {messages.length > 0 && ` (${messages.length} non-text messages in database)`}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                chatMessages.map((msg, idx) => {
                  // Extract text content from message
                  let textContent = 'N/A';
                  if (msg.content) {
                    if (typeof msg.content === 'string') {
                      textContent = msg.content;
                    } else if (msg.content.text) {
                      textContent = msg.content.text;
                    } else {
                      textContent = JSON.stringify(msg.content);
                    }
                  }

                  return (
                    <TableRow key={idx}>
                      <TableCell>{new Date(msg.timestamp || msg.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{msg.fromNode?.shortName || msg.fromNode?.longName || 'Unknown'}</TableCell>
                      <TableCell className="hide-mobile">{msg.toNode?.shortName || msg.toNode?.longName || 'Broadcast'}</TableCell>
                      <TableCell>{textContent}</TableCell>
                      <TableCell className="hide-mobile">
                        <Chip label={msg.topic || 'N/A'} size="small" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Network Graph Tab
  const renderNetworkGraphTab = () => {
    // Build a set of all node IDs that are mentioned as neighbors
    const heardByNodeIds = new Set<string>();
    nodes.forEach(node => {
      if (node.neighbors && node.neighbors.length > 0) {
        node.neighbors.forEach(neighbor => {
          heardByNodeIds.add(neighbor.neighborId);
        });
      }
    });

    // Filter to only show nodes that:
    // 1. Have neighbors (they heard someone), OR
    // 2. Are heard by other nodes (someone heard them)
    const nodesWithNeighborRelationships = nodes.filter(node => {
      const hasNeighbors = node.neighbors && node.neighbors.length > 0;
      const isHeardByOthers = heardByNodeIds.has(node.id);
      return hasNeighbors || isHeardByOthers;
    });

    // For each node, calculate which nodes heard it
    const getHeardByNodes = (nodeId: string) => {
      return nodes.filter(n => 
        n.neighbors && n.neighbors.some(neighbor => neighbor.neighborId === nodeId)
      );
    };

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Node Neighbor Relationships
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Showing only nodes with neighbor relationships ({nodesWithNeighborRelationships.length} nodes)
        </Typography>
        <TableContainer component={Paper} className="responsive-table">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Short Name</TableCell>
                <TableCell className="hide-mobile">Long Name</TableCell>
                <TableCell>Neighbors Heard</TableCell>
                <TableCell className="hide-mobile">Heard By</TableCell>
                <TableCell className="hide-mobile">Last Update</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nodesWithNeighborRelationships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">No neighbor relationships available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                nodesWithNeighborRelationships.map((node) => {
                  const heardByNodes = getHeardByNodes(node.id);
                  
                  return (
                    <TableRow key={node.id}>
                      <TableCell>{node.shortName || node.hexId}</TableCell>
                      <TableCell className="hide-mobile">{node.longName || 'N/A'}</TableCell>
                      <TableCell>
                        {node.neighbors && node.neighbors.length > 0 ? (
                          <Box>
                            {node.neighbors.map((n, idx) => {
                              // Find the neighbor node to get its short name
                              const neighborNode = nodes.find(nd => nd.id === n.neighborId);
                              const displayName = neighborNode?.shortName || neighborNode?.hexId || n.neighborId;
                              
                              return (
                                <Chip
                                  key={idx}
                                  label={`${displayName} (${n.snr?.toFixed(1) || 'N/A'}dB)`}
                                  size="small"
                                  sx={{ m: 0.5 }}
                                />
                              );
                            })}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell className="hide-mobile">
                        {heardByNodes.length > 0 ? (
                          <Box>
                            {heardByNodes.map((heardByNode, idx) => (
                              <Chip
                                key={idx}
                                label={heardByNode.shortName || heardByNode.hexId}
                                size="small"
                                sx={{ m: 0.5 }}
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell className="hide-mobile">{node.lastSeen ? new Date(node.lastSeen).toLocaleString() : 'Never'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Traceroutes Tab
  const renderTraceroutesTab = () => {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Traceroute Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Showing {traceroutes.length} traceroute messages from the last 24 hours
        </Typography>
        
        <TableContainer component={Paper} className="responsive-table">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell>Hops</TableCell>
                <TableCell>Path</TableCell>
                <TableCell className="hide-mobile">RSSI</TableCell>
                <TableCell className="hide-mobile">SNR</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {traceroutes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">
                      No traceroute data available
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                traceroutes.map((trace) => (
                  <TableRow key={trace.id}>
                    <TableCell>
                      {new Date(trace.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {(trace.fromNode.shortName && trace.fromNode.shortName.trim()) ? trace.fromNode.shortName : trace.fromNode.hexId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {trace.toNode 
                          ? ((trace.toNode.shortName && trace.toNode.shortName.trim()) ? trace.toNode.shortName : trace.toNode.hexId)
                          : (trace.hops && trace.hops.length > 0 
                              ? (trace.hops[trace.hops.length - 1].shortName || trace.hops[trace.hops.length - 1].hexId)
                              : 'Broadcast')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={trace.hopCount} 
                        size="small" 
                        color={trace.hopCount <= 3 ? 'success' : trace.hopCount <= 5 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {trace.hops.map((hop: any, idx: number) => {
                          // Use shortName if it exists and is not empty, otherwise use hexId
                          const displayName = (hop.shortName && hop.shortName.trim()) ? hop.shortName : hop.hexId || hop.nodeId;
                          
                          return (
                            <React.Fragment key={idx}>
                              <Chip
                                label={displayName}
                                size="small"
                                variant={hop.isValid ? 'filled' : 'outlined'}
                                color={hop.isValid ? 'primary' : 'default'}
                                sx={{ fontSize: '0.75rem' }}
                              />
                              {idx < trace.hops.length - 1 && (
                                <Typography variant="caption" sx={{ alignSelf: 'center', mx: 0.5 }}>
                                  →
                                </Typography>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </Box>
                    </TableCell>
                    <TableCell className="hide-mobile">
                      {trace.rssi ? (
                        <Chip 
                          label={`${trace.rssi} dBm`} 
                          size="small"
                          color={trace.rssi >= -70 ? 'success' : trace.rssi >= -90 ? 'warning' : 'error'}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell className="hide-mobile">
                      {trace.snr !== null && trace.snr !== undefined ? (
                        <Chip 
                          label={`${trace.snr.toFixed(1)} dB`} 
                          size="small"
                          color={trace.snr >= 5 ? 'success' : trace.snr >= 0 ? 'warning' : 'error'}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <NavigationHeader 
        onRefresh={handleRefresh}
        onOpenMQTTMonitor={handleOpenMQTTMonitor}
        onOpenTopology={handleOpenTopology}
      />
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="network insights tabs">
            <Tab label="Messages" />
            <Tab label="Neighbors" />
            <Tab label="Traceroutes" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {renderMessagesTab()}
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          {renderNetworkGraphTab()}
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          {renderTraceroutesTab()}
        </TabPanel>
      </Box>

      {/* MQTT Monitor */}
      <MQTTMonitor 
        isVisible={mqttMonitorOpen}
        onClose={handleCloseMQTTMonitor}
      />

      {/* Network Topology Graph */}
      <NetworkTopologyGraph
        isOpen={topologyGraphOpen}
        onClose={() => dispatch(closeTopologyGraph())}
      />

      <Footer />
    </Box>
  );
};

export default NetworkInsightsPage;
