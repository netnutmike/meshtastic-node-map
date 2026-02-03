/**
 * Protobuf Decoder Service for Meshtastic Messages
 * Decodes binary protobuf messages from Meshtastic MQTT brokers using protobufjs
 */

import * as protobuf from 'protobufjs';
import { logger } from '../utils/logger';
import {
  MessageType,
  MessagePriority,
  TelemetryType,
  NodeRole,
  PositionSource,
  CreateNodeInput,
  CreatePositionInput,
  CreateTelemetryInput,
  CreateMessageInput,
  UpdateNodeInput
} from '../types/database';
import { ParsedMeshtasticData } from './mqtt.service';
import { encryptionService } from './encryption.service';

export class ProtobufDecoderService {
  private root: protobuf.Root | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized && this.root) {
      return;
    }

    try {
      logger.info('Initializing protobuf decoder with inline definitions...');
      
      // Create a root namespace
      this.root = new protobuf.Root();
      
      // Define the ServiceEnvelope message inline
      const ServiceEnvelope = new protobuf.Type('ServiceEnvelope')
        .add(new protobuf.Field('packet', 1, 'MeshPacket'))
        .add(new protobuf.Field('channelId', 2, 'string'))
        .add(new protobuf.Field('gatewayId', 3, 'string'));
      
      // Define MeshPacket
      const MeshPacket = new protobuf.Type('MeshPacket')
        .add(new protobuf.Field('from', 1, 'fixed32'))
        .add(new protobuf.Field('to', 2, 'fixed32'))
        .add(new protobuf.Field('channel', 3, 'uint32'))
        .add(new protobuf.Field('decoded', 4, 'Data'))
        .add(new protobuf.Field('encrypted', 5, 'bytes'))
        .add(new protobuf.Field('id', 6, 'fixed32'))
        .add(new protobuf.Field('rxTime', 7, 'fixed32'))
        .add(new protobuf.Field('rxSnr', 8, 'float'))
        .add(new protobuf.Field('rxRssi', 9, 'sint32'))
        .add(new protobuf.Field('hopLimit', 10, 'uint32'))
        .add(new protobuf.Field('wantAck', 11, 'bool'))
        .add(new protobuf.Field('priority', 12, 'uint32'))
        .add(new protobuf.Field('hopStart', 13, 'uint32'));
      
      // Define Data message
      const Data = new protobuf.Type('Data')
        .add(new protobuf.Field('portnum', 1, 'uint32'))
        .add(new protobuf.Field('payload', 2, 'bytes'))
        .add(new protobuf.Field('wantResponse', 3, 'bool'))
        .add(new protobuf.Field('dest', 4, 'fixed32'))
        .add(new protobuf.Field('source', 5, 'fixed32'))
        .add(new protobuf.Field('requestId', 6, 'fixed32'))
        .add(new protobuf.Field('replyId', 7, 'fixed32'))
        .add(new protobuf.Field('emoji', 8, 'fixed32'));
      
      // Define User message for NODEINFO_APP
      const User = new protobuf.Type('User')
        .add(new protobuf.Field('id', 1, 'string'))
        .add(new protobuf.Field('longName', 2, 'string'))
        .add(new protobuf.Field('shortName', 3, 'string'))
        .add(new protobuf.Field('macaddr', 4, 'bytes'))
        .add(new protobuf.Field('hwModel', 5, 'uint32'))
        .add(new protobuf.Field('isLicensed', 6, 'bool'))
        .add(new protobuf.Field('role', 7, 'uint32'));
      
      // Define Position message for POSITION_APP
      const Position = new protobuf.Type('Position')
        .add(new protobuf.Field('latitudeI', 1, 'sfixed32'))
        .add(new protobuf.Field('longitudeI', 2, 'sfixed32'))
        .add(new protobuf.Field('altitude', 3, 'sint32'))
        .add(new protobuf.Field('time', 4, 'fixed32'))
        .add(new protobuf.Field('locationSource', 5, 'uint32'))
        .add(new protobuf.Field('altitudeSource', 6, 'uint32'))
        .add(new protobuf.Field('timestamp', 7, 'fixed32'))
        .add(new protobuf.Field('timestampMillisAdjust', 8, 'sint32'))
        .add(new protobuf.Field('altitudeHae', 9, 'sint32'))
        .add(new protobuf.Field('altitudeGeoidalSeparation', 10, 'sint32'))
        .add(new protobuf.Field('PDOP', 11, 'uint32'))
        .add(new protobuf.Field('HDOP', 12, 'uint32'))
        .add(new protobuf.Field('VDOP', 13, 'uint32'))
        .add(new protobuf.Field('gpsAccuracy', 14, 'uint32'))
        .add(new protobuf.Field('groundSpeed', 15, 'uint32'))
        .add(new protobuf.Field('groundTrack', 16, 'uint32'))
        .add(new protobuf.Field('fixQuality', 17, 'uint32'))
        .add(new protobuf.Field('fixType', 18, 'uint32'))
        .add(new protobuf.Field('satsInView', 19, 'uint32'))
        .add(new protobuf.Field('sensorId', 20, 'uint32'))
        .add(new protobuf.Field('nextUpdate', 21, 'uint32'))
        .add(new protobuf.Field('seqNumber', 22, 'uint32'))
        .add(new protobuf.Field('precisionBits', 23, 'uint32'));
      
      // Define Telemetry message
      const Telemetry = new protobuf.Type('Telemetry')
        .add(new protobuf.Field('time', 1, 'fixed32'))
        .add(new protobuf.Field('deviceMetrics', 2, 'DeviceMetrics'))
        .add(new protobuf.Field('environmentMetrics', 3, 'EnvironmentMetrics'))
        .add(new protobuf.Field('airQualityMetrics', 4, 'AirQualityMetrics'))
        .add(new protobuf.Field('powerMetrics', 5, 'PowerMetrics'));
      
      const DeviceMetrics = new protobuf.Type('DeviceMetrics')
        .add(new protobuf.Field('batteryLevel', 1, 'uint32'))
        .add(new protobuf.Field('voltage', 2, 'float'))
        .add(new protobuf.Field('channelUtilization', 3, 'float'))
        .add(new protobuf.Field('airUtilTx', 4, 'float'))
        .add(new protobuf.Field('uptimeSeconds', 5, 'uint32'));
      
      const EnvironmentMetrics = new protobuf.Type('EnvironmentMetrics')
        .add(new protobuf.Field('temperature', 1, 'float'))
        .add(new protobuf.Field('relativeHumidity', 2, 'float'))
        .add(new protobuf.Field('barometricPressure', 3, 'float'))
        .add(new protobuf.Field('gasResistance', 4, 'float'))
        .add(new protobuf.Field('voltage', 5, 'float'))
        .add(new protobuf.Field('current', 6, 'float'))
        .add(new protobuf.Field('iaq', 7, 'uint32'));
      
      const AirQualityMetrics = new protobuf.Type('AirQualityMetrics')
        .add(new protobuf.Field('pm10Standard', 1, 'uint32'))
        .add(new protobuf.Field('pm25Standard', 2, 'uint32'))
        .add(new protobuf.Field('pm100Standard', 3, 'uint32'));
      
      const PowerMetrics = new protobuf.Type('PowerMetrics')
        .add(new protobuf.Field('ch1Voltage', 1, 'float'))
        .add(new protobuf.Field('ch1Current', 2, 'float'))
        .add(new protobuf.Field('ch2Voltage', 3, 'float'))
        .add(new protobuf.Field('ch2Current', 4, 'float'))
        .add(new protobuf.Field('ch3Voltage', 5, 'float'))
        .add(new protobuf.Field('ch3Current', 6, 'float'));
      
      // Define NeighborInfo message for NEIGHBORINFO_APP
      const NeighborInfo = new protobuf.Type('NeighborInfo')
        .add(new protobuf.Field('nodeId', 1, 'fixed32'))
        .add(new protobuf.Field('nodeBroadcastIntervalSecs', 2, 'uint32'))
        .add(new protobuf.Field('neighbors', 3, 'Neighbor', 'repeated'));
      
      const Neighbor = new protobuf.Type('Neighbor')
        .add(new protobuf.Field('nodeId', 1, 'fixed32'))
        .add(new protobuf.Field('snr', 2, 'float'))
        .add(new protobuf.Field('lastRxTime', 3, 'fixed32'))
        .add(new protobuf.Field('nodeIdStr', 4, 'string'));
      
      // Add all types to root
      this.root.add(ServiceEnvelope);
      this.root.add(MeshPacket);
      this.root.add(Data);
      this.root.add(User);
      this.root.add(Position);
      this.root.add(Telemetry);
      this.root.add(DeviceMetrics);
      this.root.add(EnvironmentMetrics);
      this.root.add(AirQualityMetrics);
      this.root.add(PowerMetrics);
      this.root.add(NeighborInfo);
      this.root.add(Neighbor);
      
      this.initialized = true;
      logger.info('Protobuf decoder initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize protobuf decoder:', error);
      throw error;
    }
  }

  /**
   * Decode a protobuf ServiceEnvelope or MeshPacket from binary data
   */
  async decodeServiceEnvelope(buffer: Buffer): Promise<any | null> {
    try {
      await this.initialize();
      
      if (!this.root) {
        throw new Error('Protobuf root not initialized');
      }
      
      // Try to parse as ServiceEnvelope first
      try {
        const ServiceEnvelope = this.root.lookupType('ServiceEnvelope');
        const message = ServiceEnvelope.decode(buffer);
        const object = ServiceEnvelope.toObject(message, {
          longs: Number,
          enums: Number,
          bytes: Buffer,
          defaults: true
        });
        
        // Check if envelope has a packet
        if (object.packet) {
          logger.debug('Successfully decoded as ServiceEnvelope with packet');
          return object;
        }
        
        logger.debug('ServiceEnvelope has no packet field, trying direct MeshPacket parse');
      } catch (envelopeError) {
        logger.debug('Failed to parse as ServiceEnvelope, trying direct MeshPacket');
      }
      
      // If ServiceEnvelope didn't work, try parsing directly as MeshPacket
      try {
        const MeshPacket = this.root.lookupType('MeshPacket');
        const message = MeshPacket.decode(buffer);
        const packet = MeshPacket.toObject(message, {
          longs: Number,
          enums: Number,
          bytes: Buffer,
          defaults: true
        });
        
        logger.debug('Successfully decoded as direct MeshPacket');
        // Wrap in envelope-like structure for consistent handling
        return { packet };
      } catch (packetError) {
        logger.error('Failed to parse as both ServiceEnvelope and MeshPacket');
        logger.error(`Payload length: ${buffer.length} bytes`);
        logger.error(`Payload (first 100 bytes hex): ${buffer.slice(0, Math.min(100, buffer.length)).toString('hex')}`);
        return null;
      }
    } catch (error) {
      logger.error('Failed to decode message:', error);
      return null;
    }
  }

  /**
   * Parse a ServiceEnvelope into our database format
   */
  parseServiceEnvelope(envelope: any, channelName?: string): ParsedMeshtasticData | null {
    try {
      if (!envelope.packet) {
        logger.debug('ServiceEnvelope has no packet');
        return null;
      }

      const packet = envelope.packet;
      const fromNodeId = this.formatNodeId(packet.from);

      const result: ParsedMeshtasticData = { nodeId: fromNodeId };

      // Track if the packet was originally encrypted
      const wasEncrypted = !!(packet.encrypted && packet.encrypted.length > 0);

      // Check if the packet is encrypted
      if (wasEncrypted) {
        logger.info(`Packet from ${fromNodeId} is encrypted on channel: ${channelName || 'unknown'}, packet ID: ${packet.id}`);
        
        // Try to match channel name to get the correct key
        let channelIndex = packet.channel || 0;
        if (channelName) {
          const namedChannelIndex = encryptionService.getChannelIndex(channelName);
          if (namedChannelIndex !== undefined) {
            channelIndex = namedChannelIndex;
            logger.debug(`Matched channel name "${channelName}" to index ${channelIndex}`);
          } else {
            logger.info(`No encryption key configured for channel "${channelName}", skipping encrypted packet from ${fromNodeId}`);
            return null;
          }
        }
        
        // Check if we have a key for this channel
        if (!encryptionService.hasKey(channelIndex)) {
          logger.info(`No encryption key available for channel index ${channelIndex}, skipping encrypted packet from ${fromNodeId}`);
          return null;
        }
        
        // Try to decrypt the payload
        const decrypted = encryptionService.decrypt(
          packet.encrypted,
          packet.id || 0,
          packet.from || 0,
          channelIndex
        );
        
        if (decrypted) {
          // Parse the decrypted Data message
          try {
            if (!this.root) {
              throw new Error('Protobuf root not initialized');
            }
            
            logger.debug(`Attempting to decode decrypted payload as Data message (${decrypted.length} bytes)`);
            logger.debug(`First 32 bytes of decrypted data: ${decrypted.slice(0, 32).toString('hex')}`);
            
            const Data = this.root.lookupType('Data');
            const dataMessage = Data.decode(decrypted);
            const decoded = Data.toObject(dataMessage, {
              longs: Number,
              enums: Number,
              bytes: Buffer,
              defaults: true
            });
            
            // Replace the encrypted field with decoded data
            packet.decoded = decoded;
            packet.encrypted = null;
            
            logger.info(`Successfully decrypted packet from ${fromNodeId} on channel "${channelName}", portnum: ${decoded.portnum}`);
          } catch (error) {
            logger.warn(`Failed to decode decrypted payload from channel "${channelName}" - wrong encryption key or invalid protobuf`);
            logger.debug(`Decode error details: ${error}`);
            // If decryption succeeded but protobuf parsing failed, the key is wrong
            // Don't process this packet
            return null;
          }
        } else {
          logger.warn(`Failed to decrypt packet from channel "${channelName}", skipping`);
          return null;
        }
      }

      // Decode the payload based on portnum
      if (packet.decoded && packet.decoded.payload) {
        const decoded = packet.decoded;
        const portnum = decoded.portnum;
        
        // PortNum enum values from Meshtastic (updated to match official protocol)
        // Source: https://docs.rs/meshtastic/0.1.5/meshtastic/protobufs/enum.PortNum.html
        const PortNum = {
          UNKNOWN_APP: 0,
          TEXT_MESSAGE_APP: 1,
          REMOTE_HARDWARE_APP: 2,
          POSITION_APP: 3,
          NODEINFO_APP: 4,
          ROUTING_APP: 5,
          ADMIN_APP: 6,
          TEXT_MESSAGE_COMPRESSED_APP: 7,
          WAYPOINT_APP: 8,
          AUDIO_APP: 9,
          DETECTION_SENSOR_APP: 10,
          REPLY_APP: 32,
          IP_TUNNEL_APP: 33,
          // Registered 3rd party apps (64-127)
          SERIAL_APP: 64,
          STORE_FORWARD_APP: 65,
          RANGE_TEST_APP: 66,
          TELEMETRY_APP: 67,
          ZPS_APP: 68,
          SIMULATOR_APP: 69,
          TRACEROUTE_APP: 70,
          NEIGHBORINFO_APP: 71,
          // Private app range (256-511)
          PRIVATE_APP: 256,
          ATAK_FORWARDER: 257,
          MAX: 511
        };
        
        // Log all received portnums for debugging
        logger.info(`Received packet with portnum: ${portnum} from node ${fromNodeId} on channel ${channelName || 'unknown'}`);
        
        switch (portnum) {
          case PortNum.NODEINFO_APP:
            result.nodeUpdate = this.parseNodeInfo(fromNodeId, decoded.payload);
            // Also create a message record for NODEINFO
            result.message = this.parseGenericMessage(packet, decoded, MessageType.NODEINFO, wasEncrypted);
            break;

          case PortNum.POSITION_APP:
            result.position = this.parsePosition(fromNodeId, decoded.payload);
            // Also create a message record for POSITION
            result.message = this.parseGenericMessage(packet, decoded, MessageType.POSITION, wasEncrypted);
            break;

          case PortNum.TELEMETRY_APP:
            result.telemetry = this.parseTelemetry(fromNodeId, decoded.payload);
            if (result.telemetry) {
              logger.info(`Parsed ${result.telemetry.type} telemetry for node ${fromNodeId}`);
            } else {
              logger.warn(`Failed to parse telemetry for node ${fromNodeId}`);
            }
            // Also create a message record for TELEMETRY
            result.message = this.parseGenericMessage(packet, decoded, MessageType.TELEMETRY, wasEncrypted);
            break;

          case PortNum.TEXT_MESSAGE_APP:
            result.message = this.parseTextMessage(packet, decoded, wasEncrypted);
            break;

          case PortNum.TRACEROUTE_APP:
            logger.info('Received TRACEROUTE_APP message (portnum 70)');
            // Parse traceroute and extract routing path
            result.message = this.parseTraceroute(packet, decoded, wasEncrypted);
            break;

          case PortNum.NEIGHBORINFO_APP:
            logger.info('Received NEIGHBORINFO_APP message (portnum 71)');
            result.neighbors = this.parseNeighborInfo(fromNodeId, decoded.payload);
            // Also create a message record for NEIGHBORINFO
            result.message = this.parseGenericMessage(packet, decoded, MessageType.NEIGHBOR_INFO_APP, wasEncrypted);
            break;

          default:
            // Handle unregistered 3rd party apps (64-127) and private apps (256-511)
            if (portnum >= 256 && portnum <= 511) {
              logger.info(`Received PRIVATE_APP message (portnum ${portnum}) from ${fromNodeId}`);
              result.message = this.parseGenericMessage(packet, decoded, MessageType.PRIVATE_APP, wasEncrypted);
            } else if (portnum >= 64 && portnum < 256) {
              logger.info(`Received unregistered 3rd party app message (portnum ${portnum}) from ${fromNodeId}`);
              result.message = this.parseGenericMessage(packet, decoded, MessageType.PRIVATE_APP, wasEncrypted);
            } else {
              logger.debug(`Unhandled portnum: ${portnum}`);
            }
        }
      } else {
        logger.info(`Packet from ${fromNodeId} has no decoded data - encrypted: ${wasEncrypted}, has encrypted field: ${!!(packet.encrypted && packet.encrypted.length > 0)}`);
      }

      // Always update node last seen
      const timestamp = packet.rxTime || Math.floor(Date.now() / 1000);
      result.nodeUpdate = {
        ...result.nodeUpdate,
        lastSeen: new Date(timestamp * 1000),
        mqttConnected: true,
        isOnline: true
      };

      return result;
    } catch (error) {
      logger.error('Error parsing ServiceEnvelope:', error);
      return null;
    }
  }

  /**
   * Parse NodeInfo from decoded data
   */
  private parseNodeInfo(nodeId: string, payload: Buffer): CreateNodeInput | UpdateNodeInput {
    try {
      if (!this.root) {
        throw new Error('Protobuf root not initialized');
      }
      
      const User = this.root.lookupType('User');
      const message = User.decode(payload);
      const user = User.toObject(message, {
        longs: Number,
        enums: Number,
        bytes: Buffer,
        defaults: true
      });
      
      const hexId = nodeId.replace('!', '');

      return {
        nodeId,
        hexId,
        shortName: user.shortName || undefined,
        longName: user.longName || undefined,
        hardwareModel: user.hwModel ? `HW_${user.hwModel}` : undefined,
        role: user.role ? this.mapRole(user.role) : NodeRole.CLIENT,
        networkId: 'default' // Will be set by the caller
      };
    } catch (error) {
      logger.error('Error parsing NodeInfo:', error);
      return {
        nodeId,
        hexId: nodeId.replace('!', ''),
        networkId: 'default'
      };
    }
  }

  /**
   * Parse Position from decoded data
   */
  private parsePosition(nodeId: string, payload: Buffer): CreatePositionInput | undefined {
    try {
      if (!this.root) {
        throw new Error('Protobuf root not initialized');
      }
      
      const Position = this.root.lookupType('Position');
      const message = Position.decode(payload);
      const position = Position.toObject(message, {
        longs: Number,
        enums: Number,
        bytes: Buffer,
        defaults: true
      });

      // Meshtastic uses integer lat/lon that need to be divided by 1e7
      const latitude = position.latitudeI ? position.latitudeI / 1e7 : 0;
      const longitude = position.longitudeI ? position.longitudeI / 1e7 : 0;

      // Skip invalid positions
      if (latitude === 0 && longitude === 0) {
        return undefined;
      }

      const timestamp = position.time || Math.floor(Date.now() / 1000);

      return {
        nodeId,
        latitude,
        longitude,
        altitude: position.altitude || undefined,
        precision: position.precisionBits || undefined,
        timestamp: new Date(timestamp * 1000),
        source: PositionSource.GPS
      };
    } catch (error) {
      logger.error('Error parsing Position:', error);
      return undefined;
    }
  }

  /**
   * Parse Telemetry from decoded data
   */
  private parseTelemetry(nodeId: string, payload: Buffer): CreateTelemetryInput | undefined {
    try {
      if (!this.root) {
        throw new Error('Protobuf root not initialized');
      }
      
      const Telemetry = this.root.lookupType('Telemetry');
      const message = Telemetry.decode(payload);
      const telemetry = Telemetry.toObject(message, {
        longs: Number,
        enums: Number,
        bytes: Buffer,
        defaults: true
      });
      
      const timestamp = telemetry.time || Math.floor(Date.now() / 1000);

      if (telemetry.deviceMetrics) {
        const metrics = telemetry.deviceMetrics;
        return {
          nodeId,
          type: TelemetryType.DEVICE_METRICS,
          timestamp: new Date(timestamp * 1000),
          data: {
            batteryLevel: metrics.batteryLevel !== undefined && metrics.batteryLevel !== null ? metrics.batteryLevel : undefined,
            voltage: metrics.voltage !== undefined && metrics.voltage !== null ? metrics.voltage : undefined,
            channelUtilization: metrics.channelUtilization !== undefined && metrics.channelUtilization !== null ? metrics.channelUtilization : undefined,
            airUtilTx: metrics.airUtilTx !== undefined && metrics.airUtilTx !== null ? metrics.airUtilTx : undefined,
            uptimeSeconds: metrics.uptimeSeconds !== undefined && metrics.uptimeSeconds !== null ? metrics.uptimeSeconds : undefined
          }
        };
      }

      if (telemetry.environmentMetrics) {
        const metrics = telemetry.environmentMetrics;
        return {
          nodeId,
          type: TelemetryType.ENVIRONMENT_METRICS,
          timestamp: new Date(timestamp * 1000),
          data: {
            temperature: metrics.temperature !== undefined && metrics.temperature !== null ? metrics.temperature : undefined,
            humidity: metrics.relativeHumidity !== undefined && metrics.relativeHumidity !== null ? metrics.relativeHumidity : undefined,
            pressure: metrics.barometricPressure !== undefined && metrics.barometricPressure !== null ? metrics.barometricPressure : undefined,
            gasResistance: metrics.gasResistance !== undefined && metrics.gasResistance !== null ? metrics.gasResistance : undefined,
            iaq: metrics.iaq !== undefined && metrics.iaq !== null ? metrics.iaq : undefined
          }
        };
      }

      if (telemetry.powerMetrics) {
        const metrics = telemetry.powerMetrics;
        return {
          nodeId,
          type: TelemetryType.POWER_METRICS,
          timestamp: new Date(timestamp * 1000),
          data: {
            ch1Voltage: metrics.ch1Voltage || undefined,
            ch1Current: metrics.ch1Current || undefined,
            ch2Voltage: metrics.ch2Voltage || undefined,
            ch2Current: metrics.ch2Current || undefined,
            ch3Voltage: metrics.ch3Voltage || undefined,
            ch3Current: metrics.ch3Current || undefined
          }
        };
      }

      return undefined;
    } catch (error) {
      logger.error('Error parsing Telemetry:', error);
      return undefined;
    }
  }

  /**
   * Parse NeighborInfo from decoded data
   */
  private parseNeighborInfo(nodeId: string, payload: Buffer): Array<{ neighborId: string; snr?: number; lastHeard: Date }> | undefined {
    try {
      if (!this.root) {
        throw new Error('Protobuf root not initialized');
      }
      
      const NeighborInfo = this.root.lookupType('NeighborInfo');
      const message = NeighborInfo.decode(payload);
      const neighborInfo = NeighborInfo.toObject(message, {
        longs: Number,
        enums: Number,
        bytes: Buffer,
        defaults: true
      });
      
      logger.debug(`Parsing neighbor info for node ${nodeId}, found ${neighborInfo.neighbors?.length || 0} neighbors`);

      if (!neighborInfo.neighbors || neighborInfo.neighbors.length === 0) {
        return undefined;
      }

      const neighbors = neighborInfo.neighbors.map((neighbor: any) => {
        // Use nodeIdStr if available, otherwise format the numeric nodeId
        const neighborId = neighbor.nodeIdStr || this.formatNodeId(neighbor.nodeId);
        const lastHeard = neighbor.lastRxTime 
          ? new Date(neighbor.lastRxTime * 1000) 
          : new Date();
        
        logger.debug(`  Neighbor: ${neighborId}, SNR: ${neighbor.snr}, Last heard: ${lastHeard.toISOString()}`);
        
        return {
          neighborId,
          snr: neighbor.snr || undefined,
          lastHeard
        };
      });

      return neighbors;
    } catch (error) {
      logger.error('Error parsing NeighborInfo:', error);
      return undefined;
    }
  }

  /**
   * Parse Traceroute message and extract routing path
   */
  private parseTraceroute(packet: any, decoded: any, wasEncrypted: boolean): CreateMessageInput {
    try {
      // Extract route from the traceroute payload
      let routingPath: string[] = [];
      
      const fromNodeId = this.formatNodeId(packet.from);
      const toNodeId = packet.to ? this.formatNodeId(packet.to) : undefined;
      
      // First, try to get route from packet.data (RouteDiscovery message)
      if (packet.data && packet.data.route && Array.isArray(packet.data.route)) {
        // Build complete path: from → route → to
        routingPath.push(fromNodeId);
        routingPath.push(...packet.data.route.map((nodeId: number) => this.formatNodeId(nodeId)));
        if (toNodeId) {
          routingPath.push(toNodeId);
        }
        logger.debug(`Parsed traceroute from packet.data.route with ${routingPath.length} nodes in path: ${routingPath.join(' → ')}`);
      }
      // Fallback: try to get route from packet.route metadata
      else if (packet.route && Array.isArray(packet.route)) {
        // Build complete path: from → route → to
        routingPath.push(fromNodeId);
        routingPath.push(...packet.route.map((nodeId: number) => this.formatNodeId(nodeId)));
        if (toNodeId) {
          routingPath.push(toNodeId);
        }
        logger.debug(`Parsed traceroute from packet.route with ${routingPath.length} nodes in path: ${routingPath.join(' → ')}`);
      }
      // If no route found, just use from and to
      else {
        routingPath.push(fromNodeId);
        if (toNodeId) {
          routingPath.push(toNodeId);
        }
        logger.warn(`No route data found in traceroute packet, using only from/to nodes: ${routingPath.join(' → ')}`);
      }
      
      const timestamp = packet.rxTime || Math.floor(Date.now() / 1000);
      
      return {
        fromNodeId,
        toNodeId,
        type: MessageType.TRACEROUTE_APP,
        content: {
          route: routingPath,
          hopCount: routingPath.length
        },
        encrypted: wasEncrypted,
        hopLimit: packet.hopLimit,
        hopStart: packet.hopStart,
        wantAck: packet.wantAck || false,
        priority: MessagePriority.DEFAULT,
        channel: packet.channel || 0,
        timestamp: new Date(timestamp * 1000),
        routingPath: routingPath,
        rssi: packet.rxRssi || undefined,
        snr: packet.rxSnr || undefined
      };
    } catch (error) {
      logger.error('Error parsing Traceroute:', error);
      // Return a basic message even if parsing fails
      const timestamp = packet.rxTime || Math.floor(Date.now() / 1000);
      const fromNodeId = this.formatNodeId(packet.from);
      const toNodeId = packet.to ? this.formatNodeId(packet.to) : undefined;
      
      return {
        fromNodeId,
        toNodeId,
        type: MessageType.TRACEROUTE_APP,
        content: { error: 'Failed to parse traceroute payload' },
        encrypted: wasEncrypted,
        hopLimit: packet.hopLimit,
        hopStart: packet.hopStart,
        wantAck: packet.wantAck || false,
        priority: MessagePriority.DEFAULT,
        channel: packet.channel || 0,
        timestamp: new Date(timestamp * 1000),
        routingPath: [],
        rssi: packet.rxRssi || undefined,
        snr: packet.rxSnr || undefined
      };
    }
  }

  /**
   * Parse Text Message from packet and decoded data
   */
  private parseTextMessage(packet: any, decoded: any, wasEncrypted: boolean = false): CreateMessageInput {
    const fromNodeId = this.formatNodeId(packet.from);
    const toNodeId = packet.to ? this.formatNodeId(packet.to) : undefined;
    const timestamp = packet.rxTime || Math.floor(Date.now() / 1000);

    let content: any;
    try {
      content = decoded.payload.toString('utf-8');
    } catch (error) {
      content = decoded.payload;
    }

    return {
      messageId: packet.id?.toString(),
      fromNodeId,
      toNodeId,
      type: MessageType.TEXT,
      content,
      encrypted: wasEncrypted,
      hopLimit: packet.hopLimit || undefined,
      hopStart: packet.hopStart || undefined,
      wantAck: packet.wantAck || false,
      priority: MessagePriority.DEFAULT,
      channel: packet.channel || 0,
      timestamp: new Date(timestamp * 1000),
      routingPath: [],
      rssi: packet.rxRssi || undefined,
      snr: packet.rxSnr || undefined
    };
  }

  /**
   * Parse Generic Message from packet and decoded data (for NODEINFO, POSITION, TELEMETRY, etc.)
   */
  private parseGenericMessage(packet: any, decoded: any, messageType: MessageType, wasEncrypted: boolean = false): CreateMessageInput {
    const fromNodeId = this.formatNodeId(packet.from);
    const toNodeId = packet.to ? this.formatNodeId(packet.to) : undefined;
    const timestamp = packet.rxTime || Math.floor(Date.now() / 1000);

    // Store the raw payload as content
    let content: any;
    try {
      // For non-text messages, store a JSON representation of the payload
      content = { portnum: decoded.portnum, payloadSize: decoded.payload?.length || 0 };
    } catch (error) {
      content = {};
    }

    return {
      messageId: packet.id?.toString(),
      fromNodeId,
      toNodeId,
      type: messageType,
      content,
      encrypted: wasEncrypted,
      hopLimit: packet.hopLimit || undefined,
      hopStart: packet.hopStart || undefined,
      wantAck: packet.wantAck || false,
      priority: MessagePriority.DEFAULT,
      channel: packet.channel || 0,
      timestamp: new Date(timestamp * 1000),
      routingPath: [],
      rssi: packet.rxRssi || undefined,
      snr: packet.rxSnr || undefined
    };
  }

  /**
   * Format node ID to standard format (!xxxxxxxx)
   */
  private formatNodeId(nodeNum: number): string {
    return `!${nodeNum.toString(16).padStart(8, '0')}`;
  }

  /**
   * Map protobuf role to database role
   */
  private mapRole(role: number): NodeRole {
    const roleMap: { [key: number]: NodeRole } = {
      0: NodeRole.CLIENT,
      1: NodeRole.CLIENT_MUTE,
      2: NodeRole.ROUTER,
      3: NodeRole.ROUTER_CLIENT,
      4: NodeRole.REPEATER,
      5: NodeRole.TRACKER,
      6: NodeRole.SENSOR,
      7: NodeRole.TAK,
      8: NodeRole.CLIENT_HIDDEN,
      9: NodeRole.LOST_AND_FOUND,
      10: NodeRole.TAK_TRACKER
    };

    return roleMap[role] || NodeRole.CLIENT;
  }
}

// Export singleton instance
export const protobufDecoder = new ProtobufDecoderService();
