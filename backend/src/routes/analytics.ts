import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../services/analytics.service';
import { optionalAuth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';
import { applyRateLimit } from '../middleware/rate-limit';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const db = new PrismaClient();
const analyticsService = new AnalyticsService(db);

/**
 * @swagger
 * /api/analytics/predictions/failures:
 *   get:
 *     summary: Get node failure predictions
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *         description: Network ID to filter predictions
 *       - in: query
 *         name: lookAheadDays
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 30
 *         description: Number of days to look ahead for predictions
 *     responses:
 *       200:
 *         description: Node failure predictions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   nodeId:
 *                     type: string
 *                   shortName:
 *                     type: string
 *                   failureRisk:
 *                     type: string
 *                     enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                   riskScore:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                   predictedFailureDate:
 *                     type: string
 *                     format: date-time
 *                   riskFactors:
 *                     type: object
 *                   recommendations:
 *                     type: array
 *                     items:
 *                       type: string
 */
router.get('/predictions/failures', 
  authenticateToken,
  [
    query('networkId').optional().isString(),
    query('lookAheadDays').optional().isInt({ min: 1, max: 90 }).toInt()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { networkId, lookAheadDays = 30 } = req.query;
      
      logger.info('Fetching node failure predictions', { 
        networkId, 
        lookAheadDays,
        userId: (req as any).user?.id 
      });

      const predictions = await analyticsService.predictNodeFailures(
        networkId as string,
        lookAheadDays as number
      );

      res.json(predictions);
    } catch (error) {
      logger.error('Error fetching node failure predictions:', error);
      res.status(500).json({ error: 'Failed to fetch predictions' });
    }
  }
);

/**
 * @swagger
 * /api/analytics/anomalies:
 *   get:
 *     summary: Detect network anomalies
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *         description: Network ID to filter anomalies
 *       - in: query
 *         name: timeWindow
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *         description: Time window in hours to analyze
 *     responses:
 *       200:
 *         description: Detected network anomalies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [CONNECTIVITY, PERFORMANCE, SECURITY, HARDWARE]
 *                   severity:
 *                     type: string
 *                     enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                   description:
 *                     type: string
 *                   affectedNodes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   detectedAt:
 *                     type: string
 *                     format: date-time
 *                   confidence:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                   metrics:
 *                     type: object
 *                   suggestedActions:
 *                     type: array
 *                     items:
 *                       type: string
 */
router.get('/anomalies',
  authenticateToken,
  [
    query('networkId').optional().isString(),
    query('timeWindow').optional().isInt({ min: 1, max: 168 }).toInt()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { networkId, timeWindow = 24 } = req.query;
      
      logger.info('Detecting network anomalies', { 
        networkId, 
        timeWindow,
        userId: (req as any).user?.id 
      });

      const anomalies = await analyticsService.detectNetworkAnomalies(
        networkId as string,
        timeWindow as number
      );

      res.json(anomalies);
    } catch (error) {
      logger.error('Error detecting network anomalies:', error);
      res.status(500).json({ error: 'Failed to detect anomalies' });
    }
  }
);

/**
 * @swagger
 * /api/analytics/optimizations:
 *   get:
 *     summary: Get performance optimization recommendations
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *         description: Network ID to analyze
 *     responses:
 *       200:
 *         description: Performance optimization recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   category:
 *                     type: string
 *                     enum: [ROUTING, CHANNEL_USAGE, POWER_MANAGEMENT, NETWORK_TOPOLOGY]
 *                   priority:
 *                     type: string
 *                     enum: [LOW, MEDIUM, HIGH]
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   expectedImprovement:
 *                     type: string
 *                   implementationSteps:
 *                     type: array
 *                     items:
 *                       type: string
 *                   affectedNodes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   estimatedEffort:
 *                     type: string
 *                     enum: [EASY, MODERATE, COMPLEX]
 */
router.get('/optimizations',
  authenticateToken,
  [
    query('networkId').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { networkId } = req.query;
      
      logger.info('Generating optimization recommendations', { 
        networkId,
        userId: (req as any).user?.id 
      });

      const recommendations = await analyticsService.generateOptimizationRecommendations(
        networkId as string
      );

      res.json(recommendations);
    } catch (error) {
      logger.error('Error generating optimization recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  }
);

/**
 * @swagger
 * /api/analytics/trends:
 *   get:
 *     summary: Analyze trends and generate forecasts
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *         description: Network ID to analyze
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [nodes, messages, utilization, battery]
 *         style: form
 *         explode: false
 *         description: Metrics to analyze (comma-separated)
 *     responses:
 *       200:
 *         description: Trend analysis and forecasts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   metric:
 *                     type: string
 *                   timeframe:
 *                     type: string
 *                     enum: [HOURLY, DAILY, WEEKLY, MONTHLY]
 *                   trend:
 *                     type: string
 *                     enum: [INCREASING, DECREASING, STABLE, VOLATILE]
 *                   changeRate:
 *                     type: number
 *                   forecast:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           format: date-time
 *                         predictedValue:
 *                           type: number
 *                         confidence:
 *                           type: number
 *                   seasonality:
 *                     type: object
 */
router.get('/trends',
  authenticateToken,
  [
    query('networkId').optional().isString(),
    query('metrics').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { networkId, metrics } = req.query;
      
      const metricsArray = metrics ? 
        (metrics as string).split(',').map(m => m.trim()) : 
        ['nodes', 'messages', 'utilization'];
      
      logger.info('Analyzing trends', { 
        networkId, 
        metrics: metricsArray,
        userId: (req as any).user?.id 
      });

      const trends = await analyticsService.analyzeTrends(
        networkId as string,
        metricsArray
      );

      res.json(trends);
    } catch (error) {
      logger.error('Error analyzing trends:', error);
      res.status(500).json({ error: 'Failed to analyze trends' });
    }
  }
);

/**
 * @swagger
 * /api/analytics/alerts:
 *   get:
 *     summary: Generate intelligent alerts based on ML insights
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *         description: Network ID to analyze
 *     responses:
 *       200:
 *         description: Intelligent alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [PREDICTIVE, ANOMALY, THRESHOLD, PATTERN]
 *                   severity:
 *                     type: string
 *                     enum: [INFO, WARNING, ERROR, CRITICAL]
 *                   title:
 *                     type: string
 *                   message:
 *                     type: string
 *                   nodeIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   triggeredAt:
 *                     type: string
 *                     format: date-time
 *                   mlConfidence:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                   context:
 *                     type: object
 *                   suggestedActions:
 *                     type: array
 *                     items:
 *                       type: string
 *                   autoResolvable:
 *                     type: boolean
 */
router.get('/alerts',
  authenticateToken,
  [
    query('networkId').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { networkId } = req.query;
      
      logger.info('Generating intelligent alerts', { 
        networkId,
        userId: (req as any).user?.id 
      });

      const alerts = await analyticsService.generateIntelligentAlerts(
        networkId as string
      );

      res.json(alerts);
    } catch (error) {
      logger.error('Error generating intelligent alerts:', error);
      res.status(500).json({ error: 'Failed to generate alerts' });
    }
  }
);

