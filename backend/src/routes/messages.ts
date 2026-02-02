import { Router } from 'express';
import { MessageRepository } from '../database/repositories/message.repository';
import { NodeRepository } from '../database/repositories/node.repository';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { PacketGroupingService, PacketData } from '../services/packet-grouping.service';
import Joi from 'joi';

const router = Router();
const messageRepository = new MessageRepository();
const nodeRepository = new NodeRepository();
const packetGroupingService = new PacketGroupingService();

// Message query filters schema
const messageFiltersSchema = Joi.object({
  fromNodeId: Joi.string().optional(), // Accept CUID format
  toNodeId: Joi.string().optional(), // Accept CUID format
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

// GET /messages/grouped - Get grouped packets with aggregated statistics
router.get('/grouped',
  applyRateLimit('read'),
  optionalAuth,
  validate(Joi.object({
    fromNodeId: Joi.string().optional(),
    toNodeId: Joi.string().optional(),
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
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(25000).default(5000)
  }), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const {
      fromNodeId,
      toNodeId,
      type,
      encrypted,
      channel,
      networkId,
      startDate,
      endDate,
      limit = 5000
    } = req.query;

    logger.debug('Fetching grouped packets with filters:', req.query);

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

    // Date range filtering
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    // Fetch raw packets (limited for performance)
    const messages = await messageRepository.findMany({
      where: filters,
      select: {
        id: true,
        messageId: true,
        fromNodeId: true,
        toNodeId: true,
        type: true,
        hopStart: true,
        hopLimit: true,
        rssi: true,
        snr: true,
        timestamp: true,
        topic: true
      },
      orderBy: { timestamp: 'desc' },
      take: limit as number
    });

    // Transform messages to PacketData format
    const packets: PacketData[] = messages.map(msg => ({
      id: msg.id,
      mesh_packet_id: msg.messageId || msg.id,
      from_node_id: msg.fromNodeId,
      to_node_id: msg.toNodeId || null,
      portnum: getPortnumFromType(msg.type),
      portnum_name: msg.type,
      gateway_id: extractGatewayFromTopic(msg.topic || null),
      rssi: msg.rssi || 0,
      snr: msg.snr || 0,
      hop_start: msg.hopStart || 0,
      hop_limit: msg.hopLimit || 0,
      timestamp: msg.timestamp,
      relay_node_id: undefined // TODO: Extract from routing path if available
    }));

    // Group packets
    const groupedPackets = packetGroupingService.groupPackets(packets);

    res.json({
      data: groupedPackets,
      metadata: {
        total_packets: messages.length,
        total_groups: groupedPackets.length,
        grouped: true
      },
      filters: req.query
    });
  })
);

// Helper function to extract gateway from MQTT topic
function extractGatewayFromTopic(topic: string | null): string {
  if (!topic) return 'unknown';
  
  // Topic format: msh/<region>/<area>/<hop>/<channel>/<gateway_id>
  const parts = topic.split('/');
  if (parts.length >= 6) {
    return parts[5];
  }
  
  return 'unknown';
}

// Helper function to map message type to portnum
function getPortnumFromType(type: string): number {
  const portnumMap: Record<string, number> = {
    'TEXT': 1,
    'POSITION': 3,
    'NODEINFO': 4,
    'ROUTING': 5,
    'ADMIN': 6,
    'TELEMETRY': 67,
    'TRACEROUTE_APP': 70,
    'NEIGHBOR_INFO_APP': 71,
    // Add more mappings as needed
  };
  
  return portnumMap[type] || 0;
}

// GET /messages - List all messages with filtering
router.get('/',
  applyRateLimit('read'),
  optionalAuth,
  validate(messageFiltersSchema, { property: 'query' }),
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
  validate(schemas.uuidParam, { property: 'params' }),
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
  validate(schemas.uuidParam, { property: 'params' }),
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
  validate(schemas.uuidParam, { property: 'params' }),
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
    nodeId1: Joi.string().required(), // Accept CUID format
    nodeId2: Joi.string().required() // Accept CUID format
  }), { property: 'params' }),
  validate(schemas.pagination.concat(schemas.dateRange), { property: 'query' }),
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

