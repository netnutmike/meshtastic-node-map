import { Router, Request, Response } from 'express';
import { NodeRepository } from '../database/repositories/node.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { validate, schemas, extendedSchemas } from '../middleware/validation';
import { optionalAuth, requirePermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const nodeRepository = new NodeRepository();
const positionRepository = new PositionRepository();
const telemetryRepository = new TelemetryRepository();

// GET /nodes - List all nodes with filtering and pagination
router.get('/',
  applyRateLimit('read'),
  optionalAuth,
  validate(extendedSchemas.nodeFilters, { property: 'query' }),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'lastSeen',
      sortOrder = 'desc',
      networkId,
      role,
      isOnline,
      mqttConnected,
      hardwareModel,
      search,
      minBattery,
      maxAge,
      bounds,
      startDate,
      endDate
    } = req.query;

    logger.debug('Fetching nodes with filters:', req.query);

    // Build filter object
    const filters: any = {};
    
    if (networkId) filters.networkId = networkId;
    if (role) filters.role = role;
    if (typeof isOnline === 'boolean') filters.isOnline = isOnline;
    if (typeof mqttConnected === 'boolean') filters.mqttConnected = mqttConnected;
    if (hardwareModel) filters.hardwareModel = hardwareModel;
    if (minBattery) filters.batteryLevel = { gte: minBattery };
    
    // Age-based filtering
    if (maxAge) {
      const maxAgeHours = typeof maxAge === 'string' ? parseInt(maxAge, 10) : 
                         typeof maxAge === 'number' ? maxAge : 
                         Array.isArray(maxAge) ? parseInt(maxAge[0] as string, 10) : 0;
      const maxAgeDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      filters.lastSeen = { gte: maxAgeDate };
    }

    // Date range filtering
    if (startDate || endDate) {
      filters.lastSeen = {};
      if (startDate) filters.lastSeen.gte = new Date(startDate as string);
      if (endDate) filters.lastSeen.lte = new Date(endDate as string);
    }

    // Geographic bounds filtering
    if (bounds) {
      filters.positions = {
        some: {
          latitude: {
            gte: (bounds as any).south,
            lte: (bounds as any).north
          },
          longitude: {
            gte: (bounds as any).west,
            lte: (bounds as any).east
          }
        }
      };
    }

    // Search in text fields
    if (search) {
      filters.OR = [
        { shortName: { contains: search, mode: 'insensitive' } },
        { longName: { contains: search, mode: 'insensitive' } },
        { nodeId: { contains: search, mode: 'insensitive' } },
        { hexId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const result = await nodeRepository.findMany({
      where: filters,
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        telemetryReadings: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        network: true
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip: (page as number - 1) * (limit as number),
      take: limit as number
    });

    const total = await nodeRepository.count({ where: filters });

    res.json({
      data: result,
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

// GET /nodes/:id - Get specific node by ID
router.get('/:id',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const node = await nodeRepository.findById(id, {
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 10
        },
        telemetryReadings: {
          orderBy: { timestamp: 'desc' },
          take: 50
        },
        sentMessages: {
          orderBy: { timestamp: 'desc' },
          take: 20
        },
        receivedMessages: {
          orderBy: { timestamp: 'desc' },
          take: 20
        },
        neighborsFrom: {
          include: { neighbor: true }
        },
        neighborsTo: {
          include: { node: true }
        },
        network: true
      }
    });

    if (!node) {
      throw new NotFoundError('Node not found');
    }

    res.json({ data: node });
  })
);

// POST /nodes - Create new node
router.post('/',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('write'),
  validate(schemas.createNode),
  asyncHandler(async (req, res) => {
    const nodeData = req.body;

    logger.info('Creating new node:', nodeData);

    const node = await nodeRepository.create(nodeData);

    res.status(201).json({
      message: 'Node created successfully',
      data: node
    });
  })
);

// PUT /nodes/:id - Update node
router.put('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('write'),
  validate(schemas.uuidParam, { property: 'params' }),
  validate(schemas.updateNode),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    logger.info(`Updating node ${id}:`, updateData);

    const node = await nodeRepository.update(id, updateData);

    if (!node) {
      throw new NotFoundError('Node not found');
    }

    res.json({
      message: 'Node updated successfully',
      data: node
    });
  })
);

// DELETE /nodes/:id - Delete node
router.delete('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Deleting node ${id}`);

    const deleted = await nodeRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError('Node not found');
    }

    res.json({
      message: 'Node deleted successfully'
    });
  })
);

// GET /nodes/:id/positions - Get node positions
router.get('/:id/positions',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, { property: 'params' }),
  validate(schemas.pagination.concat(schemas.dateRange), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    // Verify node exists
    const node = await nodeRepository.findById(id);
    if (!node) {
      throw new NotFoundError('Node not found');
    }

    const filters: any = { nodeId: id };
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    const positions = await positionRepository.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
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
      }
    });
  })
);

// GET /nodes/:id/telemetry - Get node telemetry
router.get('/:id/telemetry',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, { property: 'params' }),
  validate(schemas.pagination.concat(schemas.dateRange), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 100, startDate, endDate, type } = req.query;

    // Verify node exists
    const node = await nodeRepository.findById(id);
    if (!node) {
      throw new NotFoundError('Node not found');
    }

    const filters: any = { nodeId: id };
    
    if (type) filters.type = type;
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    const telemetry = await telemetryRepository.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
      skip: (page as number - 1) * (limit as number),
      take: limit as number
    });

    const total = await telemetryRepository.count({ where: filters });

    res.json({
      data: telemetry,
      pagination: {
        page: page as number,
        limit: limit as number,
        total,
        pages: Math.ceil(total / (limit as number))
      }
    });
  })
);

// GET /nodes/:id/neighbors - Get node neighbors
router.get('/:id/neighbors',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verify node exists
    const node = await nodeRepository.findById(id, {
      include: {
        neighborsFrom: {
          include: {
            neighbor: {
              include: {
                positions: {
                  orderBy: { timestamp: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        neighborsTo: {
          include: {
            node: {
              include: {
                positions: {
                  orderBy: { timestamp: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!node) {
      throw new NotFoundError('Node not found');
    }

    res.json({
      data: {
        heardBy: node.neighborsFrom, // Nodes that heard this node
        heard: node.neighborsTo      // Nodes this node heard
      }
    });
  })
);

export { router as nodeRoutes };