import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Rate limiting configuration
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: 'Too many requests',
      message: options.message || 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Too many requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    },
    keyGenerator: (req: Request): string => {
      // Use API key if available, otherwise use IP
      const apiKey = req.headers['x-api-key'] as string;
      const authHeader = req.headers.authorization;
      
      if (apiKey) {
        return `api-key:${apiKey}`;
      } else if (authHeader) {
        // Extract user ID from JWT if possible
        try {
          const token = authHeader.split(' ')[1];
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          return `user:${payload.id}`;
        } catch {
          return req.ip || 'unknown';
        }
      }
      
      return req.ip || 'unknown';
    }
  });
};

// Different rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiting - 1000 requests per hour
  general: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000,
    message: 'Too many API requests. Please try again later.'
  }),

  // Authentication endpoints - stricter limits
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: 'Too many authentication attempts. Please try again later.',
    skipSuccessfulRequests: true
  }),

  // Read operations - more lenient
  read: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 2000,
    message: 'Too many read requests. Please try again later.'
  }),

  // Write operations - more restrictive
  write: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 500,
    message: 'Too many write requests. Please try again later.'
  }),

  // Real-time data endpoints - very lenient for legitimate use
  realtime: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many real-time requests. Please slow down.'
  }),

  // Search endpoints - moderate limits
  search: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many search requests. Please wait before searching again.'
  }),

  // Export/bulk operations - very restrictive
  export: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many export requests. Please try again later.'
  })
};

// Middleware to apply appropriate rate limiting based on operation type
export const applyRateLimit = (type: keyof typeof rateLimiters) => {
  return rateLimiters[type];
};