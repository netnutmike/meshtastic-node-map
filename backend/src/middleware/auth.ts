import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { securityAuditService } from '../services/security-audit.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
    sessionId?: string;
  };
}

export interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

// JWT Authentication middleware
export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    // Check if token is blacklisted (for logout functionality)
    // Note: In production, this would be stored in Redis or database
    // For now, we'll skip this check as it would require importing from auth routes
    
    req.user = {
      id: decoded.id,
      role: decoded.role,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId
    };
    
    next();
  } catch (error) {
    logger.warn('JWT authentication failed:', error);
    
    // Log security event
    securityAuditService.logAuthentication(false, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    }, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
};

// API Key Authentication middleware
export const authenticateApiKey = async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  try {
    // Import here to avoid circular dependency
    const { apiKeyService } = await import('../services/api-key.service');
    
    const validatedKey = await apiKeyService.validateApiKey(apiKey, req.ip);
    
    if (!validatedKey) {
      // Log security event
      securityAuditService.logApiKeyUsage('unknown', {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      }, req.path, false);
      
      res.status(403).json({ error: 'Invalid or expired API key' });
      return;
    }

    // Log successful API key usage
    securityAuditService.logApiKeyUsage(validatedKey.id, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    }, req.path, true);

    req.apiKey = {
      id: validatedKey.id,
      name: validatedKey.name,
      permissions: validatedKey.permissions
    };

    next();
  } catch (error) {
    logger.error('API key validation error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
    return;
  }
};

// Optional authentication - allows both authenticated and unauthenticated access
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'fallback-secret-key';
        const decoded = jwt.verify(token, secret) as any;
        
        req.user = {
          id: decoded.id,
          role: decoded.role,
          permissions: decoded.permissions || [],
          sessionId: decoded.sessionId
        };
      } catch (error) {
        // Invalid token, but continue without authentication
        logger.warn('Optional JWT authentication failed:', error);
      }
    }
  } else if (apiKey) {
    try {
      // Import here to avoid circular dependency
      const { apiKeyService } = await import('../services/api-key.service');
      const validatedKey = await apiKeyService.validateApiKey(apiKey, req.ip);
      if (validatedKey) {
        (req as ApiKeyRequest).apiKey = {
          id: validatedKey.id,
          name: validatedKey.name,
          permissions: validatedKey.permissions
        };
      }
    } catch (error) {
      logger.warn('Optional API key validation failed:', error);
    }
  }
  
  // Always continue, regardless of authentication status
  next();
};

// Check if authentication is enabled via configuration
export const isAuthEnabled = (): boolean => {
  return process.env.AUTH_ENABLED === 'true' || process.env.JWT_SECRET !== undefined;
};

// Conditional authentication - only require auth if enabled in config
export const conditionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!isAuthEnabled()) {
    // Authentication disabled, continue without auth
    next();
    return;
  }
  
  // Authentication enabled, require it
  authenticateJWT(req, res, next);
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      // Log authorization failure
      securityAuditService.logAuthorization(false, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user.id,
        endpoint: req.path,
        method: req.method
      }, req.path, `role:${roles.join(',')}`);
      
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user || (req as ApiKeyRequest).apiKey;
    
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!user.permissions.includes(permission) && !user.permissions.includes('admin')) {
      // Log authorization failure
      securityAuditService.logAuthorization(false, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        userId: 'user' in req && req.user ? req.user.id : undefined,
        apiKeyId: 'apiKey' in req && (req as ApiKeyRequest).apiKey ? (req as ApiKeyRequest).apiKey!.id : undefined,
        endpoint: req.path,
        method: req.method
      }, req.path, permission);
      
      res.status(403).json({ error: `Permission '${permission}' required` });
      return;
    }

    next();
  };
};

// Optional permission check - only enforces if authentication is enabled and user is authenticated
export const optionalPermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // If authentication is disabled, allow access
    if (!isAuthEnabled()) {
      next();
      return;
    }
    
    const user = req.user || (req as ApiKeyRequest).apiKey;
    
    // If no user but auth is enabled, still allow read operations for public access
    if (!user && permission === 'read') {
      next();
      return;
    }
    
    // If no user and not a read operation, require auth
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check permissions for authenticated users
    if (!user.permissions.includes(permission) && !user.permissions.includes('admin')) {
      res.status(403).json({ error: `Permission '${permission}' required` });
      return;
    }

    next();
  };
};