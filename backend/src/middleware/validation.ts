import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

// Generic validation middleware factory
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation error:', errorDetails);
      
      res.status(400).json({
        error: 'Validation failed',
        details: errorDetails
      });
      return;
    }

    // Replace the original property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }),

  // Node schemas
  createNode: Joi.object({
    nodeId: Joi.string().required(),
    hexId: Joi.string().required(),
    shortName: Joi.string().max(4).allow('').optional(),
    longName: Joi.string().max(40).allow('').optional(),
    hardwareModel: Joi.string().allow('').optional(),
    firmwareVersion: Joi.string().allow('').optional(),
    role: Joi.string().valid(
      'CLIENT', 'CLIENT_MUTE', 'ROUTER', 'ROUTER_CLIENT', 'REPEATER',
      'TRACKER', 'SENSOR', 'TAK', 'CLIENT_HIDDEN', 'LOST_AND_FOUND', 'TAK_TRACKER'
    ).default('CLIENT'),
    networkId: Joi.string().required() // Accept CUID format
  }),

  updateNode: Joi.object({
    shortName: Joi.string().max(4).optional(),
    longName: Joi.string().max(40).optional(),
    hardwareModel: Joi.string().optional(),
    firmwareVersion: Joi.string().optional(),
    role: Joi.string().valid(
      'CLIENT', 'CLIENT_MUTE', 'ROUTER', 'ROUTER_CLIENT', 'REPEATER',
      'TRACKER', 'SENSOR', 'TAK', 'CLIENT_HIDDEN', 'LOST_AND_FOUND', 'TAK_TRACKER'
    ).optional(),
    isOnline: Joi.boolean().optional(),
    mqttConnected: Joi.boolean().optional(),
    batteryLevel: Joi.number().min(0).max(100).optional(),
    voltage: Joi.number().min(0).optional(),
    channelUtilization: Joi.number().min(0).max(100).optional(),
    airUtilTx: Joi.number().min(0).max(100).optional()
  }),

  // Position schemas
  createPosition: Joi.object({
    nodeId: Joi.string().required(), // Accept CUID format
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    altitude: Joi.number().optional(),
    precision: Joi.number().min(0).optional(),
    timestamp: Joi.date().iso().required(),
    source: Joi.string().valid('GPS', 'MANUAL', 'ESTIMATED', 'NETWORK').default('GPS')
  }),

  // Telemetry schemas
  createTelemetry: Joi.object({
    nodeId: Joi.string().required(), // Accept CUID format
    type: Joi.string().valid('DEVICE_METRICS', 'ENVIRONMENT_METRICS', 'POWER_METRICS').required(),
    timestamp: Joi.date().iso().required(),
    data: Joi.object().required()
  }),

  // Message schemas
  createMessage: Joi.object({
    messageId: Joi.string().optional(),
    fromNodeId: Joi.string().required(), // Accept CUID format
    toNodeId: Joi.string().optional(), // Accept CUID format
    type: Joi.string().valid(
      'TEXT', 'POSITION', 'TELEMETRY', 'NODEINFO', 'ROUTING', 'ADMIN',
      'DETECTION_SENSOR', 'REPLY', 'IP_TUNNEL_APP', 'PAXCOUNTER_APP',
      'SERIAL_APP', 'STORE_FORWARD_APP', 'RANGE_TEST_APP', 'TELEMETRY_APP',
      'ZPS_APP', 'SIMULATOR_APP', 'TRACEROUTE_APP', 'NEIGHBOR_INFO_APP',
      'ATAK_PLUGIN', 'MAP_REPORT_APP', 'PRIVATE_APP', 'ATAK_FORWARDER'
    ).required(),
    content: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
    encrypted: Joi.boolean().default(false),
    hopLimit: Joi.number().integer().min(0).max(7).optional(),
    hopStart: Joi.number().integer().min(0).max(7).optional(),
    wantAck: Joi.boolean().default(false),
    priority: Joi.string().valid('UNSET', 'MIN', 'BACKGROUND', 'DEFAULT', 'RELIABLE', 'ACK', 'MAX').default('DEFAULT'),
    channel: Joi.number().integer().min(0).max(7).default(0),
    timestamp: Joi.date().iso().required(),
    routingPath: Joi.array().items(Joi.string()).optional(),
    rssi: Joi.number().optional(),
    snr: Joi.number().optional()
  }),

  // Network schemas
  createNetwork: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    mqttBroker: Joi.string().uri().required(),
    mqttCredentials: Joi.object().required(),
    region: Joi.string().valid(
      'UNSET', 'US', 'EU_433', 'EU_868', 'CN', 'JP', 'ANZ', 'KR', 'TW',
      'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868',
      'MY_433', 'MY_919', 'SG_923'
    ).default('UNSET'),
    isActive: Joi.boolean().default(true)
  }),

  updateNetwork: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    mqttBroker: Joi.string().uri().optional(),
    mqttCredentials: Joi.object().optional(),
    region: Joi.string().valid(
      'UNSET', 'US', 'EU_433', 'EU_868', 'CN', 'JP', 'ANZ', 'KR', 'TW',
      'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868',
      'MY_433', 'MY_919', 'SG_923'
    ).optional(),
    isActive: Joi.boolean().optional()
  }),

  // ID parameter validation (accepts CUID format)
  idParam: Joi.object({
    id: Joi.string().required()
  }),

  // UUID parameter validation (backward compatibility - now accepts CUID)
  uuidParam: Joi.object({
    id: Joi.string().required()
  })
};

