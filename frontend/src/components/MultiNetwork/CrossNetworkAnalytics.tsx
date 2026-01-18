/**
 * Cross-Network Analytics Component
 * Displays analytics across multiple networks while maintaining data separation
 * Requirements: 27.4 - Cross-network analytics while maintaining logical separation
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  NetworkCheck,
  Devices,
  Message,
  Share,
  Refresh,
  Security,
  TrendingUp
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../../services/api';

interface CrossNetworkAnalytics {
  totalNetworks: number;
  totalNodes: number;
  networkDistribution: Record<string, number>;
  crossNetworkMessages: number;
  federatedData: any[];
}

interface NetworkStats {
  networkId: string;
  networkName: string;
  nodeCount: number;
  messageCount: number;
  lastActivity: string;
  accessLevel: string;
  federationEnabled: boolean;
}

interface CrossNetworkAnalyticsProps {
  selectedNetworks: string[];
  refreshInterval?: number;
  className?: string;
}

export const CrossNetworkAnalytics: React.FC<CrossNetworkAnalyticsProps> = ({
  selectedNetworks,
  refreshInterval = 30000,
  className
}) => {
  const [analytics, setAnalytics] = useState<CrossNetworkAnalytics | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load cross-network analytics
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsResponse, statusResponse] = await Promise.all([
        apiService.get<CrossNetworkAnalytics>('/multi-network/analytics'),
        apiService.get<any>('/multi-network/status')
      ]);

      setAnalytics(analyticsResponse.data);
      
      // Transform status data to network stats
      const stats: NetworkStats[] = Object.entries(statusResponse.data.status).map(([networkId, status]: [string, any]) => ({
        networkId,
        networkName: status.networkName,
        nodeCount: 0, // Would be populated from actual data
        messageCount: 0, // Would be populated from actual data
        lastActivity: status.lastConnected || 'Never',
        accessLevel: status.accessControls?.dataVisibility || 'public',
        federationEnabled: status.accessControls?.federationEnabled || false
      }));

      setNetworkStats(stats);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load cross-network analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    
    // Set up refresh interval
    const interval = setInterval(loadAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [selectedNetworks, refreshInterval]);

  // Prepare chart data
  const networkDistributionData = analytics ? Object.entries(analytics.networkDistribution).map(([name, count]) => ({
    name,
    value: count,
    percentage: ((count / analytics.totalNodes) * 100).toFixed(1)
  })) : [];

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Get access level color
  const getAccessLevelColor = (accessLevel: string) => {
    switch (accessLevel) {
      case 'public': return 'success';
      case 'restricted': return 'warning';
      case 'private': return 'error';
      default: return 'default';
    }
  };

  if (loading && !analytics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className={className}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" component="h2">
          Cross-Network Analytics
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <Tooltip title="Refresh data">
            <IconButton onClick={loadAnalytics} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {analytics && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <NetworkCheck color="primary" fontSize="large" />
                    <Box>
                      <Typography variant="h4" component="div">
                        {analytics.totalNetworks}
                      </Typography>
                      <Typography color="text.secondary">
                        Total Networks
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Devices color="success" fontSize="large" />
                    <Box>
                      <Typography variant="h4" component="div">
                        {analytics.totalNodes}
                      </Typography>
                      <Typography color="text.secondary">
                        Total Nodes
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Message color="info" fontSize="large" />
                    <Box>
                      <Typography variant="h4" component="div">
                        {analytics.crossNetworkMessages}
                      </Typography>
                      <Typography color="text.secondary">
                        Cross-Network Messages
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Share color="warning" fontSize="large" />
                    <Box>
                      <Typography variant="h4" component="div">
                        {analytics.federatedData.length}
                      </Typography>
                      <Typography color="text.secondary">
                        Federated Records
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} mb={4}>
            {/* Network Distribution Pie Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Node Distribution by Network
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={networkDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {networkDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Network Comparison Bar Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Network Comparison
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={networkDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Network Details Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Network Details
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Network</TableCell>
                      <TableCell align="right">Nodes</TableCell>
                      <TableCell align="right">Messages</TableCell>
                      <TableCell>Access Level</TableCell>
                      <TableCell>Federation</TableCell>
                      <TableCell>Last Activity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {networkStats.map((network) => (
                      <TableRow key={network.networkId}>
                        <TableCell component="th" scope="row">
                          <Typography variant="body2" fontWeight="medium">
                            {network.networkName}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {analytics.networkDistribution[network.networkName] || 0}
                        </TableCell>
                        <TableCell align="right">
                          {network.messageCount}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={network.accessLevel}
                            size="small"
                            color={getAccessLevelColor(network.accessLevel) as any}
                            icon={<Security />}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={network.federationEnabled ? 'Enabled' : 'Disabled'}
                            size="small"
                            color={network.federationEnabled ? 'success' : 'default'}
                            icon={<Share />}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {network.lastActivity}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Federation Status */}
          {analytics.federatedData.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Federation Activity
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <TrendingUp color="success" />
                  <Typography variant="body2">
                    {analytics.federatedData.length} federated data records processed
                  </Typography>
                </Box>
                <Divider />
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Federation enables secure data sharing between authorized networks
                    while maintaining logical separation and access controls.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default CrossNetworkAnalytics;