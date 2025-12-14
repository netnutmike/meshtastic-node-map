import { Router } from 'express';
import { PositionRepository } from '../database/repositories/position.repository';
import { NodeRepository } from '../database/repositories/node.repository';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const positionRepository = new PositionRepository();
const nodeRepository = new NodeRepository();

// Position query filters schema
const positionFiltersSchema = Joi.object({
  nodeId: Joi.string().optional(), // Accept CUID format
  source: Joi.string().valid('GPS', 'MANUAL', 'ESTIMATED', 'NETWORK').optional(),
  bounds: Joi.object({
    north: Joi.number().min(-90).max(90).required(),
    south: Joi.number().min(-90).max(90).required(),
    east: Joi.number().min(-180).max(180).required(),
    west: Joi.number().min(-180).max(180).required()
  }).optional(),
  minPrecision: Joi.number().min(0).optional(),
  maxPrecision: Joi.number().min(0).optional()
}).concat(schemas.pagination).concat(schemas.dateRange);

// GET /positions - List all positions with filtering
router.get('/',
  applyRateLimit('read'),
  optionalAuth,
  validate(positionFiltersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      nodeId,
      source,
      bounds,
      minPrecision,
      maxPrecision,
      startDate,
      endDate
    } = req.query;

    logger.debug('Fetching positions with filters:', req.query);

    // Build filter object
    const filters: any = {};
    
    if (nodeId) filters.nodeId = nodeId;
    if (source) filters.source = source;
    
    // Precision filtering
    if (minPrecision || maxPrecision) {
      filters.precision = {};
      if (minPrecision) filters.precision.gte = minPrecision;
      if (maxPrecision) filters.precision.lte = maxPrecision;
    }

    // Geographic bounds filtering
    if (bounds) {
      filters.latitude = {
        gte: (bounds as any).south,
        lte: (bounds as any).north
      };
      filters.longitude = {
        gte: (bounds as any).west,
        lte: (bounds as any).east
      };
    }

    // Date range filtering
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    const positions = await positionRepository.findMany({
      where: filters,
      include: {
        node: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true,
            role: true,
            isOnline: true
          }
        }
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip: (page as number - 1) * (limit as number),
      take: limit as number
    });

    const total = await positionRepository.count({ where: filters });

    res.json({
      data: positions,
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

// GET /positions/:id - Get specific position by ID
router.get('/:id',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const position = await positionRepository.findById(id, {
      include: {
        node: true
      }
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    res.json({ data: position });
  })
);

// POST /positions - Create new position
router.post('/',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('write'),
  validate(schemas.createPosition),
  asyncHandler(async (req, res) => {
    const positionData = req.body;

    // Verify node exists
    const node = await nodeRepository.findById(positionData.nodeId);
    if (!node) {
      throw new NotFoundError('Node not found');
    }

    logger.info('Creating new position:', positionData);

    const position = await positionRepository.create(positionData);

    res.status(201).json({
      message: 'Position created successfully',
      data: position
    });
  })
);

// PUT /positions/:id - Update position
router.put('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('write'),
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    altitude: Joi.number().optional(),
    precision: Joi.number().min(0).optional(),
    source: Joi.string().valid('GPS', 'MANUAL', 'ESTIMATED', 'NETWORK').optional()
  })),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    logger.info(`Updating position ${id}:`, updateData);

    const position = await positionRepository.update(id, updateData);

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    res.json({
      message: 'Position updated successfully',
      data: position
    });
  })
);

// DELETE /positions/:id - Delete position
router.delete('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Deleting position ${id}`);

    const deleted = await positionRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError('Position not found');
    }

    res.json({
      message: 'Position deleted successfully'
    });
  })
);

// GET /positions/latest - Get latest position for each node
router.get('/latest',
  applyRateLimit('read'),
  optionalAuth,
  validate(Joi.object({
    networkId: Joi.string().optional(), // Accept CUID format
    bounds: Joi.object({
      north: Joi.number().min(-90).max(90).required(),
      south: Joi.number().min(-90).max(90).required(),
      east: Joi.number().min(-180).max(180).required(),
      west: Joi.number().min(-180).max(180).required()
    }).optional()
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { networkId, bounds } = req.query;

    logger.debug('Fetching latest positions with filters:', req.query);

    // This is a complex query that gets the latest position for each node
    // In a real implementation, you might want to use a database view or stored procedure
    const nodeFilters: any = {};
    if (networkId) nodeFilters.networkId = networkId;

    const nodes = await nodeRepository.findMany({
      where: nodeFilters,
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          where: bounds ? {
            latitude: {
              gte: (bounds as any).south,
              lte: (bounds as any).north
            },
            longitude: {
              gte: (bounds as any).west,
              lte: (bounds as any).east
            }
          } : undefined
        }
      }
    });

    // Filter nodes that have positions and extract the latest position
    const latestPositions = nodes
      .filter(node => node.positions && node.positions.length > 0)
      .map(node => ({
        ...node.positions![0],
        node: {
          id: node.id,
          nodeId: node.nodeId,
          shortName: node.shortName,
          longName: node.longName,
          role: node.role,
          isOnline: node.isOnline,
          mqttConnected: node.mqttConnected,
          batteryLevel: node.batteryLevel
        }
      }));

    res.json({
      data: latestPositions,
      count: latestPositions.length
    });
  })
);

// GET /positions/track/:nodeId - Get position track for a specific node
router.get('/track/:nodeId',
  applyRateLimit('read'),
  optionalAuth,
  validate(Joi.object({ nodeId: Joi.string().required() }), 'params'), // Accept CUID format
  validate(schemas.pagination.concat(schemas.dateRange), 'query'),
  asyncHandler(async (req, res) => {
    const { nodeId } = req.params;
    const { page = 1, limit = 100, startDate, endDate } = req.query;

    // Verify node exists
    const node = await nodeRepository.findById(nodeId);
    if (!node) {
      throw new NotFoundError('Node not found');
    }

    const filters: any = { nodeId };
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    const positions = await positionRepository.findMany({
      where: filters,
      orderBy: { timestamp: 'asc' }, // Chronological order for track
      skip: (page as number - 1) * (limit as number),
      take: limit as number
    });

    const total = await positionRepository.count({ where: filters });

    res.json({
      data: positions,
      pagination: {
        page: page as number,
        limit: limit as number,
        total,
        pages: Math.ceil(total / (limit as number))
      },
      node: {
        id: node.id,
        nodeId: node.nodeId,
        shortName: node.shortName,
        longName: node.longName
      }
    });
  })
);

export { router as positionRoutes };