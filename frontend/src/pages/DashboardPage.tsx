/**
 * Dashboard Page
 * Comprehensive analytics dashboard with metrics and charts
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6, 37.7, 37.8, 37.9, 37.10, 37.11, 37.12, 37.13, 37.14, 37.15
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import NavigationHeader from '../components/Layout/NavigationHeader';
import Footer from '../components/Layout/Footer';
import DashboardMetricCards from '../components/Analytics/DashboardMetricCards';
import DashboardCharts from '../components/Analytics/DashboardCharts';
import { MQTTMonitor } from '../components/MQTTMonitor';
import NetworkTopologyGraph from '../components/Map/NetworkTopologyGraph';
import { openTopologyGraph, closeTopologyGraph } from '../store/slices/mapSlice';
import { RootState } from '../store';
import apiService from '../services/api';

interface DashboardData {
  metrics: {
    totalNodes: number;
    activeNodes24h: number;
    activeNodesPercentage: number;
    gatewayDiversity: number;
    protocolDiversity: number;
    totalMessages: number;
    successRate: number;
  };
  charts: {
    networkActivityTrends: Array<{ timestamp: string | Date; messageCount: number }>;
    nodeActivityDistribution: Array<{ category: string; count: number }>;
    gatewayActivityDistribution: Array<{ category: string; count: number }>;
    signalQualityDistribution: Array<{ category: string; count: number }>;
    messageRoutingPatterns: Array<{ category: string; count: number }>;
    protocolUsage: Array<{ protocol: string; count: number }>;
  };
  topNodes: Array<{
    nodeId: string;
    shortName: string;
    longName: string;
    messageCount: number;
    avgRssi: string | null;
  }>;
}

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const topologyGraphOpen = useSelector((state: RootState) => state.map.topologyGraphOpen);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [mqttMonitorOpen, setMqttMonitorOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Refresh every 60 seconds
    const interval = setInterval(loadDashboardData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const response = await apiService.get('/analytics/dashboard');
      
      console.log('Dashboard API response:', response);
      
      // The response structure could be:
      // 1. { data: { metrics: ..., charts: ..., topNodes: ... } }
      // 2. { metrics: ..., charts: ..., topNodes: ... }
      
      let dashboardData;
      
      if (response.data && (response.data as any).metrics) {
        // Case 1: wrapped in data property
        dashboardData = response.data;
      } else if ((response as any).metrics) {
        // Case 2: direct response
        dashboardData = response as any;
      } else {
        console.error('Unexpected response structure:', response);
        setError('Received invalid data structure from server');
        return;
      }
      
      setData(dashboardData);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMQTTMonitor = () => {
    setMqttMonitorOpen(true);
  };

  const handleCloseMQTTMonitor = () => {
    setMqttMonitorOpen(false);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleOpenTopology = () => {
    // Open topology graph modal on current page
    dispatch(openTopologyGraph());
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavigationHeader 
        onRefresh={handleRefresh}
        onOpenTopology={handleOpenTopology}
        onOpenMQTTMonitor={handleOpenMQTTMonitor}
      />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Network Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time analytics and insights for your Meshtastic network
          </Typography>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && data && (
          <>
            {/* Metric Cards */}
            <DashboardMetricCards metrics={data.metrics} />

            {/* Charts */}
            <Box sx={{ mt: 4 }}>
              <DashboardCharts 
                charts={data.charts}
                topNodes={data.topNodes}
              />
            </Box>
          </>
        )}

        {!loading && !error && !data && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No dashboard data available. Please check your network connection.
            </Typography>
          </Paper>
        )}
      </Container>
      
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

export default DashboardPage;
