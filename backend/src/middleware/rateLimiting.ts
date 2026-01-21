import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { apiKeyService } from '../services/api-key.service';
import { securityAuditService } from '../services/security-audit.service';
import { AuthenticatedRequest, ApiKeyRequest } from './auth';

// Rate limiting store for tracking requests
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
      
      // Log security event
      securityAuditService.logRateLimitExceeded({
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      }, req.path, options.max);
      
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

// Enhanced rate limiter that respects API key specific limits
export const createApiKeyAwareRateLimiter = (defaultOptions: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  // Create the default limiter once at initialization
  const defaultLimiter = createRateLimiter(defaultOptions);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    // If API key is provided, check if it has custom limits
    if (apiKey) {
      try {
        const validatedKey = await apiKeyService.validateApiKey(apiKey, req.ip);
        if (validatedKey) {
          const keyRateLimit = apiKeyService.getRateLimit(validatedKey);
          // If custom limits differ significantly, we'd need a per-key limiter
          // For now, just use the default limiter
          // TODO: Implement per-key rate limiting if needed
        }
      } catch (error) {
        logger.error('Error validating API key for rate limiting:', error);
      }
    }

    // Use the pre-created limiter
    defaultLimiter(req, res, next);
  };
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
  read: createApiKeyAwareRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'development' ? 10000 : 5000, // Higher limit in dev
    message: 'Too many read requests. Please try again later.'
  }),

  // Write operations - more restrictive
  write: createApiKeyAwareRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 500,
    message: 'Too many write requests. Please try again later.'
  }),

  // Real-time data endpoints - very lenient for legitimate use
  realtime: createApiKeyAwareRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'development' ? 500 : 200, // Higher limit in dev
    message: 'Too many real-time requests. Please slow down.'
  }),

  // Search endpoints - moderate limits
  search: createApiKeyAwareRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Increased from 30
    message: 'Too many search requests. Please wait before searching again.'
  }),

  // Export/bulk operations - very restrictive
  export: createApiKeyAwareRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many export requests. Please try again later.'
  })
};

// Middleware to apply appropriate rate limiting based on operation type
export const applyRateLimit = (type: keyof typeof rateLimiters) => {
  return rateLimiters[type];
};

// API usage tracking middleware
export const trackApiUsage = async (req: AuthenticatedRequest | ApiKeyRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to capture response details
  res.end = function(chunk?: any, encoding?: any): any {
    const responseTime = Date.now() - startTime;
    
    // Log usage if API key is present
    const apiKeyReq = req as ApiKeyRequest;
    if (apiKeyReq.apiKey) {
      apiKeyService.logUsage({
        keyId: apiKeyReq.apiKey.id,
        endpoint: req.path,
        method: req.method,
        timestamp: new Date(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent'),
        responseStatus: res.statusCode,
        responseTime
      }).catch(error => {
        logger.error('Error logging API usage:', error);
      });
    }
    
    // Call original end function
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};