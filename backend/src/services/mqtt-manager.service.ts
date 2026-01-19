/**
 * MQTT Manager Service
 * Manages multiple MQTT connections and handles data streaming to database
 * Requirements: 13.1, 13.2
 */

import { EventEmitter } from 'events';
import { MQTTService, MQTTConnectionConfig, ParsedMeshtasticData } from './mqtt.service';
import { MQTTMonitorService } from './mqtt-monitor.service';
import { logger } from '../utils/logger';
import { NodeRepository } from '../database/repositories/node.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { NetworkRepository } from '../database/repositories/network.repository';
import { Network } from '../types/database';
import { DatabaseValidationError } from '../database/connection';

export interface MQTTManagerConfig {
  networks: Network[];
  defaultTopics: string[];
}

export class MQTTManagerService extends EventEmitter {
  private mqttServices: Map<string, MQTTService> = new Map();
  private mqttMonitorService: MQTTMonitorService;
  private nodeRepository: NodeRepository;
  private positionRepository: PositionRepository;
  private telemetryRepository: TelemetryRepository;
  private messageRepository: MessageRepository;
  private networkRepository: NetworkRepository;
  private config: MQTTManagerConfig;

  constructor(
    config: MQTTManagerConfig,
    nodeRepository: NodeRepository,
    positionRepository: PositionRepository,
    telemetryRepository: TelemetryRepository,
    messageRepository: MessageRepository,
    networkRepository: NetworkRepository
  ) {
    super();
    this.config = config;
    this.nodeRepository = nodeRepository;
    this.positionRepository = positionRepository;
    this.telemetryRepository = telemetryRepository;
    this.messageRepository = messageRepository;
    this.networkRepository = networkRepository;
    this.mqttMonitorService = new MQTTMonitorService();
  }

  /**
   * Initialize MQTT connections for all active networks
   */
  async initialize(): Promise<void> {
    logger.info('Initializing MQTT Manager...');
    
    try {
      const activeNetworks = this.config.networks.filter(network => network.isActive);
      
      for (const network of activeNetworks) {
        await this.addNetwork(network);
      }
      
      logger.info(`MQTT Manager initialized with ${activeNetworks.length} networks`);
    } catch (error) {
      logger.error('Failed to initialize MQTT Manager:', error);
      throw error;
    }
  }

