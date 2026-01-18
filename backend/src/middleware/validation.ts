import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { logger } from '../utils/logger';

// Security validation options
const SECURITY_OPTIONS = {
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
  allowedHtmlTags: [], // No HTML allowed by default
  sqlInjectionPatterns: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\/\*|\*\/|;|'|"|`)/,
    /(\bOR\b|\bAND\b).*?[=<>]/i
  ],
  xssPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
  ]
};

// Input sanitization functions
export const sanitizeInput = {
  // Sanitize string input
  string: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Limit length
    if (sanitized.length > SECURITY_OPTIONS.maxStringLength) {
      sanitized = sanitized.substring(0, SECURITY_OPTIONS.maxStringLength);
    }
    
    // Remove HTML tags
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: SECURITY_OPTIONS.allowedHtmlTags,
      ALLOWED_ATTR: []
    });
    
    // Escape special characters
    sanitized = validator.escape(sanitized);
    
    return sanitized;
  },

  // Sanitize email
  email: (input: string): string => {
    if (typeof input !== 'string') return '';
    const sanitized = input.trim().toLowerCase();
    return validator.isEmail(sanitized) ? sanitized : '';
  },

  // Sanitize URL
  url: (input: string): string => {
    if (typeof input !== 'string') return '';
    const sanitized = input.trim();
    return validator.isURL(sanitized, { 
      protocols: ['http', 'https'],
      require_protocol: true
    }) ? sanitized : '';
  },

  // Sanitize numeric input
  number: (input: any): number | null => {
    const num = Number(input);
    return isNaN(num) || !isFinite(num) ? null : num;
  },

  // Sanitize boolean input
  boolean: (input: any): boolean => {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      return input.toLowerCase() === 'true';
    }
    return Boolean(input);
  }
};

// Security validation functions
export const securityValidation = {
  // Check for SQL injection patterns
  checkSqlInjection: (input: string): boolean => {
    return SECURITY_OPTIONS.sqlInjectionPatterns.some(pattern => pattern.test(input));
  },

  // Check for XSS patterns
  checkXss: (input: string): boolean => {
    return SECURITY_OPTIONS.xssPatterns.some(pattern => pattern.test(input));
  },

  // Check for path traversal
  checkPathTraversal: (input: string): boolean => {
    return /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i.test(input);
  },

  // Validate object depth
  validateObjectDepth: (obj: any, maxDepth = SECURITY_OPTIONS.maxObjectDepth): boolean => {
    const checkDepth = (item: any, depth: number): boolean => {
      if (depth > maxDepth) return false;
      if (typeof item === 'object' && item !== null) {
        for (const key in item) {
          if (!checkDepth(item[key], depth + 1)) return false;
        }
      }
      return true;
    };
    return checkDepth(obj, 0);
  }
};

// Recursively sanitize object
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeInput.string(obj);
  }
  
  if (typeof obj === 'number') {
    return sanitizeInput.number(obj);
  }
  
  if (typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    if (obj.length > SECURITY_OPTIONS.maxArrayLength) {
      obj = obj.slice(0, SECURITY_OPTIONS.maxArrayLength);
    }
    return obj.map((item: any) => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeInput.string(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Enhanced validation middleware factory
export const validate = (schema: Joi.ObjectSchema, options: {
  property?: 'body' | 'query' | 'params';
  sanitize?: boolean;
  securityCheck?: boolean;
} = {}) => {
  const { property = 'body', sanitize = true, securityCheck = true } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[property];

    // Security validation - check actual string values, not JSON representation
    if (securityCheck && data && typeof data === 'object') {
      const checkValue = (value: any): boolean => {
        if (typeof value === 'string') {
          if (securityValidation.checkSqlInjection(value)) {
            logger.warn('SQL injection attempt detected:', { 
              ip: req.ip, 
              path: req.path, 
              value: value.substring(0, 200) 
            });
            return false;
          }

          if (securityValidation.checkXss(value)) {
            logger.warn('XSS attempt detected:', { 
              ip: req.ip, 
              path: req.path, 
              value: value.substring(0, 200) 
            });
            return false;
          }

          if (securityValidation.checkPathTraversal(value)) {
            logger.warn('Path traversal attempt detected:', { 
              ip: req.ip, 
              path: req.path, 
              value: value.substring(0, 200) 
            });
            return false;
          }
        } else if (typeof value === 'object' && value !== null) {
          // Recursively check nested objects
          for (const key in value) {
            if (!checkValue(value[key])) {
              return false;
            }
          }
        }
        return true;
      };

      if (!checkValue(data)) {
        res.status(400).json({ error: 'Invalid input detected' });
        return;
      }

      if (!securityValidation.validateObjectDepth(data)) {
        logger.warn('Object depth limit exceeded:', { 
          ip: req.ip, 
          path: req.path 
        });
        res.status(400).json({ error: 'Input too complex' });
        return;
      }
    }

    // Sanitize input if requested
    let sanitizedData = data;
    if (sanitize && typeof data === 'object' && data !== null) {
      sanitizedData = sanitizeObject(data);
    }

    // Joi validation
    const { error, value } = schema.validate(sanitizedData, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation error:', { 
        path: req.path, 
        method: req.method, 
        errors: errorDetails,
        ip: req.ip
      });
      
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
  }),

  // API Key schemas
  createApiKey: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    permissions: Joi.array().items(Joi.string().valid('read', 'write', 'admin')).min(1).required(),
    description: Joi.string().max(500).optional(),
    expiresAt: Joi.date().iso().greater('now').optional(),
    rateLimit: Joi.object({
      requests: Joi.number().integer().min(1).max(100000).required(),
      windowMs: Joi.number().integer().min(1000).max(86400000).required() // 1 second to 24 hours
    }).optional(),
    ipWhitelist: Joi.array().items(Joi.string().ip()).optional()
  }),

  updateApiKey: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    permissions: Joi.array().items(Joi.string().valid('read', 'write', 'admin')).min(1).optional(),
    description: Joi.string().max(500).optional(),
    rateLimit: Joi.object({
      requests: Joi.number().integer().min(1).max(100000).required(),
      windowMs: Joi.number().integer().min(1000).max(86400000).required()
    }).optional(),
    ipWhitelist: Joi.array().items(Joi.string().ip()).optional()
  }),

  // Security audit schemas
  auditLogFilters: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    level: Joi.string().valid('info', 'warn', 'error').optional(),
    source: Joi.string().optional(),
    ipAddress: Joi.string().ip().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
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
    ).optional(),
    // Pagination parameters
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    // Date range parameters
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  })


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