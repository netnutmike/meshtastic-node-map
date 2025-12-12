import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

winston.addColors(logColors);

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service || 'App'}] ${level}: ${message} ${metaStr}`;
  })
);

// Create base logger configuration
const createBaseLogger = () => {
  const transports: winston.transport[] = [];

  // Console transport for development
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'debug'
      })
    );
  }

  // File transports for production
  if (process.env.NODE_ENV === 'production') {
    // Error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );

    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );

    // Console for production (less verbose)
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.simple()
        ),
        level: 'info'
      })
    );
  }

  return winston.createLogger({
    levels: logLevels,
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports,
    exitOnError: false
  });
};

// Base logger instance
const baseLogger = createBaseLogger();

/**
 * Create a logger instance for a specific service/module
 */
export function createLogger(service: string): winston.Logger {
  return baseLogger.child({ service });
}

/**
 * Default logger instance
 */
export const logger = createLogger('App');

/**
 * Log database queries (for debugging)
 */
export function logDatabaseQuery(query: string, params?: any[], duration?: number) {
  if (process.env.NODE_ENV === 'development' && process.env.LOG_DB_QUERIES === 'true') {
    logger.debug('Database Query', {
      query,
      params,
      duration: duration ? `${duration}ms` : undefined
    });
  }
}

/**
 * Log MQTT messages (for debugging)
 */
export function logMQTTMessage(topic: string, message: any, direction: 'incoming' | 'outgoing') {
  if (process.env.NODE_ENV === 'development' && process.env.LOG_MQTT_MESSAGES === 'true') {
    logger.debug('MQTT Message', {
      topic,
      direction,
      message: typeof message === 'string' ? message : JSON.stringify(message)
    });
  }
}

/**
 * Log API requests
 */
export function logAPIRequest(method: string, url: string, statusCode: number, duration: number, userId?: string) {
  logger.info('API Request', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId
  });
}

/**
 * Log security events
 */
export function logSecurityEvent(event: string, details: Record<string, any>) {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log performance metrics
 */
export function logPerformanceMetric(metric: string, value: number, unit: string, context?: Record<string, any>) {
  logger.info('Performance Metric', {
    metric,
    value,
    unit,
    ...context
  });
}

export default {
  createLogger,
  logger,
  logDatabaseQuery,
  logMQTTMessage,
  logAPIRequest,
  logSecurityEvent,
  logPerformanceMetric
};