  /**
   * Add a new network connection
   */
  async addNetwork(network: Network): Promise<void> {
    try {
      if (this.mqttServices.has(network.id)) {
        logger.warn(`Network ${network.id} already exists, skipping`);
        return;
      }

      const mqttConfig: MQTTConnectionConfig = {
        brokerUrl: network.mqttBroker,
        username: network.mqttCredentials.username,
        password: network.mqttCredentials.password,
        clientId: `meshtastic-mapper-${network.id}-${Date.now()}`,
        topics: this.config.defaultTopics
      };

      const mqttService = new MQTTService(mqttConfig);
      
      // Set up event handlers
      this.setupMQTTEventHandlers(mqttService, network);
      
      // Connect to the broker
      await mqttService.connect();
      
      this.mqttServices.set(network.id, mqttService);
      
      logger.info(`Added MQTT connection for network: ${network.name}`);
      this.emit('networkAdded', network);
    } catch (error) {
      logger.error(`Failed to add network ${network.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a network connection
   */
  async removeNetwork(networkId: string): Promise<void> {
    try {
      const mqttService = this.mqttServices.get(networkId);
      
      if (mqttService) {
        await mqttService.disconnect();
        this.mqttServices.delete(networkId);
        
        logger.info(`Removed MQTT connection for network: ${networkId}`);
        this.emit('networkRemoved', networkId);
      }
    } catch (error) {
      logger.error(`Failed to remove network ${networkId}:`, error);
      throw error;
    }
  }

  /**
   * Set up event handlers for MQTT service
   */
  private setupMQTTEventHandlers(mqttService: MQTTService, network: Network): void {
    mqttService.on('connected', () => {
      logger.info(`MQTT connected for network: ${network.name}`);
      this.emit('networkConnected', network.id);
    });

    mqttService.on('disconnected', () => {
      logger.warn(`MQTT disconnected for network: ${network.name}`);
      this.emit('networkDisconnected', network.id);
    });

    mqttService.on('error', (error) => {
      logger.error(`MQTT error for network ${network.name}:`, error);
      this.emit('networkError', { networkId: network.id, error });
    });

    mqttService.on('data', async (data: ParsedMeshtasticData) => {
      await this.handleMeshtasticData(data, network.id);
    });

    // Add raw message monitoring for MQTT Monitor
    mqttService.on('rawMessage', (topic: string, payload: string, options: any) => {
      this.mqttMonitorService.addMessage(topic, payload, options);
    });

    mqttService.on('parseError', (errorData) => {
      logger.error(`Parse error for network ${network.name}:`, errorData);
      this.emit('parseError', { networkId: network.id, ...errorData });
    });
  }

  /**
   * Handle parsed Meshtastic data and store to database
   * Uses transactions to batch operations and prevent connection pool exhaustion
   */
  private async handleMeshtasticData(data: ParsedMeshtasticData, networkId: string): Promise<void> {
    try {
      logger.debug(`Processing data for node ${data.nodeId} in network ${networkId}`);

      // Use a transaction to batch all operations for this message
      // This ensures all operations use a single connection and release it quickly
      await this.nodeRepository['db'].$transaction(async (tx) => {
        // Ensure node exists
        let node = await tx.node.findUnique({
          where: { nodeId: data.nodeId }
        });
        
        if (!node && data.nodeUpdate) {
          // Create new node
          try {
            const createData = {
              nodeId: data.nodeId,
              hexId: data.nodeId.replace('!', ''),
              ...data.nodeUpdate,
              networkId,
              isOnline: true,
              mqttConnected: true
            };
            node = await tx.node.create({ data: createData });
            logger.info(`Created new node: ${data.nodeId}`);
          } catch (error: any) {
            // Handle race condition - node was created by another request
            if (error.code === 'P2002') {
              node = await tx.node.findUnique({
                where: { nodeId: data.nodeId }
              });
              if (node) {
                logger.debug(`Node ${data.nodeId} was created by concurrent request, using existing node`);
              }
            } else {
              throw error;
            }
          }
        } else if (node && data.nodeUpdate) {
          // Update existing node
          node = await tx.node.update({
            where: { id: node.id },
            data: data.nodeUpdate
          });
          logger.debug(`Updated node: ${data.nodeId}`);
        }

        if (!node) {
          logger.warn(`Could not create or find node: ${data.nodeId}`);
          return;
        }

        // Store position data
        if (data.position) {
          await tx.position.create({
            data: {
              ...data.position,
              nodeId: node.id
            }
          });
          logger.debug(`Stored position for node: ${data.nodeId}`);
        }

        // Store telemetry data
        if (data.telemetry) {
          await tx.telemetryReading.create({
            data: {
              ...data.telemetry,
              nodeId: node.id,
              data: data.telemetry.data as any // Cast to satisfy Prisma JSON type
            }
          });
          logger.debug(`Stored telemetry for node: ${data.nodeId}`);
        }

        // Store message data
        if (data.message) {
          // Find or create sender node
          let fromNode = await tx.node.findUnique({
            where: { nodeId: data.message.fromNodeId }
          });
          
          if (!fromNode) {
            try {
              fromNode = await tx.node.create({
                data: {
                  nodeId: data.message.fromNodeId,
                  hexId: data.message.fromNodeId.replace('!', ''),
                  networkId,
                  role: 'CLIENT' as any,
                  isOnline: true,
                  mqttConnected: true
                }
              });
            } catch (error: any) {
              // Handle race condition
              if (error.code === 'P2002') {
                fromNode = await tx.node.findUnique({
                  where: { nodeId: data.message.fromNodeId }
                });
                if (fromNode) {
                  logger.debug(`Sender node ${data.message.fromNodeId} was created by concurrent request`);
                }
              } else {
                throw error;
              }
            }
          }

          // Find receiver node if specified
          let toNode = null;
          if (data.message.toNodeId) {
            toNode = await tx.node.findUnique({
              where: { nodeId: data.message.toNodeId }
            });
            
            if (!toNode) {
              try {
                toNode = await tx.node.create({
                  data: {
                    nodeId: data.message.toNodeId,
                    hexId: data.message.toNodeId.replace('!', ''),
                    networkId,
                    role: 'CLIENT' as any,
                    isOnline: true,
                    mqttConnected: true
                  }
                });
              } catch (error: any) {
                // Handle race condition
                if (error.code === 'P2002') {
                  toNode = await tx.node.findUnique({
                    where: { nodeId: data.message.toNodeId }
                  });
                  if (toNode) {
                    logger.debug(`Receiver node ${data.message.toNodeId} was created by concurrent request`);
                  }
                } else {
                  throw error;
                }
              }
            }
          }

          if (fromNode) {
            await tx.message.create({
              data: {
                ...data.message,
                fromNodeId: fromNode.id,
                toNodeId: toNode?.id,
                receivedAt: new Date()
              }
            });
            logger.debug(`Stored message from node: ${data.nodeId}`);
          } else {
            logger.warn(`Could not create or find sender node: ${data.message.fromNodeId}`);
          }
        }
      }, {
        maxWait: 5000, // Maximum time to wait for a transaction slot
        timeout: 30000, // Maximum time for the transaction to complete
      });

      // Emit real-time update event
      this.emit('dataUpdate', {
        networkId,
        nodeId: data.nodeId,
        data
      });

    } catch (error) {
      logger.error('Error handling Meshtastic data:', error);
      this.emit('dataError', { networkId, nodeId: data.nodeId, error });
    }
  }

  /**
   * Get connection status for all networks
   */
  getConnectionStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [networkId, mqttService] of this.mqttServices) {
      status[networkId] = mqttService.getStats();
    }
    
    return status;
  }

  /**
   * Get statistics for all connections
   */
  getStats() {
    return {
      totalNetworks: this.mqttServices.size,
      connections: this.getConnectionStatus(),
      uptime: process.uptime()
    };
  }

  /**
   * Get MQTT monitor service instance
   */
  getMQTTMonitorService(): MQTTMonitorService {
    return this.mqttMonitorService;
  }

  /**
   * Shutdown all MQTT connections
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down MQTT Manager...');
    
    const disconnectPromises = Array.from(this.mqttServices.values()).map(
      service => service.disconnect()
    );
    
    await Promise.all(disconnectPromises);
    this.mqttServices.clear();
    
    logger.info('MQTT Manager shutdown complete');
  }

  /**
   * Reload network configurations
   */
  async reloadNetworks(): Promise<void> {
    try {
      logger.info('Reloading network configurations...');
      
      // Get updated networks from database
      const activeNetworks = await this.networkRepository.findActiveNetworks();
      
      // Remove connections for inactive networks
      for (const [networkId] of this.mqttServices) {
        const network = activeNetworks.find((n: any) => n.id === networkId);
        if (!network) {
          await this.removeNetwork(networkId);
        }
      }
      
      // Add connections for new active networks
      for (const network of activeNetworks) {
        if (!this.mqttServices.has(network.id)) {
          await this.addNetwork(network);
        }
      }
      
      logger.info('Network configurations reloaded');
    } catch (error) {
      logger.error('Failed to reload networks:', error);
      throw error;
    }
  }
}