import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { MQTTManagerService } from './services/mqtt-manager.service';
import { NodeRepository } from './database/repositories/node.repository';
import { PositionRepository } from './database/repositories/position.repository';
import { TelemetryRepository } from './database/repositories/telemetry.repository';
import { MessageRepository } from './database/repositories/message.repository';
import { NetworkRepository } from './database/repositories/network.repository';
import { logger } from './utils/logger';
import { apiRoutes } from './routes';
import { rateLimiters } from './middleware/rateLimiting';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { setupSwagger } from './docs/swagger';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting
app.use(rateLimiters.general);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Setup Swagger documentation
setupSwagger(app);

// Mount API routes
app.use(apiRoutes);

// Legacy status endpoint for backward compatibility
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Meshtastic Node Mapper API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentation: '/api/v1/docs'
  });
});

// Initialize repositories
const nodeRepository = new NodeRepository();
const positionRepository = new PositionRepository();
const telemetryRepository = new TelemetryRepository();
const messageRepository = new MessageRepository();
const networkRepository = new NetworkRepository();

// Initialize MQTT Manager
let mqttManager: MQTTManagerService;

async function initializeMQTTManager() {
  try {
    // Get networks from database
    const networks = await networkRepository.findActiveNetworks();
    
    mqttManager = new MQTTManagerService(
      {
        networks,
        defaultTopics: [
          'msh/+/+/+',
          'meshtastic/+/+/+',
          '+/+/+/+' // Catch-all pattern
        ]
      },
      nodeRepository,
      positionRepository,
      telemetryRepository,
      messageRepository,
      networkRepository
    );

    // Set up MQTT Manager event handlers
    mqttManager.on('dataUpdate', async (updateData) => {
      try {
        // Get the updated node data from database
        const node = await nodeRepository.findByNodeId(updateData.nodeId);
        if (node) {
          // Get latest position and telemetry
          const position = await positionRepository.getLatestPositionForNode(node.id);
          const telemetry = await telemetryRepository.findLatestByNodeId(node.id);
          
          // Prepare comprehensive update data
          const nodeUpdateData = {
            type: 'node_updated',
            nodeId: node.id,
            data: {
              ...node,
              position,
              latestTelemetry: telemetry
            }
          };
          
          // Broadcast real-time updates to connected clients
          io.emit('nodeUpdate', nodeUpdateData);
          logger.debug(`Broadcasted node update for ${updateData.nodeId} to clients`);
        }
      } catch (error) {
        logger.error('Error preparing node update data:', error);
      }
    });

    mqttManager.on('networkConnected', (networkId) => {
      io.emit('networkStatus', { networkId, status: 'connected' });
      logger.info(`Network ${networkId} connected`);
    });

    mqttManager.on('networkDisconnected', (networkId) => {
      io.emit('networkStatus', { networkId, status: 'disconnected' });
      logger.warn(`Network ${networkId} disconnected`);
    });

    mqttManager.on('networkError', ({ networkId, error }) => {
      io.emit('networkStatus', { networkId, status: 'error', error: error.message });
      logger.error(`Network ${networkId} error:`, error);
    });

    await mqttManager.initialize();
    logger.info('MQTT Manager initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize MQTT Manager:', error);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);
  
  // Send current MQTT status to new client
  if (mqttManager) {
    socket.emit('mqttStatus', mqttManager.getStats());
  }
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });

  // Handle client requests for MQTT status
  socket.on('getMQTTStatus', () => {
    if (mqttManager) {
      socket.emit('mqttStatus', mqttManager.getStats());
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler for unmatched routes
app.use('*', notFoundHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (mqttManager) {
    await mqttManager.shutdown();
  }
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (mqttManager) {
    await mqttManager.shutdown();
  }
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, async () => {
    logger.info(`🚀 Meshtastic Node Mapper Backend running on port ${PORT}`);
    logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
    logger.info(`🔌 Socket.IO server ready for connections`);
    
    // Initialize MQTT Manager after server starts
    await initializeMQTTManager();
  });
}

export { app, io, mqttManager };