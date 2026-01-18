import { Router } from 'express';
import { NetworkRepository } from '../database/repositories/network.repository';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const networkRepository = new NetworkRepository();

// Network query filters schema
const networkFiltersSchema = Joi.object({
  isActive: Joi.boolean().optional(),
  region: Joi.string().valid(
    'UNSET', 'US', 'EU_433', 'EU_868', 'CN', 'JP', 'ANZ', 'KR', 'TW',
    'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868',
    'MY_433', 'MY_919', 'SG_923'
  ).optional(),
  search: Joi.string().optional() // Search in name and description
}).concat(schemas.pagination);

// GET /networks - List all networks with filtering
router.get('/',
  applyRateLimit('read'),
  optionalAuth,
  validate(networkFiltersSchema, { property: 'query' }),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
      isActive,
      region,
      search
    } = req.query;

    logger.debug('Fetching networks with filters:', req.query);

    // Build filter object
    const filters: any = {};
    
    if (typeof isActive === 'boolean') filters.isActive = isActive;
    if (region) filters.region = region;
    
    // Search in name and description
    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const networks = await networkRepository.findMany({
      where: filters,
      include: {
        _count: {
          select: {
            nodes: true,
            channels: true
          }
        }
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip: (page as number - 1) * (limit as number),
      take: limit as number
    });

    const total = await networkRepository.count({ where: filters });

    // Remove sensitive credentials from response
    const sanitizedNetworks = networks.map(network => ({
      ...network,
      mqttCredentials: network.mqttCredentials ? { configured: true } : { configured: false }
    }));

    res.json({
      data: sanitizedNetworks,
      pagination: {
        page: page as number,
        limit: limit as number,
        total,
        pages: Math.ceil(total / (limit as number))
      },
      filters: req.query
    });
  })
);

// GET /networks/:id - Get specific network by ID
router.get('/:id',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const network = await networkRepository.findById(id, {
      include: {
        nodes: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true,
            role: true,
            isOnline: true,
            lastSeen: true
          },
          orderBy: { lastSeen: 'desc' },
          take: 10 // Limit to recent nodes
        },
        channels: true,
        _count: {
          select: {
            nodes: true,
            channels: true
          }
        }
      }
    });

    if (!network) {
      throw new NotFoundError('Network not found');
    }

    // Remove sensitive credentials from response
    const sanitizedNetwork = {
      ...network,
      mqttCredentials: network.mqttCredentials ? { configured: true } : { configured: false }
    };

    res.json({ data: sanitizedNetwork });
  })
);

// POST /networks - Create new network
router.post('/',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.createNetwork),
  asyncHandler(async (req, res) => {
    const networkData = req.body;

    logger.info('Creating new network:', { ...networkData, mqttCredentials: '[REDACTED]' });

    const network = await networkRepository.create(networkData);

    // Remove sensitive credentials from response
    const sanitizedNetwork = {
      ...network,
      mqttCredentials: { configured: true }
    };

    res.status(201).json({
      message: 'Network created successfully',
      data: sanitizedNetwork
    });
  })
);

// PUT /networks/:id - Update network
router.put('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, { property: 'params' }),
  validate(schemas.updateNetwork),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    logger.info(`Updating network ${id}:`, { ...updateData, mqttCredentials: updateData.mqttCredentials ? '[REDACTED]' : undefined });

    const network = await networkRepository.update(id, updateData);

    if (!network) {
      throw new NotFoundError('Network not found');
    }

    // Remove sensitive credentials from response
    const sanitizedNetwork = {
      ...network,
      mqttCredentials: network.mqttCredentials ? { configured: true } : { configured: false }
    };

    res.json({
      message: 'Network updated successfully',
      data: sanitizedNetwork
    });
  })
);

// DELETE /networks/:id - Delete network
router.delete('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Deleting network ${id}`);

    const deleted = await networkRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError('Network not found');
    }

    res.json({
      message: 'Network deleted successfully'
    });
  })
);

// GET /networks/:id/stats - Get network statistics
router.get('/:id/stats',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, { property: 'params' }),
  validate(schemas.dateRange, { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Verify network exists
    const network = await networkRepository.findById(id);
    if (!network) {
      throw new NotFoundError('Network not found');
    }

    // Default to last 24 hours if no date range specified
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const dateFilter = {
      gte: startDate ? new Date(startDate as string) : defaultStartDate,
      lte: endDate ? new Date(endDate as string) : now
    };

    // Get comprehensive network statistics
    const stats = await networkRepository.getNetworkStats(id, dateFilter);

    res.json({
      data: stats,
      dateRange: {
        start: dateFilter.gte,
        end: dateFilter.lte
      },
      network: {
        id: network.id,
        name: network.name,
        region: network.region
      }
    });
  })
);

export { router as networkRoutes };