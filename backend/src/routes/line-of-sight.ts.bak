/**
 * Line of Sight Analysis Routes
 * API endpoints for analyzing RF connectivity potential between nodes
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6
 */

import { Router } from 'express';
import { lineOfSightService } from '../services/line-of-sight.service';
import { elevationProfileService } from '../services/elevation-profile.service';
import { applyRateLimit } from '../middleware/rateLimiting';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/analysis/line-of-sight
 * Analyze line of sight between two nodes
 * 
 * Query Parameters:
 * - from: Source node ID (required)
 * - to: Destination node ID (required)
 * 
 * Response:
 * - fromNode: Source node information with position
 * - toNode: Destination node information with position
 * - distanceKm: Straight-line distance in kilometers
 * - distanceFormatted: Formatted distance string
 * - bearing: Bearing/azimuth in degrees (0-360)
 * - hasHistoricalConnectivity: Whether nodes have communicated
 * - signalQuality: Signal quality statistics if connectivity exists
 */
router.get('/',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      const fromNodeId = req.query.from as string;
      const toNodeId = req.query.to as string;

      // Validate required parameters
      if (!fromNodeId) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'from parameter is required'
        });
      }

      if (!toNodeId) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'to parameter is required'
        });
      }

      if (fromNodeId === toNodeId) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'from and to nodes must be different'
        });
      }

      logger.debug(`Analyzing line of sight: ${fromNodeId} -> ${toNodeId}`);

      // Perform line of sight analysis
      const result = await lineOfSightService.analyzeLine({
        fromNodeId,
        toNodeId
      });

      return res.json(result);
    } catch (error) {
      logger.error('Error analyzing line of sight:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Node not found',
          message: error.message
        });
      }

      return res.status(500).json({
        error: 'Failed to analyze line of sight',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/analysis/line-of-sight/elevation
 * Get elevation profile between two coordinates
 * 
 * Query Parameters:
 * - lat1: Starting latitude (required)
 * - lon1: Starting longitude (required)
 * - lat2: Ending latitude (required)
 * - lon2: Ending longitude (required)
 * - samples: Number of sample points (optional, default 50, max 100)
 * - frequency: Frequency in MHz for Fresnel zone calculation (optional, default 915)
 * 
 * Response:
 * - points: Array of elevation points with coordinates, elevation, and distance
 * - totalDistanceKm: Total distance between endpoints
 * - minElevation: Minimum elevation in profile
 * - maxElevation: Maximum elevation in profile
 * - elevationGain: Total elevation gain
 * - fresnelZones: Fresnel zone clearance analysis for each point
 * - obstructions: Obstruction analysis with clearance percentage
 */
router.get('/elevation',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      const lat1 = parseFloat(req.query.lat1 as string);
      const lon1 = parseFloat(req.query.lon1 as string);
      const lat2 = parseFloat(req.query.lat2 as string);
      const lon2 = parseFloat(req.query.lon2 as string);
      const samples = Math.min(
        parseInt(req.query.samples as string) || 50,
        100
      );
      const frequency = parseFloat(req.query.frequency as string) || 915;

      // Validate required parameters
      if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'lat1, lon1, lat2, and lon2 must be valid numbers'
        });
      }

      logger.debug(`Fetching elevation profile: (${lat1}, ${lon1}) -> (${lat2}, ${lon2})`);

      // Get elevation profile
      const profile = await elevationProfileService.getElevationProfile(
        lat1,
        lon1,
        lat2,
        lon2,
        samples
      );

      // Calculate Fresnel zone clearance
      const fresnelZones = elevationProfileService.calculateFresnelClearance(
        profile.points,
        frequency,
        profile.totalDistanceKm
      );

      // Detect obstructions
      const obstructions = elevationProfileService.detectObstructions(
        profile.points,
        frequency,
        profile.totalDistanceKm
      );

      return res.json({
        ...profile,
        fresnelZones,
        obstructions
      });
    } catch (error) {
      logger.error('Error fetching elevation profile:', error);

      if (error instanceof Error && error.message.includes('disabled')) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Elevation service is currently disabled'
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch elevation profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

export { router as lineOfSightRoutes };
