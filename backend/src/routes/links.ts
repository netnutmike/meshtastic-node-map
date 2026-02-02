/**
 * Links Routes
 * API endpoints for RF link analysis including longest links
 * Requirements: 39.4, 39.5, 39.6, 39.7, 39.8, 39.9
 */

import { Router } from 'express';
import { longestLinksService } from '../services/longest-links.service';
import { applyRateLimit } from '../middleware/rateLimiting';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/links/longest
 * Get longest RF links with distance calculations
 * 
 * Query Parameters:
 * - minDistance: Minimum distance in kilometers (default 1.0)
 * - minSnr: Minimum SNR in dB (default -20.0)
 * - maxAge: Maximum age of data in seconds (default 86400 for 24 hours)
 * - limit: Maximum number of results (default 100)
 * 
 * Response:
 * - Array of longest links with distance, signal quality, and age warnings
 * 
 * Caching: Results are cached for 5 minutes
 */
router.get('/longest',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      // Parse query parameters
      const minDistance = req.query.minDistance 
        ? parseFloat(req.query.minDistance as string) 
        : undefined;
      const minSnr = req.query.minSnr 
        ? parseFloat(req.query.minSnr as string) 
        : undefined;
      const maxAge = req.query.maxAge 
        ? parseInt(req.query.maxAge as string, 10) 
        : undefined;
      const limit = req.query.limit 
        ? parseInt(req.query.limit as string, 10) 
        : undefined;

      // Validate parameters
      if (minDistance !== undefined && (isNaN(minDistance) || minDistance < 0)) {
        return res.status(400).json({
          error: 'Invalid minDistance parameter',
          message: 'minDistance must be a non-negative number'
        });
      }

      if (minSnr !== undefined && isNaN(minSnr)) {
        return res.status(400).json({
          error: 'Invalid minSnr parameter',
          message: 'minSnr must be a valid number'
        });
      }

      if (maxAge !== undefined && (isNaN(maxAge) || maxAge < 0)) {
        return res.status(400).json({
          error: 'Invalid maxAge parameter',
          message: 'maxAge must be a non-negative integer'
        });
      }

      if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 1000)) {
        return res.status(400).json({
          error: 'Invalid limit parameter',
          message: 'limit must be between 1 and 1000'
        });
      }

      logger.debug(`Fetching longest links (minDistance: ${minDistance || 1}km, minSnr: ${minSnr || -20}dB, limit: ${limit || 100})`);

      // Get longest links from service (includes 5-minute caching)
      const result = await longestLinksService.getLongestLinks({
        minDistanceKm: minDistance,
        minSnrDb: minSnr,
        maxAgeSeconds: maxAge,
        limit: limit
      });

      // Return response
      res.json({
        links: result,
        count: result.length,
        filters: {
          minDistanceKm: minDistance || 1.0,
          minSnrDb: minSnr || -20.0,
          maxAgeSeconds: maxAge || 86400,
          limit: limit || 100
        }
      });
    } catch (error) {
      logger.error('Error fetching longest links:', error);
      res.status(500).json({
        error: 'Failed to fetch longest links',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/links/stats
 * Get cache statistics for longest links
 * 
 * Response:
 * - entries: Number of cached entries
 * - oldestEntry: Age of oldest cache entry in milliseconds
 */
router.get('/stats',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      const stats = longestLinksService.getCacheStats();
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
 * POST /api/links/clear-cache
 * Clear the longest links cache
 * 
 * Response:
 * - message: Success message
 */
router.post('/clear-cache',
  applyRateLimit('write'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      longestLinksService.clearCache();
      logger.info('Longest links cache cleared');
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

export { router as linksRoutes };
