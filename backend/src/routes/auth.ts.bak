import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validate, schemas } from '../middleware/validation';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Authentication schemas
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'operator', 'viewer').default('viewer')
});

// Mock user store (in production, this would be a database)
const users = new Map([
  ['admin', {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin',
    permissions: ['read', 'write', 'admin'],
    createdAt: new Date(),
    lastLogin: null as Date | null,
    isActive: true,
    loginAttempts: 0,
    lockedUntil: null as Date | null
  }],
  ['operator', {
    id: '2',
    username: 'operator',
    email: 'operator@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'operator',
    permissions: ['read', 'write'],
    createdAt: new Date(),
    lastLogin: null as Date | null,
    isActive: true,
    loginAttempts: 0,
    lockedUntil: null as Date | null
  }],
  ['viewer', {
    id: '3',
    username: 'viewer',
    email: 'viewer@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'viewer',
    permissions: ['read'],
    createdAt: new Date(),
    lastLogin: null as Date | null,
    isActive: true,
    loginAttempts: 0,
    lockedUntil: null as Date | null
  }]
]);

// Active sessions store (in production, use Redis or database)
const activeSessions = new Map(); // sessionId -> { userId, createdAt, lastActivity, ipAddress, userAgent }

// Blacklisted tokens (for logout functionality)
const blacklistedTokens = new Set();

// Generate JWT token with session tracking
const generateToken = (user: any, req: any): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  // Store session information
  activeSessions.set(sessionId, {
    userId: user.id,
    createdAt: new Date(),
    lastActivity: new Date(),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      sessionId: sessionId
    },
    secret,
    { expiresIn } as any
  );
};

// Account lockout helper
const isAccountLocked = (user: any): boolean => {
  return user.lockedUntil && user.lockedUntil > new Date();
};

const incrementLoginAttempts = (user: any): void => {
  user.loginAttempts = (user.loginAttempts || 0) + 1;
  
  // Lock account after 5 failed attempts for 15 minutes
  if (user.loginAttempts >= 5) {
    user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    logger.warn(`Account locked for user: ${user.username}`);
  }
};

const resetLoginAttempts = (user: any): void => {
  user.loginAttempts = 0;
  user.lockedUntil = null;
};

// POST /auth/login
router.post('/login',
  applyRateLimit('auth'),
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Find user
    const user = users.get(username);
    if (!user) {
      logger.warn(`Login attempt with invalid username: ${username}`);
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      });
      return;
    }

    // Check if account is active
    if (!user.isActive) {
      logger.warn(`Login attempt with inactive account: ${username}`);
      res.status(401).json({
        error: 'ACCOUNT_INACTIVE',
        message: 'Account is inactive'
      });
      return;
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      logger.warn(`Login attempt with locked account: ${username}`);
      res.status(401).json({
        error: 'ACCOUNT_LOCKED',
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      incrementLoginAttempts(user);
      logger.warn(`Login attempt with invalid password for user: ${username}`);
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      });
      return;
    }

    // Reset login attempts on successful login
    resetLoginAttempts(user);
    user.lastLogin = new Date();

    // Generate token with session tracking
    const token = generateToken(user, req);

    logger.info(`User logged in: ${username}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin
      }
    });
  })
);

// POST /auth/register (for demo purposes - in production, this might be admin-only)
router.post('/register',
  applyRateLimit('auth'),
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { username, password, email, role } = req.body;

    // Check if user already exists
    if (users.has(username)) {
      res.status(409).json({
        error: 'USER_EXISTS',
        message: 'Username already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      role,
      permissions: role === 'admin' ? ['read', 'write', 'admin'] : 
                   role === 'operator' ? ['read', 'write'] : ['read'],
      createdAt: new Date(),
      lastLogin: null as Date | null,
      isActive: true,
      loginAttempts: 0,
      lockedUntil: null as Date | null
    };

    users.set(username, newUser);

    logger.info(`New user registered: ${username} with role: ${role}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions
      }
    });
  })
);

// POST /auth/refresh
router.post('/refresh',
  applyRateLimit('auth'),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        error: 'TOKEN_REQUIRED',
        message: 'Refresh token required'
      });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      
      // Find user to get latest data
      const user = Array.from(users.values()).find(u => u.id === decoded.id);
      if (!user) {
        res.status(401).json({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
        return;
      }

      // Generate new token
      const newToken = generateToken(user, req);

      res.json({
        message: 'Token refreshed successfully',
        token: newToken
      });
    } catch (error) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
      return;
    }
  })
);

