import { NodeRepository } from '../database/repositories/node.repository';
import { PositionRepository } from '../database/repositories/position.repository';
import { TelemetryRepository } from '../database/repositories/telemetry.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { NetworkRepository } from '../database/repositories/network.repository';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export interface ExportFilters {
  networkId?: string;
  nodeIds?: string[];
  startDate?: Date;
  endDate?: Date;
  messageTypes?: string[];
  telemetryTypes?: string[];
  includePositions?: boolean;
  includeTelemetry?: boolean;
  includeMessages?: boolean;
  includeNodes?: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'kml';
  filters: ExportFilters;
  filename?: string;
}

export interface BackupOptions {
  includeNodes?: boolean;
  includePositions?: boolean;
  includeTelemetry?: boolean;
  includeMessages?: boolean;
  includeNetworks?: boolean;
  compress?: boolean;
}

export class DataExportService {
  private nodeRepository: NodeRepository;
  private positionRepository: PositionRepository;
  private telemetryRepository: TelemetryRepository;
  private messageRepository: MessageRepository;
  private networkRepository: NetworkRepository;

  constructor() {
    this.nodeRepository = new NodeRepository();
    this.positionRepository = new PositionRepository();
    this.telemetryRepository = new TelemetryRepository();
    this.messageRepository = new MessageRepository();
    this.networkRepository = new NetworkRepository();
  }

