import { Router } from 'express';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { NodeRepository } from '../database/repositories/node.repository';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const telemetryRepository = new TelemetryRepository();
const nodeRepository = new NodeRepository();

// Telemetry query filters schema
const telemetryFiltersSchema = Joi.object({
  nodeId: Joi.string().optional(), // Accept CUID format
  type: Joi.string().valid('DEVICE_METRICS', 'ENVIRONMENT_METRICS', 'POWER_METRICS').optional(),
  networkId: Joi.string().optional() // Accept CUID format
}).concat(schemas.pagination).concat(schemas.dateRange);

// GET /telemetry - List all telemetry readings with filtering
router.get('/',
  applyRateLimit('read'),
  optionalAuth,
  validate(telemetryFiltersSchema, { property: 'query' }),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 100,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      nodeId,
      type,
      networkId,
      startDate,
      endDate
    } = req.query;

    logger.debug('Fetching telemetry with filters:', req.query);

    // Build filter object
    const filters: any = {};
    
    if (nodeId) filters.nodeId = nodeId;
    if (type) filters.type = type;
    
    // Network filtering through node relationship
    if (networkId) {
      filters.node = {
        networkId: networkId
      };
    }

    // Date range filtering
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    const telemetry = await telemetryRepository.findMany({
      where: filters,
      include: {
        node: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true,
            role: true,
            networkId: true
          }
        }
      },
      orderBy: { [sortBy as string]: sortOrder },
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
      },
      filters: req.query
    });
  })
);

// GET /telemetry/:id - Get specific telemetry reading by ID
router.get('/:id',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const telemetry = await telemetryRepository.findById(id, {
      include: {
        node: true
      }
    });

    if (!telemetry) {
      throw new NotFoundError('Telemetry reading not found');
    }

    res.json({ data: telemetry });
  })
);

// POST /telemetry - Create new telemetry reading
router.post('/',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('write'),
  validate(schemas.createTelemetry),
  asyncHandler(async (req, res) => {
    const telemetryData = req.body;

    // Verify node exists
    const node = await nodeRepository.findById(telemetryData.nodeId);
    if (!node) {
      throw new NotFoundError('Node not found');
    }

    logger.info('Creating new telemetry reading:', telemetryData);

    const telemetry = await telemetryRepository.create(telemetryData);

    res.status(201).json({
      message: 'Telemetry reading created successfully',
      data: telemetry
    });
  })
);

// PUT /telemetry/:id - Update telemetry reading
router.put('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('write'),
  validate(schemas.uuidParam, { property: 'params' }),
  validate(Joi.object({
    type: Joi.string().valid('DEVICE_METRICS', 'ENVIRONMENT_METRICS', 'POWER_METRICS').optional(),
    timestamp: Joi.date().iso().optional(),
    data: Joi.object().optional()
  })),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    logger.info(`Updating telemetry reading ${id}:`, updateData);

    const telemetry = await telemetryRepository.update(id, updateData);

    if (!telemetry) {
      throw new NotFoundError('Telemetry reading not found');
    }

    res.json({
      message: 'Telemetry reading updated successfully',
      data: telemetry
    });
  })
);

// DELETE /telemetry/:id - Delete telemetry reading
router.delete('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, { property: 'params' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Deleting telemetry reading ${id}`);

    const deleted = await telemetryRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError('Telemetry reading not found');
    }

    res.json({
      message: 'Telemetry reading deleted successfully'
    });
  })
);

// GET /telemetry/latest/:nodeId - Get latest telemetry for a specific node
router.get('/latest/:nodeId',
  applyRateLimit('read'),
  optionalAuth,
  validate(Joi.object({ nodeId: Joi.string().required() }), { property: 'params' }), // Accept CUID format
  validate(Joi.object({
    type: Joi.string().valid('DEVICE_METRICS', 'ENVIRONMENT_METRICS', 'POWER_METRICS').optional()
  }), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { nodeId } = req.params;
    const { type } = req.query;

    // Verify node exists
    const node = await nodeRepository.findById(nodeId);
    if (!node) {
      throw new NotFoundError('Node not found');
    }

    const filters: any = { nodeId };
    if (type) filters.type = type;

    const telemetry = await telemetryRepository.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
      take: type ? 1 : 3, // If type specified, get 1, otherwise get latest of each type
      include: {
        node: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true
          }
        }
      }
    });

    res.json({
      data: telemetry,
      node: {
        id: node.id,
        nodeId: node.nodeId,
        shortName: node.shortName,
        longName: node.longName
      }
    });
  })
);

