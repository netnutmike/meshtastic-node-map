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
import { NodeRepository } from '../database/repositories/node.repository';

const router = Router();
const nodeRepository = new NodeRepository();

/**
 * GET /api/links/topology
 * Get network topology links from neighbor relationships, traceroute data, and gateway connections
 * 
 * Query Parameters:
 * - includeNeighbors: Include neighbor relationships (default true)
 * - includeTraceroutes: Include traceroute paths (default true)
 * - minSnr: Minimum SNR for neighbor links in dB (optional)
 * - maxAge: Maximum age of data in hours (default 24)
 * 
 * Response:
 * - links: Array of topology links with source, target, type, and metadata
 *   - type: 'neighbor' | 'traceroute' | 'gateway'
 *   - neighbor: Direct neighbor relationship with RSSI/SNR
 *   - traceroute: Hop in a traceroute path
 *   - gateway: Node heard by a gateway (extracted from MQTT topic)
 */
router.get('/topology',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res): Promise<any> => {
    try {
      const includeNeighbors = req.query.includeNeighbors !== 'false';
      const includeTraceroutes = req.query.includeTraceroutes !== 'false';
      const minSnr = req.query.minSnr ? parseFloat(req.query.minSnr as string) : undefined;
      const maxAgeHours = req.query.maxAge ? parseInt(req.query.maxAge as string, 10) : 24;

      const links: any[] = [];

      // Get neighbor relationships
      if (includeNeighbors) {
        const maxAgeDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        
        const neighbors = await nodeRepository['db'].nodeNeighbor.findMany({
          where: {
            updatedAt: {
              gte: maxAgeDate
            },
            ...(minSnr !== undefined ? { snr: { gte: minSnr } } : {})
          },
          include: {
            node: {
              select: {
                id: true,
                nodeId: true,
                hexId: true,
                shortName: true,
                longName: true
              }
            },
            neighbor: {
              select: {
                id: true,
                nodeId: true,
                hexId: true,
                shortName: true,
                longName: true
              }
            }
          }
        });

        neighbors.forEach((neighbor: any) => {
          links.push({
            source: neighbor.node.nodeId,
            target: neighbor.neighbor.nodeId,
            type: 'neighbor',
            snr: neighbor.snr,
            rssi: neighbor.rssi,
            lastHeard: neighbor.lastHeard,
            updatedAt: neighbor.updatedAt,
            metadata: {
              sourceId: neighbor.node.id,
              targetId: neighbor.neighbor.id,
              sourceName: neighbor.node.shortName || neighbor.node.longName || neighbor.node.hexId,
              targetName: neighbor.neighbor.shortName || neighbor.neighbor.longName || neighbor.neighbor.hexId
            }
          });
        });
      }

      // Get traceroute paths
      if (includeTraceroutes) {
        const maxAgeDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        
        const traceroutes = await nodeRepository['db'].message.findMany({
          where: {
            type: 'TRACEROUTE_APP',
            timestamp: {
              gte: maxAgeDate
            },
            routingPath: {
              isEmpty: false
            }
          },
          include: {
            fromNode: {
              select: {
                id: true,
                nodeId: true,
                hexId: true,
                shortName: true,
                longName: true
              }
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 1000 // Limit to recent traceroutes
        });

        // Process traceroute paths to create links
        traceroutes.forEach((traceroute: any) => {
          const path = traceroute.routingPath || [];
          
          // Create links between consecutive hops in the path
          for (let i = 0; i < path.length - 1; i++) {
            const sourceNodeId = path[i];
            const targetNodeId = path[i + 1];
            
            // Skip invalid node IDs (all F's are placeholders)
            if (sourceNodeId.match(/^!f+$/i) || targetNodeId.match(/^!f+$/i)) {
              continue;
            }
            
            links.push({
              source: sourceNodeId,
              target: targetNodeId,
              type: 'traceroute',
              hopIndex: i,
              totalHops: path.length,
              timestamp: traceroute.timestamp,
              metadata: {
                messageId: traceroute.id,
                fromNode: traceroute.fromNode.nodeId,
                fromNodeName: traceroute.fromNode.shortName || traceroute.fromNode.longName || traceroute.fromNode.hexId
              }
            });
          }
        });
      }

      // Get gateway-to-node links based on MQTT topics
      // Messages received on topics like "msh/2/json/LongFast/!abc123" indicate gateway !abc123 heard the message
      const maxAgeDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      
      const gatewayMessages = await nodeRepository['db'].message.findMany({
        where: {
          timestamp: {
            gte: maxAgeDate
          },
          topic: {
            not: null
          }
        },
        select: {
          id: true,
          fromNodeId: true,
          topic: true,
          timestamp: true,
          rssi: true,
          snr: true,
          fromNode: {
            select: {
              id: true,
              nodeId: true,
              hexId: true,
              shortName: true,
              longName: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 5000 // Limit to recent messages
      });

      // Extract gateway IDs from MQTT topics and create links
      const gatewayLinksMap = new Map<string, any>();
      
      gatewayMessages.forEach((message: any) => {
        if (!message.topic) return;
        
        // Parse MQTT topic format: msh/2/json/LongFast/!gatewayId or msh/US/2/json/LongFast/!gatewayId
        const topicParts = message.topic.split('/');
        const gatewayId = topicParts[topicParts.length - 1];
        
        // Validate gateway ID format (should start with !)
        if (!gatewayId || !gatewayId.startsWith('!')) return;
        
        // Don't create self-links
        if (gatewayId === message.fromNode.nodeId) return;
        
        // Create unique key for this gateway-node pair
        const linkKey = `${gatewayId}-${message.fromNode.nodeId}`;
        
        // Keep only the most recent link for each gateway-node pair
        if (!gatewayLinksMap.has(linkKey)) {
          gatewayLinksMap.set(linkKey, {
            source: gatewayId,
            target: message.fromNode.nodeId,
            type: 'gateway',
            rssi: message.rssi,
            snr: message.snr,
            timestamp: message.timestamp,
            metadata: {
              messageId: message.id,
              targetName: message.fromNode.shortName || message.fromNode.longName || message.fromNode.hexId
            }
          });
        }
      });

      // Add gateway links to the result
      gatewayLinksMap.forEach(link => links.push(link));

      logger.debug(`Fetched ${links.length} topology links (neighbors: ${includeNeighbors}, traceroutes: ${includeTraceroutes})`);

      return res.json({
        links,
        count: links.length,
        filters: {
          includeNeighbors,
          includeTraceroutes,
          minSnr,
          maxAgeHours
        }
      });
    } catch (error) {
      logger.error('Error fetching topology links:', error);
      return res.status(500).json({
        error: 'Failed to fetch topology links',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * GET /api/links/traceroutes
 * Get all traceroute messages with their routing paths
 * 
 * Query Parameters:
 * - maxAge: Maximum age of data in hours (default 24)
 * - limit: Maximum number of results (default 100)
 * 
 * Response:
 * - traceroutes: Array of traceroute messages with paths and metadata
 */
router.get('/traceroutes',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res): Promise<any> => {
    try {
      const maxAgeHours = req.query.maxAge ? parseInt(req.query.maxAge as string, 10) : 24;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

      const maxAgeDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      
      logger.debug(`Fetching TRACEROUTE_APP messages since ${maxAgeDate.toISOString()}`);
      
      const traceroutes = await nodeRepository['db'].message.findMany({
        where: {
          type: 'TRACEROUTE_APP',
          timestamp: {
            gte: maxAgeDate
          }
          // Note: We fetch all TRACEROUTE_APP messages and filter empty paths later
          // because Prisma's isEmpty check may not work reliably with arrays
        },
        include: {
          fromNode: {
            select: {
              id: true,
              nodeId: true,
              hexId: true,
              shortName: true,
              longName: true
            }
          },
          toNode: {
            select: {
              id: true,
              nodeId: true,
              hexId: true,
              shortName: true,
              longName: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      });

      // Filter out traceroutes with empty routing paths
      const validTraceroutes = traceroutes.filter((t: any) => {
        const path = t.routingPath || [];
        return path.length > 0;
      });

      logger.debug(`Found ${traceroutes.length} TRACEROUTE_APP messages, ${validTraceroutes.length} with valid paths`);

      // Process traceroutes to include hop details
      const processedTraceroutes = await Promise.all(validTraceroutes.map(async (traceroute: any) => {
        const path = traceroute.routingPath || [];
        
        // Get node details for each hop
        const hopDetails = await Promise.all(path.map(async (hexId: string) => {
          // Skip invalid node IDs
          if (hexId.match(/^!f+$/i)) {
            return {
              nodeId: hexId,
              hexId: hexId,
              shortName: null,
              longName: null,
              isValid: false
            };
          }

          try {
            // Strip the '!' prefix if present for database lookup
            const hexIdForQuery = hexId.startsWith('!') ? hexId.substring(1) : hexId;
            
            const node = await nodeRepository['db'].node.findFirst({
              where: {
                hexId: hexIdForQuery
              },
              select: {
                id: true,
                nodeId: true,
                hexId: true,
                shortName: true,
                longName: true,
                role: true
              }
            });

            if (node) {
              logger.debug(`Found node for hexId ${hexId}: shortName="${node.shortName}", hexId="${node.hexId}"`);
              return {
                nodeId: node.nodeId,
                hexId: node.hexId,
                shortName: node.shortName,
                longName: node.longName,
                role: node.role,
                isValid: true
              };
            } else {
              logger.debug(`No node found for hexId ${hexId}`);
            }
          } catch (error) {
            logger.error(`Error fetching node ${hexId}:`, error);
          }

          return {
            nodeId: hexId,
            hexId: hexId,
            shortName: null,
            longName: null,
            isValid: false
          };
        }));

        // Handle toNode - if toNode is null but we have a toNodeId, look it up
        // If toNodeId is also null, use the last node in the routing path
        let toNodeData = null;
        if (traceroute.toNode) {
          toNodeData = {
            nodeId: traceroute.toNode.nodeId,
            hexId: traceroute.toNode.hexId,
            shortName: traceroute.toNode.shortName,
            longName: traceroute.toNode.longName
          };
        } else if (traceroute.toNodeId) {
          // toNode is null but we have a toNodeId - look it up
          try {
            // Strip the '!' prefix if present for database lookup
            const hexIdForQuery = traceroute.toNodeId.startsWith('!') ? traceroute.toNodeId.substring(1) : traceroute.toNodeId;
            
            const toNode = await nodeRepository['db'].node.findFirst({
              where: {
                hexId: hexIdForQuery
              },
              select: {
                id: true,
                nodeId: true,
                hexId: true,
                shortName: true,
                longName: true
              }
            });

            if (toNode) {
              logger.debug(`Found toNode for nodeId ${traceroute.toNodeId}: shortName="${toNode.shortName}"`);
              toNodeData = {
                nodeId: toNode.nodeId,
                hexId: toNode.hexId,
                shortName: toNode.shortName,
                longName: toNode.longName
              };
            } else {
              // Node doesn't exist in database yet, use the nodeId as hexId
              logger.debug(`No toNode found for nodeId ${traceroute.toNodeId}, using as hexId`);
              toNodeData = {
                nodeId: traceroute.toNodeId,
                hexId: traceroute.toNodeId,
                shortName: null,
                longName: null
              };
            }
          } catch (error) {
            logger.error(`Error fetching toNode ${traceroute.toNodeId}:`, error);
          }
        } else if (path.length > 0) {
          // No toNode or toNodeId, use the last node in the routing path
          const lastHexId = path[path.length - 1];
          logger.debug(`No toNode found, using last node in path: ${lastHexId}`);
          
          // Try to look up the last node in the path
          try {
            // Strip the '!' prefix if present for database lookup
            const hexIdForQuery = lastHexId.startsWith('!') ? lastHexId.substring(1) : lastHexId;
            
            const lastNode = await nodeRepository['db'].node.findFirst({
              where: {
                hexId: hexIdForQuery
              },
              select: {
                id: true,
                nodeId: true,
                hexId: true,
                shortName: true,
                longName: true
              }
            });

            if (lastNode) {
              logger.debug(`Found last node in path: shortName="${lastNode.shortName}"`);
              toNodeData = {
                nodeId: lastNode.nodeId,
                hexId: lastNode.hexId,
                shortName: lastNode.shortName,
                longName: lastNode.longName
              };
            } else {
              // Node doesn't exist in database yet, use the hexId
              logger.debug(`Last node in path not found in database, using hexId: ${lastHexId}`);
              toNodeData = {
                nodeId: lastHexId,
                hexId: lastHexId,
                shortName: null,
                longName: null
              };
            }
          } catch (error) {
            logger.error(`Error fetching last node in path ${lastHexId}:`, error);
            toNodeData = {
              nodeId: lastHexId,
              hexId: lastHexId,
              shortName: null,
              longName: null
            };
          }
        }

        return {
          id: traceroute.id,
          messageId: traceroute.messageId,
          timestamp: traceroute.timestamp,
          fromNode: {
            nodeId: traceroute.fromNode.nodeId,
            hexId: traceroute.fromNode.hexId,
            shortName: traceroute.fromNode.shortName,
            longName: traceroute.fromNode.longName
          },
          toNode: toNodeData,
          routingPath: path,
          hopCount: path.length,
          hops: hopDetails,
          rssi: traceroute.rssi,
          snr: traceroute.snr,
          topic: traceroute.topic
        };
      }));

      logger.debug(`Fetched ${processedTraceroutes.length} traceroutes`);

      return res.json({
        traceroutes: processedTraceroutes,
        count: processedTraceroutes.length,
        filters: {
          maxAgeHours,
          limit
        }
      });
    } catch (error) {
      logger.error('Error fetching traceroutes:', error);
      return res.status(500).json({
        error: 'Failed to fetch traceroutes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

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
      return res.json({
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
      return res.status(500).json({
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
      return res.json(stats);
    } catch (error) {
      logger.error('Error fetching cache stats:', error);
      return res.status(500).json({
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
      return res.json({
        message: 'Cache cleared successfully'
      });
    } catch (error) {
      logger.error('Error clearing cache:', error);
      return res.status(500).json({
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

export { router as linksRoutes };
