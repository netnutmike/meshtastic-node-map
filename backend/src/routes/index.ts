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
import { apiKeyRoutes } from './api-keys';
import { securityAuditRoutes } from './security-audit';
import { dataExportRoutes } from './data-export';
// import analyticsRoutes from './analytics'; // Temporarily disabled due to validation errors
import coverageAnalysisRoutes from './coverage-analysis';
import { trackApiUsage } from '../middleware/rateLimiting';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Apply API usage tracking to all routes
router.use(trackApiUsage);

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
router.use(`${API_VERSION}/api-keys`, apiKeyRoutes);
router.use(`${API_VERSION}/security`, securityAuditRoutes);
router.use(`${API_VERSION}/export`, dataExportRoutes);
// router.use(`${API_VERSION}/analytics`, analyticsRoutes); // Temporarily disabled
router.use(`${API_VERSION}/coverage-analysis`, coverageAnalysisRoutes);

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
      utilizationAnalysis: `${API_VERSION}/utilization-analysis`,
      apiKeys: `${API_VERSION}/api-keys`,
      security: `${API_VERSION}/security`,
      export: `${API_VERSION}/export`,
      analytics: `${API_VERSION}/analytics`,
      coverageAnalysis: `${API_VERSION}/coverage-analysis`
    },
    documentation: `${API_VERSION}/docs`
  });
});

export { router as apiRoutes };