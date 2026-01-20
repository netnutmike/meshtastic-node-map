import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FormControl,
  Select,
  MenuItem,
  Chip,
  Link,
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import NavigationHeader from '../components/Layout/NavigationHeader';
import Footer from '../components/Layout/Footer';
import { MQTTMonitor } from '../components/MQTTMonitor';
import { RootState } from '../store';
import { setNodes } from '../store/slices/nodeSlice';
import apiService from '../services/api';
import { getHardwareName, getHardwareDocUrl } from '../utils/hardwareModels';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

const NetworkInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('all');
  const [databaseOverview, setDatabaseOverview] = useState<any>(null);
  const [messageTimeline, setMessageTimeline] = useState<any>(null);
  const [topTalkers, setTopTalkers] = useState<any>(null);
  const [mqttMonitorOpen, setMqttMonitorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const nodes = useSelector((state: RootState) => state.nodes.nodes);
  const dispatch = useDispatch();
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
        
        await loadDatabaseOverview();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadMessageTimeline();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadTopTalkers();
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

  const loadDatabaseOverview = async () => {
    try {
      console.log('NetworkInsightsPage: Loading database overview...');
      const response = await apiService.getDatabaseOverview();
      console.log('NetworkInsightsPage: Loaded database overview:', response.data);
      setDatabaseOverview(response.data);
    } catch (error) {
      console.error('NetworkInsightsPage: Failed to load database overview:', error);
      setDatabaseOverview(null);
    }
  };

  const loadMessageTimeline = async () => {
    try {
      console.log('NetworkInsightsPage: Loading message timeline...');
      const response = await apiService.getMessageTimeline({
        days: 3,
        intervalMinutes: 15
      });
      console.log('NetworkInsightsPage: Loaded message timeline:', response.data);
      setMessageTimeline(response.data);
    } catch (error) {
      console.error('NetworkInsightsPage: Failed to load message timeline:', error);
      setMessageTimeline(null);
    }
  };

  const loadTopTalkers = async () => {
    try {
      console.log('NetworkInsightsPage: Loading top talkers...');
      // Set requireShortName to true to only include nodes with shortNames
      const response = await apiService.getTopTalkers({ limit: 20, requireShortName: true });
      console.log('NetworkInsightsPage: Loaded top talkers:', response.data);
      setTopTalkers(response.data);
    } catch (error) {
      console.error('NetworkInsightsPage: Failed to load top talkers:', error);
      setTopTalkers(null);
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
    // Navigate to map page - the topology graph is rendered in MapComponent
    navigate('/map');
  };

  // Messages Tab
  const renderMessagesTab = () => {
    const chatMessages = messages.filter(m => m.type === 'TEXT_MESSAGE_APP' || m.type === 'chat');

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Chat Messages
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Sender</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Topic</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chatMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary">No messages available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                chatMessages.map((msg, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(msg.timestamp || msg.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{msg.fromNode?.shortName || msg.from || 'Unknown'}</TableCell>
                    <TableCell>{msg.text || msg.payload || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip label={msg.topic || 'N/A'} size="small" />
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

  // Network Graph Tab
  const renderNetworkGraphTab = () => {
    // Filter to only show nodes with short names
    const nodesWithShortNames = nodes.filter(node => node.shortName && node.shortName.trim() !== '');

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Node Neighbor Relationships
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Showing only nodes with short names ({nodesWithShortNames.length} nodes)
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Short Name</TableCell>
                <TableCell>Long Name</TableCell>
                <TableCell>Neighbors Heard</TableCell>
                <TableCell>Heard By</TableCell>
                <TableCell>Last Update</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nodesWithShortNames.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">No nodes with short names available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                nodesWithShortNames.map((node) => (
                  <TableRow key={node.id}>
                    <TableCell>{node.shortName}</TableCell>
                    <TableCell>{node.longName}</TableCell>
                    <TableCell>
                      {node.neighbors && node.neighbors.length > 0 ? (
                        <Box>
                          {node.neighbors.map((n, idx) => (
                            <Chip
                              key={idx}
                              label={`${n.neighborId} (${n.snr}dB)`}
                              size="small"
                              sx={{ m: 0.5 }}
                            />
                          ))}
                        </Box>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {/* Nodes that heard this node - would need backend support */}
                    </TableCell>
                    <TableCell>{node.lastSeen ? new Date(node.lastSeen).toLocaleString() : 'Never'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Memoized Statistics Tab to prevent flashing on re-renders
  const StatisticsTabContent = useMemo(() => {
    // Message type distribution (using 'type' field which is actually stored)
    const typeCounts = messages.reduce((acc: any, msg) => {
      const type = msg.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const typeData = Object.entries(typeCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Messages by topic distribution
    const topicCounts = messages.reduce((acc: any, msg) => {
      const topic = msg.topic || 'unknown';
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});

    const topicData = Object.entries(topicCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Hardware types
    const nodesList = nodes; // nodes is already an array
    const hardwareCounts = nodesList.reduce((acc: any, node) => {
      const hw = node.hardwareModel || 'unknown';
      const friendlyName = getHardwareName(hw);
      acc[friendlyName] = (acc[friendlyName] || 0) + 1;
      return acc;
    }, {});

    const hardwareData = Object.entries(hardwareCounts)
      .filter(([name]) => name.toLowerCase() !== 'unknown')
      .map(([name, value]) => ({
        name,
        value,
      }));

    // Nodes by role
    const roleCounts = nodesList.reduce((acc: any, node) => {
      const role = node.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const roleData = Object.entries(roleCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Network health score (simplified calculation)
    const onlineNodes = nodesList.filter(n => n.isOnline).length;
    const totalNodes = nodesList.length;
    const healthScore = totalNodes > 0 ? Math.round((onlineNodes / totalNodes) * 100) : 0;

    // Format message timeline data for chart
    const timelineData = messageTimeline?.dataPoints?.map((point: any) => ({
      time: new Date(point.timestamp).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      count: point.count
    })) || [];

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Network Statistics
        </Typography>

        {/* Database Overview Section */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Database Overview
          </Typography>
          {databaseOverview ? (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Records: {databaseOverview.total?.toLocaleString()}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mt: 2 }}>
                {Object.entries(databaseOverview.tables || {}).map(([table, count]: [string, any]) => (
                  <Box key={table} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {table.charAt(0).toUpperCase() + table.slice(1)}
                    </Typography>
                    <Typography variant="h6">
                      {count.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Typography color="text.secondary">Loading database overview...</Typography>
          )}
        </Paper>

        {/* Message Timeline Section */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            MQTT Message Timeline (Last 3 Days)
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Messages received in 15-minute intervals
          </Typography>
          {messageTimeline && timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval="preserveStartEnd"
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Messages" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <Typography color="text.secondary">
                {messageTimeline === null ? 'Loading message timeline...' : 'No message data available'}
              </Typography>
            </Box>
          )}
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3, mt: 2 }}>
          {/* Message Type Distribution */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Message Type Distribution
            </Typography>
            {typeData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No message data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {typeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>

          {/* Messages by Topic */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Messages by Topic
            </Typography>
            {topicData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No message data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topicData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>

          {/* Hardware Types */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Hardware Distribution
            </Typography>
            {hardwareData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No node data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={hardwareData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {hardwareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>

          {/* Nodes by Role */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Nodes by Role
            </Typography>
            {roleData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No node data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {roleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>

          {/* Network Health Score */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Network Health Score
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 250 }}>
              <Typography variant="h1" sx={{ fontSize: '4rem', fontWeight: 'bold', color: healthScore > 75 ? '#4caf50' : healthScore > 50 ? '#ff9800' : '#f44336' }}>
                {healthScore}%
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {onlineNodes} of {totalNodes} nodes online
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }, [messages, nodes, messageTimeline, databaseOverview]);

  // Statistics Tab - wrapper function
  const renderStatisticsTab = () => StatisticsTabContent;

  // Top Talkers Tab
  const renderTopTalkersTab = () => {
    if (!topTalkers) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
          <Typography color="text.secondary">Loading top talkers...</Typography>
        </Box>
      );
    }

    const talkers = topTalkers.talkers || [];
    const top10 = talkers.slice(0, 10);

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Top Talkers
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} size="small">
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="hour">Last Hour</MenuItem>
              <MenuItem value="day">Last Day</MenuItem>
              <MenuItem value="week">Last Week</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Bar Chart */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Top 10 Most Active Nodes
          </Typography>
          {top10.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <Typography color="text.secondary">No data available</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10.map((t: any) => ({ nodeName: t.displayName || t.shortName || t.nodeIdHex, count: t.messageCount }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nodeName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Node Name</TableCell>
                <TableCell align="right">Message Count</TableCell>
                <TableCell align="right">Activity %</TableCell>
                <TableCell>Last Active</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {talkers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">No activity data available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                talkers.map((talker: any, idx: number) => (
                  <TableRow key={talker.nodeId}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      {talker.displayName || talker.shortName || talker.nodeIdHex}
                      {!talker.hasShortName && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          (No name set)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{talker.messageCount}</TableCell>
                    <TableCell align="right">
                      {talker.percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell>{new Date(talker.lastActive).toLocaleString()}</TableCell>
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
        onOpenMQTTMonitor={handleOpenMQTTMonitor}
        onOpenTopology={handleOpenTopology}
      />
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="network insights tabs">
            <Tab label="Messages" />
            <Tab label="Neighbors" />
            <Tab label="Statistics" />
            <Tab label="Top Talkers" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {renderMessagesTab()}
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          {renderNetworkGraphTab()}
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          {renderStatisticsTab()}
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          {renderTopTalkersTab()}
        </TabPanel>
      </Box>

      {/* MQTT Monitor */}
      <MQTTMonitor 
        isVisible={mqttMonitorOpen}
        onClose={handleCloseMQTTMonitor}
      />

      <Footer />
    </Box>
  );
};

export default NetworkInsightsPage;
