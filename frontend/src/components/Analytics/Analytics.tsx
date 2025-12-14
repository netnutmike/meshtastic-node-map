import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Psychology as PsychologyIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkCheckIcon,
  BatteryAlert as BatteryAlertIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
import { api } from '../../services/api';
import './Analytics.css';

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

interface NodeFailurePrediction {
  nodeId: string;
  shortName?: string;
  failureRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  predictedFailureDate?: string;
  riskFactors: {
    batteryTrend: number;
    connectivityIssues: number;
    telemetryAnomalies: number;
    messageFailureRate: number;
  };
  recommendations: string[];
}

interface NetworkAnomaly {
  id: string;
  type: 'CONNECTIVITY' | 'PERFORMANCE' | 'SECURITY' | 'HARDWARE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedNodes: string[];
  detectedAt: string;
  confidence: number;
  metrics: Record<string, number>;
  suggestedActions: string[];
}

interface PerformanceOptimization {
  category: 'ROUTING' | 'CHANNEL_USAGE' | 'POWER_MANAGEMENT' | 'NETWORK_TOPOLOGY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  description: string;
  expectedImprovement: string;
  implementationSteps: string[];
  affectedNodes?: string[];
  estimatedEffort: 'EASY' | 'MODERATE' | 'COMPLEX';
}

interface TrendAnalysis {
  metric: string;
  timeframe: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  changeRate: number;
  forecast: Array<{
    date: string;
    predictedValue: number;
    confidence: number;
  }>;
}

interface IntelligentAlert {
  id: string;
  type: 'PREDICTIVE' | 'ANOMALY' | 'THRESHOLD' | 'PATTERN';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  nodeIds: string[];
  triggeredAt: string;
  mlConfidence: number;
  context: Record<string, any>;
  suggestedActions: string[];
  autoResolvable: boolean;
}

interface NetworkHealthScore {
  overallScore: number;
  healthGrade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  breakdown: {
    connectivity: number;
    performance: number;
    reliability: number;
    security: number;
  };
  recommendations: string[];
  lastAssessed: string;
}

interface AnalyticsProps {
  networkId?: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ networkId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Analytics data state
  const [predictions, setPredictions] = useState<NodeFailurePrediction[]>([]);
  const [anomalies, setAnomalies] = useState<NetworkAnomaly[]>([]);
  const [optimizations, setOptimizations] = useState<PerformanceOptimization[]>([]);
  const [trends, setTrends] = useState<TrendAnalysis[]>([]);
  const [alerts, setAlerts] = useState<IntelligentAlert[]>([]);
  const [healthScore, setHealthScore] = useState<NetworkHealthScore | null>(null);

  // Filters
  const [timeWindow, setTimeWindow] = useState(24);
  const [lookAheadDays, setLookAheadDays] = useState(30);

  useEffect(() => {
    loadAnalyticsData();
  }, [networkId, timeWindow, lookAheadDays]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        predictionsRes,
        anomaliesRes,
        optimizationsRes,
        trendsRes,
        alertsRes,
        healthRes
      ] = await Promise.all([
        api.get('/analytics/predictions/failures', {
          params: { networkId, lookAheadDays }
        }),
        api.get('/analytics/anomalies', {
          params: { networkId, timeWindow }
        }),
        api.get('/analytics/optimizations', {
          params: { networkId }
        }),
        api.get('/analytics/trends', {
          params: { networkId, metrics: 'nodes,messages,utilization,battery' }
        }),
        api.get('/analytics/alerts', {
          params: { networkId }
        }),
        networkId ? api.get(`/analytics/network/${networkId}/health-score`) : Promise.resolve({ data: null })
      ]);

