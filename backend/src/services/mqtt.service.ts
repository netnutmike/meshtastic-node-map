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
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const messageStr = message.toString();
      logger.debug(`Received message on topic ${topic}:`, messageStr);

      // Emit raw message for monitoring
      this.emit('rawMessage', topic, messageStr, { qos: 0, retain: false });

      // Parse the message based on topic structure
      const parsedData = this.parseMessage(topic, messageStr);
      
      if (parsedData) {
        this.emit('data', parsedData);
        logger.debug('Parsed Meshtastic data:', parsedData);
      }
    } catch (error) {
      logger.error('Error handling MQTT message:', error);
      this.emit('parseError', { topic, message: message.toString(), error });
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
   */
  parseRawMessage(messageStr: string): MeshtasticMQTTMessage | null {
    try {
      const parsed = JSON.parse(messageStr);
      
      // Validate required fields
      if (!parsed.from || typeof parsed.from !== 'string') {
        throw new Error('Invalid from field');
      }
      
      if (!parsed.type || !Object.values(MessageType).includes(parsed.type)) {
        throw new Error('Invalid message type');
      }
      
      if (typeof parsed.encrypted !== 'boolean') {
        throw new Error('Invalid encrypted field');
      }
      
      if (typeof parsed.wantAck !== 'boolean') {
        throw new Error('Invalid wantAck field');
      }
      
      if (!parsed.priority || !Object.values(MessagePriority).includes(parsed.priority)) {
        throw new Error('Invalid priority field');
      }
      
      if (typeof parsed.channel !== 'number' || parsed.channel < 0 || parsed.channel > 7) {
        throw new Error('Invalid channel field');
      }
      
      if (typeof parsed.timestamp !== 'number') {
        throw new Error('Invalid timestamp field');
      }
      
      return {
        id: parsed.id,
        from: parsed.from,
        to: parsed.to,
        type: parsed.type,
        payload: parsed.payload || {},
        encrypted: parsed.encrypted,
        hopLimit: parsed.hopLimit,
        hopStart: parsed.hopStart,
        wantAck: parsed.wantAck,
        priority: parsed.priority,
        channel: parsed.channel,
        timestamp: parsed.timestamp,
        routingPath: parsed.routingPath,
        rssi: parsed.rssi,
        snr: parsed.snr
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