/**
 * @swagger
 * /api/analytics/node/{nodeId}/risk-assessment:
 *   get:
 *     summary: Get detailed risk assessment for a specific node
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Node ID to assess
 *       - in: query
 *         name: lookAheadDays
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 30
 *         description: Number of days to look ahead for predictions
 *     responses:
 *       200:
 *         description: Detailed node risk assessment
 *       404:
 *         description: Node not found
 */
router.get('/node/:nodeId/risk-assessment',
  authenticateToken,
  [
    param('nodeId').isString().notEmpty(),
    query('lookAheadDays').optional().isInt({ min: 1, max: 90 }).toInt()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { nodeId } = req.params;
      const { lookAheadDays = 30 } = req.query;
      
      logger.info('Getting node risk assessment', { 
        nodeId, 
        lookAheadDays,
        userId: (req as any).user?.id 
      });

      const predictions = await analyticsService.predictNodeFailures(
        undefined,
        lookAheadDays as number
      );

      const nodeAssessment = predictions.find(p => p.nodeId === nodeId);
      
      if (!nodeAssessment) {
        return res.status(404).json({ error: 'Node not found or no assessment available' });
      }

      res.json(nodeAssessment);
    } catch (error) {
      logger.error('Error getting node risk assessment:', error);
      res.status(500).json({ error: 'Failed to get risk assessment' });
    }
  }
);

/**
 * @swagger
 * /api/analytics/network/{networkId}/health-score:
 *   get:
 *     summary: Get overall network health score
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: networkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Network ID to assess
 *     responses:
 *       200:
 *         description: Network health score and breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overallScore:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 100
 *                 healthGrade:
 *                   type: string
 *                   enum: [EXCELLENT, GOOD, FAIR, POOR, CRITICAL]
 *                 breakdown:
 *                   type: object
 *                   properties:
 *                     connectivity:
 *                       type: number
 *                     performance:
 *                       type: number
 *                     reliability:
 *                       type: number
 *                     security:
 *                       type: number
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *                 lastAssessed:
 *                   type: string
 *                   format: date-time
 */
router.get('/network/:networkId/health-score',
  authenticateToken,
  [
    param('networkId').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { networkId } = req.params;
      
      logger.info('Calculating network health score', { 
        networkId,
        userId: (req as any).user?.id 
      });

      // Get various analytics to calculate health score
      const [anomalies, predictions, optimizations] = await Promise.all([
        analyticsService.detectNetworkAnomalies(networkId, 24),
        analyticsService.predictNodeFailures(networkId, 7),
        analyticsService.generateOptimizationRecommendations(networkId)
      ]);

      // Calculate health score components
      const connectivityScore = Math.max(0, 100 - (anomalies.filter(a => a.type === 'CONNECTIVITY').length * 20));
      const performanceScore = Math.max(0, 100 - (anomalies.filter(a => a.type === 'PERFORMANCE').length * 15));
      const reliabilityScore = Math.max(0, 100 - (predictions.filter(p => p.riskScore > 60).length * 10));
      const securityScore = Math.max(0, 100 - (anomalies.filter(a => a.type === 'SECURITY').length * 25));

      const overallScore = Math.round((connectivityScore + performanceScore + reliabilityScore + securityScore) / 4);

      let healthGrade: string;
      if (overallScore >= 90) healthGrade = 'EXCELLENT';
      else if (overallScore >= 75) healthGrade = 'GOOD';
      else if (overallScore >= 60) healthGrade = 'FAIR';
      else if (overallScore >= 40) healthGrade = 'POOR';
      else healthGrade = 'CRITICAL';

      const recommendations = [
        ...anomalies.flatMap(a => a.suggestedActions),
        ...optimizations.slice(0, 3).map(o => o.title)
      ].slice(0, 5);

      res.json({
        overallScore,
        healthGrade,
        breakdown: {
          connectivity: connectivityScore,
          performance: performanceScore,
          reliability: reliabilityScore,
          security: securityScore
        },
        recommendations,
        lastAssessed: new Date()
      });
    } catch (error) {
      logger.error('Error calculating network health score:', error);
      res.status(500).json({ error: 'Failed to calculate health score' });
    }
  }
);

export default router;