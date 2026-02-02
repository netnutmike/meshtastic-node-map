import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../services/analytics.service';
import { optionalAuth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { applyRateLimit } from '../middleware/rateLimiting';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { createClient } from 'redis';

const router = Router();
const db = new PrismaClient();
const analyticsService = new AnalyticsService(db);

// Initialize Redis client for caching
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect().catch(err => logger.error('Failed to connect to Redis', err));

// Validation middleware helper (simplified)
const validateRequest = (req: Request, res: Response, next: Function) => {
  // Simplified validation - in production use express-validator
  next();
};

// Auth middleware (using optionalAuth as base)
const authenticateToken = optionalAuth;

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics with metrics and charts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     totalNodes:
 *                       type: number
 *                     activeNodes24h:
 *                       type: number
 *                     activeNodesPercentage:
 *                       type: number
 *                     gatewayDiversity:
 *                       type: number
 *                     protocolDiversity:
 *                       type: number
 *                     totalMessages:
 *                       type: number
 *                     successRate:
 *                       type: number
 *                 charts:
 *                   type: object
 *                   properties:
 *                     networkActivityTrends:
 *                       type: array
 *                     nodeActivityDistribution:
 *                       type: array
 *                     gatewayActivityDistribution:
 *                       type: array
 *                     signalQualityDistribution:
 *                       type: array
 *                     messageRoutingPatterns:
 *                       type: array
 *                     protocolUsage:
 *                       type: array
 *                 topNodes:
 *                   type: array
 */
router.get('/dashboard',
  authenticateToken,
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Fetching dashboard statistics', { 
        userId: (req as any).user?.id 
      });

      // Check cache first
      const cacheKey = 'dashboard:statistics';
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        logger.debug('Returning cached dashboard statistics');
        res.json(JSON.parse(cached));
        return;
      }

      // Calculate dashboard statistics using optimized query
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Single optimized query for all statistics
      const stats = await db.$queryRaw<any[]>`
        WITH node_stats AS (
          SELECT
            COUNT(DISTINCT id) as total_nodes,
            COUNT(DISTINCT CASE WHEN "lastSeen" >= ${twentyFourHoursAgo} THEN id END) as active_nodes_24h
          FROM nodes
        ),
        message_stats AS (
          SELECT
            COUNT(*) as total_messages,
            COUNT(DISTINCT CASE WHEN topic IS NOT NULL THEN SUBSTRING(topic FROM 'msh/[^/]+/[^/]+/[^/]+/[^/]+/([^/]+)/') END) as gateway_diversity,
            COUNT(DISTINCT type) as protocol_diversity,
            SUM(CASE WHEN rssi IS NOT NULL THEN 1 ELSE 0 END) as successful_messages,
            -- RSSI distribution
            SUM(CASE WHEN rssi > -70 THEN 1 ELSE 0 END) as rssi_excellent,
            SUM(CASE WHEN rssi > -80 AND rssi <= -70 THEN 1 ELSE 0 END) as rssi_good,
            SUM(CASE WHEN rssi > -90 AND rssi <= -80 THEN 1 ELSE 0 END) as rssi_fair,
            SUM(CASE WHEN rssi <= -90 THEN 1 ELSE 0 END) as rssi_poor,
            -- Routing patterns
            SUM(CASE WHEN "hopStart" IS NOT NULL AND "hopLimit" IS NOT NULL AND ("hopStart" - "hopLimit") = 0 THEN 1 ELSE 0 END) as direct_messages,
            SUM(CASE WHEN "hopStart" IS NOT NULL AND "hopLimit" IS NOT NULL AND ("hopStart" - "hopLimit") BETWEEN 1 AND 2 THEN 1 ELSE 0 END) as routed_messages,
            SUM(CASE WHEN "hopStart" IS NOT NULL AND "hopLimit" IS NOT NULL AND ("hopStart" - "hopLimit") >= 3 THEN 1 ELSE 0 END) as multihop_messages
          FROM messages
          WHERE timestamp >= ${twentyFourHoursAgo}
        ),
        node_activity AS (
          SELECT
            n.id,
            n."shortName",
            n."longName",
            COUNT(m.id) as message_count,
            AVG(m.rssi) as avg_rssi
          FROM nodes n
          LEFT JOIN messages m ON m."fromNodeId" = n.id AND m.timestamp >= ${twentyFourHoursAgo}
          GROUP BY n.id, n."shortName", n."longName"
        ),
        hourly_activity AS (
          SELECT
            DATE_TRUNC('hour', timestamp) as hour,
            COUNT(*) as message_count
          FROM messages
          WHERE timestamp >= ${sevenDaysAgo}
          GROUP BY DATE_TRUNC('hour', timestamp)
          ORDER BY hour
        )
        SELECT
          (SELECT json_build_object(
            'totalNodes', total_nodes,
            'activeNodes24h', active_nodes_24h
          ) FROM node_stats) as node_stats,
          (SELECT json_build_object(
            'totalMessages', total_messages,
            'gatewayDiversity', gateway_diversity,
            'protocolDiversity', protocol_diversity,
            'successfulMessages', successful_messages,
            'rssiExcellent', rssi_excellent,
            'rssiGood', rssi_good,
            'rssiFair', rssi_fair,
            'rssiPoor', rssi_poor,
            'directMessages', direct_messages,
            'routedMessages', routed_messages,
            'multihopMessages', multihop_messages
          ) FROM message_stats) as message_stats,
          (SELECT json_agg(json_build_object(
            'nodeId', id,
            'shortName', "shortName",
            'longName', "longName",
            'messageCount', message_count,
            'avgRssi', avg_rssi
          ) ORDER BY message_count DESC LIMIT 10) FROM node_activity WHERE message_count > 0) as top_nodes,
          (SELECT json_agg(json_build_object(
            'hour', hour,
            'messageCount', message_count
          ) ORDER BY hour) FROM hourly_activity) as hourly_activity
      `;

      const result = stats[0];
      const nodeStats = result.node_stats || { totalNodes: 0, activeNodes24h: 0 };
      const messageStats = result.message_stats || {};
      const topNodes = result.top_nodes || [];
      const hourlyActivity = result.hourly_activity || [];

      // Calculate derived metrics
      const activeNodesPercentage = nodeStats.totalNodes > 0 
        ? Math.round((nodeStats.activeNodes24h / nodeStats.totalNodes) * 100) 
        : 0;

      const successRate = messageStats.totalMessages > 0
        ? Math.round((messageStats.successfulMessages / messageStats.totalMessages) * 100)
        : 0;

      // Build response
      const dashboardData = {
        metrics: {
          totalNodes: Number(nodeStats.totalNodes) || 0,
          activeNodes24h: Number(nodeStats.activeNodes24h) || 0,
          activeNodesPercentage,
          gatewayDiversity: Number(messageStats.gatewayDiversity) || 0,
          protocolDiversity: Number(messageStats.protocolDiversity) || 0,
          totalMessages: Number(messageStats.totalMessages) || 0,
          successRate
        },
        charts: {
          networkActivityTrends: hourlyActivity.map((item: any) => ({
            timestamp: item.hour,
            messageCount: Number(item.messageCount)
          })),
          nodeActivityDistribution: [
            { category: 'Very Active (>100 msgs)', count: topNodes.filter((n: any) => n.messageCount > 100).length },
            { category: 'Moderately Active (10-100)', count: topNodes.filter((n: any) => n.messageCount >= 10 && n.messageCount <= 100).length },
            { category: 'Lightly Active (1-10)', count: topNodes.filter((n: any) => n.messageCount >= 1 && n.messageCount < 10).length },
            { category: 'Inactive (0)', count: Math.max(0, Number(nodeStats.totalNodes) - topNodes.length) }
          ],
          gatewayActivityDistribution: [], // Will be populated from gateway-specific query if needed
          signalQualityDistribution: [
            { category: 'Excellent (>-70dBm)', count: Number(messageStats.rssiExcellent) || 0 },
            { category: 'Good (-70 to -80)', count: Number(messageStats.rssiGood) || 0 },
            { category: 'Fair (-80 to -90)', count: Number(messageStats.rssiFair) || 0 },
            { category: 'Poor (<-90)', count: Number(messageStats.rssiPoor) || 0 }
          ],
          messageRoutingPatterns: [
            { category: 'Direct (0 hops)', count: Number(messageStats.directMessages) || 0 },
            { category: 'Routed (1-2 hops)', count: Number(messageStats.routedMessages) || 0 },
            { category: 'Multi-hop (3+)', count: Number(messageStats.multihopMessages) || 0 }
          ],
          protocolUsage: [] as Array<{ protocol: string; count: number }>
        },
        topNodes: topNodes.map((node: any) => ({
          nodeId: node.nodeId,
          shortName: node.shortName || 'Unknown',
          longName: node.longName || 'Unknown',
          messageCount: Number(node.messageCount),
          avgRssi: node.avgRssi ? Number(node.avgRssi).toFixed(1) : null
        })).slice(0, 10) // Ensure we only return top 10
      };

      // Get protocol usage distribution
      const protocolUsage = await db.message.groupBy({
        by: ['type'],
        where: {
          timestamp: {
            gte: twentyFourHoursAgo
          }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });

      dashboardData.charts.protocolUsage = protocolUsage.map(p => ({
        protocol: p.type,
        count: p._count.id
      }));

      // Cache for 60 seconds
      await redisClient.setEx(cacheKey, 60, JSON.stringify(dashboardData));

      res.json(dashboardData);
    } catch (error) {
      logger.error('Error fetching dashboard statistics:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  }
);

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
        res.status(404).json({ error: 'Node not found or no assessment available' });
        return;
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