// GET /telemetry/stats/:nodeId - Get telemetry statistics for a node
router.get('/stats/:nodeId',
  applyRateLimit('read'),
  optionalAuth,
  validate(Joi.object({ nodeId: Joi.string().required() }), { property: 'params' }), // Accept CUID format
  validate(schemas.dateRange.concat(Joi.object({
    type: Joi.string().valid('DEVICE_METRICS', 'ENVIRONMENT_METRICS', 'POWER_METRICS').optional(),
    interval: Joi.string().valid('hour', 'day', 'week', 'month').default('hour')
  })), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { nodeId } = req.params;
    const { type, startDate, endDate, interval = 'hour' } = req.query;

    // Verify node exists
    const node = await nodeRepository.findById(nodeId);
    if (!node) {
      throw new NotFoundError('Node not found');
    }

    const filters: any = { nodeId };
    if (type) filters.type = type;
    
    // Default to last 24 hours if no date range specified
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    filters.timestamp = {
      gte: startDate ? new Date(startDate as string) : defaultStartDate,
      lte: endDate ? new Date(endDate as string) : now
    };

    const telemetry = await telemetryRepository.findMany({
      where: filters,
      orderBy: { timestamp: 'asc' }
    });

    // Group telemetry by time intervals and calculate statistics
    const stats = telemetry.reduce((acc: any, reading) => {
      const timestamp = reading.timestamp;
      let intervalKey: string;
      
      // Create interval key based on requested interval
      switch (interval) {
        case 'hour':
          intervalKey = timestamp.toISOString().substring(0, 13) + ':00:00.000Z';
          break;
        case 'day':
          intervalKey = timestamp.toISOString().substring(0, 10) + 'T00:00:00.000Z';
          break;
        case 'week':
          const weekStart = new Date(timestamp);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          intervalKey = weekStart.toISOString().substring(0, 10) + 'T00:00:00.000Z';
          break;
        case 'month':
          intervalKey = timestamp.toISOString().substring(0, 7) + '-01T00:00:00.000Z';
          break;
        default:
          intervalKey = timestamp.toISOString();
      }

      if (!acc[intervalKey]) {
        acc[intervalKey] = {
          timestamp: intervalKey,
          count: 0,
          readings: []
        };
      }
      
      acc[intervalKey].count++;
      acc[intervalKey].readings.push(reading);
      
      return acc;
    }, {});

    // Convert to array and calculate averages for numeric fields
    const statsArray = Object.values(stats).map((stat: any) => {
      const numericData: any = {};
      
      // Calculate averages for numeric fields in telemetry data
      stat.readings.forEach((reading: any) => {
        Object.entries(reading.data).forEach(([key, value]) => {
          if (typeof value === 'number') {
            if (!numericData[key]) {
              numericData[key] = { sum: 0, count: 0 };
            }
            numericData[key].sum += value;
            numericData[key].count++;
          }
        });
      });

      // Calculate averages
      const averages: any = {};
      Object.entries(numericData).forEach(([key, data]: [string, any]) => {
        averages[key] = data.sum / data.count;
      });

      return {
        timestamp: stat.timestamp,
        count: stat.count,
        averages
      };
    });

    res.json({
      data: statsArray,
      interval,
      dateRange: {
        start: filters.timestamp.gte,
        end: filters.timestamp.lte
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

// GET /telemetry/summary - Get telemetry summary across all nodes
router.get('/summary',
  applyRateLimit('read'),
  optionalAuth,
  validate(Joi.object({
    networkId: Joi.string().optional(), // Accept CUID format
    type: Joi.string().valid('DEVICE_METRICS', 'ENVIRONMENT_METRICS', 'POWER_METRICS').optional()
  }).concat(schemas.dateRange), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { networkId, type, startDate, endDate } = req.query;

    logger.debug('Fetching telemetry summary with filters:', req.query);

    const filters: any = {};
    if (type) filters.type = type;
    
    if (networkId) {
      filters.node = { networkId };
    }

    // Default to last 24 hours if no date range specified
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    filters.timestamp = {
      gte: startDate ? new Date(startDate as string) : defaultStartDate,
      lte: endDate ? new Date(endDate as string) : now
    };

    const telemetry = await telemetryRepository.findMany({
      where: filters,
      include: {
        node: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            networkId: true
          }
        }
      }
    });

    // Calculate summary statistics
    const summary = {
      totalReadings: telemetry.length,
      uniqueNodes: new Set(telemetry.map(t => t.nodeId)).size,
      typeBreakdown: {} as any,
      dateRange: {
        start: filters.timestamp.gte,
        end: filters.timestamp.lte
      }
    };

    // Group by type
    telemetry.forEach(reading => {
      if (!summary.typeBreakdown[reading.type]) {
        summary.typeBreakdown[reading.type] = {
          count: 0,
          nodes: new Set()
        };
      }
      summary.typeBreakdown[reading.type].count++;
      summary.typeBreakdown[reading.type].nodes.add(reading.nodeId);
    });

    // Convert sets to counts
    Object.keys(summary.typeBreakdown).forEach(type => {
      summary.typeBreakdown[type].uniqueNodes = summary.typeBreakdown[type].nodes.size;
      delete summary.typeBreakdown[type].nodes;
    });

    res.json({ data: summary });
  })
);

export { router as telemetryRoutes };