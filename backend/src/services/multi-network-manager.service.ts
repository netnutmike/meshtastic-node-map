/**
 * Multi-Network Manager Service
 * Manages multiple MQTT broker connections with network segmentation and federation
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
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

export interface NetworkConnection {
  network: Network;
  mqttService: MQTTService;
  isConnected: boolean;
  lastConnected?: Date;
  connectionAttempts: number;
  accessControls: NetworkAccessControl;
}

export interface NetworkAccessControl {
  allowedUsers: string[];
  allowedRoles: string[];
  dataVisibility: 'public' | 'restricted' | 'private';
  crossNetworkSharing: boolean;
  federationEnabled: boolean;
}

export interface CrossNetworkAnalytics {
  totalNetworks: number;
  totalNodes: number;
  networkDistribution: Record<string, number>;
  crossNetworkMessages: number;
  federatedData: any[];
}

export interface MultiNetworkConfig {
  networks: Network[];
  defaultTopics: string[];
  federationSettings: {
    enabled: boolean;
    syncInterval: number;
    allowedNetworks: string[];
    dataTypes: string[];
  };
  accessControlDefaults: NetworkAccessControl;
}

export class MultiNetworkManagerService extends EventEmitter {
  private networkConnections: Map<string, NetworkConnection> = new Map();
  private mqttMonitorService: MQTTMonitorService;
  private nodeRepository: NodeRepository;
  private positionRepository: PositionRepository;
  private telemetryRepository: TelemetryRepository;
  private messageRepository: MessageRepository;
  private networkRepository: NetworkRepository;
  private config: MultiNetworkConfig;
  private federationTimer?: NodeJS.Timeout;

  constructor(
    config: MultiNetworkConfig,
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
   * Initialize multi-network connections
   * Requirement 27.1: Support connections to multiple MQTT brokers simultaneously
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Multi-Network Manager...');
    
    try {
      const activeNetworks = this.config.networks.filter(network => network.isActive);
      
      for (const network of activeNetworks) {
        await this.addNetworkConnection(network);
      }
      
      // Start federation if enabled
      if (this.config.federationSettings.enabled) {
        this.startFederation();
      }
      
      logger.info(`Multi-Network Manager initialized with ${activeNetworks.length} networks`);
      this.emit('initialized', { networkCount: activeNetworks.length });
    } catch (error) {
      logger.error('Failed to initialize Multi-Network Manager:', error);
      throw error;
    }
  }

  /**
   * Add a new network connection with access controls
   * Requirement 27.1: Separate authentication credentials per network
   */
  async addNetworkConnection(network: Network, accessControls?: NetworkAccessControl): Promise<void> {
    try {
      if (this.networkConnections.has(network.id)) {
        logger.warn(`Network ${network.id} already exists, updating configuration`);
        await this.updateNetworkConnection(network.id, network, accessControls);
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
      
      const networkConnection: NetworkConnection = {
        network,
        mqttService,
        isConnected: false,
        connectionAttempts: 0,
        accessControls: accessControls || this.config.accessControlDefaults
      };

      // Set up event handlers
      this.setupNetworkEventHandlers(networkConnection);
      
      // Connect to the broker
      await mqttService.connect();
      networkConnection.isConnected = true;
      networkConnection.lastConnected = new Date();
      
      this.networkConnections.set(network.id, networkConnection);
      
      logger.info(`Added network connection: ${network.name} (${network.id})`);
      this.emit('networkAdded', { networkId: network.id, network });
    } catch (error) {
      logger.error(`Failed to add network ${network.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a network connection
   */
  async removeNetworkConnection(networkId: string): Promise<void> {
    try {
      const connection = this.networkConnections.get(networkId);
      
      if (connection) {
        await connection.mqttService.disconnect();
        this.networkConnections.delete(networkId);
        
        logger.info(`Removed network connection: ${networkId}`);
        this.emit('networkRemoved', { networkId });
      }
    } catch (error) {
      logger.error(`Failed to remove network ${networkId}:`, error);
      throw error;
    }
  }

  /**
   * Update network connection configuration
   */
  async updateNetworkConnection(
    networkId: string, 
    network: Network, 
    accessControls?: NetworkAccessControl
  ): Promise<void> {
    try {
      const existingConnection = this.networkConnections.get(networkId);
      
      if (existingConnection) {
        // Disconnect existing connection
        await existingConnection.mqttService.disconnect();
        
        // Update access controls if provided
        if (accessControls) {
          existingConnection.accessControls = accessControls;
        }
        
        // Create new MQTT service with updated config
        const mqttConfig: MQTTConnectionConfig = {
          brokerUrl: network.mqttBroker,
          username: network.mqttCredentials.username,
          password: network.mqttCredentials.password,
          clientId: `meshtastic-mapper-${network.id}-${Date.now()}`,
          topics: this.config.defaultTopics
        };

        const mqttService = new MQTTService(mqttConfig);
        existingConnection.mqttService = mqttService;
        existingConnection.network = network;
        
        // Set up event handlers and reconnect
        this.setupNetworkEventHandlers(existingConnection);
        await mqttService.connect();
        existingConnection.isConnected = true;
        existingConnection.lastConnected = new Date();
        
        logger.info(`Updated network connection: ${network.name} (${networkId})`);
        this.emit('networkUpdated', { networkId, network });
      } else {
        // Network doesn't exist, add it
        await this.addNetworkConnection(network, accessControls);
      }
    } catch (error) {
      logger.error(`Failed to update network ${networkId}:`, error);
      throw error;
    }
  }

  /**
   * Set up event handlers for network connection
   */
  private setupNetworkEventHandlers(connection: NetworkConnection): void {
    const { network, mqttService } = connection;

    mqttService.on('connected', () => {
      logger.info(`MQTT connected for network: ${network.name}`);
      connection.isConnected = true;
      connection.lastConnected = new Date();
      connection.connectionAttempts = 0;
      this.emit('networkConnected', { networkId: network.id, network });
    });

    mqttService.on('disconnected', () => {
      logger.warn(`MQTT disconnected for network: ${network.name}`);
      connection.isConnected = false;
      this.emit('networkDisconnected', { networkId: network.id, network });
    });

    mqttService.on('error', (error) => {
      logger.error(`MQTT error for network ${network.name}:`, error);
      connection.connectionAttempts++;
      this.emit('networkError', { networkId: network.id, network, error });
    });

    mqttService.on('data', async (data: ParsedMeshtasticData) => {
      await this.handleNetworkData(data, connection);
    });

    // Add raw message monitoring
    mqttService.on('rawMessage', (topic: string, payload: string, options: any) => {
      this.mqttMonitorService.addMessage(topic, payload, { 
        ...options, 
        networkId: network.id,
        networkName: network.name 
      });
    });

    mqttService.on('parseError', (errorData) => {
      logger.error(`Parse error for network ${network.name}:`, errorData);
      this.emit('parseError', { networkId: network.id, network, ...errorData });
    });
  }

  /**
   * Handle data from network with access control enforcement
   * Requirement 27.3: Enforce access controls per network segment
   */
  private async handleNetworkData(data: ParsedMeshtasticData, connection: NetworkConnection): Promise<void> {
    try {
      const { network, accessControls } = connection;
      
      logger.debug(`Processing data for node ${data.nodeId} in network ${network.id}`);

      // Apply access controls for data visibility
      if (accessControls.dataVisibility === 'private') {
        logger.debug(`Skipping private network data for ${network.id}`);
        return;
      }

      // Ensure node exists with network association
      let node = await this.nodeRepository.findByNodeId(data.nodeId);
      
      if (!node && data.nodeUpdate) {
        // Create new node with network association
        const createData = {
          nodeId: data.nodeId,
          hexId: data.nodeId.replace('!', ''),
          ...data.nodeUpdate,
          networkId: network.id,
          isOnline: true,
          mqttConnected: true
        };
        node = await this.nodeRepository.create(createData);
        logger.info(`Created new node: ${data.nodeId} in network ${network.id}`);
      } else if (node && data.nodeUpdate) {
        // Verify node belongs to this network for security
        if (node.networkId !== network.id) {
          logger.warn(`Node ${data.nodeId} belongs to different network, skipping update`);
          return;
        }
        
        // Update existing node
        node = await this.nodeRepository.update(node.id, data.nodeUpdate);
        logger.debug(`Updated node: ${data.nodeId} in network ${network.id}`);
      }

      if (!node) {
        logger.warn(`Could not create or find node: ${data.nodeId}`);
        return;
      }

      // Store position data with network context
      if (data.position) {
        await this.positionRepository.create({
          ...data.position,
          nodeId: node.id
        });
        logger.debug(`Stored position for node: ${data.nodeId} in network ${network.id}`);
      }

      // Store telemetry data with network context
      if (data.telemetry) {
        await this.telemetryRepository.create({
          ...data.telemetry,
          nodeId: node.id
        });
        logger.debug(`Stored telemetry for node: ${data.nodeId} in network ${network.id}`);
      }

      // Store message data with cross-network tracking
      if (data.message) {
        await this.handleCrossNetworkMessage(data.message, network);
      }

      // Emit real-time update with network context
      this.emit('dataUpdate', {
        networkId: network.id,
        nodeId: data.nodeId,
        data,
        accessControls
      });

      // Handle federation if enabled
      if (accessControls.federationEnabled && this.config.federationSettings.enabled) {
        await this.handleFederatedData(data, network);
      }

    } catch (error) {
      logger.error('Error handling network data:', error);
      this.emit('dataError', { 
        networkId: connection.network.id, 
        nodeId: data.nodeId, 
        error 
      });
    }
  }

  /**
   * Handle cross-network message processing
   */
  private async handleCrossNetworkMessage(messageData: any, network: Network): Promise<void> {
    try {
      // Find or create sender node
      let fromNode = await this.nodeRepository.findByNodeId(messageData.fromNodeId);
      if (!fromNode) {
        fromNode = await this.nodeRepository.create({
          nodeId: messageData.fromNodeId,
          hexId: messageData.fromNodeId.replace('!', ''),
          networkId: network.id,
          role: 'CLIENT' as any,
          isOnline: true,
          mqttConnected: true
        });
      }

      // Find receiver node if specified
      let toNode = null;
      if (messageData.toNodeId) {
        toNode = await this.nodeRepository.findByNodeId(messageData.toNodeId);
        if (!toNode) {
          toNode = await this.nodeRepository.create({
            nodeId: messageData.toNodeId,
            hexId: messageData.toNodeId.replace('!', ''),
            networkId: network.id,
            role: 'CLIENT' as any,
            isOnline: true,
            mqttConnected: true
          });
        }
      }

      // Store message with network context
      await this.messageRepository.create({
        ...messageData,
        fromNodeId: fromNode.id,
        toNodeId: toNode?.id,
        receivedAt: new Date()
      });

      // Track cross-network messages
      if (toNode && toNode.networkId !== network.id) {
        logger.info(`Cross-network message detected: ${network.id} -> ${toNode.networkId}`);
        this.emit('crossNetworkMessage', {
          fromNetworkId: network.id,
          toNetworkId: toNode.networkId,
          messageData
        });
      }

      logger.debug(`Stored message from node: ${messageData.fromNodeId} in network ${network.id}`);
    } catch (error) {
      logger.error('Error handling cross-network message:', error);
      throw error;
    }
  }

  /**
   * Handle federated data synchronization
   * Requirement 27.5: Support data federation and replication
   */
  private async handleFederatedData(data: ParsedMeshtasticData, sourceNetwork: Network): Promise<void> {
    try {
      const { federationSettings } = this.config;
      
      if (!federationSettings.enabled) return;

      // Check if source network is allowed for federation
      if (federationSettings.allowedNetworks.length > 0 && 
          !federationSettings.allowedNetworks.includes(sourceNetwork.id)) {
        return;
      }

      // Prepare federated data package
      const federatedData = {
        sourceNetworkId: sourceNetwork.id,
        sourceNetworkName: sourceNetwork.name,
        nodeId: data.nodeId,
        timestamp: new Date(),
        dataTypes: [] as string[],
        data: {} as any
      };

      // Include allowed data types
      if (federationSettings.dataTypes.includes('position') && data.position) {
        federatedData.dataTypes.push('position');
        federatedData.data.position = data.position;
      }

      if (federationSettings.dataTypes.includes('telemetry') && data.telemetry) {
        federatedData.dataTypes.push('telemetry');
        federatedData.data.telemetry = data.telemetry;
      }

      if (federationSettings.dataTypes.includes('nodeInfo') && data.nodeUpdate) {
        federatedData.dataTypes.push('nodeInfo');
        federatedData.data.nodeUpdate = data.nodeUpdate;
      }

      // Emit federated data event for other networks to consume
      if (federatedData.dataTypes.length > 0) {
        this.emit('federatedData', federatedData);
        logger.debug(`Federated data from network ${sourceNetwork.id}: ${federatedData.dataTypes.join(', ')}`);
      }
    } catch (error) {
      logger.error('Error handling federated data:', error);
    }
  }

  /**
   * Start federation synchronization timer
   */
  private startFederation(): void {
    const { syncInterval } = this.config.federationSettings;
    
    this.federationTimer = setInterval(async () => {
      await this.performFederationSync();
    }, syncInterval * 1000);

    logger.info(`Federation started with ${syncInterval}s sync interval`);
  }

  /**
   * Perform periodic federation synchronization
   */
  private async performFederationSync(): Promise<void> {
    try {
      logger.debug('Performing federation sync...');
      
      // Get cross-network analytics
      const analytics = await this.getCrossNetworkAnalytics();
      
      // Emit federation sync event
      this.emit('federationSync', {
        timestamp: new Date(),
        analytics,
        activeNetworks: Array.from(this.networkConnections.keys())
      });
      
    } catch (error) {
      logger.error('Error during federation sync:', error);
    }
  }

  /**
   * Get cross-network analytics
   * Requirement 27.4: Provide cross-network analytics while maintaining separation
   */
  async getCrossNetworkAnalytics(userPermissions?: string[]): Promise<CrossNetworkAnalytics> {
    try {
      const analytics: CrossNetworkAnalytics = {
        totalNetworks: 0,
        totalNodes: 0,
        networkDistribution: {},
        crossNetworkMessages: 0,
        federatedData: []
      };

      // Get accessible networks based on user permissions
      const accessibleNetworks = this.getAccessibleNetworks(userPermissions);
      
      analytics.totalNetworks = accessibleNetworks.length;

      // Aggregate data from accessible networks
      for (const connection of accessibleNetworks) {
        const { network } = connection;
        
        // Count nodes per network
        const nodeCount = await this.nodeRepository.count({ 
          where: { networkId: network.id } 
        });
        
        analytics.networkDistribution[network.name] = nodeCount;
        analytics.totalNodes += nodeCount;
      }

      // Count cross-network messages (if user has access to multiple networks)
      if (accessibleNetworks.length > 1) {
        const networkIds = accessibleNetworks.map(c => c.network.id);
        
        // This would require a more complex query to identify cross-network messages
        // For now, we'll use a simplified approach
        analytics.crossNetworkMessages = await this.messageRepository.count({
          where: {
            fromNode: { networkId: { in: networkIds } }
          }
        });
      }

      return analytics;
    } catch (error) {
      logger.error('Error getting cross-network analytics:', error);
      throw error;
    }
  }

  /**
   * Get networks accessible to user based on permissions
   * Requirement 27.3: User-specific visibility rules
   */
  private getAccessibleNetworks(userPermissions?: string[]): NetworkConnection[] {
    const accessibleNetworks: NetworkConnection[] = [];

    for (const [networkId, connection] of this.networkConnections) {
      const { accessControls } = connection;
      
      // Public networks are always accessible
      if (accessControls.dataVisibility === 'public') {
        accessibleNetworks.push(connection);
        continue;
      }

      // Check user permissions for restricted/private networks
      if (userPermissions) {
        const hasAccess = userPermissions.some(permission => 
          accessControls.allowedUsers.includes(permission) ||
          accessControls.allowedRoles.includes(permission)
        );
        
        if (hasAccess) {
          accessibleNetworks.push(connection);
        }
      }
    }

    return accessibleNetworks;
  }

  /**
   * Get network selection filters for UI
   * Requirement 27.2: Network selection filters and visual indicators
   */
  getNetworkSelectionFilters(userPermissions?: string[]): any[] {
    const accessibleNetworks = this.getAccessibleNetworks(userPermissions);
    
    return accessibleNetworks.map(connection => ({
      id: connection.network.id,
      name: connection.network.name,
      description: connection.network.description,
      region: connection.network.region,
      isConnected: connection.isConnected,
      lastConnected: connection.lastConnected,
      nodeCount: 0, // This would be populated by a separate query
      accessLevel: connection.accessControls.dataVisibility,
      federationEnabled: connection.accessControls.federationEnabled
    }));
  }

  /**
   * Get connection status for all networks
   */
  getConnectionStatus(userPermissions?: string[]): Record<string, any> {
    const status: Record<string, any> = {};
    const accessibleNetworks = this.getAccessibleNetworks(userPermissions);
    
    for (const connection of accessibleNetworks) {
      const { network, mqttService, isConnected, lastConnected, connectionAttempts } = connection;
      
      status[network.id] = {
        networkName: network.name,
        isConnected,
        lastConnected,
        connectionAttempts,
        mqttStats: mqttService.getStats(),
        accessControls: connection.accessControls
      };
    }
    
    return status;
  }

  /**
   * Get comprehensive statistics
   */
  getStats(userPermissions?: string[]): any {
    const accessibleNetworks = this.getAccessibleNetworks(userPermissions);
    
    return {
      totalNetworks: this.networkConnections.size,
      accessibleNetworks: accessibleNetworks.length,
      connectedNetworks: accessibleNetworks.filter(c => c.isConnected).length,
      federationEnabled: this.config.federationSettings.enabled,
      connections: this.getConnectionStatus(userPermissions),
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown all network connections
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Multi-Network Manager...');
    
    // Stop federation timer
    if (this.federationTimer) {
      clearInterval(this.federationTimer);
    }
    
    // Disconnect all networks
    const disconnectPromises = Array.from(this.networkConnections.values()).map(
      connection => connection.mqttService.disconnect()
    );
    
    await Promise.all(disconnectPromises);
    this.networkConnections.clear();
    
    logger.info('Multi-Network Manager shutdown complete');
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
      for (const [networkId] of this.networkConnections) {
        const network = activeNetworks.find((n: any) => n.id === networkId);
        if (!network) {
          await this.removeNetworkConnection(networkId);
        }
      }
      
      // Add connections for new active networks
      for (const network of activeNetworks) {
        if (!this.networkConnections.has(network.id)) {
          await this.addNetworkConnection(network);
        }
      }
      
      logger.info('Network configurations reloaded');
      this.emit('networksReloaded', { 
        activeNetworks: activeNetworks.length,
        connectedNetworks: this.networkConnections.size 
      });
    } catch (error) {
      logger.error('Failed to reload networks:', error);
      throw error;
    }
  }

  /**
   * Get MQTT monitor service instance
   */
  getMQTTMonitorService(): MQTTMonitorService {
    return this.mqttMonitorService;
  }
}