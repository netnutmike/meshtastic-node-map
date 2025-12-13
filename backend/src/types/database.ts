// Database entity types based on Prisma schema

export enum NodeRole {
  CLIENT = 'CLIENT',
  CLIENT_MUTE = 'CLIENT_MUTE',
  ROUTER = 'ROUTER',
  ROUTER_CLIENT = 'ROUTER_CLIENT',
  REPEATER = 'REPEATER',
  TRACKER = 'TRACKER',
  SENSOR = 'SENSOR',
  TAK = 'TAK',
  CLIENT_HIDDEN = 'CLIENT_HIDDEN',
  LOST_AND_FOUND = 'LOST_AND_FOUND',
  TAK_TRACKER = 'TAK_TRACKER'
}

export enum PositionSource {
  GPS = 'GPS',
  MANUAL = 'MANUAL',
  ESTIMATED = 'ESTIMATED',
  NETWORK = 'NETWORK'
}

export enum TelemetryType {
  DEVICE_METRICS = 'DEVICE_METRICS',
  ENVIRONMENT_METRICS = 'ENVIRONMENT_METRICS',
  POWER_METRICS = 'POWER_METRICS'
}

export enum MessageType {
  TEXT = 'TEXT',
  POSITION = 'POSITION',
  TELEMETRY = 'TELEMETRY',
  NODEINFO = 'NODEINFO',
  ROUTING = 'ROUTING',
  ADMIN = 'ADMIN',
  DETECTION_SENSOR = 'DETECTION_SENSOR',
  REPLY = 'REPLY',
  IP_TUNNEL_APP = 'IP_TUNNEL_APP',
  PAXCOUNTER_APP = 'PAXCOUNTER_APP',
  SERIAL_APP = 'SERIAL_APP',
  STORE_FORWARD_APP = 'STORE_FORWARD_APP',
  RANGE_TEST_APP = 'RANGE_TEST_APP',
  TELEMETRY_APP = 'TELEMETRY_APP',
  ZPS_APP = 'ZPS_APP',
  SIMULATOR_APP = 'SIMULATOR_APP',
  TRACEROUTE_APP = 'TRACEROUTE_APP',
  NEIGHBOR_INFO_APP = 'NEIGHBOR_INFO_APP',
  ATAK_PLUGIN = 'ATAK_PLUGIN',
  MAP_REPORT_APP = 'MAP_REPORT_APP',
  PRIVATE_APP = 'PRIVATE_APP',
  ATAK_FORWARDER = 'ATAK_FORWARDER'
}

export enum MessagePriority {
  UNSET = 'UNSET',
  MIN = 'MIN',
  BACKGROUND = 'BACKGROUND',
  DEFAULT = 'DEFAULT',
  RELIABLE = 'RELIABLE',
  ACK = 'ACK',
  MAX = 'MAX'
}

export enum LoRaRegion {
  UNSET = 'UNSET',
  US = 'US',
  EU_433 = 'EU_433',
  EU_868 = 'EU_868',
  CN = 'CN',
  JP = 'JP',
  ANZ = 'ANZ',
  KR = 'KR',
  TW = 'TW',
  RU = 'RU',
  IN = 'IN',
  NZ_865 = 'NZ_865',
  TH = 'TH',
  LORA_24 = 'LORA_24',
  UA_433 = 'UA_433',
  UA_868 = 'UA_868',
  MY_433 = 'MY_433',
  MY_919 = 'MY_919',
  SG_923 = 'SG_923'
}

// Core entity interfaces
export interface Network {
  id: string;
  name: string;
  description?: string;
  mqttBroker: string;
  mqttCredentials: Record<string, any>;
  region: LoRaRegion;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes?: Node[];
  channels?: Channel[];
}

export interface Node {
  id: string;
  nodeId: string;
  hexId: string;
  shortName?: string;
  longName?: string;
  hardwareModel?: string;
  firmwareVersion?: string;
  role: NodeRole;
  lastSeen?: Date;
  lastHeard?: Date;
  isOnline: boolean;
  mqttConnected: boolean;
  batteryLevel?: number;
  voltage?: number;
  channelUtilization?: number;
  airUtilTx?: number;
  createdAt: Date;
  updatedAt: Date;
  networkId: string;
  network?: Network;
  positions?: Position[];
  telemetryReadings?: TelemetryReading[];
  sentMessages?: Message[];
  receivedMessages?: Message[];
  neighborsFrom?: NodeNeighbor[];
  neighborsTo?: NodeNeighbor[];
}

