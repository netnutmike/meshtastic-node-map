/**
 * Gateway Comparison Routes
 * API endpoints for comparing signal quality between gateways
 * Requirements: 41.2, 41.3, 41.4, 41.9, 41.14
 */

import express from 'express';
import { GatewayComparisonService } from '../services/gateway-comparison.service';
import { logger } from '../utils/logger';

const router = express.Router();
const gatewayComparisonService = new GatewayComparisonService();

/**
 * @swagger
 * /api/gateways/compare:
 *   get:
 *     summary: Compare signal quality between two gateways
 *     description: Finds common packets received by both gateways and calculates signal quality differences
 *     tags: [Gateways]
 *     parameters:
 *       - in: query
 *         name: gateway1
 *         required: true
 *         schema:
 *           type: string
 *         description: First gateway ID (e.g., !abc123)
 *       - in: query
 *         name: gateway2
 *         required: true
 *         schema:
 *           type: string
 *         description: Second gateway ID (e.g., !def456)
 *       - in: query
 *         name: start_time
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start time for filtering packets
 *       - in: query
 *         name: end_time
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End time for filtering packets
 *       - in: query
 *         name: source_node_id
 *         schema:
 *           type: string
 *         description: Filter by specific source node
 *     responses:
 *       200:
 *         description: Gateway comparison results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 common_packets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       mesh_packet_id:
 *                         type: string
 *                       from_node_id:
 *                         type: string
 *                       hop_limit:
 *                         type: number
 *                       gateway1_rssi:
 *                         type: number
 *                       gateway1_snr:
 *                         type: number
 *                       gateway1_timestamp:
 *                         type: string
 *                         format: date-time
 *                       gateway2_rssi:
 *                         type: number
 *                       gateway2_snr:
 *                         type: number
 *                       gateway2_timestamp:
 *                         type: string
 *                         format: date-time
 *                       time_diff_seconds:
 *                         type: number
 *                       rssi_diff:
 *                         type: number
 *                       snr_diff:
 *                         type: number
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     packet_count:
 *                       type: number
 *                     avg_rssi:
 *                       type: number
 *                     avg_snr:
 *                       type: number
 *                     unique_sources:
 *                       type: number
 *                     rssi_diff_avg:
 *                       type: number
 *                     rssi_diff_min:
 *                       type: number
 *                     rssi_diff_max:
 *                       type: number
 *                     rssi_diff_stddev:
 *                       type: number
 *                     snr_diff_avg:
 *                       type: number
 *                     snr_diff_min:
 *                       type: number
 *                     snr_diff_max:
 *                       type: number
 *                     snr_diff_stddev:
 *                       type: number
 *                 gateway1_id:
 *                   type: string
 *                 gateway2_id:
 *                   type: string
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/compare', async (req, res) => {
  try {
    const { gateway1, gateway2, start_time, end_time, source_node_id } = req.query;

    // Validate required parameters
    if (!gateway1 || !gateway2) {
      return res.status(400).json({
        error: 'Missing required parameters: gateway1 and gateway2'
      });
    }

    // Parse optional date parameters
    const options: {
      startTime?: Date;
      endTime?: Date;
      sourceNodeId?: string;
    } = {};

    if (start_time) {
      options.startTime = new Date(start_time as string);
      if (isNaN(options.startTime.getTime())) {
        return res.status(400).json({
          error: 'Invalid start_time format'
        });
      }
    }

    if (end_time) {
      options.endTime = new Date(end_time as string);
      if (isNaN(options.endTime.getTime())) {
        return res.status(400).json({
          error: 'Invalid end_time format'
        });
      }
    }

    if (source_node_id) {
      options.sourceNodeId = source_node_id as string;
    }

    // Compare gateways
    const result = await gatewayComparisonService.compareGateways(
      gateway1 as string,
      gateway2 as string,
      options
    );

    return res.json(result);
  } catch (error) {
    logger.error('Error in gateway comparison endpoint:', error);
    return res.status(500).json({
      error: 'Failed to compare gateways',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/gateways/cache/clear:
 *   post:
 *     summary: Clear gateway comparison cache
 *     description: Clears the cached gateway comparison data
 *     tags: [Gateways]
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       500:
 *         description: Server error
 */
router.post('/cache/clear', async (req, res) => {
  try {
    gatewayComparisonService.clearCache();
    return res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    logger.error('Error clearing gateway comparison cache:', error);
    return res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/gateways/cache/stats:
 *   get:
 *     summary: Get gateway comparison cache statistics
 *     description: Returns statistics about the gateway comparison cache
 *     tags: [Gateways]
 *     responses:
 *       200:
 *         description: Cache statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entries:
 *                   type: number
 *                 oldestEntry:
 *                   type: number
 *       500:
 *         description: Server error
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = gatewayComparisonService.getCacheStats();
    return res.json(stats);
  } catch (error) {
    logger.error('Error getting gateway comparison cache stats:', error);
    return res.status(500).json({
      error: 'Failed to get cache stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
