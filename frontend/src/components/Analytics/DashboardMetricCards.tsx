import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import {
  Devices as DevicesIcon,
  CheckCircle as CheckCircleIcon,
  Router as RouterIcon,
  Category as CategoryIcon,
  Message as MessageIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import './DashboardMetricCards.css';

interface DashboardMetrics {
  totalNodes: number;
  activeNodes24h: number;
  activeNodesPercentage: number;
  gatewayDiversity: number;
  protocolDiversity: number;
  totalMessages: number;
  successRate: number;
}

interface DashboardMetricCardsProps {
  metrics?: DashboardMetrics;
}

const DashboardMetricCards: React.FC<DashboardMetricCardsProps> = ({ metrics }) => {
  // Default values if metrics is undefined
  const {
    totalNodes = 0,
    activeNodes24h = 0,
    activeNodesPercentage = 0,
    gatewayDiversity = 0,
    protocolDiversity = 0,
    totalMessages = 0,
    successRate = 0
  } = metrics || {};

  /**
   * Format large numbers with commas
   * @param num - Number to format
   * @returns Formatted string with commas
   */
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  /**
   * Format success rate with appropriate decimal places
   * @param rate - Success rate percentage
   * @returns Formatted percentage string
   */
  const formatSuccessRate = (rate: number): string => {
    // If it's a whole number, don't show decimals
    if (rate === Math.floor(rate)) {
      return `${rate}%`;
    }
    // Otherwise show one decimal place
    return `${rate.toFixed(1)}%`;
  };

  /**
   * Get color class for success rate based on thresholds
   * @param rate - Success rate percentage
   * @returns CSS class name for color coding
   */
  const getSuccessRateColorClass = (rate: number): string => {
    if (rate >= 95) return 'success-high';
    if (rate >= 85) return 'success-medium';
    return 'success-low';
  };

  const metricCards = [
    {
      title: 'Total Nodes',
      value: formatNumber(totalNodes),
      icon: <DevicesIcon />,
      colorClass: 'total-nodes',
      testId: 'total-nodes-card'
    },
    {
      title: 'Active Nodes (24h)',
      value: formatNumber(activeNodes24h),
      subtitle: `${activeNodesPercentage}% coverage`,
      icon: <CheckCircleIcon />,
      colorClass: 'active-nodes',
      testId: 'active-nodes-card'
    },
    {
      title: 'Gateway Diversity',
      value: formatNumber(gatewayDiversity),
      icon: <RouterIcon />,
      colorClass: 'gateway-diversity',
      testId: 'gateway-diversity-card'
    },
    {
      title: 'Protocol Diversity',
      value: formatNumber(protocolDiversity),
      icon: <CategoryIcon />,
      colorClass: 'protocol-diversity',
      testId: 'protocol-diversity-card'
    },
    {
      title: 'Total Messages',
      value: formatNumber(totalMessages),
      icon: <MessageIcon />,
      colorClass: 'total-messages',
      testId: 'total-messages-card'
    },
    {
      title: 'Processing Success Rate',
      value: formatSuccessRate(successRate),
      icon: <TrendingUpIcon />,
      colorClass: getSuccessRateColorClass(successRate),
      testId: 'success-rate-card'
    }
  ];

  return (
    <Box className="dashboard-metric-cards">
      <Grid container spacing={3}>
        {metricCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card
              className={`metric-card ${card.colorClass}`}
              data-testid={card.testId}
              role="article"
              aria-label={`${card.title}: ${card.value}`}
            >
              <CardContent>
                <Box className="metric-card-header">
                  <Box className="metric-icon">
                    {card.icon}
                  </Box>
                  <Typography
                    variant="subtitle2"
                    className="metric-title"
                    color="text.secondary"
                  >
                    {card.title}
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  className="metric-value"
                  component="div"
                >
                  {card.value}
                </Typography>
                {card.subtitle && (
                  <Typography
                    variant="caption"
                    className="metric-subtitle"
                    color="text.secondary"
                  >
                    {card.subtitle}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardMetricCards;
