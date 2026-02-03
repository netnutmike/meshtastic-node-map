import { Router } from 'express';
import { validate, schemas } from '../middleware/validation';
import { authenticateJWT, requireRole, requirePermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';
import { apiKeyService } from '../services/api-key.service';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// All API key management routes require authentication and admin role
router.use(authenticateJWT);
router.use(requireRole(['admin']));

// GET /api-keys - List all API keys
router.get('/',
  applyRateLimit('read'),
  validate(schemas.pagination, { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as any;
    
    const apiKeys = await apiKeyService.listApiKeys();
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedKeys = apiKeys.slice(startIndex, endIndex);
    
    res.json({
      apiKeys: paginatedKeys,
      pagination: {
        page,
        limit,
        total: apiKeys.length,
        totalPages: Math.ceil(apiKeys.length / limit)
      }
    });
  })
);

// GET /api-keys/:id - Get specific API key
router.get('/:id',
  applyRateLimit('read'),
  validate(schemas.idParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const apiKey = await apiKeyService.getApiKeyById(id);
    
    if (!apiKey) {
      res.status(404).json({
        error: 'API_KEY_NOT_FOUND',
        message: 'API key not found'
      });
      return;
    }
    
    res.json({ apiKey });
  })
);

// POST /api-keys - Create new API key
router.post('/',
  applyRateLimit('write'),
  validate(schemas.createApiKey),
  asyncHandler(async (req, res) => {
    const { name, permissions, description, expiresAt, rateLimit, ipWhitelist } = req.body;
    const createdBy = (req as any).user.username;
    
    try {
      const { apiKey, plainKey } = await apiKeyService.createApiKey({
        name,
        permissions,
        description,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        rateLimit,
        ipWhitelist,
        createdBy
      });
      
      logger.info(`API key created: ${name} by ${createdBy}`);
      
      res.status(201).json({
        message: 'API key created successfully',
        apiKey,
        key: plainKey, // Only returned once during creation
        warning: 'Store this key securely. It will not be shown again.'
      });
    } catch (error) {
      logger.error('Error creating API key:', error);
      res.status(500).json({
        error: 'CREATION_FAILED',
        message: 'Failed to create API key'
      });
    }
  })
);

// PUT /api-keys/:id - Update API key
router.put('/:id',
  applyRateLimit('write'),
  validate(schemas.idParam, { property: 'params' }),
  validate(schemas.updateApiKey),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const updatedBy = (req as any).user.username;
    
    const updatedKey = await apiKeyService.updateApiKey(id, updates, updatedBy);
    
    if (!updatedKey) {
      res.status(404).json({
        error: 'API_KEY_NOT_FOUND',
        message: 'API key not found'
      });
      return;
    }
    
    res.json({
      message: 'API key updated successfully',
      apiKey: updatedKey
    });
  })
);

// POST /api-keys/:id/revoke - Revoke API key
router.post('/:id/revoke',
  applyRateLimit('write'),
  validate(schemas.idParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const revokedBy = (req as any).user.username;
    
    const success = await apiKeyService.revokeApiKey(id, revokedBy);
    
    if (!success) {
      res.status(404).json({
        error: 'API_KEY_NOT_FOUND',
        message: 'API key not found'
      });
      return;
    }
    
    res.json({
      message: 'API key revoked successfully'
    });
  })
);

// DELETE /api-keys/:id - Delete API key
router.delete('/:id',
  applyRateLimit('write'),
  validate(schemas.idParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deletedBy = (req as any).user.username;
    
    const success = await apiKeyService.deleteApiKey(id, deletedBy);
    
    if (!success) {
      res.status(404).json({
        error: 'API_KEY_NOT_FOUND',
        message: 'API key not found'
      });
      return;
    }
    
    res.json({
      message: 'API key deleted successfully'
    });
  })
);

// GET /api-keys/:id/usage - Get API key usage statistics
router.get('/:id/usage',
  applyRateLimit('read'),
  validate(schemas.idParam, { property: 'params' }),
  validate(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  }), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate, limit } = req.query as any;
    
    // Verify API key exists
    const apiKey = await apiKeyService.getApiKeyById(id);
    if (!apiKey) {
      res.status(404).json({
        error: 'API_KEY_NOT_FOUND',
        message: 'API key not found'
      });
      return;
    }
    
    const timeRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : undefined;
    
    const [stats, usage] = await Promise.all([
      apiKeyService.getUsageStats(id, timeRange),
      apiKeyService.getApiKeyUsage(id, limit)
    ]);
    
    res.json({
      apiKey: { id: apiKey.id, name: apiKey.name },
      stats,
      recentUsage: usage
    });
  })
);

// GET /usage/overview - Get overall API usage statistics (admin only)
router.get('/usage/overview',
  applyRateLimit('read'),
  validate(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query as any;
    
    const timeRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : undefined;
    
    const overallStats = await apiKeyService.getUsageStats(undefined, timeRange);
    const apiKeys = await apiKeyService.listApiKeys();
    
    // Get stats for each API key
    const keyStats = await Promise.all(
      apiKeys.map(async (key) => {
        const stats = await apiKeyService.getUsageStats(key.id, timeRange);
        return {
          keyId: key.id,
          keyName: key.name,
          ...stats
        };
      })
    );
    
    res.json({
      overall: overallStats,
      byApiKey: keyStats,
      totalApiKeys: apiKeys.length,
      activeApiKeys: apiKeys.filter(key => key.isActive).length
    });
  })
);

export { router as apiKeyRoutes };