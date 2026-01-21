/**
 * MQTT Service for Meshtastic Node Mapper
 * Handles MQTT client connection, message parsing, and real-time data streaming
 * Requirements: 13.1, 13.5
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { EventEmitter } from 'events';
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

// MQTT Message interfaces
export interface MeshtasticMQTTMessage {
  id?: string;
  from: string;
  to?: string;
  type: MessageType;
  payload: any;
  encrypted: boolean;
  hopLimit?: number;
  hopStart?: number;
  wantAck: boolean;
  priority: MessagePriority;
  channel: number;
  timestamp: number;
  routingPath?: string[];
  rssi?: number;
  snr?: number;
}

export interface MQTTConnectionConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  clientId?: string;
  topics: string[];
  reconnectPeriod?: number;
  connectTimeout?: number;
  keepalive?: number;
}

export interface ParsedMeshtasticData {
  nodeUpdate?: CreateNodeInput | UpdateNodeInput;
  position?: CreatePositionInput;
  telemetry?: CreateTelemetryInput;
  message?: CreateMessageInput;
  nodeId: string;
}

export class MQTTService extends EventEmitter {
  private client: MqttClient | null = null;
  private config: MQTTConnectionConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds

  constructor(config: MQTTConnectionConfig) {
    super();
    this.config = {
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      keepalive: 60,
      ...config
    };
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    try {
      const options: IClientOptions = {
        clientId: this.config.clientId || `meshtastic-mapper-${Date.now()}`,
        username: this.config.username,
        password: this.config.password,
        reconnectPeriod: this.config.reconnectPeriod,
        connectTimeout: this.config.connectTimeout,
        keepalive: this.config.keepalive,
        clean: true,
        rejectUnauthorized: false // For self-signed certificates
      };

      logger.info(`Connecting to MQTT broker: ${this.config.brokerUrl}`);
      
      this.client = mqtt.connect(this.config.brokerUrl, options);

      return new Promise((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Failed to create MQTT client'));
          return;
        }

        this.client.on('connect', () => {
          logger.info('Connected to MQTT broker');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.subscribeToTopics();
          this.emit('connected');
          resolve();
        });

        this.client.on('error', (error) => {
          logger.error('MQTT connection error:', error);
          this.isConnected = false;
          this.emit('error', error);
          reject(error);
        });

        this.client.on('close', () => {
          logger.warn('MQTT connection closed');
          this.isConnected = false;
          this.emit('disconnected');
          this.handleReconnection();
        });

        this.client.on('offline', () => {
          logger.warn('MQTT client offline');
          this.isConnected = false;
          this.emit('offline');
        });

        this.client.on('message', (topic, message) => {
          this.handleMessage(topic, message);
        });
      });
    } catch (error) {
      logger.error('Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      logger.info('Disconnecting from MQTT broker');
      return new Promise((resolve) => {
        this.client!.end(false, {}, () => {
          this.isConnected = false;
          this.client = null;
          logger.info('Disconnected from MQTT broker');
          resolve();
        });
      });
    }
  }

  /**
   * Subscribe to configured topics
   */
  private subscribeToTopics(): void {
    if (!this.client || !this.isConnected) {
      logger.warn('Cannot subscribe: MQTT client not connected');
      return;
    }

    this.config.topics.forEach(topic => {
      this.client!.subscribe(topic, { qos: 0 }, (error) => {
        if (error) {
          logger.error(`Failed to subscribe to topic ${topic}:`, error);
        } else {
          logger.info(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      // Try to detect message format: protobuf or JSON
      const isProtobuf = this.isProtobufMessage(message);

      if (isProtobuf) {
        // Handle protobuf message
        logger.debug(`Received protobuf message on topic ${topic}`);
        const parsedData = await this.parseProtobufMessage(message, topic);
        
        if (parsedData) {
          this.emit('data', parsedData);
          logger.debug('Parsed protobuf Meshtastic data:', parsedData);
          
          // Emit parsed data for monitoring (after decryption/decoding)
          if (parsedData.message) {
            const monitorPayload = JSON.stringify({
              from: parsedData.nodeId,
              type: parsedData.message.type,
              encrypted: parsedData.message.encrypted,
              decryptionFailed: false,
              channel: parsedData.message.channel,
              payload: parsedData.message.content,
              timestamp: Math.floor(parsedData.message.timestamp.getTime() / 1000)
            });
            this.emit('rawMessage', topic, monitorPayload, { qos: 0, retain: false });
          } else {
            // For non-message packets (nodeinfo, position, telemetry), create a summary
            // Check if there's a message object that has the encrypted flag
            const wasEncrypted = (parsedData.message as CreateMessageInput | undefined)?.encrypted || false;
            const monitorPayload = JSON.stringify({
              from: parsedData.nodeId,
              type: parsedData.position ? 'POSITION' : parsedData.telemetry ? 'TELEMETRY' : parsedData.nodeUpdate ? 'NODEINFO' : 'UNKNOWN',
              encrypted: wasEncrypted,
              decryptionFailed: false,
              timestamp: Math.floor(Date.now() / 1000)
            });
            this.emit('rawMessage', topic, monitorPayload, { qos: 0, retain: false });
          }
        } else {
          // Decryption or parsing failed - emit a failure indicator
          // Extract channel name and node ID from topic for better error reporting
          const topicParts = topic.split('/');
          const eIndex = topicParts.indexOf('e');
          const channelName = eIndex !== -1 && eIndex + 1 < topicParts.length ? topicParts[eIndex + 1] : 'unknown';
          // Node ID is typically the last part of the topic (e.g., !9e75f7d4)
          const nodeId = topicParts[topicParts.length - 1] || 'unknown';
          
          const monitorPayload = JSON.stringify({
            from: nodeId,
            sender: nodeId,
            type: 'ENCRYPTED',
            encrypted: true,
            decryptionFailed: true,
            channel: channelName,
            payload: { error: 'Failed to decrypt or decode message', channelName },
            timestamp: Math.floor(Date.now() / 1000)
          });
          this.emit('rawMessage', topic, monitorPayload, { qos: 0, retain: false });
          logger.debug(`Failed to decrypt/decode protobuf message on channel ${channelName}`);
        }
      } else {
        // Handle JSON message
        const messageStr = message.toString();
        
        // Skip non-JSON messages (like bridge status messages "online", "offline")
        if (!messageStr.trim().startsWith('{')) {
          logger.debug(`Skipping non-JSON message on topic ${topic}: ${messageStr.substring(0, 50)}`);
          return;
        }

        logger.debug(`Received JSON message on topic ${topic}:`, messageStr.substring(0, 200));

        // Emit raw message for monitoring (JSON messages)
        this.emit('rawMessage', topic, messageStr, { qos: 0, retain: false });

        // Parse the JSON message
        const parsedData = this.parseMessage(topic, messageStr);
        
        if (parsedData) {
          // Add topic to message if it exists
          if (parsedData.message) {
            parsedData.message.topic = topic;
          }
          this.emit('data', parsedData);
          logger.debug('Parsed JSON Meshtastic data:', parsedData);
        }
      }
    } catch (error) {
      logger.error('Error handling MQTT message:', error);
      this.emit('parseError', { topic, message: message.toString(), error });
    }
  }

  /**
   * Check if a buffer is likely a protobuf message
   */
  private isProtobufMessage(buffer: Buffer): boolean {
    // Protobuf messages are binary and typically start with field tags
    // Check if it's not valid UTF-8 text (which would indicate JSON)
    try {
      const str = buffer.toString('utf-8');
      // If it starts with { or [, it's likely JSON
      if (str.trim().startsWith('{') || str.trim().startsWith('[')) {
        return false;
      }
      // If it contains mostly printable ASCII, it's likely not protobuf
      const printableRatio = str.split('').filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).length / str.length;
      return printableRatio < 0.7; // If less than 70% printable, likely binary
    } catch {
      return true; // If UTF-8 decode fails, it's binary
    }
  }

  /**
   * Parse protobuf message using the protobuf decoder service
   */
  private async parseProtobufMessage(buffer: Buffer, topic: string): Promise<ParsedMeshtasticData | null> {
    try {
      // Import the protobuf decoder (lazy load to avoid circular dependencies)
      const { protobufDecoder } = require('./protobuf-decoder.service');
      
      // Extract channel name from topic (e.g., msh/US/DMV/2/e/LongFast/!xxxxx)
      // Topic format: msh/<region>/<area>/<hop_limit>/e/<channel_name>/<node_id>
      // But some topics have more parts: msh/US/VA/VPM/2/e/LongFast/!xxxxx
      let channelName: string | undefined;
      const topicParts = topic.split('/');
      
      // Find the 'e' marker and get the next part as channel name
      const eIndex = topicParts.indexOf('e');
      if (eIndex !== -1 && eIndex + 1 < topicParts.length) {
        channelName = topicParts[eIndex + 1];
      }
      
      // Decode the ServiceEnvelope
      const envelope = await protobufDecoder.decodeServiceEnvelope(buffer);
      if (!envelope) {
        return null;
      }

      // Parse the envelope into our database format
      const parsedData = protobufDecoder.parseServiceEnvelope(envelope, channelName);
      
      // Add topic to message if it exists
      if (parsedData && parsedData.message) {
        parsedData.message.topic = topic;
      }
      
      return parsedData;
    } catch (error) {
      logger.error('Error parsing protobuf message:', error);
      return null;
    }
  }

  /**
   * Parse MQTT message into Meshtastic data structures
   */
  parseMessage(topic: string, messageStr: string): ParsedMeshtasticData | null {
    try {
      // Parse JSON message
      const mqttMessage = this.parseRawMessage(messageStr);
      
      if (!mqttMessage) {
        throw new Error('Failed to parse raw MQTT message');
      }

      const nodeId = this.extractNodeId(mqttMessage.from);
      const result: ParsedMeshtasticData = { nodeId };

      // Extract node information
      if (mqttMessage.payload) {
        // Handle different message types
        switch (mqttMessage.type) {
          case MessageType.NODEINFO:
            result.nodeUpdate = this.parseNodeInfo(nodeId, mqttMessage.payload);
            break;
          
          case MessageType.POSITION:
            result.position = this.parsePosition(nodeId, mqttMessage.payload, mqttMessage.timestamp);
            break;
          
          case MessageType.TELEMETRY:
            result.telemetry = this.parseTelemetry(nodeId, mqttMessage.payload, mqttMessage.timestamp);
            break;
          
          case MessageType.TEXT:
            result.message = this.parseTextMessage(mqttMessage);
            break;
          
          default:
            // For other message types, just store as generic message
            result.message = this.parseGenericMessage(mqttMessage);
            break;
        }
      }

      // Always update node last seen
      result.nodeUpdate = {
        ...result.nodeUpdate,
        lastSeen: new Date(mqttMessage.timestamp * 1000),
        mqttConnected: true,
        isOnline: true
      };

      return result;
    } catch (error) {
      logger.error('Error parsing message:', error);
      throw new Error(`Failed to parse MQTT message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse raw MQTT message string into MeshtasticMQTTMessage
   * Handles the actual Meshtastic MQTT JSON format from public brokers
   */
  parseRawMessage(messageStr: string): MeshtasticMQTTMessage | null {
    try {
      const parsed = JSON.parse(messageStr);
      
      // Handle the actual Meshtastic MQTT format
      // Example: { "channel": 1, "from": 2224786404, "sender": "!849a248c", "type": "text", "payload": {"text": "..."}, ... }
      
      // Extract node ID - prefer 'sender' field, fallback to 'from' as hex
      let fromNodeId: string;
      if (parsed.sender && typeof parsed.sender === 'string') {
        fromNodeId = parsed.sender.startsWith('!') ? parsed.sender : `!${parsed.sender}`;
      } else if (parsed.from && typeof parsed.from === 'number') {
        // Convert numeric ID to hex format
        fromNodeId = `!${parsed.from.toString(16).padStart(8, '0')}`;
      } else {
        throw new Error('Missing sender/from field');
      }
      
      // Extract 'to' field
      let toNodeId: string | undefined;
      if (parsed.to && typeof parsed.to === 'number') {
        // 4294967295 (0xFFFFFFFF) is broadcast address
        if (parsed.to !== 4294967295) {
          toNodeId = `!${parsed.to.toString(16).padStart(8, '0')}`;
        }
      }
      
      // Validate and normalize message type
      let messageType: MessageType;
      if (parsed.type && typeof parsed.type === 'string') {
        const typeUpper = parsed.type.toUpperCase();
        if (Object.values(MessageType).includes(typeUpper as MessageType)) {
          messageType = typeUpper as MessageType;
        } else {
          // Map common type names
          switch (parsed.type.toLowerCase()) {
            case 'text':
              messageType = MessageType.TEXT;
              break;
            case 'nodeinfo':
            case 'node_info':
              messageType = MessageType.NODEINFO;
              break;
            case 'position':
              messageType = MessageType.POSITION;
              break;
            case 'telemetry':
              messageType = MessageType.TELEMETRY;
              break;
            default:
              messageType = MessageType.TEXT; // Default to TEXT for unknown types
          }
        }
      } else {
        messageType = MessageType.TEXT; // Default to TEXT for unknown types
      }
      
      // Extract channel (default to 0 if not present)
      const channel = typeof parsed.channel === 'number' ? parsed.channel : 0;
      
      // Extract timestamp (use current time if not present)
      const timestamp = typeof parsed.timestamp === 'number' ? parsed.timestamp : Math.floor(Date.now() / 1000);
      
      // Build the normalized message
      return {
        id: parsed.id?.toString(),
        from: fromNodeId,
        to: toNodeId,
        type: messageType,
        payload: parsed.payload || {},
        encrypted: typeof parsed.encrypted === 'boolean' ? parsed.encrypted : false,
        hopLimit: typeof parsed.hops_away === 'number' ? parsed.hops_away : undefined,
        hopStart: typeof parsed.hop_start === 'number' ? parsed.hop_start : undefined,
        wantAck: typeof parsed.want_ack === 'boolean' ? parsed.want_ack : false,
        priority: MessagePriority.DEFAULT, // Not typically in MQTT messages
        channel,
        timestamp,
        routingPath: parsed.routing_path || parsed.routingPath,
        rssi: typeof parsed.rssi === 'number' ? parsed.rssi : undefined,
        snr: typeof parsed.snr === 'number' ? parsed.snr : undefined
      };
    } catch (error) {
      logger.error('Error parsing raw MQTT message:', error);
      return null;
    }
  }

  /**
   * Serialize MeshtasticMQTTMessage to string
   */
  serializeMessage(message: MeshtasticMQTTMessage): string {
    try {
      // Validate message structure
      if (!message.from || typeof message.from !== 'string') {
        throw new Error('Invalid from field');
      }
      
      if (!message.type || !Object.values(MessageType).includes(message.type)) {
        throw new Error('Invalid message type');
      }
      
      // Helper function to clean NaN and undefined values
      const cleanValue = (value: any): any => {
        if (value === undefined) return undefined;
        if (typeof value === 'number' && isNaN(value)) return null;
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            return value.map(cleanValue);
          }
          const cleaned: any = {};
          for (const [key, val] of Object.entries(value)) {
            const cleanedVal = cleanValue(val);
            if (cleanedVal !== undefined) {
              cleaned[key] = cleanedVal;
            }
          }
          return cleaned;
        }
        return value;
      };
      
      // Create serializable object (remove undefined values and convert NaN to null)
      const serializable: any = {
        from: message.from,
        type: message.type,
        payload: cleanValue(message.payload),
        encrypted: message.encrypted,
        wantAck: message.wantAck,
        priority: message.priority,
        channel: message.channel,
        timestamp: message.timestamp
      };
      
      // Add optional fields only if they exist
      if (message.id !== undefined) serializable.id = message.id;
      if (message.to !== undefined) serializable.to = message.to;
      if (message.hopLimit !== undefined) serializable.hopLimit = message.hopLimit;
      if (message.hopStart !== undefined) serializable.hopStart = message.hopStart;
      if (message.routingPath !== undefined) serializable.routingPath = message.routingPath;
      if (message.rssi !== undefined) serializable.rssi = message.rssi;
      if (message.snr !== undefined && !isNaN(message.snr)) serializable.snr = message.snr;
      
      return JSON.stringify(serializable);
    } catch (error) {
      throw new Error(`Failed to serialize MQTT message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract node ID from Meshtastic node identifier
   */
  private extractNodeId(from: string): string {
    // Meshtastic node IDs typically start with '!' followed by hex
    return from.startsWith('!') ? from : `!${from}`;
  }

  /**
   * Parse node info payload
   */
  private parseNodeInfo(nodeId: string, payload: any): CreateNodeInput | UpdateNodeInput {
    const hexId = nodeId.replace('!', '');
    
    return {
      nodeId,
      hexId,
      shortName: payload.shortName,
      longName: payload.longName,
      hardwareModel: payload.hardwareModel,
      firmwareVersion: payload.firmwareVersion,
      role: payload.role || NodeRole.CLIENT
    };
  }

  /**
   * Parse position payload
   */
  private parsePosition(nodeId: string, payload: any, timestamp: number): CreatePositionInput {
    return {
      nodeId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      altitude: payload.altitude,
      precision: payload.precision,
      timestamp: new Date(timestamp * 1000),
      source: payload.source || PositionSource.GPS
    };
  }

  /**
   * Parse telemetry payload
   */
  private parseTelemetry(nodeId: string, payload: any, timestamp: number): CreateTelemetryInput {
    let type: TelemetryType;
    let data: any;

    // Determine telemetry type based on payload content
    if (payload.batteryLevel !== undefined || payload.voltage !== undefined || 
        payload.channelUtilization !== undefined || payload.airUtilTx !== undefined) {
      type = TelemetryType.DEVICE_METRICS;
      data = {
        batteryLevel: payload.batteryLevel,
        voltage: payload.voltage,
        channelUtilization: payload.channelUtilization,
        airUtilTx: payload.airUtilTx,
        uptimeSeconds: payload.uptimeSeconds
      };
    } else if (payload.temperature !== undefined || payload.humidity !== undefined || 
               payload.pressure !== undefined) {
      type = TelemetryType.ENVIRONMENT_METRICS;
      data = {
        temperature: payload.temperature,
        humidity: payload.humidity,
        pressure: payload.pressure,
        gasResistance: payload.gasResistance,
        iaq: payload.iaq
      };
    } else {
      type = TelemetryType.POWER_METRICS;
      data = {
        ch1Voltage: payload.ch1Voltage,
        ch1Current: payload.ch1Current,
        ch2Voltage: payload.ch2Voltage,
        ch2Current: payload.ch2Current,
        ch3Voltage: payload.ch3Voltage,
        ch3Current: payload.ch3Current
      };
    }

    return {
      nodeId,
      type,
      timestamp: new Date(timestamp * 1000),
      data
    };
  }

  /**
   * Parse text message
   */
  private parseTextMessage(mqttMessage: MeshtasticMQTTMessage): CreateMessageInput {
    return {
      messageId: mqttMessage.id,
      fromNodeId: mqttMessage.from,
      toNodeId: mqttMessage.to,
      type: MessageType.TEXT,
      content: mqttMessage.payload,
      encrypted: mqttMessage.encrypted,
      hopLimit: mqttMessage.hopLimit,
      hopStart: mqttMessage.hopStart,
      wantAck: mqttMessage.wantAck,
      priority: mqttMessage.priority,
      channel: mqttMessage.channel,
      timestamp: new Date(mqttMessage.timestamp * 1000),
      routingPath: mqttMessage.routingPath || [],
      rssi: mqttMessage.rssi,
      snr: mqttMessage.snr
    };
  }

  /**
   * Parse generic message
   */
  private parseGenericMessage(mqttMessage: MeshtasticMQTTMessage): CreateMessageInput {
    return {
      messageId: mqttMessage.id,
      fromNodeId: mqttMessage.from,
      toNodeId: mqttMessage.to,
      type: mqttMessage.type,
      content: mqttMessage.payload,
      encrypted: mqttMessage.encrypted,
      hopLimit: mqttMessage.hopLimit,
      hopStart: mqttMessage.hopStart,
      wantAck: mqttMessage.wantAck,
      priority: mqttMessage.priority,
      channel: mqttMessage.channel,
      timestamp: new Date(mqttMessage.timestamp * 1000),
      routingPath: mqttMessage.routingPath || [],
      rssi: mqttMessage.rssi,
      snr: mqttMessage.snr
    };
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. Giving up.');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        logger.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Get connection status
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client?.connected === true;
  }

  /**
   * Get client statistics
   */
  getStats() {
    return {
      connected: this.isClientConnected(),
      reconnectAttempts: this.reconnectAttempts,
      brokerUrl: this.config.brokerUrl,
      topics: this.config.topics
    };
  }
}