/**
 * Gateway Comparison Page
 * Interactive tool to compare signal quality between two gateways
 * Requirements: 41.1, 41.5, 41.6, 41.7, 41.8, 41.10
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  Refresh as RefreshIcon,
  Share as ShareIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { Scatter, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { RootState } from '../store';
import NavigationHeader from '../components/Layout/NavigationHeader';
import Footer from '../components/Layout/Footer';
import { MQTTMonitor } from '../components/MQTTMonitor';
import NetworkTopologyGraph from '../components/Map/NetworkTopologyGraph';
import { openTopologyGraph, closeTopologyGraph } from '../store/slices/mapSlice';
import apiService from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface GatewayOption {
  id: string;
  label: string;
  packetCount?: number;
}

interface CommonPacket {
  mesh_packet_id: string;
  from_node_id: string;
  hop_limit: number;
  gateway1_rssi: number;
  gateway1_snr: number;
  gateway1_timestamp: string;
  gateway2_rssi: number;
  gateway2_snr: number;
  gateway2_timestamp: string;
  time_diff_seconds: number;
  rssi_diff: number;
  snr_diff: number;
}

interface GatewayStatistics {
  packet_count: number;
  avg_rssi: number;
  avg_snr: number;
  unique_sources: number;
  rssi_diff_avg: number;
  rssi_diff_min: number;
  rssi_diff_max: number;
  rssi_diff_stddev: number;
  snr_diff_avg: number;
  snr_diff_min: number;
  snr_diff_max: number;
  snr_diff_stddev: number;
}

interface GatewayComparisonResult {
  common_packets: CommonPacket[];
  statistics: GatewayStatistics;
  gateway1_id: string;
  gateway2_id: string;
}

const GatewayComparisonPage: React.FC = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const nodes = useSelector((state: RootState) => state.nodes.nodes);
  const topologyGraphOpen = useSelector((state: RootState) => state.map.topologyGraphOpen);
  
  const [gateway1, setGateway1] = useState<GatewayOption | null>(null);
  const [gateway2, setGateway2] = useState<GatewayOption | null>(null);
  const [result, setResult] = useState<GatewayComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [mqttMonitorOpen, setMqttMonitorOpen] = useState(false);

  // Convert nodes to gateway options (nodes that have received packets)
  const gatewayOptions = useMemo(() => {
    // In a real implementation, this would fetch actual gateway data
    // For now, we'll use nodes that could be gateways
    return nodes
      .filter(node => node.shortName && node.shortName.trim() !== '')
      .map(node => ({
        id: node.hexId,
        label: `${node.shortName} (${node.hexId})`,
        packetCount: 0 // Would be populated from actual data
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [nodes]);

  // Load gateways from URL parameters on mount
  useEffect(() => {
    const gw1Param = searchParams.get('gateway1');
    const gw2Param = searchParams.get('gateway2');

    if (gw1Param && gw2Param && gatewayOptions.length > 0) {
      const gw1Option = gatewayOptions.find(g => g.id === gw1Param);
      const gw2Option = gatewayOptions.find(g => g.id === gw2Param);

      if (gw1Option && gw2Option) {
        setGateway1(gw1Option);
        setGateway2(gw2Option);
        // Automatically compare if both gateways are found
        compareGateways(gw1Option.id, gw2Option.id);
      }
    }
  }, [searchParams, gatewayOptions]);

  const compareGateways = async (gw1Id: string, gw2Id: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setPage(0);

    try {
      const response = await apiService.get(`/gateways/compare?gateway1=${gw1Id}&gateway2=${gw2Id}`);
      setResult(response.data);
    } catch (err: any) {
      console.error('Error comparing gateways:', err);
      setError(err.response?.data?.message || 'Failed to compare gateways');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (!gateway1 || !gateway2) {
      setError('Please select both gateways');
      return;
    }

    if (gateway1.id === gateway2.id) {
      setError('Please select different gateways');
      return;
    }

    // Update URL parameters
    setSearchParams({ gateway1: gateway1.id, gateway2: gateway2.id });

    compareGateways(gateway1.id, gateway2.id);
  };

  const handleSwapGateways = () => {
    const temp = gateway1;
    setGateway1(gateway2);
    setGateway2(temp);
  };

  const handleShareLink = () => {
    if (gateway1 && gateway2) {
      const url = `${window.location.origin}/gateway-comparison?gateway1=${gateway1.id}&gateway2=${gateway2.id}`;
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleExportCSV = () => {
    if (!result) return;

    const headers = [
      'Packet ID',
      'From Node',
      'Hop Limit',
      'Gateway 1 RSSI',
      'Gateway 1 SNR',
      'Gateway 1 Time',
      'Gateway 2 RSSI',
      'Gateway 2 SNR',
      'Gateway 2 Time',
      'Time Diff (s)',
      'RSSI Diff',
      'SNR Diff'
    ];

    const rows = result.common_packets.map(p => [
      p.mesh_packet_id,
      p.from_node_id,
      p.hop_limit,
      p.gateway1_rssi,
      p.gateway1_snr,
      p.gateway1_timestamp,
      p.gateway2_rssi,
      p.gateway2_snr,
      p.gateway2_timestamp,
      p.time_diff_seconds,
      p.rssi_diff,
      p.snr_diff
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gateway-comparison-${gateway1?.id}-${gateway2?.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

  const handleRefresh = () => {
    // Refresh comparison if gateways are selected
    if (gateway1 && gateway2) {
      compareGateways(gateway1.id, gateway2.id);
    }
  };

  // Prepare scatter plot data for RSSI comparison
  const rssiScatterData = useMemo(() => {
    if (!result) return null;

    return {
      datasets: [
        {
          label: 'RSSI Comparison',
          data: result.common_packets.map(p => ({
            x: p.gateway1_rssi,
            y: p.gateway2_rssi
          })),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Equal Line',
          data: [
            { x: -120, y: -120 },
            { x: -40, y: -40 }
          ],
          type: 'line' as any,
          borderColor: 'rgba(255, 99, 132, 0.5)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    };
  }, [result]);

  // Prepare scatter plot data for SNR comparison
  const snrScatterData = useMemo(() => {
    if (!result) return null;

    return {
      datasets: [
        {
          label: 'SNR Comparison',
          data: result.common_packets.map(p => ({
            x: p.gateway1_snr,
            y: p.gateway2_snr
          })),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Equal Line',
          data: [
            { x: -20, y: -20 },
            { x: 20, y: 20 }
          ],
          type: 'line' as any,
          borderColor: 'rgba(255, 99, 132, 0.5)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    };
  }, [result]);

  // Prepare timeline chart data
  const timelineData = useMemo(() => {
    if (!result) return null;

    const sortedPackets = [...result.common_packets].sort(
      (a, b) => new Date(a.gateway1_timestamp).getTime() - new Date(b.gateway1_timestamp).getTime()
    );

    return {
      labels: sortedPackets.map(p => new Date(p.gateway1_timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: `${gateway1?.label} RSSI`,
          data: sortedPackets.map(p => p.gateway1_rssi),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1
        },
        {
          label: `${gateway2?.label} RSSI`,
          data: sortedPackets.map(p => p.gateway2_rssi),
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
          tension: 0.1
        }
      ]
    };
  }, [result, gateway1, gateway2]);

  // Prepare histogram data for signal differences
  const histogramData = useMemo(() => {
    if (!result) return null;

    // Create bins for RSSI differences
    const bins = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
    const binCounts = new Array(bins.length - 1).fill(0);

    result.common_packets.forEach(p => {
      for (let i = 0; i < bins.length - 1; i++) {
        if (p.rssi_diff >= bins[i] && p.rssi_diff < bins[i + 1]) {
          binCounts[i]++;
          break;
        }
      }
    });

    return {
      labels: bins.slice(0, -1).map((bin, i) => `${bin} to ${bins[i + 1]}`),
      datasets: [
        {
          label: 'RSSI Difference Distribution',
          data: binCounts,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  }, [result]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <NavigationHeader 
        onRefresh={handleRefresh}
        onOpenTopology={handleOpenTopology}
        onOpenMQTTMonitor={handleOpenMQTTMonitor}
      />
      
      <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Gateway Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Compare signal quality between two gateways for common packets
        </Typography>

        {/* Gateway Selection */}
        <Paper sx={{ p: 3, mb: 3, mt: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={gatewayOptions}
                value={gateway1}
                onChange={(_, newValue) => setGateway1(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Gateway 1" placeholder="Search gateways..." />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>
            
            <Grid item xs={12} md={2} sx={{ textAlign: 'center' }}>
              <Button
                variant="outlined"
                onClick={handleSwapGateways}
                disabled={!gateway1 && !gateway2}
                startIcon={<SwapIcon />}
              >
                Swap
              </Button>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={gatewayOptions}
                value={gateway2}
                onChange={(_, newValue) => setGateway2(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Gateway 2" placeholder="Search gateways..." />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  onClick={handleCompare}
                  disabled={!gateway1 || !gateway2 || loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  fullWidth
                >
                  {loading ? 'Comparing...' : 'Compare'}
                </Button>
                {result && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={handleShareLink}
                      startIcon={<ShareIcon />}
                    >
                      Share
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleExportCSV}
                      startIcon={<DownloadIcon />}
                    >
                      Export CSV
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
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
            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Common Packets
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {result.statistics.packet_count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unique sources: {result.statistics.unique_sources}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Avg RSSI Diff
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {result.statistics.rssi_diff_avg.toFixed(1)} dBm
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      σ = {result.statistics.rssi_diff_stddev.toFixed(1)} dBm
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      RSSI Range
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {result.statistics.rssi_diff_min.toFixed(1)} to {result.statistics.rssi_diff_max.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      dBm difference
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Avg SNR Diff
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {result.statistics.snr_diff_avg.toFixed(1)} dB
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      σ = {result.statistics.snr_diff_stddev.toFixed(1)} dB
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Scatter Plots */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    RSSI Comparison
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {rssiScatterData && (
                    <Box sx={{ height: 400 }}>
                      <Scatter
                        data={rssiScatterData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top' as const,
                            },
                            title: {
                              display: true,
                              text: 'Gateway 1 RSSI vs Gateway 2 RSSI'
                            }
                          },
                          scales: {
                            x: {
                              title: {
                                display: true,
                                text: `${gateway1?.label} RSSI (dBm)`
                              }
                            },
                            y: {
                              title: {
                                display: true,
                                text: `${gateway2?.label} RSSI (dBm)`
                              }
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    SNR Comparison
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {snrScatterData && (
                    <Box sx={{ height: 400 }}>
                      <Scatter
                        data={snrScatterData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top' as const,
                            },
                            title: {
                              display: true,
                              text: 'Gateway 1 SNR vs Gateway 2 SNR'
                            }
                          },
                          scales: {
                            x: {
                              title: {
                                display: true,
                                text: `${gateway1?.label} SNR (dB)`
                              }
                            },
                            y: {
                              title: {
                                display: true,
                                text: `${gateway2?.label} SNR (dB)`
                              }
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Timeline Chart */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Signal Quality Over Time
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {timelineData && (
                <Box sx={{ height: 400 }}>
                  <Line
                    data={timelineData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        title: {
                          display: true,
                          text: 'RSSI Timeline Comparison'
                        }
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Time'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'RSSI (dBm)'
                          }
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </Paper>

            {/* Histogram */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Signal Difference Distribution
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {histogramData && (
                <Box sx={{ height: 400 }}>
                  <Bar
                    data={histogramData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        title: {
                          display: true,
                          text: 'RSSI Difference Histogram (Gateway 2 - Gateway 1)'
                        }
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'RSSI Difference (dBm)'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Packet Count'
                          }
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </Paper>

            {/* Detailed Packet Table */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Common Packets Detail
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer className="responsive-table">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Packet ID</TableCell>
                      <TableCell>From Node</TableCell>
                      <TableCell className="hide-mobile">Hops</TableCell>
                      <TableCell align="right">GW1 RSSI</TableCell>
                      <TableCell align="right">GW2 RSSI</TableCell>
                      <TableCell align="right" className="hide-mobile">RSSI Diff</TableCell>
                      <TableCell align="right" className="hide-mobile">GW1 SNR</TableCell>
                      <TableCell align="right" className="hide-mobile">GW2 SNR</TableCell>
                      <TableCell align="right" className="hide-mobile">SNR Diff</TableCell>
                      <TableCell className="hide-mobile">Time Diff</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.common_packets
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((packet, index) => (
                        <TableRow key={index}>
                          <TableCell>{packet.mesh_packet_id.substring(0, 8)}...</TableCell>
                          <TableCell>{packet.from_node_id}</TableCell>
                          <TableCell className="hide-mobile">{packet.hop_limit}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${packet.gateway1_rssi} dBm`}
                              size="small"
                              color={packet.gateway1_rssi > -80 ? 'success' : packet.gateway1_rssi > -100 ? 'warning' : 'error'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${packet.gateway2_rssi} dBm`}
                              size="small"
                              color={packet.gateway2_rssi > -80 ? 'success' : packet.gateway2_rssi > -100 ? 'warning' : 'error'}
                            />
                          </TableCell>
                          <TableCell align="right" className="hide-mobile">
                            <Chip
                              label={`${packet.rssi_diff > 0 ? '+' : ''}${packet.rssi_diff.toFixed(1)} dBm`}
                              size="small"
                              color={Math.abs(packet.rssi_diff) < 5 ? 'default' : 'primary'}
                            />
                          </TableCell>
                          <TableCell align="right" className="hide-mobile">{packet.gateway1_snr.toFixed(1)} dB</TableCell>
                          <TableCell align="right" className="hide-mobile">{packet.gateway2_snr.toFixed(1)} dB</TableCell>
                          <TableCell align="right" className="hide-mobile">
                            {packet.snr_diff > 0 ? '+' : ''}{packet.snr_diff.toFixed(1)} dB
                          </TableCell>
                          <TableCell className="hide-mobile">{Math.abs(packet.time_diff_seconds).toFixed(1)}s</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={result.common_packets.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          </>
        )}
      </Box>

      <Footer />

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
    </Box>
  );
};

export default GatewayComparisonPage;