// Extended schemas that depend on base schemas
export const extendedSchemas = {
  // Search and filter schemas
  nodeFilters: Joi.object({
    networkId: Joi.string().optional(), // Accept CUID format
    role: Joi.string().valid(
      'CLIENT', 'CLIENT_MUTE', 'ROUTER', 'ROUTER_CLIENT', 'REPEATER',
      'TRACKER', 'SENSOR', 'TAK', 'CLIENT_HIDDEN', 'LOST_AND_FOUND', 'TAK_TRACKER'
    ).optional(),
    isOnline: Joi.boolean().optional(),
    mqttConnected: Joi.boolean().optional(),
    hardwareModel: Joi.string().valid(
      'TBEAM', 'HELTEC_V3', 'RAK4631', 'STATION_G1', 'NANO_G1',
      'LORA32_V2_1', 'T_ECHO', 'PORTDUINO', 'ANDROID_SIM', 'DIY_V1'
    ).optional(),
    search: Joi.string().max(100).optional(), // Search in name, shortName, longName, hexId
    minBattery: Joi.number().min(0).max(100).optional(),
    maxAge: Joi.number().integer().min(0).max(8760).optional(), // Hours since last seen (max 1 year)
    bounds: Joi.alternatives().try(
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value);
          const { error } = Joi.object({
            north: Joi.number().min(-90).max(90).required(),
            south: Joi.number().min(-90).max(90).required(),
            east: Joi.number().min(-180).max(180).required(),
            west: Joi.number().min(-180).max(180).required()
          }).validate(parsed);
          
          if (error) {
            return helpers.error('any.invalid');
          }
          
          // Validate logical bounds
          if (parsed.north <= parsed.south) {
            return helpers.error('any.invalid', { message: 'North must be greater than south' });
          }
          if (parsed.east <= parsed.west) {
            return helpers.error('any.invalid', { message: 'East must be greater than west' });
          }
          
          return parsed;
        } catch (e) {
          return helpers.error('any.invalid');
        }
      }),
      Joi.object({
        north: Joi.number().min(-90).max(90).required(),
        south: Joi.number().min(-90).max(90).required(),
        east: Joi.number().min(-180).max(180).required(),
        west: Joi.number().min(-180).max(180).required()
      })
    ).optional()
  }).concat(schemas.pagination).concat(schemas.dateRange)


};

// Error handling for validation
export const handleValidationError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.isJoi) {
    const errorDetails = error.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    res.status(400).json({
      error: 'Validation failed',
      details: errorDetails
    });
    return;
  }
  next(error);
};