      setPredictions(predictionsRes.data);
      setAnomalies(anomaliesRes.data);
      setOptimizations(optimizationsRes.data);
      setTrends(trendsRes.data);
      setAlerts(alertsRes.data);
      setHealthScore(healthRes.data);
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': case 'ERROR': return 'error';
      case 'MEDIUM': case 'WARNING': return 'warning';
      case 'LOW': case 'INFO': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': case 'ERROR': return <ErrorIcon />;
      case 'HIGH': case 'WARNING': return <WarningIcon />;
      case 'MEDIUM': case 'INFO': return <InfoIcon />;
      case 'LOW': return <CheckCircleIcon />;
      default: return <InfoIcon />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING': return <TrendingUpIcon color="success" />;
      case 'DECREASING': return <TrendingDownIcon color="error" />;
      case 'STABLE': return <TrendingFlatIcon color="info" />;
      default: return <TrendingFlatIcon />;
    }
  };

  const renderHealthScore = () => {
    if (!healthScore) return null;

    const getHealthColor = (grade: string) => {
      switch (grade) {
        case 'EXCELLENT': return '#4caf50';
        case 'GOOD': return '#8bc34a';
        case 'FAIR': return '#ff9800';
        case 'POOR': return '#f44336';
        case 'CRITICAL': return '#d32f2f';
        default: return '#9e9e9e';
      }
    };

    return (
      <Card className="health-score-card">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Network Health Score
          </Typography>
          <Box display="flex" alignItems="center" mb={2}>
            <Box position="relative" display="inline-flex" mr={2}>
              <CircularProgress
                variant="determinate"
                value={healthScore.overallScore}
                size={80}
                thickness={4}
                style={{ color: getHealthColor(healthScore.healthGrade) }}
              />
              <Box
                position="absolute"
                top={0}
                left={0}
                bottom={0}
                right={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography variant="h6" component="div">
                  {healthScore.overallScore}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="h5" style={{ color: getHealthColor(healthScore.healthGrade) }}>
                {healthScore.healthGrade}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Last assessed: {new Date(healthScore.lastAssessed).toLocaleString()}
              </Typography>
            </Box>
          </Box>
          
          <Grid container spacing={2}>
            {Object.entries(healthScore.breakdown).map(([key, value]) => (
              <Grid item xs={6} sm={3} key={key}>
                <Box textAlign="center">
                  <Typography variant="body2" color="textSecondary" textTransform="capitalize">
                    {key}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={value}
                    style={{ height: 8, borderRadius: 4, marginTop: 4 }}
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {value}%
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {healthScore.recommendations.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Top Recommendations:
              </Typography>
              <List dense>
                {healthScore.recommendations.slice(0, 3).map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPredictions = () => (
    <Grid container spacing={2}>
      {predictions.slice(0, 10).map((prediction) => (
        <Grid item xs={12} md={6} key={prediction.nodeId}>
          <Card className={`prediction-card risk-${prediction.failureRisk.toLowerCase()}`}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">
                  {prediction.shortName || prediction.nodeId}
                </Typography>
                <Chip
                  label={prediction.failureRisk}
                  color={getSeverityColor(prediction.failureRisk) as any}
                  size="small"
                />
              </Box>
              
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="body2" color="textSecondary" mr={1}>
                  Risk Score:
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={prediction.riskScore}
                  style={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" fontWeight="bold" ml={1}>
                  {prediction.riskScore}%
                </Typography>
              </Box>

              {prediction.predictedFailureDate && (
                <Typography variant="body2" color="error" gutterBottom>
                  Predicted failure: {new Date(prediction.predictedFailureDate).toLocaleDateString()}
                </Typography>
              )}

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">Risk Factors & Recommendations</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>Risk Factors:</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption">Battery Trend: {(prediction.riskFactors.batteryTrend * 100).toFixed(1)}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption">Connectivity: {(prediction.riskFactors.connectivityIssues * 100).toFixed(1)}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption">Telemetry: {(prediction.riskFactors.telemetryAnomalies * 100).toFixed(1)}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption">Messages: {(prediction.riskFactors.messageFailureRate * 100).toFixed(1)}%</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                  <List dense>
                    {prediction.recommendations.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderAnomalies = () => (
    <Grid container spacing={2}>
      {anomalies.map((anomaly) => (
        <Grid item xs={12} key={anomaly.id}>
          <Alert
            severity={getSeverityColor(anomaly.severity) as any}
            icon={getSeverityIcon(anomaly.severity)}
          >
            <AlertTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <span>{anomaly.type} Anomaly</span>
                <Chip
                  label={`${(anomaly.confidence * 100).toFixed(0)}% confidence`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </AlertTitle>
            <Typography variant="body2" gutterBottom>
              {anomaly.description}
            </Typography>
            
            {anomaly.affectedNodes.length > 0 && (
              <Typography variant="caption" display="block" gutterBottom>
                Affected nodes: {anomaly.affectedNodes.join(', ')}
              </Typography>
            )}
            
            <Typography variant="caption" display="block" gutterBottom>
              Detected: {new Date(anomaly.detectedAt).toLocaleString()}
            </Typography>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">Suggested Actions</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {anomaly.suggestedActions.map((action, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={action} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </Alert>
        </Grid>
      ))}
    </Grid>
  );

  const renderOptimizations = () => (
    <Grid container spacing={2}>
      {optimizations.map((opt, index) => (
        <Grid item xs={12} md={6} key={index}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">{opt.title}</Typography>
                <Box>
                  <Chip
                    label={opt.priority}
                    color={getSeverityColor(opt.priority) as any}
                    size="small"
                    style={{ marginRight: 8 }}
                  />
                  <Chip
                    label={opt.estimatedEffort}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Box>
              
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {opt.category.replace('_', ' ')}
              </Typography>
              
              <Typography variant="body2" paragraph>
                {opt.description}
              </Typography>
              
              <Typography variant="body2" color="primary" gutterBottom>
                Expected improvement: {opt.expectedImprovement}
              </Typography>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">Implementation Steps</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {opt.implementationSteps.map((step, stepIndex) => (
                      <ListItem key={stepIndex}>
                        <ListItemText primary={`${stepIndex + 1}. ${step}`} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderTrends = () => {
    const chartData = trends.map(trend => ({
      label: trend.metric,
      data: trend.forecast.map(f => f.predictedValue),
      borderColor: trend.trend === 'INCREASING' ? '#4caf50' : 
                   trend.trend === 'DECREASING' ? '#f44336' : '#2196f3',
      backgroundColor: trend.trend === 'INCREASING' ? 'rgba(76, 175, 80, 0.1)' : 
                       trend.trend === 'DECREASING' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(33, 150, 243, 0.1)',
      fill: true
    }));

    const chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Trend Forecasts'
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
            text: 'Value'
          }
        }
      }
    };

    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trend Analysis & Forecasting
              </Typography>
              {trends.length > 0 && (
                <Line
                  data={{
                    labels: trends[0]?.forecast.map(f => new Date(f.date).toLocaleDateString()) || [],
                    datasets: chartData
                  }}
                  options={chartOptions}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {trends.map((trend, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  {getTrendIcon(trend.trend)}
                  <Typography variant="h6" ml={1} textTransform="capitalize">
                    {trend.metric}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {trend.timeframe} trend
                </Typography>
                
                <Typography variant="h4" color={
                  trend.trend === 'INCREASING' ? 'success.main' : 
                  trend.trend === 'DECREASING' ? 'error.main' : 'info.main'
                }>
                  {trend.changeRate > 0 ? '+' : ''}{trend.changeRate.toFixed(1)}%
                </Typography>
                
                <Typography variant="body2" color="textSecondary">
                  {trend.trend.toLowerCase()} trend
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderAlerts = () => (
    <Grid container spacing={2}>
      {alerts.map((alert) => (
        <Grid item xs={12} key={alert.id}>
          <Alert
            severity={getSeverityColor(alert.severity) as any}
            icon={getSeverityIcon(alert.severity)}
          >
            <AlertTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <span>{alert.title}</span>
                <Box>
                  <Chip
                    label={alert.type}
                    size="small"
                    variant="outlined"
                    style={{ marginRight: 8 }}
                  />
                  <Chip
                    label={`${(alert.mlConfidence * 100).toFixed(0)}% confidence`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>
            </AlertTitle>
            
            <Typography variant="body2" gutterBottom>
              {alert.message}
            </Typography>
            
            {alert.nodeIds.length > 0 && (
              <Typography variant="caption" display="block" gutterBottom>
                Affected nodes: {alert.nodeIds.join(', ')}
              </Typography>
            )}
            
            <Typography variant="caption" display="block" gutterBottom>
              Triggered: {new Date(alert.triggeredAt).toLocaleString()}
            </Typography>

            {alert.suggestedActions.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">Suggested Actions</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {alert.suggestedActions.map((action, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={action} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}
          </Alert>
        </Grid>
      ))}
    </Grid>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Error Loading Analytics</AlertTitle>
        {error}
        <Button onClick={loadAnalyticsData} startIcon={<RefreshIcon />} style={{ marginTop: 8 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box className="analytics-container">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          <PsychologyIcon style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Advanced Analytics
        </Typography>
        
        <Box display="flex" gap={2}>
          <FormControl size="small" style={{ minWidth: 120 }}>
            <InputLabel>Time Window</InputLabel>
            <Select
              value={timeWindow}
              label="Time Window"
              onChange={(e) => setTimeWindow(e.target.value as number)}
            >
              <MenuItem value={1}>1 Hour</MenuItem>
              <MenuItem value={6}>6 Hours</MenuItem>
              <MenuItem value={24}>24 Hours</MenuItem>
              <MenuItem value={168}>1 Week</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" style={{ minWidth: 120 }}>
            <InputLabel>Forecast</InputLabel>
            <Select
              value={lookAheadDays}
              label="Forecast"
              onChange={(e) => setLookAheadDays(e.target.value as number)}
            >
              <MenuItem value={7}>7 Days</MenuItem>
              <MenuItem value={30}>30 Days</MenuItem>
              <MenuItem value={90}>90 Days</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAnalyticsData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {healthScore && (
        <Box mb={3}>
          {renderHealthScore()}
        </Box>
      )}

      <Paper>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Failure Predictions" icon={<BatteryAlertIcon />} />
          <Tab label="Anomaly Detection" icon={<SecurityIcon />} />
          <Tab label="Optimizations" icon={<SpeedIcon />} />
          <Tab label="Trend Analysis" icon={<TrendingUpIcon />} />
          <Tab label="Intelligent Alerts" icon={<PsychologyIcon />} />
        </Tabs>
        
        <Box p={3}>
          {activeTab === 0 && renderPredictions()}
          {activeTab === 1 && renderAnomalies()}
          {activeTab === 2 && renderOptimizations()}
          {activeTab === 3 && renderTrends()}
          {activeTab === 4 && renderAlerts()}
        </Box>
      </Paper>
    </Box>
  );
};

export default Analytics;