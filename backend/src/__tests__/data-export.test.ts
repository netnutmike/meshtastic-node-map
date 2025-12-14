import request from 'supertest';
import express from 'express';
import { DataExportService } from '../services/data-export.service';
import { NodeRepository } from '../database/repositories/node.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { NetworkRepository } from '../database/repositories/network.repository';
import { NodeRole, PositionSource, TelemetryType, MessageType, MessagePriority } from '../types/database';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock the database connection
jest.mock('../database/connection', () => ({
  getDatabase: jest.fn(() => ({
    node: {},
    position: {},
    telemetryReading: {},
    message: {},
    network: {}
  })),
  executeWithErrorHandling: jest.fn((fn) => fn())
}));

// Mock the repositories
jest.mock('../database/repositories/node.repository');
jest.mock('../database/repositories/position.repository');
jest.mock('../database/repositories/telemetry.repository');
jest.mock('../database/repositories/message.repository');
jest.mock('../database/repositories/network.repository');

// Mock fs operations
jest.mock('fs/promises');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
    destroy: jest.fn()
  }))
}));

describe('Data Export Service', () => {
  let exportService: DataExportService;
  let mockNodeRepository: jest.Mocked<NodeRepository>;
  let mockPositionRepository: jest.Mocked<PositionRepository>;
  let mockTelemetryRepository: jest.Mocked<TelemetryRepository>;
  let mockMessageRepository: jest.Mocked<MessageRepository>;
  let mockNetworkRepository: jest.Mocked<NetworkRepository>;

  const mockNode = {
    id: 'node-1',
    nodeId: '!12345678',
    hexId: '12345678',
    shortName: 'TEST1',
    longName: 'Test Node 1',
    role: NodeRole.CLIENT,
    hardwareModel: 'TBEAM',
    firmwareVersion: '2.2.0',
    isOnline: true,
    mqttConnected: true,
    batteryLevel: 85,
    voltage: 4.1,
    channelUtilization: 15,
    airUtilTx: 5,
    lastSeen: new Date('2024-01-01T12:00:00Z'),
    lastHeard: new Date('2024-01-01T12:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    networkId: 'network-1'
  };

  const mockPosition = {
    id: 'pos-1',
    nodeId: 'node-1',
    latitude: 40.7128,
    longitude: -74.0060,
    altitude: 10,
    precision: 5,
    source: PositionSource.GPS,
    timestamp: new Date('2024-01-01T12:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z')
  };

  const mockTelemetry = {
    id: 'tel-1',
    nodeId: 'node-1',
    type: TelemetryType.DEVICE_METRICS,
    timestamp: new Date('2024-01-01T12:00:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    data: {
      batteryLevel: 85,
      voltage: 4.1,
      channelUtilization: 15,
      airUtilTx: 5
    }
  };

  const mockMessage = {
    id: 'msg-1',
    fromNodeId: 'node-1',
    toNodeId: 'node-2',
    type: MessageType.TEXT,
    content: 'Hello World',
    encrypted: false,
    hopLimit: 3,
    hopStart: 3,
    wantAck: false,
    priority: MessagePriority.UNSET,
    channel: 0,
    routingPath: ['node-1', 'node-2'],
    timestamp: new Date('2024-01-01T12:00:00Z'),
    receivedAt: new Date('2024-01-01T12:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock repository methods directly on the constructor
    (NodeRepository as jest.MockedClass<typeof NodeRepository>).prototype.findMany = jest.fn().mockResolvedValue([mockNode]);
    (PositionRepository as jest.MockedClass<typeof PositionRepository>).prototype.findMany = jest.fn().mockResolvedValue([mockPosition]);
    (TelemetryRepository as jest.MockedClass<typeof TelemetryRepository>).prototype.findMany = jest.fn().mockResolvedValue([mockTelemetry]);
    (MessageRepository as jest.MockedClass<typeof MessageRepository>).prototype.findMany = jest.fn().mockResolvedValue([mockMessage]);
    (NetworkRepository as jest.MockedClass<typeof NetworkRepository>).prototype.findMany = jest.fn().mockResolvedValue([]);
    (NodeRepository as jest.MockedClass<typeof NodeRepository>).prototype.create = jest.fn().mockResolvedValue(mockNode);
    (PositionRepository as jest.MockedClass<typeof PositionRepository>).prototype.create = jest.fn().mockResolvedValue(mockPosition);

    // Mock fs operations
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('test data'));
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.access as jest.Mock).mockResolvedValue(undefined);

    exportService = new DataExportService();
    
    // Get the mocked instances for assertions
    mockNodeRepository = (exportService as any).nodeRepository;
    mockPositionRepository = (exportService as any).positionRepository;
    mockTelemetryRepository = (exportService as any).telemetryRepository;
    mockMessageRepository = (exportService as any).messageRepository;
    mockNetworkRepository = (exportService as any).networkRepository;
  });

  describe('Export Data', () => {
    it('should export data in CSV format', async () => {
      const exportOptions = {
        format: 'csv' as const,
        filters: {
          includeNodes: true,
          includePositions: true,
          includeTelemetry: true,
          includeMessages: true
        }
      };

      const result = await exportService.exportData(exportOptions);
      
      expect(result).toContain('.csv');
      expect(mockNodeRepository.findMany).toHaveBeenCalled();
      expect(mockPositionRepository.findMany).toHaveBeenCalled();
      expect(mockTelemetryRepository.findMany).toHaveBeenCalled();
      expect(mockMessageRepository.findMany).toHaveBeenCalled();
    });

    it('should export data in JSON format', async () => {
      const exportOptions = {
        format: 'json' as const,
        filters: {
          includeNodes: true,
          includePositions: false,
          includeTelemetry: false,
          includeMessages: false
        }
      };

      const result = await exportService.exportData(exportOptions);
      
      expect(result).toContain('.json');
      expect(mockNodeRepository.findMany).toHaveBeenCalled();
      expect(mockPositionRepository.findMany).not.toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should export data in KML format', async () => {
      const exportOptions = {
        format: 'kml' as const,
        filters: {
          includeNodes: true,
          includePositions: true,
          includeTelemetry: false,
          includeMessages: false
        }
      };

      const result = await exportService.exportData(exportOptions);
      
      expect(result).toContain('.kml');
      expect(mockNodeRepository.findMany).toHaveBeenCalled();
      expect(mockPositionRepository.findMany).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      const exportOptions = {
        format: 'json' as const,
        filters: {
          networkId: 'network-1',
          nodeIds: ['node-1'],
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-01T23:59:59Z'),
          includeNodes: true
        }
      };

      await exportService.exportData(exportOptions);
      
      expect(mockNodeRepository.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          networkId: 'network-1',
          id: { in: ['node-1'] },
          lastSeen: {
            gte: exportOptions.filters.startDate,
            lte: exportOptions.filters.endDate
          }
        })
      });
    });

    it('should handle export errors gracefully', async () => {
      mockNodeRepository.findMany.mockRejectedValue(new Error('Database error'));

      const exportOptions = {
        format: 'json' as const,
        filters: { includeNodes: true }
      };

      await expect(exportService.exportData(exportOptions)).rejects.toThrow('Database error');
    });

    it('should throw error for unsupported format', async () => {
      const exportOptions = {
        format: 'xml' as any,
        filters: { includeNodes: true }
      };

      await expect(exportService.exportData(exportOptions)).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('Backup Operations', () => {
    it('should create a complete backup', async () => {
      const backupOptions = {
        includeNodes: true,
        includePositions: true,
        includeTelemetry: true,
        includeMessages: true,
        includeNetworks: true
      };

      const result = await exportService.createBackup(backupOptions);
      
      expect(result).toContain('backup-');
      expect(result).toContain('.json');
      expect(mockNodeRepository.findMany).toHaveBeenCalled();
      expect(mockPositionRepository.findMany).toHaveBeenCalled();
      expect(mockTelemetryRepository.findMany).toHaveBeenCalled();
      expect(mockMessageRepository.findMany).toHaveBeenCalled();
      expect(mockNetworkRepository.findMany).toHaveBeenCalled();
    });

    it('should create selective backup', async () => {
      const backupOptions = {
        includeNodes: true,
        includePositions: false,
        includeTelemetry: false,
        includeMessages: false,
        includeNetworks: false
      };

      await exportService.createBackup(backupOptions);
      
      expect(mockNodeRepository.findMany).toHaveBeenCalled();
      expect(mockPositionRepository.findMany).not.toHaveBeenCalled();
      expect(mockTelemetryRepository.findMany).not.toHaveBeenCalled();
      expect(mockMessageRepository.findMany).not.toHaveBeenCalled();
      expect(mockNetworkRepository.findMany).not.toHaveBeenCalled();
    });

    it('should restore backup successfully', async () => {
      const mockBackupData = {
        metadata: {
          backupDate: '2024-01-01T12:00:00Z',
          version: '1.0.0'
        },
        nodes: [mockNode],
        positions: [mockPosition]
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockBackupData));
      mockNodeRepository.create.mockResolvedValue(mockNode);
      mockPositionRepository.create.mockResolvedValue(mockPosition);

      await exportService.restoreBackup('/path/to/backup.json');
      
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/backup.json', 'utf-8');
      expect(mockNodeRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        id: mockNode.id,
        nodeId: mockNode.nodeId,
        shortName: mockNode.shortName
      }));
      expect(mockPositionRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        id: mockPosition.id,
        nodeId: mockPosition.nodeId,
        latitude: mockPosition.latitude
      }));
    });

    it('should handle backup restoration errors', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(exportService.restoreBackup('/invalid/path.json')).rejects.toThrow('File not found');
    });
  });

  describe('Public URL Generation', () => {
    it('should generate public URL for filtered data', async () => {
      const filters = {
        networkId: 'network-1',
        includeNodes: true
      };

      const result = await exportService.generatePublicUrl(filters, 24);
      
      expect(result).toContain('/exports/');
      expect(mockNodeRepository.findMany).toHaveBeenCalled();
    });
  });

  describe('Data Filtering', () => {
    it('should filter nodes by network ID', async () => {
      const filters = { networkId: 'network-1', includeNodes: true };
      
      await exportService.exportData({
        format: 'json',
        filters
      });

      expect(mockNodeRepository.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          networkId: 'network-1'
        })
      });
    });

    it('should filter positions by date range', async () => {
      const filters = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-01T23:59:59Z'),
        includePositions: true
      };
      
      await exportService.exportData({
        format: 'json',
        filters
      });

      expect(mockPositionRepository.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate
          }
        })
      });
    });

    it('should filter telemetry by type', async () => {
      const filters = {
        telemetryTypes: ['DEVICE_METRICS'],
        includeTelemetry: true
      };
      
      await exportService.exportData({
        format: 'json',
        filters
      });

      expect(mockTelemetryRepository.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          type: { in: ['DEVICE_METRICS'] }
        })
      });
    });

    it('should filter messages by node IDs', async () => {
      const filters = {
        nodeIds: ['node-1', 'node-2'],
        includeMessages: true
      };
      
      await exportService.exportData({
        format: 'json',
        filters
      });

      expect(mockMessageRepository.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: [
            { fromNodeId: { in: ['node-1', 'node-2'] } },
            { toNodeId: { in: ['node-1', 'node-2'] } }
          ]
        })
      });
    });
  });
});

// Note: API endpoint tests would require setting up the full Express app with routes
// For now, we focus on testing the service layer functionality
// API tests can be added separately with proper Express app setup