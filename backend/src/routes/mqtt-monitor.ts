/**
 * MQTT Monitor Routes
 * Provides real-time MQTT traffic monitoring and debugging tools
 * Requirements: 11.1
 */

import { Router } from 'express';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission, optionalPermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// MQTT Monitor service will be injected via middleware or app context
// For now, we'll use a placeholder that will be replaced during app initialization
let mqttMonitorService: any = null;

// Middleware to inject MQTT monitor service
router.use((req, res, next) => {
  if (!mqttMonitorService && (req.app as any).mqttManagerService) {
    mqttMonitorService = (req.app as any).mqttManagerService.getMQTTMonitorService();
  }
  next();
});

// GET /mqtt-monitor/status - Get MQTT connection status
router.get('/status',
  applyRateLimit('read'),
  optionalAuth,
  optionalPermission('read'),
  asyncHandler(async (req, res) => {
    if (!mqttMonitorService) {
      return res.status(503).json({ error: 'MQTT Monitor service not available' });
    }
    const status = await mqttMonitorService.getConnectionStatus();
    return res.json({ data: status });
  })
);

// GET /mqtt-monitor/messages - Get recent MQTT messages with filtering
router.get('/messages',
  applyRateLimit('read'),
  optionalAuth,
  optionalPermission('read'),
  asyncHandler(async (req, res) => {
    if (!mqttMonitorService) {
      // Return empty data instead of 503 when service is not available
      logger.warn('MQTT Monitor service not available, returning empty data');
      return res.json({
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0
        },
        filters: req.query,
        warning: 'MQTT Monitor service is not available. Check MQTT connection configuration.'
      });
    }

    const {
      page = 1,
      limit = 50,
      messageType,
      nodeId,
      encrypted,
      channel,
      startDate,
      endDate,
      search
    } = req.query;

    const filters: any = {};
    
    if (messageType) filters.type = messageType;
    if (nodeId) filters.nodeId = nodeId;
    if (typeof encrypted === 'boolean') filters.encrypted = encrypted;
    if (channel) filters.channel = parseInt(channel as string, 10);
    if (search) filters.search = search;
    
    if (startDate || endDate) {
      filters.dateRange = {};
      if (startDate) filters.dateRange.start = new Date(startDate as string);
      if (endDate) filters.dateRange.end = new Date(endDate as string);
    }

    const result = await mqttMonitorService.getMessages({
      filters,
      page: page as number,
      limit: limit as number
    });

    return res.json({
      data: result.messages,
      pagination: {
        page: page as number,
        limit: limit as number,
        total: result.total,
        pages: Math.ceil(result.total / (limit as number))
      },
      filters: req.query
    });
  })
);

// GET /mqtt-monitor/statistics - Get message statistics and breakdown
router.get('/statistics',
  applyRateLimit('read'),
  optionalAuth,
  optionalPermission('read'),
  asyncHandler(async (req, res) => {
    if (!mqttMonitorService) {
      logger.warn('MQTT Monitor service not available, returning empty statistics');
      return res.json({
        data: {
          totalMessages: 0,
          messagesByType: {},
          messagesByChannel: {},
          encryptedMessages: 0,
          unencryptedMessages: 0,
          decryptionFailures: 0,
          decryptionFailurePercentage: 0,
          averageMessageSize: 0,
          messagesPerMinute: 0,
          topNodes: [],
          timeRange: req.query.timeRange || '1h'
        },
        warning: 'MQTT Monitor service is not available. Check MQTT connection configuration.'
      });
    }
    
    const { timeRange = '1h' } = req.query;
    
    const stats = await mqttMonitorService.getStatistics(timeRange as string);
    return res.json({ data: stats });
  })
);

// GET /mqtt-monitor/traffic-rate - Get real-time traffic rate
router.get('/traffic-rate',
  applyRateLimit('read'),
  optionalAuth,
  optionalPermission('read'),
  asyncHandler(async (req, res) => {
    if (!mqttMonitorService) {
      return res.status(503).json({ error: 'MQTT Monitor service not available' });
    }
    
    const { interval = '1m' } = req.query;
    
    const trafficRate = await mqttMonitorService.getTrafficRate(interval as string);
    return res.json({ data: trafficRate });
  })
);

// POST /mqtt-monitor/alerts - Configure traffic rate alerts
router.post('/alerts',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  asyncHandler(async (req, res) => {
    if (!mqttMonitorService) {
      return res.status(503).json({ error: 'MQTT Monitor service not available' });
    }
    
    const { threshold, interval, enabled } = req.body;
    
    const alertConfig = await mqttMonitorService.configureAlerts({
      threshold,
      interval,
      enabled
    });
    
    return res.json({
      message: 'Alert configuration updated',
      data: alertConfig
    });
  })
);

// GET /mqtt-monitor/message/:id - Get detailed message inspection
router.get('/message/:id',
  applyRateLimit('read'),
  optionalAuth,
  optionalPermission('read'),
  asyncHandler(async (req, res) => {
    if (!mqttMonitorService) {
      return res.status(503).json({ error: 'MQTT Monitor service not available' });
    }
    
    const { id } = req.params;
    
    const message = await mqttMonitorService.getMessageDetails(id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    return res.json({ data: message });
  })
);

// WebSocket endpoint for real-time message streaming
router.get('/stream',
  optionalAuth,
  optionalPermission('read'),
  asyncHandler(async (req, res) => {
    // This will be handled by WebSocket upgrade in the main server
    return res.status(426).json({
      error: 'Upgrade Required',
      message: 'This endpoint requires WebSocket connection'
    });
  })
);

export { router as mqttMonitorRoutes };