// POST /auth/forgot-password
router.post('/forgot-password',
  applyRateLimit('auth'),
  validate(Joi.object({
    email: Joi.string().email().required()
  })),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Find user by email
    const user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
      // Don't reveal if email exists or not for security
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
      return;
    }

    // Generate reset token (in production, store this in database with expiration)
    const resetToken = jwt.sign(
      { id: user.id, type: 'password_reset' },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '1h' }
    );

    // In production, send email with reset link
    logger.info(`Password reset requested for user: ${user.username}, token: ${resetToken}`);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      // In development, return the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  })
);

// POST /auth/reset-password
router.post('/reset-password',
  applyRateLimit('auth'),
  validate(Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  })),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, secret) as any;

      if (decoded.type !== 'password_reset') {
        res.status(400).json({
          error: 'INVALID_TOKEN',
          message: 'Invalid reset token'
        });
        return;
      }

      // Find user
      const user = Array.from(users.values()).find(u => u.id === decoded.id);
      if (!user) {
        res.status(400).json({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
        return;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;

      logger.info(`Password reset completed for user: ${user.username}`);

      res.json({
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      res.status(400).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired reset token'
      });
      return;
    }
  })
);

// POST /auth/change-password
router.post('/change-password',
  applyRateLimit('auth'),
  validate(Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  })),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'TOKEN_REQUIRED',
        message: 'Authentication token required'
      });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      
      const user = Array.from(users.values()).find(u => u.id === decoded.id);
      if (!user) {
        res.status(401).json({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
        return;
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        res.status(400).json({
          error: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        });
        return;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;

      logger.info(`Password changed for user: ${user.username}`);

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
      return;
    }
  })
);

// PUT /auth/profile
router.put('/profile',
  applyRateLimit('auth'),
  validate(Joi.object({
    email: Joi.string().email().optional(),
    // Add other profile fields as needed
  })),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'TOKEN_REQUIRED',
        message: 'Authentication token required'
      });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      
      const user = Array.from(users.values()).find(u => u.id === decoded.id);
      if (!user) {
        res.status(401).json({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
        return;
      }

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = Array.from(users.values()).find(u => u.email === email && u.id !== user.id);
        if (existingUser) {
          res.status(409).json({
            error: 'EMAIL_EXISTS',
            message: 'Email already in use'
          });
          return;
        }
        user.email = email;
      }

      logger.info(`Profile updated for user: ${user.username}`);

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        }
      });
    } catch (error) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
      return;
    }
  })
);

// GET /auth/me - Get current user info
router.get('/me',
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'TOKEN_REQUIRED',
        message: 'Authentication token required'
      });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      
      const user = Array.from(users.values()).find(u => u.id === decoded.id);
      if (!user) {
        res.status(401).json({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        });
        return;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        }
      });
    } catch (error) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
      return;
    }
  })
);

// POST /auth/logout
router.post('/logout',
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'fallback-secret-key';
        const decoded = jwt.verify(token, secret) as any;
        
        // Add token to blacklist
        blacklistedTokens.add(token);
        
        // Remove session if it exists
        if (decoded.sessionId) {
          activeSessions.delete(decoded.sessionId);
        }

        logger.info(`User logged out: ${decoded.username}`);
      } catch (error) {
        // Token might be invalid, but we still want to allow logout
        logger.warn('Logout attempt with invalid token');
      }
    }

    res.json({
      message: 'Logged out successfully'
    });
  })
);

// POST /auth/logout-all
router.post('/logout-all',
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'TOKEN_REQUIRED',
        message: 'Authentication token required'
      });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      
      // Remove all sessions for this user
      for (const [sessionId, session] of activeSessions.entries()) {
        if (session.userId === decoded.id) {
          activeSessions.delete(sessionId);
        }
      }

      logger.info(`All sessions logged out for user: ${decoded.username}`);

      res.json({
        message: 'All sessions logged out successfully'
      });
    } catch (error) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
      return;
    }
  })
);

// GET /auth/sessions
router.get('/sessions',
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'TOKEN_REQUIRED',
        message: 'Authentication token required'
      });
      return;
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      
      // Get all sessions for this user
      const userSessions = [];
      for (const [sessionId, session] of activeSessions.entries()) {
        if (session.userId === decoded.id) {
          userSessions.push({
            sessionId,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            isCurrent: sessionId === decoded.sessionId
          });
        }
      }

      res.json({
        sessions: userSessions
      });
    } catch (error) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
      return;
    }
  })
);

// GET /auth/config - Get authentication configuration (public endpoint)
router.get('/config',
  asyncHandler(async (req, res) => {
    res.json({
      enabled: process.env.AUTH_ENABLED === 'true' || process.env.JWT_SECRET !== undefined,
      methods: ['local'], // Could be extended to include LDAP, OAuth, etc.
      registration: process.env.ALLOW_REGISTRATION !== 'false'
    });
  })
);

export { router as authRoutes };