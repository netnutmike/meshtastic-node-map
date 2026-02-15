/**
 * Map Routes
 * API endpoints for map-related data including RF links
 * Requirements: 34.10, 34.15
 */

import { Router } from 'express';
import { rfLinkService } from '../services/rf-link.service';
import { applyRateLimit } from '../middleware/rateLimiting';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/map/links
 * Get RF links from traceroute and packet data
 * 
 * Query Parameters:
 * - hours: Number of hours to look back (default 24, max 336 for 14 days)
 * - mergeBidirectional: Whether to merge bidirectional links (default true)
 * 
 * Response:
 * - traceroute_links: Array of links extracted from traceroute packets
 * - packet_links: Array of links extracted from 0-hop packets
 * - all_links: Combined array of all links
 * 
 * Caching: Results are cached for 5 minutes
 */
router.get('/links',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      // Parse query parameters
      const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 24;
      const mergeBidirectional = req.query.mergeBidirectional !== 'false';

      // Validate hours parameter
      const validHours = Math.min(Math.max(1, hours), 336); // Clamp between 1 and 336 hours

      if (hours !== validHours) {
        logger.warn(`Hours parameter ${hours} clamped to ${validHours}`);
      }

      logger.debug(`Fetching RF links for last ${validHours} hours (mergeBidirectional: ${mergeBidirectional})`);

      // Get RF links from service (includes 5-minute caching)
      const result = await rfLinkService.getAllRFLinks(validHours, mergeBidirectional);

      // Return response
      res.json(result);
    } catch (error) {
      logger.error('Error fetching RF links:', error);
      res.status(500).json({
        error: 'Failed to fetch RF links',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/map/links/stats
 * Get cache statistics for RF links
 * 
 * Response:
 * - entries: Number of cached entries
 * - oldestEntry: Age of oldest cache entry in milliseconds
 */
router.get('/links/stats',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      const stats = rfLinkService.getCacheStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error fetching cache stats:', error);
      res.status(500).json({
        error: 'Failed to fetch cache statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * POST /api/map/links/clear-cache
 * Clear the RF links cache
 * 
 * Response:
 * - message: Success message
 */
router.post('/links/clear-cache',
  applyRateLimit('write'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      rfLinkService.clearCache();
      logger.info('RF links cache cleared');
      res.json({
        message: 'Cache cleared successfully'
      });
    } catch (error) {
      logger.error('Error clearing cache:', error);
      res.status(500).json({
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

export { router as mapRoutes };
