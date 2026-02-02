import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, CircularProgress, Alert } from '@mui/material';
import DashboardMetricCards from './DashboardMetricCards';
import DashboardCharts from './DashboardCharts';
import apiService from '../../services/api';

/**
 * DashboardExample Component
 * 
 * Example implementation showing how to use DashboardMetricCards and DashboardCharts
 * together to create a complete dashboard view.
 * 
 * This component:
 * 1. Fetches dashboard data from the API
 * 2. Displays metric cards at the top
 * 3. Displays charts below the metrics
 * 4. Handles loading and error states
 */
const DashboardExample: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get('/analytics/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Network Dashboard
      </Typography>

      {/* Metric Cards */}
      <Box mb={4}>
        <DashboardMetricCards metrics={dashboardData?.metrics} />
      </Box>

      {/* Charts */}
      <DashboardCharts 
        charts={dashboardData?.charts} 
        topNodes={dashboardData?.topNodes} 
      />
    </Container>
  );
};

export default DashboardExample;