export interface Position {
  id: string;
  nodeId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  precision?: number;
  timestamp: Date;
  source: PositionSource;
  createdAt: Date;
  node?: Node;
}

export interface TelemetryReading {
  id: string;
  nodeId: string;
  type: TelemetryType;
  timestamp: Date;
  data: TelemetryData;
  createdAt: Date;
  node?: Node;
}

// Telemetry data structures
export interface DeviceMetrics {
  batteryLevel?: number;
  voltage?: number;
  channelUtilization?: number;
  airUtilTx?: number;
  uptimeSeconds?: number;
}

export interface EnvironmentMetrics {
  temperature?: number;
  humidity?: number;
  pressure?: number;
  gasResistance?: number;
  iaq?: number;
}

export interface PowerMetrics {
  ch1Voltage?: number;
  ch1Current?: number;
  ch2Voltage?: number;
  ch2Current?: number;
  ch3Voltage?: number;
  ch3Current?: number;
}

export type TelemetryData = DeviceMetrics | EnvironmentMetrics | PowerMetrics;

export interface Message {
  id: string;
  messageId?: string;
  fromNodeId: string;
  toNodeId?: string;
  type: MessageType;
  content: Record<string, any> | string;
  encrypted: boolean;
  hopLimit?: number;
  hopStart?: number;
  wantAck: boolean;
  priority: MessagePriority;
  channel: number;
  timestamp: Date;
  receivedAt: Date;
  routingPath: string[];
  rssi?: number;
  snr?: number;
  fromNode?: Node;
  toNode?: Node;
}

export interface NodeNeighbor {
  id: string;
  nodeId: string;
  neighborId: string;
  rssi?: number;
  snr?: number;
  lastHeard: Date;
  hopCount: number;
  createdAt: Date;
  updatedAt: Date;
  node?: Node;
  neighbor?: Node;
}

export interface Channel {
  id: string;
  networkId: string;
  index: number;
  name: string;
  psk?: string;
  frequency?: bigint;
  bandwidth?: number;
  spreadingFactor?: number;
  codingRate?: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  network?: Network;
}

// Input types for creating entities
export interface CreateNetworkInput {
  name: string;
  description?: string;
  mqttBroker: string;
  mqttCredentials: Record<string, any>;
  region: LoRaRegion;
  isActive?: boolean;
}

export interface CreateNodeInput {
  nodeId: string;
  hexId: string;
  shortName?: string;
  longName?: string;
  hardwareModel?: string;
  firmwareVersion?: string;
  role?: NodeRole;
  networkId: string;
  isOnline?: boolean;
  mqttConnected?: boolean;
  batteryLevel?: number;
  voltage?: number;
  channelUtilization?: number;
  airUtilTx?: number;
}

export interface CreatePositionInput {
  nodeId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  precision?: number;
  timestamp: Date;
  source?: PositionSource;
}

export interface CreateTelemetryInput {
  nodeId: string;
  type: TelemetryType;
  timestamp: Date;
  data: TelemetryData;
}

export interface CreateMessageInput {
  messageId?: string;
  fromNodeId: string;
  toNodeId?: string;
  type: MessageType;
  content: Record<string, any> | string;
  encrypted?: boolean;
  hopLimit?: number;
  hopStart?: number;
  wantAck?: boolean;
  priority?: MessagePriority;
  channel?: number;
  timestamp: Date;
  receivedAt?: Date;
  routingPath?: string[];
  rssi?: number;
  snr?: number;
}

export interface CreateChannelInput {
  networkId: string;
  index: number;
  name: string;
  psk?: string;
  frequency?: bigint;
  bandwidth?: number;
  spreadingFactor?: number;
  codingRate?: number;
  isDefault?: boolean;
}

// Update types
export interface UpdateNodeInput {
  shortName?: string;
  longName?: string;
  hardwareModel?: string;
  firmwareVersion?: string;
  role?: NodeRole;
  lastSeen?: Date;
  lastHeard?: Date;
  isOnline?: boolean;
  mqttConnected?: boolean;
  batteryLevel?: number;
  voltage?: number;
  channelUtilization?: number;
  airUtilTx?: number;
}

export interface UpdateNetworkInput {
  name?: string;
  description?: string;
  mqttBroker?: string;
  mqttCredentials?: Record<string, any>;
  region?: LoRaRegion;
  isActive?: boolean;
}