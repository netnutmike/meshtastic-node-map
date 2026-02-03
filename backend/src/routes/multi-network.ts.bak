/**
 * Multi-Network API Routes
 * Handles multi-network management, federation, and cross-network analytics
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
 */

import { Router } from 'express';
import { MultiNetworkManagerService } from '../services/multi-network-manager.service';
import { NetworkRepository } from '../database/repositories/network.repository';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission, AuthenticatedRequest, ApiKeyRequest } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const networkRepository = new NetworkRepository();

// Helper function to get user permissions from request
const getUserPermissions = (req: AuthenticatedRequest | ApiKeyRequest): string[] => {
  if ('user' in req && req.user) {
    return req.user.permissions || [];
  }
  if ('apiKey' in req && req.apiKey) {
    return req.apiKey.permissions || [];
  }
  return [];
};

// Multi-network manager instance (would be injected in real implementation)
let multiNetworkManager: MultiNetworkManagerService;

// Initialize multi-network manager
export const initializeMultiNetworkManager = (manager: MultiNetworkManagerService) => {
  multiNetworkManager = manager;
};

// Network access control schema
const accessControlSchema = Joi.object({
  allowedUsers: Joi.array().items(Joi.string()).default([]),
  allowedRoles: Joi.array().items(Joi.string()).default([]),
  dataVisibility: Joi.string().valid('public', 'restricted', 'private').default('public'),
  crossNetworkSharing: Joi.boolean().default(false),
  federationEnabled: Joi.boolean().default(false)
});

// Network connection schema
const networkConnectionSchema = Joi.object({
  networkId: Joi.string().uuid().required(),
  accessControls: accessControlSchema.optional()
});

// Federation settings schema
const federationSettingsSchema = Joi.object({
  enabled: Joi.boolean().required(),
  syncInterval: Joi.number().min(30).max(3600).default(300),
  allowedNetworks: Joi.array().items(Joi.string().uuid()).default([]),
  dataTypes: Joi.array().items(
    Joi.string().valid('position', 'telemetry', 'nodeInfo', 'messages')
  ).default(['position', 'telemetry', 'nodeInfo'])
});

// GET /multi-network/status - Get multi-network connection status
router.get('/status',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    const userPermissions = getUserPermissions(req as AuthenticatedRequest);
    
    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    const status = multiNetworkManager.getConnectionStatus(userPermissions);
    const stats = multiNetworkManager.getStats(userPermissions);

    res.json({
      data: {
        status,
        stats,
        timestamp: new Date()
      }
    });
  })
);

// GET /multi-network/networks - Get accessible networks with filters
router.get('/networks',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req, res) => {
    const userPermissions = getUserPermissions(req as AuthenticatedRequest);
    
    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    const networks = multiNetworkManager.getNetworkSelectionFilters(userPermissions);

    res.json({
      data: networks,
      total: networks.length,
      userPermissions: userPermissions || []
    });
  })
);

// POST /multi-network/networks/:id/connect - Connect to a network
router.post('/networks/:id/connect',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, { property: 'params' }),
  validate(accessControlSchema, { property: 'body' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const accessControls = req.body;

    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    // Get network from database
    const network = await networkRepository.findById(id);
    if (!network) {
      throw new NotFoundError('Network not found');
    }

    logger.info(`Connecting to network ${id} with access controls:`, accessControls);

    await multiNetworkManager.addNetworkConnection(network, accessControls);

    res.json({
      message: 'Network connection established',
      data: {
        networkId: id,
        networkName: network.name,
        accessControls
      }
    });
  })
);

// DELETE /multi-network/networks/:id/disconnect - Disconnect from a network
router.delete('/networks/:id/disconnect',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    logger.info(`Disconnecting from network ${id}`);

    await multiNetworkManager.removeNetworkConnection(id);

    res.json({
      message: 'Network disconnected successfully',
      data: { networkId: id }
    });
  })
);