  /**
   * Export data in specified format
   */
  async exportData(options: ExportOptions): Promise<string> {
    const { format, filters } = options;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = options.filename || `meshtastic-export-${timestamp}`;

    logger.info('Starting data export:', { format, filters, filename });

    try {
      switch (format) {
        case 'csv':
          return await this.exportToCSV(filters, filename);
        case 'json':
          return await this.exportToJSON(filters, filename);
        case 'kml':
          return await this.exportToKML(filters, filename);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Export data to CSV format
   */
  private async exportToCSV(filters: ExportFilters, filename: string): Promise<string> {
    const exportPath = path.join(process.cwd(), 'exports', `${filename}.csv`);
    await fs.mkdir(path.dirname(exportPath), { recursive: true });

    const writeStream = createWriteStream(exportPath);
    let headerWritten = false;

    try {
      // Export nodes if requested
      if (filters.includeNodes !== false) {
        const nodes = await this.getFilteredNodes(filters);
        if (nodes.length > 0) {
          const nodeHeaders = [
            'Type', 'ID', 'NodeID', 'HexID', 'ShortName', 'LongName', 
            'Role', 'HardwareModel', 'FirmwareVersion', 'IsOnline', 
            'MQTTConnected', 'BatteryLevel', 'Voltage', 'ChannelUtilization',
            'AirUtilTx', 'LastSeen', 'LastHeard', 'CreatedAt', 'UpdatedAt'
          ];
          
          if (!headerWritten) {
            writeStream.write(nodeHeaders.join(',') + '\n');
            headerWritten = true;
          }

          for (const node of nodes) {
            const row = [
              'Node',
              node.id,
              node.nodeId,
              node.hexId || '',
              node.shortName || '',
              node.longName || '',
              node.role || '',
              node.hardwareModel || '',
              node.firmwareVersion || '',
              node.isOnline,
              node.mqttConnected,
              node.batteryLevel || '',
              node.voltage || '',
              node.channelUtilization || '',
              node.airUtilTx || '',
              node.lastSeen?.toISOString() || '',
              node.lastHeard?.toISOString() || '',
              node.createdAt.toISOString(),
              node.updatedAt.toISOString()
            ];
            writeStream.write(row.join(',') + '\n');
          }
        }
      }

      // Export positions if requested
      if (filters.includePositions !== false) {
        const positions = await this.getFilteredPositions(filters);
        if (positions.length > 0) {
          const positionHeaders = [
            'Type', 'ID', 'NodeID', 'Latitude', 'Longitude', 'Altitude',
            'Precision', 'Source', 'Timestamp'
          ];
          
          if (!headerWritten) {
            writeStream.write(positionHeaders.join(',') + '\n');
            headerWritten = true;
          }

          for (const position of positions) {
            const row = [
              'Position',
              position.id,
              position.nodeId,
              position.latitude,
              position.longitude,
              position.altitude || '',
              position.precision || '',
              position.source || '',
              position.timestamp.toISOString()
            ];
            writeStream.write(row.join(',') + '\n');
          }
        }
      }

      // Export telemetry if requested
      if (filters.includeTelemetry !== false) {
        const telemetry = await this.getFilteredTelemetry(filters);
        if (telemetry.length > 0) {
          const telemetryHeaders = [
            'Type', 'ID', 'NodeID', 'TelemetryType', 'BatteryLevel', 'Voltage',
            'ChannelUtilization', 'AirUtilTx', 'Temperature', 'Humidity',
            'Pressure', 'Ch1Voltage', 'Ch1Current', 'Ch2Voltage', 'Ch2Current',
            'Timestamp'
          ];
          
          if (!headerWritten) {
            writeStream.write(telemetryHeaders.join(',') + '\n');
            headerWritten = true;
          }

          for (const reading of telemetry) {
            const data = reading.data as any;
            const row = [
              'Telemetry',
              reading.id,
              reading.nodeId,
              reading.type,
              data?.batteryLevel || '',
              data?.voltage || '',
              data?.channelUtilization || '',
              data?.airUtilTx || '',
              data?.temperature || '',
              data?.humidity || '',
              data?.pressure || '',
              data?.ch1Voltage || '',
              data?.ch1Current || '',
              data?.ch2Voltage || '',
              data?.ch2Current || '',
              reading.timestamp.toISOString()
            ];
            writeStream.write(row.join(',') + '\n');
          }
        }
      }

      // Export messages if requested
      if (filters.includeMessages !== false) {
        const messages = await this.getFilteredMessages(filters);
        if (messages.length > 0) {
          const messageHeaders = [
            'Type', 'ID', 'FromNodeID', 'ToNodeID', 'MessageType', 'Content',
            'Encrypted', 'HopLimit', 'HopStart', 'WantAck', 'Priority',
            'Channel', 'RoutingPath', 'Timestamp', 'ReceivedAt'
          ];
          
          if (!headerWritten) {
            writeStream.write(messageHeaders.join(',') + '\n');
            headerWritten = true;
          }

          for (const message of messages) {
            const row = [
              'Message',
              message.id,
              message.fromNodeId,
              message.toNodeId || '',
              message.type,
              typeof message.content === 'string' ? message.content.replace(/,/g, ';') : JSON.stringify(message.content).replace(/,/g, ';'),
              message.encrypted,
              message.hopLimit || '',
              message.hopStart || '',
              message.wantAck || '',
              message.priority || '',
              message.channel || '',
              Array.isArray(message.routingPath) ? message.routingPath.join(';') : '',
              message.timestamp.toISOString(),
              message.receivedAt?.toISOString() || ''
            ];
            writeStream.write(row.join(',') + '\n');
          }
        }
      }

      writeStream.end();
      logger.info(`CSV export completed: ${exportPath}`);
      return exportPath;
    } catch (error) {
      writeStream.destroy();
      throw error;
    }
  }

  /**
   * Export data to JSON format
   */
  private async exportToJSON(filters: ExportFilters, filename: string): Promise<string> {
    const exportPath = path.join(process.cwd(), 'exports', `${filename}.json`);
    await fs.mkdir(path.dirname(exportPath), { recursive: true });

    const exportData: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        filters,
        version: '1.0.0'
      }
    };

    // Collect all data
    if (filters.includeNodes !== false) {
      exportData.nodes = await this.getFilteredNodes(filters);
    }

    if (filters.includePositions !== false) {
      exportData.positions = await this.getFilteredPositions(filters);
    }

    if (filters.includeTelemetry !== false) {
      exportData.telemetry = await this.getFilteredTelemetry(filters);
    }

    if (filters.includeMessages !== false) {
      exportData.messages = await this.getFilteredMessages(filters);
    }

    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    logger.info(`JSON export completed: ${exportPath}`);
    return exportPath;
  }

  /**
   * Export data to KML format (for geographic visualization)
   */
  private async exportToKML(filters: ExportFilters, filename: string): Promise<string> {
    const exportPath = path.join(process.cwd(), 'exports', `${filename}.kml`);
    await fs.mkdir(path.dirname(exportPath), { recursive: true });

    const nodes = await this.getFilteredNodes(filters);
    const positions = await this.getFilteredPositions(filters);

    // Create KML content
    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Meshtastic Network Export</name>
    <description>Exported Meshtastic network data</description>
    
    <!-- Node Styles -->
    <Style id="onlineNode">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="offlineNode">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="disconnectedNode">
      <IconStyle>
        <color>ffff0000</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
`;

    // Add nodes with their latest positions
    for (const node of nodes) {
      const latestPosition = positions.find(p => p.nodeId === node.id);
      if (latestPosition) {
        const styleId = node.isOnline ? 'onlineNode' : 
                       node.mqttConnected ? 'disconnectedNode' : 'offlineNode';
        
        kmlContent += `
    <Placemark>
      <name>${node.shortName || node.longName || node.nodeId}</name>
      <description><![CDATA[
        <b>Node ID:</b> ${node.nodeId}<br/>
        <b>Hex ID:</b> ${node.hexId || 'N/A'}<br/>
        <b>Role:</b> ${node.role || 'N/A'}<br/>
        <b>Hardware:</b> ${node.hardwareModel || 'N/A'}<br/>
        <b>Firmware:</b> ${node.firmwareVersion || 'N/A'}<br/>
        <b>Status:</b> ${node.isOnline ? 'Online' : 'Offline'}<br/>
        <b>MQTT:</b> ${node.mqttConnected ? 'Connected' : 'Disconnected'}<br/>
        <b>Battery:</b> ${node.batteryLevel ? node.batteryLevel + '%' : 'N/A'}<br/>
        <b>Last Seen:</b> ${node.lastSeen?.toISOString() || 'N/A'}<br/>
      ]]></description>
      <styleUrl>#${styleId}</styleUrl>
      <Point>
        <coordinates>${latestPosition.longitude},${latestPosition.latitude},${latestPosition.altitude || 0}</coordinates>
      </Point>
    </Placemark>`;
      }
    }

    // Add position history as paths if multiple positions exist
    const nodePositionMap = new Map<string, any[]>();
    positions.forEach(pos => {
      if (!nodePositionMap.has(pos.nodeId)) {
        nodePositionMap.set(pos.nodeId, []);
      }
      nodePositionMap.get(pos.nodeId)!.push(pos);
    });

    for (const [nodeId, nodePositions] of nodePositionMap) {
      if (nodePositions.length > 1) {
        const node = nodes.find(n => n.id === nodeId);
        const sortedPositions = nodePositions.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        kmlContent += `
    <Placemark>
      <name>${node?.shortName || node?.longName || nodeId} - Path</name>
      <description>Movement path for node</description>
      <LineString>
        <coordinates>`;

        for (const pos of sortedPositions) {
          kmlContent += `${pos.longitude},${pos.latitude},${pos.altitude || 0} `;
        }

        kmlContent += `</coordinates>
      </LineString>
    </Placemark>`;
      }
    }

    kmlContent += `
  </Document>
</kml>`;

    await fs.writeFile(exportPath, kmlContent);
    logger.info(`KML export completed: ${exportPath}`);
    return exportPath;
  }

  /**
   * Create a complete database backup
   */
  async createBackup(options: BackupOptions = {}): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), 'backups', `backup-${timestamp}.json`);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    const backup: any = {
      metadata: {
        backupDate: new Date().toISOString(),
        version: '1.0.0',
        options
      }
    };

    try {
      if (options.includeNetworks !== false) {
        backup.networks = await this.networkRepository.findMany({});
      }

      if (options.includeNodes !== false) {
        backup.nodes = await this.nodeRepository.findMany({});
      }

      if (options.includePositions !== false) {
        backup.positions = await this.positionRepository.findMany({});
      }

      if (options.includeTelemetry !== false) {
        backup.telemetry = await this.telemetryRepository.findMany({});
      }

      if (options.includeMessages !== false) {
        backup.messages = await this.messageRepository.findMany({});
      }

      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
      logger.info(`Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  /**
   * Restore data from backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    try {
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
      logger.info('Starting backup restoration:', backupData.metadata);

      // Restore in dependency order
      if (backupData.networks) {
        for (const network of backupData.networks) {
          await this.networkRepository.create(network);
        }
      }

      if (backupData.nodes) {
        for (const node of backupData.nodes) {
          await this.nodeRepository.create(node);
        }
      }

      if (backupData.positions) {
        for (const position of backupData.positions) {
          await this.positionRepository.create(position);
        }
      }

      if (backupData.telemetry) {
        for (const reading of backupData.telemetry) {
          await this.telemetryRepository.create(reading);
        }
      }

      if (backupData.messages) {
        for (const message of backupData.messages) {
          await this.messageRepository.create(message);
        }
      }

      logger.info('Backup restoration completed successfully');
    } catch (error) {
      logger.error('Backup restoration failed:', error);
      throw error;
    }
  }

  /**
   * Generate a public sharing URL for filtered data
   */
  async generatePublicUrl(filters: ExportFilters, expiresIn: number = 24): Promise<string> {
    // Create a temporary export
    const exportOptions: ExportOptions = {
      format: 'json',
      filters,
      filename: `public-${Date.now()}`
    };

    const filePath = await this.exportData(exportOptions);
    
    // In a real implementation, you would:
    // 1. Store the file in a public location (S3, etc.)
    // 2. Generate a signed URL with expiration
    // 3. Return the public URL
    
    // For now, return a placeholder URL
    const publicUrl = `${process.env.PUBLIC_URL || 'http://localhost:3001'}/exports/${path.basename(filePath)}`;
    
    // Schedule cleanup after expiration
    setTimeout(async () => {
      try {
        await fs.unlink(filePath);
        logger.info(`Cleaned up expired public export: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to cleanup expired export: ${error}`);
      }
    }, expiresIn * 60 * 60 * 1000);

    return publicUrl;
  }

  // Helper methods for filtering data

  private async getFilteredNodes(filters: ExportFilters) {
    const where: any = {};
    
    if (filters.networkId) where.networkId = filters.networkId;
    if (filters.nodeIds?.length) where.id = { in: filters.nodeIds };
    if (filters.startDate || filters.endDate) {
      where.lastSeen = {};
      if (filters.startDate) where.lastSeen.gte = filters.startDate;
      if (filters.endDate) where.lastSeen.lte = filters.endDate;
    }

    return this.nodeRepository.findMany({ where });
  }

  private async getFilteredPositions(filters: ExportFilters) {
    const where: any = {};
    
    if (filters.nodeIds?.length) where.nodeId = { in: filters.nodeIds };
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.positionRepository.findMany({ where });
  }

  private async getFilteredTelemetry(filters: ExportFilters) {
    const where: any = {};
    
    if (filters.nodeIds?.length) where.nodeId = { in: filters.nodeIds };
    if (filters.telemetryTypes?.length) where.type = { in: filters.telemetryTypes };
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.telemetryRepository.findMany({ where });
  }

  private async getFilteredMessages(filters: ExportFilters) {
    const where: any = {};
    
    if (filters.nodeIds?.length) {
      where.OR = [
        { fromNodeId: { in: filters.nodeIds } },
        { toNodeId: { in: filters.nodeIds } }
      ];
    }
    if (filters.messageTypes?.length) where.type = { in: filters.messageTypes };
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.messageRepository.findMany({ where });
  }
}