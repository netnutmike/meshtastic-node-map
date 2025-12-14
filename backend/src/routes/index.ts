import { Router } from 'express';
import { nodeRoutes } from './nodes';
import { positionRoutes } from './positions';
import { telemetryRoutes } from './telemetry';
import { messageRoutes } from './messages';
import { networkRoutes } from './networks';
import { authRoutes } from './auth';
import { mqttMonitorRoutes } from './mqtt-monitor';
import { statisticsRoutes } from './statistics';
import { utilizationAnalysisRoutes } from './utilization-analysis';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Mount route modules
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/nodes`, nodeRoutes);
router.use(`${API_VERSION}/positions`, positionRoutes);
router.use(`${API_VERSION}/telemetry`, telemetryRoutes);
router.use(`${API_VERSION}/messages`, messageRoutes);
router.use(`${API_VERSION}/networks`, networkRoutes);
router.use(`${API_VERSION}/mqtt-monitor`, mqttMonitorRoutes);
router.use(`${API_VERSION}/statistics`, statisticsRoutes);
router.use(`${API_VERSION}/utilization-analysis`, utilizationAnalysisRoutes);

// API info endpoint
router.get(`${API_VERSION}`, (req, res) => {
  res.json({
    name: 'Meshtastic Node Mapper API',
    version: '1.0.0',
    description: 'REST API for Meshtastic mesh network visualization and monitoring',
    endpoints: {
      auth: `${API_VERSION}/auth`,
      nodes: `${API_VERSION}/nodes`,
      positions: `${API_VERSION}/positions`,
      telemetry: `${API_VERSION}/telemetry`,
      messages: `${API_VERSION}/messages`,
      networks: `${API_VERSION}/networks`,
      mqttMonitor: `${API_VERSION}/mqtt-monitor`,
      statistics: `${API_VERSION}/statistics`,
      utilizationAnalysis: `${API_VERSION}/utilization-analysis`
    },
    documentation: `${API_VERSION}/docs`
  });
});

export { router as apiRoutes };