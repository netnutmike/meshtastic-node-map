import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
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
    
    req.user = {
      id: decoded.id,
      role: decoded.role,
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (error) {
    logger.warn('JWT authentication failed:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
};

// API Key Authentication middleware
export const authenticateApiKey = (req: ApiKeyRequest, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  // In a real implementation, you would validate the API key against a database
  // For now, we'll use a simple validation
  const validApiKeys = process.env.API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  req.apiKey = {
    id: apiKey,
    name: 'Default API Key',
    permissions: ['read', 'write'] // Default permissions
  };

  next();
};

// Optional authentication - allows both authenticated and unauthenticated access
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  if (authHeader) {
    authenticateJWT(req, res, next);
    return;
  } else if (apiKey) {
    authenticateApiKey(req as ApiKeyRequest, res, next);
    return;
  } else {
    // No authentication provided, continue with limited access
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
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
      res.status(403).json({ error: `Permission '${permission}' required` });
      return;
    }

    next();
  };
};