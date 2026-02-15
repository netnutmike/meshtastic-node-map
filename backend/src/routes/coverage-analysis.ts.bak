import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validation';
import { coverageAnalysisService, HypotheticalNode } from '../services/coverage-analysis.service';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const coverageAnalysisSchemas = {
  networkQuery: Joi.object({
    networkId: Joi.string().optional()
  }),

  simulateDeployment: Joi.object({
    hypotheticalNodes: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        hardwareModel: Joi.string().required(),
        transmitPower: Joi.number().optional(),
        antennaGain: Joi.number().optional()
      })
    ).required(),
    networkId: Joi.string().optional()
  }),

  nodeIds: Joi.object({
    fromNodeId: Joi.string().required(),
    toNodeId: Joi.string().required()
  }),

  terrainElevation: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  })
};

/**
 * @swagger
 * /api/coverage-analysis/radio-ranges:
 *   get:
 *     summary: Get radio range calculations for all nodes
 *     tags: [Coverage Analysis]
 *     parameters:
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *         description: Optional network ID to filter nodes
 *     responses:
 *       200:
 *         description: Radio range data for nodes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   nodeId:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   rangeMeters:
 *                     type: number
 *                   hardwareModel:
 *                     type: string
 */
router.get('/radio-ranges', 
  validate(coverageAnalysisSchemas.networkQuery, { property: 'query' }),
  async (req, res) => {
    try {
      const { networkId } = req.query;
      const ranges = await coverageAnalysisService.calculateRadioRanges(networkId as string);
      
      res.json(ranges);
    } catch (error) {
      logger.error('Error calculating radio ranges:', error);
      res.status(500).json({ error: 'Failed to calculate radio ranges' });
    }
  }
);

/**
 * @swagger
 * /api/coverage-analysis/coverage-gaps:
 *   get:
 *     summary: Identify coverage gaps in the network
 *     tags: [Coverage Analysis]
 *     parameters:
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *         description: Optional network ID to filter nodes
 *     responses:
 *       200:
 *         description: Coverage gaps in the network
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   gapRadius:
 *                     type: number
 *                   severity:
 *                     type: string
 *                     enum: [low, medium, high]
 */
router.get('/coverage-gaps',
  validate(coverageAnalysisSchemas.networkQuery, { property: 'query' }),
  async (req, res) => {
    try {
      const { networkId } = req.query;
      const gaps = await coverageAnalysisService.identifyCoverageGaps(networkId as string);
      
      res.json(gaps);
    } catch (error) {
      logger.error('Error identifying coverage gaps:', error);
      res.status(500).json({ error: 'Failed to identify coverage gaps' });
    }
  }
);

/**
 * @swagger
 * /api/coverage-analysis/simulate-deployment:
 *   post:
 *     summary: Simulate deployment of hypothetical nodes
 *     tags: [Coverage Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hypotheticalNodes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     hardwareModel:
 *                       type: string
 *               networkId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deployment simulation results
 */
router.post('/simulate-deployment',
  validate(coverageAnalysisSchemas.simulateDeployment),
  async (req, res) => {
    try {
      const { hypotheticalNodes, networkId } = req.body;
      const result = await coverageAnalysisService.simulateDeployment(
        hypotheticalNodes as HypotheticalNode[],
        networkId
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Error simulating deployment:', error);
      res.status(500).json({ error: 'Failed to simulate deployment' });
    }
  }
);

/**
 * @swagger
 * /api/coverage-analysis/line-of-sight/{fromNodeId}/{toNodeId}:
 *   get:
 *     summary: Calculate line-of-sight between two nodes
 *     tags: [Coverage Analysis]
 *     parameters:
 *       - in: path
 *         name: fromNodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: toNodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Line-of-sight calculation result
 */
router.get('/line-of-sight/:fromNodeId/:toNodeId',
  validate(coverageAnalysisSchemas.nodeIds, { property: 'params' }),
  validate(coverageAnalysisSchemas.networkQuery, { property: 'query' }),
  async (req, res) => {
    try {
      const { fromNodeId, toNodeId } = req.params;
      const { networkId } = req.query;
      
      const result = await coverageAnalysisService.calculateLineOfSight(
        fromNodeId,
        toNodeId,
        networkId as string
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Error calculating line of sight:', error);
      res.status(500).json({ error: 'Failed to calculate line of sight' });
    }
  }
);

/**
 * @swagger
 * /api/coverage-analysis/performance-estimate/{fromNodeId}/{toNodeId}:
 *   get:
 *     summary: Estimate network performance between two nodes
 *     tags: [Coverage Analysis]
 *     parameters:
 *       - in: path
 *         name: fromNodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: toNodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Performance estimate
 */
router.get('/performance-estimate/:fromNodeId/:toNodeId',
  validate(coverageAnalysisSchemas.nodeIds, { property: 'params' }),
  validate(coverageAnalysisSchemas.networkQuery, { property: 'query' }),
  async (req, res) => {
    try {
      const { fromNodeId, toNodeId } = req.params;
      const { networkId } = req.query;
      
      const result = await coverageAnalysisService.estimatePerformance(
        fromNodeId,
        toNodeId,
        networkId as string
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Error estimating performance:', error);
      res.status(500).json({ error: 'Failed to estimate performance' });
    }
  }
);

/**
 * @swagger
 * /api/coverage-analysis/optimization-recommendations:
 *   get:
 *     summary: Get network optimization recommendations
 *     tags: [Coverage Analysis]
 *     parameters:
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *         description: Optional network ID to filter nodes
 *     responses:
 *       200:
 *         description: Network optimization recommendations
 */
router.get('/optimization-recommendations',
  validate(coverageAnalysisSchemas.networkQuery, { property: 'query' }),
  async (req, res) => {
    try {
      const { networkId } = req.query;
      const recommendations = await coverageAnalysisService.generateOptimizationRecommendations(
        networkId as string
      );
      
      res.json(recommendations);
    } catch (error) {
      logger.error('Error generating optimization recommendations:', error);
      res.status(500).json({ error: 'Failed to generate optimization recommendations' });
    }
  }
);

/**
 * @swagger
 * /api/coverage-analysis/terrain-elevation:
 *   get:
 *     summary: Get terrain elevation for a coordinate
 *     tags: [Coverage Analysis]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Terrain elevation in meters
 */
router.get('/terrain-elevation',
  validate(coverageAnalysisSchemas.terrainElevation, { property: 'query' }),
  async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      const elevation = await coverageAnalysisService.getTerrainElevation(
        parseFloat(latitude as string),
        parseFloat(longitude as string)
      );
      
      res.json({ elevation });
    } catch (error) {
      logger.error('Error getting terrain elevation:', error);
      res.status(500).json({ error: 'Failed to get terrain elevation' });
    }
  }
);

export default router;