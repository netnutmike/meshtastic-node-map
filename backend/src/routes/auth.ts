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
    permissions: ['read', 'write', 'admin']
  }],
  ['operator', {
    id: '2',
    username: 'operator',
    email: 'operator@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'operator',
    permissions: ['read', 'write']
  }],
  ['viewer', {
    id: '3',
    username: 'viewer',
    email: 'viewer@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'viewer',
    permissions: ['read']
  }]
]);

// Generate JWT token
const generateToken = (user: any): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    },
    secret,
    { expiresIn } as any
  );
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn(`Login attempt with invalid password for user: ${username}`);
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      });
      return;
    }

    // Generate token
    const token = generateToken(user);

    logger.info(`User logged in: ${username}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions
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
                   role === 'operator' ? ['read', 'write'] : ['read']
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
      const newToken = generateToken(user);

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

export { router as authRoutes };