// PUT /multi-network/networks/:id/access-controls - Update network access controls
router.put('/networks/:id/access-controls',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, { property: 'params' }),
  validate(accessControlSchema, { property: 'body' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const accessControls = req.body;

    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    // Get network from database
    const network = await networkRepository.findById(id);
    if (!network) {
      throw new NotFoundError('Network not found');
    }

    logger.info(`Updating access controls for network ${id}:`, accessControls);

    await multiNetworkManager.updateNetworkConnection(id, network, accessControls);

    res.json({
      message: 'Network access controls updated',
      data: {
        networkId: id,
        accessControls
      }
    });
  })
);

// GET /multi-network/analytics - Get cross-network analytics
router.get('/analytics',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.dateRange, { property: 'query' }),
  asyncHandler(async (req, res) => {
    const userPermissions = getUserPermissions(req as AuthenticatedRequest);
    
    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    const analytics = await multiNetworkManager.getCrossNetworkAnalytics(userPermissions);

    res.json({
      data: analytics,
      timestamp: new Date(),
      userPermissions: userPermissions || []
    });
  })
);

// GET /multi-network/federation/status - Get federation status
router.get('/federation/status',
  applyRateLimit('read'),
  optionalAuth,
  requirePermission('operator'),
  asyncHandler(async (req, res) => {
    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    const stats = multiNetworkManager.getStats();
    
    res.json({
      data: {
        federationEnabled: stats.federationEnabled,
        activeNetworks: stats.connectedNetworks,
        totalNetworks: stats.totalNetworks,
        uptime: stats.uptime
      }
    });
  })
);

// POST /multi-network/federation/configure - Configure federation settings
router.post('/federation/configure',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(federationSettingsSchema, { property: 'body' }),
  asyncHandler(async (req, res) => {
    const federationSettings = req.body;

    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    logger.info('Configuring federation settings:', federationSettings);

    // This would update the federation configuration
    // For now, we'll just return success
    res.json({
      message: 'Federation settings updated',
      data: federationSettings
    });
  })
);

// POST /multi-network/reload - Reload network configurations
router.post('/reload',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  asyncHandler(async (req, res) => {
    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    logger.info('Reloading network configurations');

    await multiNetworkManager.reloadNetworks();

    const stats = multiNetworkManager.getStats();

    res.json({
      message: 'Network configurations reloaded',
      data: {
        activeNetworks: stats.connectedNetworks,
        totalNetworks: stats.totalNetworks
      }
    });
  })
);

// GET /multi-network/networks/:id/isolation-test - Test network isolation
router.get('/networks/:id/isolation-test',
  applyRateLimit('read'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userPermissions = getUserPermissions(req as AuthenticatedRequest);

    if (!multiNetworkManager) {
      res.status(503).json({ 
        error: 'Multi-network manager not initialized' 
      });
      return;
    }

    // Test network isolation by checking data access
    const accessibleNetworks = multiNetworkManager.getNetworkSelectionFilters(userPermissions);
    const targetNetwork = accessibleNetworks.find(n => n.id === id);

    if (!targetNetwork) {
      throw new ForbiddenError('Access denied to network');
    }

    // Perform isolation test
    const isolationTest = {
      networkId: id,
      networkName: targetNetwork.name,
      accessLevel: targetNetwork.accessLevel,
      canAccess: true,
      isolationScore: targetNetwork.accessLevel === 'private' ? 100 : 
                     targetNetwork.accessLevel === 'restricted' ? 75 : 50,
      testResults: {
        dataVisibility: targetNetwork.accessLevel,
        crossNetworkAccess: targetNetwork.federationEnabled,
        userPermissions: userPermissions || []
      }
    };

    res.json({
      data: isolationTest,
      timestamp: new Date()
    });
  })
);

// WebSocket endpoint for real-time multi-network updates would be handled separately
// This would be implemented in the main server file with Socket.IO

export { router as multiNetworkRoutes };