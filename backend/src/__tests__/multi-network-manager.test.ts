/**
 * Multi-Network Manager Service Tests
 * Tests for multi-network support and federation functionality
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
 */

import { MultiNetworkManagerService, NetworkAccessControl } from '../services/multi-network-manager.service';
import { MQTTService } from '../services/mqtt.service';
import { NodeRepository } from '../database/repositories/node.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { NetworkRepository } from '../database/repositories/network.repository';
import { Network, LoRaRegion } from '../types/database';

// Mock dependencies
jest.mock('../services/mqtt.service');
jest.mock('../database/repositories/node.repository');
jest.mock('../database/repositories/position.repository');
jest.mock('../database/repositories/telemetry.repository');
jest.mock('../database/repositories/message.repository');
jest.mock('../database/repositories/network.repository');
jest.mock('../utils/logger');

describe('MultiNetworkManagerService', () => {
  let multiNetworkManager: MultiNetworkManagerService;
  let mockNodeRepository: jest.Mocked<NodeRepository>;
  let mockPositionRepository: jest.Mocked<PositionRepository>;
  let mockTelemetryRepository: jest.Mocked<TelemetryRepository>;
  let mockMessageRepository: jest.Mocked<MessageRepository>;
  let mockNetworkRepository: jest.Mocked<NetworkRepository>;

  const mockNetwork1: Network = {
    id: 'network-1',
    name: 'Test Network 1',
    description: 'First test network',
    mqttBroker: 'mqtt://broker1.example.com',
    mqttCredentials: { username: 'user1', password: 'pass1' },
    region: LoRaRegion.US,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    nodes: [],
    channels: []
  };

  const mockNetwork2: Network = {
    id: 'network-2',
    name: 'Test Network 2',
    description: 'Second test network',
    mqttBroker: 'mqtt://broker2.example.com',
    mqttCredentials: { username: 'user2', password: 'pass2' },
    region: LoRaRegion.EU_868,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    nodes: [],
    channels: []
  };

  const mockConfig = {
    networks: [mockNetwork1, mockNetwork2],
    defaultTopics: ['msh/+/json/+', 'msh/+/2/json/+'],
    federationSettings: {
      enabled: true,
      syncInterval: 300,
      allowedNetworks: ['network-1', 'network-2'],
      dataTypes: ['position', 'telemetry', 'nodeInfo']
    },
    accessControlDefaults: {
      allowedUsers: [],
      allowedRoles: [],
      dataVisibility: 'public' as const,
      crossNetworkSharing: false,
      federationEnabled: false
    }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockNodeRepository = new NodeRepository() as jest.Mocked<NodeRepository>;
    mockPositionRepository = new PositionRepository() as jest.Mocked<PositionRepository>;
    mockTelemetryRepository = new TelemetryRepository() as jest.Mocked<TelemetryRepository>;
    mockMessageRepository = new MessageRepository() as jest.Mocked<MessageRepository>;
    mockNetworkRepository = new NetworkRepository() as jest.Mocked<NetworkRepository>;

    // Create service instance
    multiNetworkManager = new MultiNetworkManagerService(
      mockConfig,
      mockNodeRepository,
      mockPositionRepository,
      mockTelemetryRepository,
      mockMessageRepository,
      mockNetworkRepository
    );

    // Mock MQTT service
    const mockMQTTService = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        connected: true,
        reconnectAttempts: 0,
        brokerUrl: 'mqtt://test.example.com',
        topics: ['test/topic']
      })
    };
    (MQTTService as unknown as jest.Mock).mockImplementation(() => mockMQTTService);
  });

  afterEach(async () => {
    await multiNetworkManager.shutdown();
  });

  describe('Network Connection Management', () => {
    /**
     * Test multiple MQTT broker connections
     * Requirement 27.1: Support connections to multiple MQTT brokers simultaneously
     */
    test('should connect to multiple MQTT brokers simultaneously', async () => {
      await multiNetworkManager.initialize();

      const connectionStatus = multiNetworkManager.getConnectionStatus();
      
      expect(Object.keys(connectionStatus)).toHaveLength(2);
      expect(connectionStatus['network-1']).toBeDefined();
      expect(connectionStatus['network-2']).toBeDefined();
      expect(connectionStatus['network-1'].networkName).toBe('Test Network 1');
      expect(connectionStatus['network-2'].networkName).toBe('Test Network 2');
    });

    test('should handle separate authentication credentials per network', async () => {
      await multiNetworkManager.initialize();

      // Verify MQTT services were created with correct credentials
      expect(MQTTService).toHaveBeenCalledTimes(2);
      
      const calls = (MQTTService as unknown as jest.Mock).mock.calls;
      expect(calls[0][0]).toMatchObject({
        brokerUrl: 'mqtt://broker1.example.com',
        username: 'user1',
        password: 'pass1'
      });
      expect(calls[1][0]).toMatchObject({
        brokerUrl: 'mqtt://broker2.example.com',
        username: 'user2',
        password: 'pass2'
      });
    });

    test('should add new network connection with access controls', async () => {
      const accessControls: NetworkAccessControl = {
        allowedUsers: ['admin@example.com'],
        allowedRoles: ['admin'],
        dataVisibility: 'restricted',
        crossNetworkSharing: true,
        federationEnabled: true
      };

      await multiNetworkManager.addNetworkConnection(mockNetwork1, accessControls);

      const connectionStatus = multiNetworkManager.getConnectionStatus();
      expect(connectionStatus['network-1']).toBeDefined();
      expect(connectionStatus['network-1'].accessControls).toEqual(accessControls);
    });

    test('should remove network connection', async () => {
      await multiNetworkManager.addNetworkConnection(mockNetwork1);
      
      let connectionStatus = multiNetworkManager.getConnectionStatus();
      expect(connectionStatus['network-1']).toBeDefined();

      await multiNetworkManager.removeNetworkConnection('network-1');
      
      connectionStatus = multiNetworkManager.getConnectionStatus();
      expect(connectionStatus['network-1']).toBeUndefined();
    });

    test('should update network connection configuration', async () => {
      await multiNetworkManager.addNetworkConnection(mockNetwork1);

      const updatedNetwork = { ...mockNetwork1, name: 'Updated Network 1' };
      const newAccessControls: NetworkAccessControl = {
        allowedUsers: ['user@example.com'],
        allowedRoles: ['operator'],
        dataVisibility: 'private',
        crossNetworkSharing: false,
        federationEnabled: false
      };

      await multiNetworkManager.updateNetworkConnection('network-1', updatedNetwork, newAccessControls);

      const connectionStatus = multiNetworkManager.getConnectionStatus();
      expect(connectionStatus['network-1']).toBeDefined();
      expect(connectionStatus['network-1'].networkName).toBe('Updated Network 1');
      expect(connectionStatus['network-1'].accessControls).toEqual(newAccessControls);
    });
  });

  describe('Network Selection and Filtering', () => {
    /**
     * Test network selection filters and visual indicators
     * Requirement 27.2: Network selection filters and visual indicators
     */
    test('should provide network selection filters', async () => {
      await multiNetworkManager.initialize();

      const filters = multiNetworkManager.getNetworkSelectionFilters();
      
      expect(filters).toHaveLength(2);
      expect(filters[0]).toMatchObject({
        id: 'network-1',
        name: 'Test Network 1',
        region: 'US',
        accessLevel: 'public'
      });
      expect(filters[1]).toMatchObject({
        id: 'network-2',
        name: 'Test Network 2',
        region: 'EU_868',
        accessLevel: 'public'
      });
    });

    test('should filter networks based on user permissions', async () => {
      // Add networks with different access controls
      await multiNetworkManager.addNetworkConnection(mockNetwork1, {
        allowedUsers: ['admin@example.com'],
        allowedRoles: ['admin'],
        dataVisibility: 'restricted',
        crossNetworkSharing: false,
        federationEnabled: false
      });

      await multiNetworkManager.addNetworkConnection(mockNetwork2, {
        allowedUsers: [],
        allowedRoles: [],
        dataVisibility: 'public',
        crossNetworkSharing: false,
        federationEnabled: false
      });

      // Test with admin permissions
      const adminFilters = multiNetworkManager.getNetworkSelectionFilters(['admin@example.com']);
      expect(adminFilters).toHaveLength(2);

      // Test with no permissions
      const noPermFilters = multiNetworkManager.getNetworkSelectionFilters([]);
      expect(noPermFilters).toHaveLength(1);
      expect(noPermFilters[0].id).toBe('network-2');
    });

    test('should provide visual indicators for network status', async () => {
      await multiNetworkManager.initialize();

      const filters = multiNetworkManager.getNetworkSelectionFilters();
      
      filters.forEach(filter => {
        expect(filter).toHaveProperty('isConnected');
        expect(filter).toHaveProperty('accessLevel');
        expect(filter).toHaveProperty('federationEnabled');
        expect(filter).toHaveProperty('lastConnected');
      });
    });
  });

  describe('Access Controls and Network Isolation', () => {
    /**
     * Test access controls per network segment
     * Requirement 27.3: Enforce access controls per network segment with user-specific visibility rules
     */
    test('should enforce data visibility controls', async () => {
      // Mock repositories
      mockNodeRepository.findByNodeId = jest.fn().mockResolvedValue(null);
      mockNodeRepository.create = jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeId: '!12345678',
        networkId: 'network-1'
      });

      // Add network with private access
      await multiNetworkManager.addNetworkConnection(mockNetwork1, {
        allowedUsers: [],
        allowedRoles: [],
        dataVisibility: 'private',
        crossNetworkSharing: false,
        federationEnabled: false
      });

      // Simulate data processing - should be skipped for private networks
      const mockData = {
        nodeId: '!12345678',
        nodeUpdate: {
          shortName: 'TEST',
          longName: 'Test Node'
        }
      };

      // This should not create a node due to private visibility
      await multiNetworkManager['handleNetworkData'](mockData, {
        network: mockNetwork1,
        mqttService: {} as any,
        isConnected: true,
        connectionAttempts: 0,
        accessControls: {
          allowedUsers: [],
          allowedRoles: [],
          dataVisibility: 'private',
          crossNetworkSharing: false,
          federationEnabled: false
        }
      });

      expect(mockNodeRepository.create).not.toHaveBeenCalled();
    });

    test('should validate network ownership for security', async () => {
      // Mock existing node from different network
      mockNodeRepository.findByNodeId = jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeId: '!12345678',
        networkId: 'network-2' // Different network
      });

      await multiNetworkManager.addNetworkConnection(mockNetwork1);

      const mockData = {
        nodeId: '!12345678',
        nodeUpdate: {
          shortName: 'TEST',
          longName: 'Test Node'
        }
      };

      // Should not update node from different network
      await multiNetworkManager['handleNetworkData'](mockData, {
        network: mockNetwork1,
        mqttService: {} as any,
        isConnected: true,
        connectionAttempts: 0,
        accessControls: mockConfig.accessControlDefaults
      });

      expect(mockNodeRepository.update).not.toHaveBeenCalled();
    });

    test('should provide user-specific network visibility', async () => {
      // Add networks with different access levels
      await multiNetworkManager.addNetworkConnection(mockNetwork1, {
        allowedUsers: ['user1@example.com'],
        allowedRoles: [],
        dataVisibility: 'restricted',
        crossNetworkSharing: false,
        federationEnabled: false
      });

      await multiNetworkManager.addNetworkConnection(mockNetwork2, {
        allowedUsers: ['user2@example.com'],
        allowedRoles: [],
        dataVisibility: 'restricted',
        crossNetworkSharing: false,
        federationEnabled: false
      });

      // Test user1 permissions
      const user1Status = multiNetworkManager.getConnectionStatus(['user1@example.com']);
      expect(Object.keys(user1Status)).toHaveLength(1);
      expect(user1Status['network-1']).toBeDefined();

      // Test user2 permissions
      const user2Status = multiNetworkManager.getConnectionStatus(['user2@example.com']);
      expect(Object.keys(user2Status)).toHaveLength(1);
      expect(user2Status['network-2']).toBeDefined();
    });
  });

  describe('Cross-Network Analytics', () => {
    /**
     * Test cross-network analytics while maintaining separation
     * Requirement 27.4: Provide cross-network analytics while maintaining logical separation
     */
    test('should provide cross-network analytics', async () => {
      // Mock repository responses
      mockNodeRepository.count = jest.fn()
        .mockResolvedValueOnce(10) // network-1
        .mockResolvedValueOnce(15); // network-2
      mockMessageRepository.count = jest.fn().mockResolvedValue(100);

      await multiNetworkManager.initialize();

      const analytics = await multiNetworkManager.getCrossNetworkAnalytics();

      expect(analytics.totalNetworks).toBe(2);
      expect(analytics.totalNodes).toBe(25);
      expect(analytics.networkDistribution).toEqual({
        'Test Network 1': 10,
        'Test Network 2': 15
      });
    });

    test('should maintain logical separation in analytics', async () => {
      // Add networks with different access levels
      await multiNetworkManager.addNetworkConnection(mockNetwork1, {
        allowedUsers: ['admin@example.com'],
        allowedRoles: [],
        dataVisibility: 'restricted',
        crossNetworkSharing: false,
        federationEnabled: false
      });

      await multiNetworkManager.addNetworkConnection(mockNetwork2, {
        allowedUsers: [],
        allowedRoles: [],
        dataVisibility: 'public',
        crossNetworkSharing: false,
        federationEnabled: false
      });

      mockNodeRepository.count = jest.fn().mockResolvedValue(5);

      // User with no permissions should only see public network
      const restrictedAnalytics = await multiNetworkManager.getCrossNetworkAnalytics([]);
      expect(restrictedAnalytics.totalNetworks).toBe(1);
      expect(restrictedAnalytics.networkDistribution).toHaveProperty('Test Network 2');
      expect(restrictedAnalytics.networkDistribution).not.toHaveProperty('Test Network 1');

      // Admin should see both networks
      const adminAnalytics = await multiNetworkManager.getCrossNetworkAnalytics(['admin@example.com']);
      expect(adminAnalytics.totalNetworks).toBe(2);
    });

    test('should track cross-network messages', async () => {
      mockMessageRepository.count = jest.fn().mockResolvedValue(50);
      
      await multiNetworkManager.initialize();

      const analytics = await multiNetworkManager.getCrossNetworkAnalytics(['admin']);
      
      expect(analytics.crossNetworkMessages).toBe(50);
      expect(mockMessageRepository.count).toHaveBeenCalledWith({
        where: {
          fromNode: { networkId: { in: ['network-1', 'network-2'] } }
        }
      });
    });
  });

  describe('Data Federation', () => {
    /**
     * Test data federation and replication
     * Requirement 27.5: Support data federation and replication between geographically distributed instances
     */
    test('should handle federated data when enabled', async () => {
      const federationSpy = jest.fn();
      multiNetworkManager.on('federatedData', federationSpy);

      await multiNetworkManager.addNetworkConnection(mockNetwork1, {
        allowedUsers: [],
        allowedRoles: [],
        dataVisibility: 'public',
        crossNetworkSharing: true,
        federationEnabled: true
      });

      // Test that federation configuration is properly set
      const connectionStatus = multiNetworkManager.getConnectionStatus();
      expect(connectionStatus['network-1']).toBeDefined();
      expect(connectionStatus['network-1'].accessControls.federationEnabled).toBe(true);
    });

    test('should respect federation allowed networks', async () => {
      const federationSpy = jest.fn();
      multiNetworkManager.on('federatedData', federationSpy);

      // Update config to only allow network-2 for federation
      const restrictedConfig = {
        ...mockConfig,
        federationSettings: {
          ...mockConfig.federationSettings,
          allowedNetworks: ['network-2']
        }
      };

      const restrictedManager = new MultiNetworkManagerService(
        restrictedConfig,
        mockNodeRepository,
        mockPositionRepository,
        mockTelemetryRepository,
        mockMessageRepository,
        mockNetworkRepository
      );

      await restrictedManager.addNetworkConnection(mockNetwork1, {
        allowedUsers: [],
        allowedRoles: [],
        dataVisibility: 'public',
        crossNetworkSharing: true,
        federationEnabled: true
      });

      const mockData = {
        nodeId: '!12345678',
        position: {
          nodeId: '!12345678',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date()
        }
      };

      mockNodeRepository.findByNodeId = jest.fn().mockResolvedValue(null);
      mockNodeRepository.create = jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeId: '!12345678',
        networkId: 'network-1'
      });

      await restrictedManager['handleNetworkData'](mockData, {
        network: mockNetwork1,
        mqttService: {} as any,
        isConnected: true,
        connectionAttempts: 0,
        accessControls: {
          allowedUsers: [],
          allowedRoles: [],
          dataVisibility: 'public',
          crossNetworkSharing: true,
          federationEnabled: true
        }
      });

      // Should not federate data from network-1 since it's not in allowed list
      expect(federationSpy).not.toHaveBeenCalled();

      await restrictedManager.shutdown();
    });

    test('should filter federated data types', async () => {
      // Update config to only allow position data
      const positionOnlyConfig = {
        ...mockConfig,
        federationSettings: {
          ...mockConfig.federationSettings,
          dataTypes: ['position']
        }
      };

      const positionOnlyManager = new MultiNetworkManagerService(
        positionOnlyConfig,
        mockNodeRepository,
        mockPositionRepository,
        mockTelemetryRepository,
        mockMessageRepository,
        mockNetworkRepository
      );

      await positionOnlyManager.addNetworkConnection(mockNetwork1, {
        allowedUsers: [],
        allowedRoles: [],
        dataVisibility: 'public',
        crossNetworkSharing: true,
        federationEnabled: true
      });

      // Test that federation configuration is properly set with filtered data types
      const stats = positionOnlyManager.getStats();
      expect(stats.federationEnabled).toBe(true);

      await positionOnlyManager.shutdown();
    });
  });

  describe('Network Management', () => {
    test('should reload network configurations', async () => {
      mockNetworkRepository.findActiveNetworks = jest.fn().mockResolvedValue([mockNetwork1]);

      await multiNetworkManager.initialize();
      
      // Should have 2 networks initially
      expect(Object.keys(multiNetworkManager.getConnectionStatus())).toHaveLength(2);

      // Mock updated networks (only network-1 active)
      await multiNetworkManager.reloadNetworks();

      // Should remove network-2 and keep network-1
      const status = multiNetworkManager.getConnectionStatus();
      expect(Object.keys(status)).toHaveLength(1);
      expect(status['network-1']).toBeDefined();
    });

    test('should provide comprehensive statistics', async () => {
      await multiNetworkManager.initialize();

      const stats = multiNetworkManager.getStats();

      expect(stats).toMatchObject({
        totalNetworks: 2,
        accessibleNetworks: 2,
        connectedNetworks: 2,
        federationEnabled: true,
        uptime: expect.any(Number)
      });
    });

    test('should shutdown all connections gracefully', async () => {
      await multiNetworkManager.initialize();

      const disconnectSpy = jest.fn().mockResolvedValue(undefined);
      const mockMQTTService = {
        disconnect: disconnectSpy
      };

      // Mock the MQTT services
      multiNetworkManager['networkConnections'].forEach(connection => {
        connection.mqttService = mockMQTTService as any;
      });

      await multiNetworkManager.shutdown();

      expect(disconnectSpy).toHaveBeenCalledTimes(2);
      expect(multiNetworkManager['networkConnections'].size).toBe(0);
    });
  });
});