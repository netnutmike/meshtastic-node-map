import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  Chip, 
  Alert, 
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import { 
  RadioButtonChecked, 
  Warning, 
  CheckCircle, 
  Error, 
  TrendingUp, 
  Place, 
  Visibility,
  VisibilityOff,
  SignalCellularAlt
} from '@mui/icons-material';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../services/api';
import './CoverageAnalysis.css';

interface RadioRange {
  nodeId: string;
  latitude: number;
  longitude: number;
  rangeMeters: number;
  hardwareModel: string;
  transmitPower?: number;
  antennaGain?: number;
}

interface CoverageGap {
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

interface HypotheticalNode {
  id: string;
  latitude: number;
  longitude: number;
  hardwareModel: string;
  transmitPower?: number;
  antennaGain?: number;
}

interface NetworkOptimization {
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

interface LineOfSightResult {
  fromNodeId: string;
  toNodeId: string;
  hasLineOfSight: boolean;
  obstacleElevation?: number;
  fresnelZoneClearance: number;
}

interface PerformanceEstimate {
  messageDeliveryRate: number;
  averageLatency: number;
  hopCount: number;
  signalStrength: number;
}

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
      id={`coverage-tabpanel-${index}`}
      aria-labelledby={`coverage-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Custom map component for placing hypothetical nodes
function NodePlacementMap({ 
  onNodePlace, 
  hypotheticalNodes, 
  onNodeRemove,
  radioRanges,
  coverageGaps,
  showRanges,
  showGaps
}: {
  onNodePlace: (lat: number, lng: number) => void;
  hypotheticalNodes: HypotheticalNode[];
  onNodeRemove: (id: string) => void;
  radioRanges: RadioRange[];
  coverageGaps: CoverageGap[];
  showRanges: boolean;
  showGaps: boolean;
}) {
  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        onNodePlace(e.latlng.lat, e.latlng.lng);
      }
    });
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#ffeb3b';
      default: return '#9e9e9e';
    }
  };

  return (
    <MapContainer
      center={[40.7128, -74.0060]}
      zoom={10}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapClickHandler />
      
      {/* Existing node ranges */}
      {showRanges && radioRanges.map((range) => (
        <Circle
          key={`range-${range.nodeId}`}
          center={[range.latitude, range.longitude]}
          radius={range.rangeMeters}
          pathOptions={{
            color: '#2196f3',
            fillColor: '#2196f3',
            fillOpacity: 0.1,
            weight: 2
          }}
        >
          <Popup>
            <div>
              <strong>Node: {range.nodeId}</strong><br />
              Hardware: {range.hardwareModel}<br />
              Range: {(range.rangeMeters / 1000).toFixed(1)} km
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Coverage gaps */}
      {showGaps && coverageGaps.map((gap) => (
        <Circle
          key={`gap-${gap.id}`}
          center={[gap.latitude, gap.longitude]}
          radius={gap.gapRadius}
          pathOptions={{
            color: getSeverityColor(gap.severity),
            fillColor: getSeverityColor(gap.severity),
            fillOpacity: 0.3,
            weight: 2,
            dashArray: '5, 5'
          }}
        >
          <Popup>
            <div>
              <strong>Coverage Gap</strong><br />
              Severity: {gap.severity}<br />
              Radius: {(gap.gapRadius / 1000).toFixed(1)} km<br />
              Nearest nodes: {gap.nearestNodes.length}
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Hypothetical nodes */}
      {hypotheticalNodes.map((node) => (
        <Marker
          key={node.id}
          position={[node.latitude, node.longitude]}
          icon={L.divIcon({
            className: 'hypothetical-node-marker',
            html: '<div style="background: #4caf50; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })}
        >
          <Popup>
            <div>
              <strong>Hypothetical Node</strong><br />
              Hardware: {node.hardwareModel}<br />
              <Button 
                size="small" 
                color="error" 
                onClick={() => onNodeRemove(node.id)}
              >
                Remove
              </Button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export const CoverageAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [radioRanges, setRadioRanges] = useState<RadioRange[]>([]);
  const [coverageGaps, setCoverageGaps] = useState<CoverageGap[]>([]);
  const [hypotheticalNodes, setHypotheticalNodes] = useState<HypotheticalNode[]>([]);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [optimizationRecommendations, setOptimizationRecommendations] = useState<NetworkOptimization | null>(null);
  const [lineOfSightResults, setLineOfSightResults] = useState<LineOfSightResult[]>([]);
  const [performanceEstimates, setPerformanceEstimates] = useState<PerformanceEstimate[]>([]);
  
  // UI states
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('');
  const [newNodeHardware, setNewNodeHardware] = useState('TBEAM');
  const [showRanges, setShowRanges] = useState(true);
  const [showGaps, setShowGaps] = useState(true);
  const [selectedFromNode, setSelectedFromNode] = useState('');
  const [selectedToNode, setSelectedToNode] = useState('');

  const hardwareOptions = [
    'TBEAM',
    'HELTEC_V3',
    'TLORA_V2',
    'TLORA_V1',
    'LORA32_V2_1'
  ];

  // Load initial data
  useEffect(() => {
    loadRadioRanges();
    loadCoverageGaps();
    loadOptimizationRecommendations();
  }, [selectedNetworkId]);

  const loadRadioRanges = async () => {
    try {
      setLoading(true);
      const params = selectedNetworkId ? { networkId: selectedNetworkId } : {};
      const response = await api.get('/coverage-analysis/radio-ranges', { params });
      setRadioRanges(response.data);
    } catch (err) {
      setError('Failed to load radio ranges');
      console.error('Error loading radio ranges:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCoverageGaps = async () => {
    try {
      const params = selectedNetworkId ? { networkId: selectedNetworkId } : {};
      const response = await api.get('/coverage-analysis/coverage-gaps', { params });
      setCoverageGaps(response.data);
    } catch (err) {
      setError('Failed to load coverage gaps');
      console.error('Error loading coverage gaps:', err);
    }
  };

  const loadOptimizationRecommendations = async () => {
    try {
      const params = selectedNetworkId ? { networkId: selectedNetworkId } : {};
      const response = await api.get('/coverage-analysis/optimization-recommendations', { params });
      setOptimizationRecommendations(response.data);
    } catch (err) {
      setError('Failed to load optimization recommendations');
      console.error('Error loading optimization recommendations:', err);
    }
  };

  const handleNodePlace = useCallback((lat: number, lng: number) => {
    const newNode: HypotheticalNode = {
      id: `hyp_${Date.now()}`,
      latitude: lat,
      longitude: lng,
      hardwareModel: newNodeHardware
    };
    setHypotheticalNodes(prev => [...prev, newNode]);
  }, [newNodeHardware]);

  const handleNodeRemove = useCallback((id: string) => {
    setHypotheticalNodes(prev => prev.filter(node => node.id !== id));
  }, []);

  const runSimulation = async () => {
    if (hypotheticalNodes.length === 0) {
      setError('Please place at least one hypothetical node on the map');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/coverage-analysis/simulate-deployment', {
        hypotheticalNodes,
        networkId: selectedNetworkId || undefined
      });
      setSimulationResults(response.data);
    } catch (err) {
      setError('Failed to run simulation');
      console.error('Error running simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateLineOfSight = async () => {
    if (!selectedFromNode || !selectedToNode) {
      setError('Please select both nodes for line-of-sight calculation');
      return;
    }

    try {
      setLoading(true);
      const params = selectedNetworkId ? { networkId: selectedNetworkId } : {};
      const response = await api.get(
        `/coverage-analysis/line-of-sight/${selectedFromNode}/${selectedToNode}`,
        { params }
      );
      setLineOfSightResults(prev => [...prev, response.data]);
    } catch (err) {
      setError('Failed to calculate line of sight');
      console.error('Error calculating line of sight:', err);
    } finally {
      setLoading(false);
    }
  };

  const estimatePerformance = async () => {
    if (!selectedFromNode || !selectedToNode) {
      setError('Please select both nodes for performance estimation');
      return;
    }

    try {
      setLoading(true);
      const params = selectedNetworkId ? { networkId: selectedNetworkId } : {};
      const response = await api.get(
        `/coverage-analysis/performance-estimate/${selectedFromNode}/${selectedToNode}`,
        { params }
      );
      setPerformanceEstimates(prev => [...prev, response.data]);
    } catch (err) {
      setError('Failed to estimate performance');
      console.error('Error estimating performance:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <Error color="error" />;
      case 'medium': return <Warning color="warning" />;
      case 'low': return <CheckCircle color="success" />;
      default: return <RadioButtonChecked />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box className="coverage-analysis">
      <Typography variant="h4" gutterBottom>
        Coverage Analysis & Network Planning
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Radio Ranges" />
          <Tab label="Coverage Gaps" />
          <Tab label="Deployment Simulation" />
          <Tab label="Line of Sight" />
          <Tab label="Performance Analysis" />
          <Tab label="Optimization" />
        </Tabs>
      </Box>

      {/* Radio Ranges Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Radio Range Visualization
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={showRanges ? <Visibility /> : <VisibilityOff />}
                    onClick={() => setShowRanges(!showRanges)}
                    sx={{ mr: 1 }}
                  >
                    {showRanges ? 'Hide' : 'Show'} Ranges
                  </Button>
                  <Button
                    variant="contained"
                    onClick={loadRadioRanges}
                    disabled={loading}
                  >
                    Refresh Data
                  </Button>
                </Box>
                {loading && <CircularProgress size={24} />}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Range Statistics
                </Typography>
                <Typography variant="body2">
                  Total Nodes: {radioRanges.length}
                </Typography>
                <Typography variant="body2">
                  Average Range: {radioRanges.length > 0 
                    ? (radioRanges.reduce((sum, r) => sum + r.rangeMeters, 0) / radioRanges.length / 1000).toFixed(1) 
                    : 0} km
                </Typography>
                <Typography variant="body2">
                  Max Range: {radioRanges.length > 0 
                    ? (Math.max(...radioRanges.map(r => r.rangeMeters)) / 1000).toFixed(1) 
                    : 0} km
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Coverage Gaps Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Coverage Gaps
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={showGaps ? <Visibility /> : <VisibilityOff />}
                    onClick={() => setShowGaps(!showGaps)}
                    sx={{ mr: 1 }}
                  >
                    {showGaps ? 'Hide' : 'Show'} Gaps
                  </Button>
                  <Button
                    variant="contained"
                    onClick={loadCoverageGaps}
                    disabled={loading}
                  >
                    Analyze Gaps
                  </Button>
                </Box>
                {loading && <CircularProgress size={24} />}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Gap Summary
                </Typography>
                <List dense>
                  {['high', 'medium', 'low'].map(severity => {
                    const count = coverageGaps.filter(g => g.severity === severity).length;
                    return (
                      <ListItem key={severity}>
                        <ListItemIcon>
                          {getSeverityIcon(severity)}
                        </ListItemIcon>
                        <ListItemText 
                          primary={`${severity.charAt(0).toUpperCase() + severity.slice(1)} Priority`}
                          secondary={`${count} gaps`}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Deployment Simulation Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Deployment Simulation
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Hardware Model</InputLabel>
                      <Select
                        value={newNodeHardware}
                        onChange={(e) => setNewNodeHardware(e.target.value)}
                      >
                        {hardwareOptions.map(hw => (
                          <MenuItem key={hw} value={hw}>{hw}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="contained"
                      onClick={runSimulation}
                      disabled={loading || hypotheticalNodes.length === 0}
                      fullWidth
                    >
                      Run Simulation
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="outlined"
                      onClick={() => setHypotheticalNodes([])}
                      fullWidth
                    >
                      Clear Nodes
                    </Button>
                  </Grid>
                </Grid>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Click on the map to place hypothetical nodes. Current nodes: {hypotheticalNodes.length}
                </Typography>
                
                <NodePlacementMap
                  onNodePlace={handleNodePlace}
                  hypotheticalNodes={hypotheticalNodes}
                  onNodeRemove={handleNodeRemove}
                  radioRanges={radioRanges}
                  coverageGaps={coverageGaps}
                  showRanges={showRanges}
                  showGaps={showGaps}
                />

                {simulationResults && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Simulation Results
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h4" color="primary">
                              {simulationResults.coverageImprovement.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2">
                              Coverage Improvement
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h4" color="secondary">
                              {simulationResults.connectivityImprovement.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2">
                              Connectivity Improvement
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h4" color="success.main">
                              {simulationResults.newConnections.length}
                            </Typography>
                            <Typography variant="body2">
                              New Connections
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Line of Sight Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Line of Sight Analysis
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="From Node ID"
                      value={selectedFromNode}
                      onChange={(e) => setSelectedFromNode(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="To Node ID"
                      value={selectedToNode}
                      onChange={(e) => setSelectedToNode(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={calculateLineOfSight}
                      disabled={loading || !selectedFromNode || !selectedToNode}
                      fullWidth
                    >
                      Calculate Line of Sight
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Results
                </Typography>
                <List>
                  {lineOfSightResults.map((result, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {result.hasLineOfSight ? 
                          <CheckCircle color="success" /> : 
                          <Error color="error" />
                        }
                      </ListItemIcon>
                      <ListItemText
                        primary={`${result.fromNodeId} → ${result.toNodeId}`}
                        secondary={
                          result.hasLineOfSight 
                            ? `Clear line of sight (${result.fresnelZoneClearance.toFixed(2)}x Fresnel clearance)`
                            : `Obstructed (${result.obstacleElevation}m obstacle)`
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Performance Analysis Tab */}
      <TabPanel value={activeTab} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Estimation
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="From Node ID"
                      value={selectedFromNode}
                      onChange={(e) => setSelectedFromNode(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="To Node ID"
                      value={selectedToNode}
                      onChange={(e) => setSelectedToNode(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={estimatePerformance}
                      disabled={loading || !selectedFromNode || !selectedToNode}
                      fullWidth
                    >
                      Estimate Performance
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <List>
                  {performanceEstimates.map((estimate, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">
                        Connection {index + 1}
                      </Typography>
                      <Typography variant="body2">
                        Delivery Rate: {(estimate.messageDeliveryRate * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2">
                        Latency: {estimate.averageLatency.toFixed(0)}ms
                      </Typography>
                      <Typography variant="body2">
                        Hop Count: {estimate.hopCount}
                      </Typography>
                      <Typography variant="body2">
                        Signal Strength: {estimate.signalStrength.toFixed(1)} dBm
                      </Typography>
                      <Divider sx={{ mt: 1 }} />
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Optimization Tab */}
      <TabPanel value={activeTab} index={5}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Optimization Recommendations
                </Typography>
                {optimizationRecommendations && (
                  <List>
                    {optimizationRecommendations.suggestedPlacements.map((placement, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Place />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1">
                                {placement.latitude.toFixed(4)}, {placement.longitude.toFixed(4)}
                              </Typography>
                              <Chip 
                                label={placement.priority} 
                                color={getPriorityColor(placement.priority) as any}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {placement.reason}
                              </Typography>
                              <Typography variant="body2" color="success.main">
                                Expected improvement: {placement.expectedImprovement.toFixed(1)}%
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Overall Impact
                </Typography>
                {optimizationRecommendations && (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h4" color="primary">
                        {optimizationRecommendations.coverageImprovement.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2">
                        Potential Coverage Improvement
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h4" color="secondary">
                        {optimizationRecommendations.connectivityImprovement.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2">
                        Potential Connectivity Improvement
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<TrendingUp />}
                      onClick={loadOptimizationRecommendations}
                      disabled={loading}
                      fullWidth
                    >
                      Refresh Analysis
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default CoverageAnalysis;