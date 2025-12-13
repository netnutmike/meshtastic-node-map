import { Router } from 'express';
import { MessageRepository } from '../database/repositories/message.repository';
import { NodeRepository } from '../database/repositories/node.repository';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const messageRepository = new MessageRepository();
const nodeRepository = new NodeRepository();

// Message query filters schema
const messageFiltersSchema = Joi.object({
  fromNodeId: Joi.string().uuid().optional(),
  toNodeId: Joi.string().uuid().optional(),
  type: Joi.string().valid(
    'TEXT', 'POSITION', 'TELEMETRY', 'NODEINFO', 'ROUTING', 'ADMIN',
    'DETECTION_SENSOR', 'REPLY', 'IP_TUNNEL_APP', 'PAXCOUNTER_APP',
    'SERIAL_APP', 'STORE_FORWARD_APP', 'RANGE_TEST_APP', 'TELEMETRY_APP',
    'ZPS_APP', 'SIMULATOR_APP', 'TRACEROUTE_APP', 'NEIGHBOR_INFO_APP',
    'ATAK_PLUGIN', 'MAP_REPORT_APP', 'PRIVATE_APP', 'ATAK_FORWARDER'
  ).optional(),
  encrypted: Joi.boolean().optional(),
  channel: Joi.number().integer().min(0).max(7).optional(),
  networkId: Joi.string().uuid().optional(),
  search: Joi.string().optional() // Search in message content
}).concat(schemas.pagination).concat(schemas.dateRange);

// GET /messages - List all messages with filtering
router.get('/',
  applyRateLimit('read'),
  optionalAuth,
  validate(messageFiltersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      fromNodeId,
      toNodeId,
      type,
      encrypted,
      channel,
      networkId,
      search,
      startDate,
      endDate
    } = req.query;

    logger.debug('Fetching messages with filters:', req.query);

    // Build filter object
    const filters: any = {};
    
    if (fromNodeId) filters.fromNodeId = fromNodeId;
    if (toNodeId) filters.toNodeId = toNodeId;
    if (type) filters.type = type;
    if (typeof encrypted === 'boolean') filters.encrypted = encrypted;
    if (channel !== undefined) filters.channel = channel;
    
    // Network filtering through node relationship
    if (networkId) {
      filters.fromNode = {
        networkId: networkId
      };
    }

    // Search in message content
    if (search) {
      filters.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { messageId: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Date range filtering
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    const messages = await messageRepository.findMany({
      where: filters,
      include: {
        fromNode: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true,
            role: true
          }
        },
        toNode: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true,
            role: true
          }
        }
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip: (page as number - 1) * (limit as number),
      take: limit as number
    });

    const total = await messageRepository.count({ where: filters });

    res.json({
      data: messages,
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
// GET /messages/:id - Get specific message by ID
router.get('/:id',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const message = await messageRepository.findById(id, {
      include: {
        fromNode: true,
        toNode: true
      }
    });

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    res.json({ data: message });
  })
);

// POST /messages - Create new message
router.post('/',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('write'),
  validate(schemas.createMessage),
  asyncHandler(async (req, res) => {
    const messageData = req.body;

    // Verify from node exists
    const fromNode = await nodeRepository.findById(messageData.fromNodeId);
    if (!fromNode) {
      throw new NotFoundError('From node not found');
    }

    // Verify to node exists (if specified)
    if (messageData.toNodeId) {
      const toNode = await nodeRepository.findById(messageData.toNodeId);
      if (!toNode) {
        throw new NotFoundError('To node not found');
      }
    }

    logger.info('Creating new message:', messageData);

    const message = await messageRepository.create(messageData);

    res.status(201).json({
      message: 'Message created successfully',
      data: message
    });
  })
);

// PUT /messages/:id - Update message
router.put('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('write'),
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    content: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
    encrypted: Joi.boolean().optional(),
    wantAck: Joi.boolean().optional(),
    priority: Joi.string().valid('UNSET', 'MIN', 'BACKGROUND', 'DEFAULT', 'RELIABLE', 'ACK', 'MAX').optional()
  })),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    logger.info(`Updating message ${id}:`, updateData);

    const message = await messageRepository.update(id, updateData);

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    res.json({
      message: 'Message updated successfully',
      data: message
    });
  })
);

// DELETE /messages/:id - Delete message
router.delete('/:id',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('admin'),
  validate(schemas.uuidParam, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    logger.info(`Deleting message ${id}`);

    const deleted = await messageRepository.delete(id);

    if (!deleted) {
      throw new NotFoundError('Message not found');
    }

    res.json({
      message: 'Message deleted successfully'
    });
  })
);

// GET /messages/conversation/:nodeId1/:nodeId2 - Get conversation between two nodes
router.get('/conversation/:nodeId1/:nodeId2',
  applyRateLimit('read'),
  optionalAuth,
  validate(Joi.object({
    nodeId1: Joi.string().uuid().required(),
    nodeId2: Joi.string().uuid().required()
  }), 'params'),
  validate(schemas.pagination.concat(schemas.dateRange), 'query'),
  asyncHandler(async (req, res) => {
    const { nodeId1, nodeId2 } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    // Verify both nodes exist
    const [node1, node2] = await Promise.all([
      nodeRepository.findById(nodeId1),
      nodeRepository.findById(nodeId2)
    ]);

    if (!node1) throw new NotFoundError('First node not found');
    if (!node2) throw new NotFoundError('Second node not found');

    const filters: any = {
      OR: [
        { fromNodeId: nodeId1, toNodeId: nodeId2 },
        { fromNodeId: nodeId2, toNodeId: nodeId1 }
      ]
    };

    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    const messages = await messageRepository.findMany({
      where: filters,
      include: {
        fromNode: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true
          }
        },
        toNode: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      skip: (page as number - 1) * (limit as number),
      take: limit as number
    });

    const total = await messageRepository.count({ where: filters });

    res.json({
      data: messages,
      pagination: {
        page: page as number,
        limit: limit as number,
        total,
        pages: Math.ceil(total / (limit as number))
      },
      participants: [
        {
          id: node1.id,
          nodeId: node1.nodeId,
          shortName: node1.shortName,
          longName: node1.longName
        },
        {
          id: node2.id,
          nodeId: node2.nodeId,
          shortName: node2.shortName,
          longName: node2.longName
        }
      ]
    });
  })
);

export { router as messageRoutes };