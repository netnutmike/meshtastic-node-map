import { Router, Request, Response } from 'express';
import { UtilizationAnalysisService } from '../services/utilization-analysis.service';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission, optionalPermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { getDatabase } from '../database/connection';

const db = getDatabase();

const router = Router();
const utilizationService = new UtilizationAnalysisService(db);

// GET /utilization-analysis/channel-stats - Get channel utilization statistics
router.get('/channel-stats',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { networkId } = req.query;

    logger.debug('Fetching channel utilization statistics', { networkId });

    const stats = await utilizationService.getChannelUtilizationStats(
      networkId as string | undefined
    );

    return res.json({
      data: stats,
      generatedAt: new Date()
    });
  })
);

// GET /utilization-analysis/trends - Get utilization trends over time
router.get('/trends',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { period = '24h' } = req.query;

    if (!['24h', '7d', '30d'].includes(period as string)) {
      return res.status(400).json({
        error: 'Invalid period. Supported periods: 24h, 7d, 30d'
      });
    }

    logger.debug('Fetching utilization trends', { period });

    const trends = await utilizationService.getUtilizationTrends(
      period as '24h' | '7d' | '30d'
    );

    return res.json({
      data: trends,
      generatedAt: new Date()
    });
  })
);

// GET /utilization-analysis/heatmap - Generate utilization heatmap
router.get('/heatmap',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { networkId } = req.query;

    logger.debug('Generating utilization heatmap', { networkId });

    const heatmap = await utilizationService.generateUtilizationHeatmap(
      networkId as string | undefined
    );

    return res.json({
      data: heatmap,
      generatedAt: new Date()
    });
  })
);

// GET /utilization-analysis/capacity-planning - Get capacity planning report
router.get('/capacity-planning',
  applyRateLimit('read'),
  optionalAuth,
  optionalPermission('read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { networkId } = req.query;

    logger.debug('Generating capacity planning report', { networkId });

    const report = await utilizationService.generateCapacityPlanningReport(
      networkId as string | undefined
    );

    return res.json({
      data: report,
      generatedAt: new Date()
    });
  })
);

// GET /utilization-analysis/high-utilization-nodes - Get nodes with high utilization
router.get('/high-utilization-nodes',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { threshold = '80', networkId } = req.query;

    const thresholdValue = parseFloat(threshold as string);
    if (isNaN(thresholdValue) || thresholdValue < 0 || thresholdValue > 100) {
      return res.status(400).json({
        error: 'Threshold must be a number between 0 and 100'
      });
    }

    logger.debug('Identifying high utilization nodes', { threshold: thresholdValue, networkId });

    const nodes = await utilizationService.identifyHighUtilizationNodes(
      thresholdValue,
      networkId as string | undefined
    );

    return res.json({
      data: nodes,
      generatedAt: new Date()
    });
  })
);

// GET /utilization-analysis/capacity-metrics - Get network capacity metrics
router.get('/capacity-metrics',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { networkId } = req.query;

    logger.debug('Calculating network capacity metrics', { networkId });

    const metrics = await utilizationService.calculateNetworkCapacityMetrics(
      networkId as string | undefined
    );

    return res.json({
      data: metrics,
      generatedAt: new Date()
    });
  })
);

// GET /utilization-analysis/trend-analysis - Analyze utilization trends
router.get('/trend-analysis',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { period = '7d' } = req.query;

    if (!['7d', '30d'].includes(period as string)) {
      return res.status(400).json({
        error: 'Invalid period. Supported periods: 7d, 30d'
      });
    }

    logger.debug('Analyzing utilization trends', { period });

    const analysis = await utilizationService.analyzeTrends(
      period as '7d' | '30d'
    );

    return res.json({
      data: analysis,
      generatedAt: new Date()
    });
  })
);

// GET /utilization-analysis/anomalies - Detect utilization anomalies
router.get('/anomalies',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { networkId } = req.query;

    logger.debug('Detecting utilization anomalies', { networkId });

    const anomalies = await utilizationService.detectUtilizationAnomalies(
      networkId as string | undefined
    );

    return res.json({
      data: anomalies,
      generatedAt: new Date()
    });
  })
);

// GET /utilization-analysis/forecast - Forecast future utilization
router.get('/forecast',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { daysAhead = '7' } = req.query;

    const days = parseInt(daysAhead as string);
    if (isNaN(days) || days <= 0 || days > 30) {
      return res.status(400).json({
        error: 'Days ahead must be a number between 1 and 30'
      });
    }

    logger.debug('Forecasting utilization', { daysAhead: days });

    const forecast = await utilizationService.forecastUtilization(days);

    return res.json({
      data: forecast,
      generatedAt: new Date()
    });
  })
);

// POST /utilization-analysis/check-thresholds - Check utilization thresholds
router.post('/check-thresholds',
  applyRateLimit('write'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { warning, critical, checkInterval } = req.body;

    if (typeof warning !== 'number' || typeof critical !== 'number') {
      return res.status(400).json({
        error: 'Warning and critical thresholds must be numbers'
      });
    }

    const config = {
      warning,
      critical,
      checkInterval: checkInterval || undefined
    };

    logger.debug('Checking utilization thresholds', config);

    const result = await utilizationService.checkUtilizationThresholds(config);

    return res.json({
      data: result,
      generatedAt: new Date()
    });
  })
);

// GET /utilization-analysis/performance-degradation - Detect performance degradation
router.get('/performance-degradation',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    logger.debug('Detecting performance degradation');

    const result = await utilizationService.detectPerformanceDegradation();

    return res.json({
      data: result,
      generatedAt: new Date()
    });
  })
);

export { router as utilizationAnalysisRoutes };