// GET /messages/export - Export messages in various formats
router.get('/export',
  applyRateLimit('read'),
  optionalAuth,
  validate(Joi.object({
    format: Joi.string().valid('csv', 'json').default('json'),
    fromNodeId: Joi.string().optional(), // Accept CUID format
    toNodeId: Joi.string().optional(), // Accept CUID format
    type: Joi.string().valid(
      'TEXT', 'POSITION', 'TELEMETRY', 'NODEINFO', 'ROUTING', 'ADMIN',
      'DETECTION_SENSOR', 'REPLY', 'IP_TUNNEL_APP', 'PAXCOUNTER_APP',
      'SERIAL_APP', 'STORE_FORWARD_APP', 'RANGE_TEST_APP', 'TELEMETRY_APP',
      'ZPS_APP', 'SIMULATOR_APP', 'TRACEROUTE_APP', 'NEIGHBOR_INFO_APP',
      'ATAK_PLUGIN', 'MAP_REPORT_APP', 'PRIVATE_APP', 'ATAK_FORWARDER'
    ).optional(),
    encrypted: Joi.boolean().optional(),
    channel: Joi.number().integer().min(0).max(7).optional(),
    networkId: Joi.string().optional(), // Accept CUID format
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  }), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const {
      format = 'json',
      fromNodeId,
      toNodeId,
      type,
      encrypted,
      channel,
      networkId,
      startDate,
      endDate
    } = req.query;

    logger.debug('Exporting messages with filters:', req.query);

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
      orderBy: { timestamp: 'desc' }
    });

    if (format === 'csv') {
      // Generate CSV format
      const csvHeader = 'Timestamp,From Node,To Node,Type,Content,Encrypted,Channel,Routing Path\n';
      const csvRows = messages.map(msg => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        const routingPath = Array.isArray(msg.routingPath) ? msg.routingPath.join(' -> ') : '';
        
        return [
          msg.timestamp.toISOString(),
          msg.fromNode?.shortName || msg.fromNode?.longName || 'Unknown',
          msg.toNode?.shortName || msg.toNode?.longName || 'Broadcast',
          msg.type,
          `"${content.replace(/"/g, '""')}"`, // Escape quotes in CSV
          msg.encrypted,
          msg.channel,
          `"${routingPath}"`
        ].join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="messages_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="messages_export_${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        totalMessages: messages.length,
        filters: req.query,
        messages: messages
      });
    }
  })
);

// GET /messages/node/:nodeId - Get messages for a specific node (sent, received, or both)
router.get('/node/:nodeId',
  applyRateLimit('read'),
  optionalAuth,
  validate(schemas.uuidParam, { property: 'params' }),
  validate(Joi.object({
    direction: Joi.string().valid('sent', 'received', 'both').default('both'),
    type: Joi.string().valid(
      'TEXT', 'POSITION', 'TELEMETRY', 'NODEINFO', 'ROUTING', 'ADMIN',
      'DETECTION_SENSOR', 'REPLY', 'IP_TUNNEL_APP', 'PAXCOUNTER_APP',
      'SERIAL_APP', 'STORE_FORWARD_APP', 'RANGE_TEST_APP', 'TELEMETRY_APP',
      'ZPS_APP', 'SIMULATOR_APP', 'TRACEROUTE_APP', 'NEIGHBOR_INFO_APP',
      'ATAK_PLUGIN', 'MAP_REPORT_APP', 'PRIVATE_APP', 'ATAK_FORWARDER'
    ).optional(),
    limit: Joi.number().integer().min(1).max(1000).default(50),
    page: Joi.number().integer().min(1).default(1),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  }), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { nodeId } = req.params;
    const { direction = 'both', type, limit = 50, page = 1, startDate, endDate } = req.query;

    // Verify node exists
    const node = await nodeRepository.findById(nodeId);
    if (!node) {
      throw new NotFoundError('Node not found');
    }

    const filters: any = {};
    
    // Direction filtering
    if (direction === 'sent') {
      filters.fromNodeId = nodeId;
    } else if (direction === 'received') {
      filters.toNodeId = nodeId;
    } else {
      filters.OR = [
        { fromNodeId: nodeId },
        { toNodeId: nodeId }
      ];
    }
    
    if (type) filters.type = type;

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
      node: {
        id: node.id,
        nodeId: node.nodeId,
        shortName: node.shortName,
        longName: node.longName
      },
      direction,
      filters: { type, startDate, endDate }
    });
  })
);

export { router as messageRoutes };