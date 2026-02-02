/**
 * Line of Sight Analysis Page
 * Interactive tool to analyze RF connectivity potential between two nodes
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Autocomplete,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  Refresh as RefreshIcon,
  Share as ShareIcon,
  Terrain as TerrainIcon
} from '@mui/icons-material';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RootState } from '../store';
import NavigationHeader from '../components/Layout/NavigationHeader';
import Footer from '../components/Layout/Footer';
import apiService from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface NodeOption {
  id: string;
  hexId: string;
  shortName: string;
  longName: string;
  label: string;
}

interface Position {
  latitude: number;
  longitude: number;
  altitude?: number;
}

interface SignalQuality {
  avgRssi: number;
  avgSnr: number;
  minRssi: number;
  maxRssi: number;
  minSnr: number;
  maxSnr: number;
  packetCount: number;
  lastCommunication: string;
}

interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevation: number;
  distanceKm: number;
}

interface FresnelZone {
  distanceKm: number;
  elevation: number;
  fresnelRadius: number;
  clearance: number;
  isObstructed: boolean;
}

interface ObstructionAnalysis {
  hasObstructions: boolean;
  obstructedPoints: FresnelZone[];
  clearancePercentage: number;
  minClearance: number;
}

interface ElevationProfile {
  points: ElevationPoint[];
  totalDistanceKm: number;
  minElevation: number;
  maxElevation: number;
  elevationGain: number;
  fresnelZones: FresnelZone[];
  obstructions: ObstructionAnalysis;
}

interface LineOfSightResult {
  fromNode: {
    id: string;
    hexId: string;
    shortName: string;
    longName: string;
    position: Position | null;
  };
  toNode: {
    id: string;
    hexId: string;
    shortName: string;
    longName: string;
    position: Position | null;
  };
  distanceKm: number;
  distanceFormatted: string;
  bearing: number;
  hasHistoricalConnectivity: boolean;
  signalQuality: SignalQuality | null;
}

const LineOfSightPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const nodes = useSelector((state: RootState) => state.nodes.nodes);
  
  const [fromNode, setFromNode] = useState<NodeOption | null>(null);
  const [toNode, setToNode] = useState<NodeOption | null>(null);
  const [result, setResult] = useState<LineOfSightResult | null>(null);
  const [elevationProfile, setElevationProfile] = useState<ElevationProfile | null>(null);
  const [showElevation, setShowElevation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingElevation, setLoadingElevation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elevationError, setElevationError] = useState<string | null>(null);

  // Convert nodes to autocomplete options
  const nodeOptions = useMemo(() => {
    return nodes
      .filter(node => node.shortName && node.shortName.trim() !== '')
      .map(node => ({
        id: node.id,
        hexId: node.hexId,
        shortName: node.shortName || 'Unknown',
        longName: node.longName || 'Unknown',
        label: `${node.shortName} (${node.hexId})`
      }))
      .sort((a, b) => a.shortName.localeCompare(b.shortName));
  }, [nodes]);

  // Load nodes from URL parameters on mount
  useEffect(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (fromParam && toParam && nodeOptions.length > 0) {
      const fromOption = nodeOptions.find(n => n.id === fromParam || n.hexId === fromParam);
      const toOption = nodeOptions.find(n => n.id === toParam || n.hexId === toParam);

      if (fromOption && toOption) {
        setFromNode(fromOption);
        setToNode(toOption);
        // Automatically analyze if both nodes are found
        analyzeLineOfSight(fromOption.id, toOption.id);
      }
    }
  }, [searchParams, nodeOptions]);

  const analyzeLineOfSight = async (fromId: string, toId: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setElevationProfile(null);

    try {
      const response = await apiService.get(`/analysis/line-of-sight?from=${fromId}&to=${toId}`);
      setResult(response.data);

      // Automatically fetch elevation if enabled and positions are available
      if (showElevation && response.data.fromNode.position && response.data.toNode.position) {
        fetchElevationProfile(
          response.data.fromNode.position.latitude,
          response.data.fromNode.position.longitude,
          response.data.toNode.position.latitude,
          response.data.toNode.position.longitude
        );
      }
    } catch (err: any) {
      console.error('Error analyzing line of sight:', err);
      setError(err.response?.data?.message || 'Failed to analyze line of sight');
    } finally {
      setLoading(false);
    }
  };

  const fetchElevationProfile = async (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    setLoadingElevation(true);
    setElevationError(null);

    try {
      const response = await apiService.get(
        `/analysis/line-of-sight/elevation?lat1=${lat1}&lon1=${lon1}&lat2=${lat2}&lon2=${lon2}&samples=50&frequency=915`
      );
      setElevationProfile(response.data);
    } catch (err: any) {
      console.error('Error fetching elevation profile:', err);
      setElevationError(err.response?.data?.message || 'Failed to fetch elevation data');
    } finally {
      setLoadingElevation(false);
    }
  };

  const handleAnalyze = () => {
    if (!fromNode || !toNode) {
      setError('Please select both nodes');
      return;
    }

    if (fromNode.id === toNode.id) {
      setError('Please select different nodes');
      return;
    }

    // Update URL parameters
    setSearchParams({ from: fromNode.id, to: toNode.id });

    analyzeLineOfSight(fromNode.id, toNode.id);
  };

  const handleSwapNodes = () => {
    const temp = fromNode;
    setFromNode(toNode);
    setToNode(temp);
  };

  const handleShareLink = () => {
    if (fromNode && toNode) {
      const url = `${window.location.origin}/line-of-sight?from=${fromNode.id}&to=${toNode.id}`;
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getSignalQualityColor = (rssi: number) => {
    if (rssi > -70) return 'success';
    if (rssi > -80) return 'warning';
    return 'error';
  };

  // Calculate map center and bounds
  const mapCenter: [number, number] = useMemo(() => {
    if (result?.fromNode.position && result?.toNode.position) {
      const lat = (result.fromNode.position.latitude + result.toNode.position.latitude) / 2;
      const lon = (result.fromNode.position.longitude + result.toNode.position.longitude) / 2;
      return [lat, lon];
    }
    return [0, 0];
  }, [result]);

  const linePositions: [number, number][] = useMemo(() => {
    if (result?.fromNode.position && result?.toNode.position) {
      return [
        [result.fromNode.position.latitude, result.fromNode.position.longitude],
        [result.toNode.position.latitude, result.toNode.position.longitude]
      ];
    }
    return [];
  }, [result]);

  // Prepare elevation chart data
  const elevationChartData = useMemo(() => {
    if (!elevationProfile) return null;

    const labels = elevationProfile.points.map(p => p.distanceKm.toFixed(2));
    const elevationData = elevationProfile.points.map(p => p.elevation);
    
    // Calculate line of sight
    const startElevation = elevationProfile.points[0].elevation;
    const endElevation = elevationProfile.points[elevationProfile.points.length - 1].elevation;
    const losData = elevationProfile.points.map(p => {
      const ratio = p.distanceKm / elevationProfile.totalDistanceKm;
      return startElevation + (endElevation - startElevation) * ratio;
    });

    // Calculate Fresnel zone boundaries
    const fresnelUpperData = elevationProfile.fresnelZones.map(fz => 
      losData[elevationProfile.points.findIndex(p => p.distanceKm === fz.distanceKm)] + fz.fresnelRadius
    );
    const fresnelLowerData = elevationProfile.fresnelZones.map(fz => 
      losData[elevationProfile.points.findIndex(p => p.distanceKm === fz.distanceKm)] - fz.fresnelRadius
    );

    return {
      labels,
      datasets: [
        {
          label: 'Terrain Elevation',
          data: elevationData,
          borderColor: 'rgb(139, 69, 19)',
          backgroundColor: 'rgba(139, 69, 19, 0.3)',
          fill: 'origin',
          tension: 0.4,
          pointRadius: 0
        },
        {
          label: 'Line of Sight',
          data: losData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0,
          pointRadius: 0
        },
        {
          label: 'Fresnel Zone (Upper)',
          data: fresnelUpperData,
          borderColor: 'rgba(255, 99, 132, 0.5)',
          backgroundColor: 'transparent',
          borderDash: [2, 2],
          tension: 0.4,
          pointRadius: 0
        },
        {
          label: 'Fresnel Zone (Lower)',
          data: fresnelLowerData,
          borderColor: 'rgba(255, 99, 132, 0.5)',
          backgroundColor: 'transparent',
          borderDash: [2, 2],
          tension: 0.4,
          pointRadius: 0
        }
      ]
    };
  }, [elevationProfile]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <NavigationHeader />
      
      <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Line of Sight Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Analyze RF connectivity potential between any two nodes
        </Typography>

        {/* Node Selection */}
        <Paper sx={{ p: 3, mb: 3, mt: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={nodeOptions}
                value={fromNode}
                onChange={(_, newValue) => setFromNode(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="From Node" placeholder="Search nodes..." />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>
            
            <Grid item xs={12} md={2} sx={{ textAlign: 'center' }}>
              <Button
                variant="outlined"
                onClick={handleSwapNodes}
                disabled={!fromNode && !toNode}
                startIcon={<SwapIcon />}
              >
                Swap
              </Button>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={nodeOptions}
                value={toNode}
                onChange={(_, newValue) => setToNode(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="To Node" placeholder="Search nodes..." />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  onClick={handleAnalyze}
                  disabled={!fromNode || !toNode || loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  fullWidth
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </Button>
                {result && (
                  <Button
                    variant="outlined"
                    onClick={handleShareLink}
                    startIcon={<ShareIcon />}
                  >
                    Share
                  </Button>
                )}
              </Stack>
            </Grid>

            {result?.fromNode.position && result?.toNode.position && (
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={showElevation}
                      onChange={(e) => {
                        setShowElevation(e.target.checked);
                        if (e.target.checked && result?.fromNode.position && result?.toNode.position) {
                          fetchElevationProfile(
                            result.fromNode.position.latitude,
                            result.fromNode.position.longitude,
                            result.toNode.position.latitude,
                            result.toNode.position.longitude
                          );
                        }
                      }}
                      icon={<TerrainIcon />}
                      checkedIcon={<TerrainIcon />}
                    />
                  }
                  label="Show Elevation Profile"
                />
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Distance and Bearing */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Distance
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {result.distanceFormatted}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {result.distanceKm.toFixed(3)} km
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Bearing
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {result.bearing}°
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Azimuth for antenna alignment
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Connectivity
                    </Typography>
                    <Chip
                      label={result.hasHistoricalConnectivity ? 'Connected' : 'No History'}
                      color={result.hasHistoricalConnectivity ? 'success' : 'default'}
                      sx={{ fontSize: '1.2rem', p: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {result.hasHistoricalConnectivity 
                        ? 'Nodes have communicated' 
                        : 'No direct communication found'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Signal Quality Statistics */}
            {result.signalQuality && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Signal Quality Statistics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      RSSI (Received Signal Strength)
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body1">
                        Average: <Chip 
                          label={`${result.signalQuality.avgRssi} dBm`}
                          color={getSignalQualityColor(result.signalQuality.avgRssi)}
                          size="small"
                        />
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Range: {result.signalQuality.minRssi} to {result.signalQuality.maxRssi} dBm
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      SNR (Signal-to-Noise Ratio)
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body1">
                        Average: <Chip 
                          label={`${result.signalQuality.avgSnr} dB`}
                          color="primary"
                          size="small"
                        />
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Range: {result.signalQuality.minSnr} to {result.signalQuality.maxSnr} dB
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Packet Count:</strong> {result.signalQuality.packetCount}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Last Communication:</strong> {formatDate(result.signalQuality.lastCommunication)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Elevation Profile */}
            {showElevation && elevationProfile && elevationChartData && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Elevation Profile
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {/* Obstruction Warning */}
                {elevationProfile.obstructions.hasObstructions && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Potential Terrain Obstructions Detected</strong>
                    <br />
                    Clearance: {elevationProfile.obstructions.clearancePercentage}%
                    <br />
                    {elevationProfile.obstructions.obstructedPoints.length} point(s) obstruct the first Fresnel zone
                  </Alert>
                )}

                {!elevationProfile.obstructions.hasObstructions && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <strong>Clear Line of Sight</strong>
                    <br />
                    No terrain obstructions detected. First Fresnel zone is clear.
                  </Alert>
                )}

                {/* Elevation Statistics */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Min Elevation
                    </Typography>
                    <Typography variant="h6">
                      {elevationProfile.minElevation.toFixed(0)} m
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Max Elevation
                    </Typography>
                    <Typography variant="h6">
                      {elevationProfile.maxElevation.toFixed(0)} m
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Elevation Gain
                    </Typography>
                    <Typography variant="h6">
                      {elevationProfile.elevationGain.toFixed(0)} m
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Min Clearance
                    </Typography>
                    <Typography variant="h6">
                      {elevationProfile.obstructions.minClearance.toFixed(1)} m
                    </Typography>
                  </Grid>
                </Grid>

                {/* Elevation Chart */}
                <Box sx={{ height: 400 }}>
                  <Line
                    data={elevationChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        title: {
                          display: true,
                          text: 'Elevation Profile with Fresnel Zone'
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              let label = context.dataset.label || '';
                              if (label) {
                                label += ': ';
                              }
                              if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1) + ' m';
                              }
                              return label;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Distance (km)'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Elevation (m)'
                          }
                        }
                      }
                    }}
                  />
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  The Fresnel zone represents the area around the line of sight where radio waves propagate. 
                  For optimal signal quality, at least 60% of the first Fresnel zone should be clear of obstructions.
                </Typography>
              </Paper>
            )}

            {/* Elevation Loading */}
            {showElevation && loadingElevation && (
              <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Fetching elevation data...
                </Typography>
              </Paper>
            )}

            {/* Elevation Error */}
            {showElevation && elevationError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {elevationError}
              </Alert>
            )}

            {/* Map */}
            {result.fromNode.position && result.toNode.position && (
              <Paper sx={{ p: 2, height: 500 }}>
                <MapContainer
                  center={mapCenter}
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Line connecting nodes */}
                  <Polyline
                    positions={linePositions}
                    color="#1976d2"
                    weight={3}
                    opacity={0.7}
                  />

                  {/* From Node Marker */}
                  <Marker position={[result.fromNode.position.latitude, result.fromNode.position.longitude]}>
                    <Popup>
                      <strong>{result.fromNode.shortName}</strong><br />
                      {result.fromNode.longName}<br />
                      {result.fromNode.hexId}
                    </Popup>
                  </Marker>

                  {/* To Node Marker */}
                  <Marker position={[result.toNode.position.latitude, result.toNode.position.longitude]}>
                    <Popup>
                      <strong>{result.toNode.shortName}</strong><br />
                      {result.toNode.longName}<br />
                      {result.toNode.hexId}
                    </Popup>
                  </Marker>
                </MapContainer>
              </Paper>
            )}

            {/* No Position Warning */}
            {(!result.fromNode.position || !result.toNode.position) && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                {!result.fromNode.position && !result.toNode.position
                  ? 'Both nodes are missing position data. Map cannot be displayed.'
                  : !result.fromNode.position
                  ? 'From node is missing position data. Map cannot be displayed.'
                  : 'To node is missing position data. Map cannot be displayed.'}
              </Alert>
            )}
          </>
        )}
      </Box>

      <Footer />
    </Box>
  );
};

export default LineOfSightPage;
