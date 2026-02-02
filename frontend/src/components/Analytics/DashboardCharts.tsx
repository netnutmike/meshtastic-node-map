import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { applyThemeToChartOptions } from '../../utils/chartTheme';
import './DashboardCharts.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TimeSeriesData {
  timestamp: string | Date;
  messageCount: number;
}

interface CategoryData {
  category: string;
  count: number;
}

interface TopNodeData {
  nodeId: string;
  shortName: string;
  longName: string;
  messageCount: number;
  avgRssi: string | null;
}

interface DashboardChartsData {
  networkActivityTrends: TimeSeriesData[];
  nodeActivityDistribution: CategoryData[];
  gatewayActivityDistribution: CategoryData[];
  signalQualityDistribution: CategoryData[];
  messageRoutingPatterns: CategoryData[];
  protocolUsage: Array<{ protocol: string; count: number }>;
}

interface DashboardChartsProps {
  charts?: DashboardChartsData;
  topNodes?: TopNodeData[];
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ charts, topNodes = [] }) => {
  const [chartKey, setChartKey] = useState(0);

  // Listen for theme changes and force chart re-render
  useEffect(() => {
    const handleThemeChange = () => {
      setChartKey(prev => prev + 1);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  // Default empty data if charts is undefined
  const {
    networkActivityTrends = [],
    nodeActivityDistribution = [],
    gatewayActivityDistribution = [],
    signalQualityDistribution = [],
    messageRoutingPatterns = [],
    protocolUsage = []
  } = charts || {};

  /**
   * Network Activity Trends Line Chart (7 days)
   * Shows messages per hour over the last 7 days
   */
  const renderNetworkActivityTrends = () => {
    const labels = networkActivityTrends.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
    });

    const data = {
      labels,
      datasets: [
        {
          label: 'Messages per Hour',
          data: networkActivityTrends.map(item => item.messageCount),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4
        }
      ]
    };

    const options = applyThemeToChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const
        },
        title: {
          display: true,
          text: 'Network Activity Trends (7 Days)'
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false
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
            text: 'Message Count'
          },
          beginAtZero: true
        }
      }
    });

    return (
      <Card data-testid="network-activity-trends-chart">
        <CardContent>
          <Box height={300}>
            <Line key={`activity-${chartKey}`} data={data} options={options} />
          </Box>
        </CardContent>
      </Card>
    );
  };

  /**
   * Node Activity Distribution Doughnut Chart
   * Categories: Very Active (>100 msgs), Moderately Active (10-100), Lightly Active (1-10), Inactive (0)
   */
  const renderNodeActivityDistribution = () => {
    const labels = nodeActivityDistribution.map(item => item.category);
    const counts = nodeActivityDistribution.map(item => item.count);

    const data = {
      labels,
      datasets: [
        {
          label: 'Node Count',
          data: counts,
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(201, 203, 207, 0.8)'
          ],
          borderColor: [
            'rgb(75, 192, 192)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(201, 203, 207)'
          ],
          borderWidth: 1
        }
      ]
    };

    const options = applyThemeToChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right' as const
        },
        title: {
          display: true,
          text: 'Node Activity Distribution'
        }
      }
    });

    return (
      <Card data-testid="node-activity-distribution-chart">
        <CardContent>
          <Box height={300}>
            <Doughnut key={`node-activity-${chartKey}`} data={data} options={options} />
          </Box>
        </CardContent>
      </Card>
    );
  };

  /**
   * Gateway Activity Distribution Bar Chart
   * Shows top 10 gateways by packet count
   */
  const renderGatewayActivityDistribution = () => {
    const labels = gatewayActivityDistribution.map(item => item.category);
    const counts = gatewayActivityDistribution.map(item => item.count);

    const data = {
      labels,
      datasets: [
        {
          label: 'Packet Count',
          data: counts,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }
      ]
    };

    const options = applyThemeToChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Gateway Activity Distribution (Top 10)'
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Gateway'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Packet Count'
          },
          beginAtZero: true
        }
      }
    });

    return (
      <Card data-testid="gateway-activity-distribution-chart">
        <CardContent>
          <Box height={300}>
            {gatewayActivityDistribution.length > 0 ? (
              <Bar key={`gateway-${chartKey}`} data={data} options={options} />
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <Typography variant="body2" color="text.secondary">
                  No gateway data available
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  /**
   * Signal Quality Distribution Bar Chart
   * Categories: Excellent (>-70dBm), Good (-70 to -80), Fair (-80 to -90), Poor (<-90)
   */
  const renderSignalQualityDistribution = () => {
    const labels = signalQualityDistribution.map(item => item.category);
    const counts = signalQualityDistribution.map(item => item.count);

    const data = {
      labels,
      datasets: [
        {
          label: 'Message Count',
          data: counts,
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(255, 99, 132, 0.8)'
          ],
          borderColor: [
            'rgb(75, 192, 192)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(255, 99, 132)'
          ],
          borderWidth: 1
        }
      ]
    };

    const options = applyThemeToChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Signal Quality Distribution'
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Signal Quality'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Message Count'
          },
          beginAtZero: true
        }
      }
    });

    return (
      <Card data-testid="signal-quality-distribution-chart">
        <CardContent>
          <Box height={300}>
            <Bar key={`signal-${chartKey}`} data={data} options={options} />
          </Box>
        </CardContent>
      </Card>
    );
  };

  /**
   * Message Routing Patterns Doughnut Chart
   * Categories: Direct (0 hops), Routed (1-2 hops), Multi-hop (3+)
   */
  const renderMessageRoutingPatterns = () => {
    const labels = messageRoutingPatterns.map(item => item.category);
    const counts = messageRoutingPatterns.map(item => item.count);

    const data = {
      labels,
      datasets: [
        {
          label: 'Message Count',
          data: counts,
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(255, 99, 132, 0.8)'
          ],
          borderColor: [
            'rgb(75, 192, 192)',
            'rgb(255, 206, 86)',
            'rgb(255, 99, 132)'
          ],
          borderWidth: 1
        }
      ]
    };

    const options = applyThemeToChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right' as const
        },
        title: {
          display: true,
          text: 'Message Routing Patterns'
        }
      }
    });

    return (
      <Card data-testid="message-routing-patterns-chart">
        <CardContent>
          <Box height={300}>
            <Doughnut key={`routing-${chartKey}`} data={data} options={options} />
          </Box>
        </CardContent>
      </Card>
    );
  };

  /**
   * Protocol Usage Pie Chart (24h)
   * Shows message count per protocol type for last 24 hours
   */
  const renderProtocolUsage = () => {
    const labels = protocolUsage.map(item => item.protocol);
    const counts = protocolUsage.map(item => item.count);

    const data = {
      labels,
      datasets: [
        {
          label: 'Message Count',
          data: counts,
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(255, 99, 255, 0.8)',
            'rgba(99, 255, 132, 0.8)'
          ],
          borderColor: [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)',
            'rgb(199, 199, 199)',
            'rgb(83, 102, 255)',
            'rgb(255, 99, 255)',
            'rgb(99, 255, 132)'
          ],
          borderWidth: 1
        }
      ]
    };

    const options = applyThemeToChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right' as const
        },
        title: {
          display: true,
          text: 'Protocol Usage (24h)'
        }
      }
    });

    return (
      <Card data-testid="protocol-usage-chart">
        <CardContent>
          <Box height={300}>
            {protocolUsage.length > 0 ? (
              <Pie key={`protocol-${chartKey}`} data={data} options={options} />
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <Typography variant="body2" color="text.secondary">
                  No protocol data available
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  /**
   * Most Active Nodes Table
   * Shows top 10 nodes with message counts and signal quality
   */
  const renderMostActiveNodesTable = () => {
    return (
      <Card data-testid="most-active-nodes-table">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Most Active Nodes (Top 10)
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Short Name</TableCell>
                  <TableCell>Long Name</TableCell>
                  <TableCell align="right">Message Count</TableCell>
                  <TableCell align="right">Avg RSSI</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topNodes.length > 0 ? (
                  topNodes.map((node) => (
                    <TableRow key={node.nodeId} hover>
                      <TableCell>{node.shortName || 'Unknown'}</TableCell>
                      <TableCell>{node.longName || 'Unknown'}</TableCell>
                      <TableCell align="right">{node.messageCount.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {node.avgRssi ? `${node.avgRssi} dBm` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No active nodes found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box className="dashboard-charts">
      <Grid container spacing={3}>
        {/* Network Activity Trends - Full width */}
        <Grid item xs={12}>
          {renderNetworkActivityTrends()}
        </Grid>

        {/* Node Activity Distribution */}
        <Grid item xs={12} md={6}>
          {renderNodeActivityDistribution()}
        </Grid>

        {/* Gateway Activity Distribution */}
        <Grid item xs={12} md={6}>
          {renderGatewayActivityDistribution()}
        </Grid>

        {/* Signal Quality Distribution */}
        <Grid item xs={12} md={6}>
          {renderSignalQualityDistribution()}
        </Grid>

        {/* Message Routing Patterns */}
        <Grid item xs={12} md={6}>
          {renderMessageRoutingPatterns()}
        </Grid>

        {/* Protocol Usage */}
        <Grid item xs={12} md={6}>
          {renderProtocolUsage()}
        </Grid>

        {/* Most Active Nodes Table */}
        <Grid item xs={12} md={6}>
          {renderMostActiveNodesTable()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardCharts;
