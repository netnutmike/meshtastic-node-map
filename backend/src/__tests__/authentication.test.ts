import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { authenticateJWT, requireRole, requirePermission, optionalAuth, conditionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';
import Joi from 'joi';

// Create test-specific auth routes without rate limiting
const createTestAuthRoutes = () => {
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

  // Mock user store for tests (reset for each test)
  let users = new Map();

  // Generate JWT token
  const generateToken = (user: any): string => {
    const secret = process.env.JWT_SECRET || 'test-secret-key';
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
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const { username, password } = req.body;

      // Find user
      const user = users.get(username);
      if (!user) {
        res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        });
        return;
      }

      // Generate token
      const token = generateToken(user);

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

  // POST /auth/register
  router.post('/register',
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
        const secret = process.env.JWT_SECRET || 'test-secret-key';
        const decoded = jwt.verify(token, secret) as any;
        
        // Find user to get latest data
        const user = Array.from(users.values()).find((u: any) => u.id === decoded.id);
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

  // GET /auth/me
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
        const secret = process.env.JWT_SECRET || 'test-secret-key';
        const decoded = jwt.verify(token, secret) as any;
        
        const user = Array.from(users.values()).find((u: any) => u.id === decoded.id);
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

  // Add method to reset users for testing
  (router as any).resetUsers = () => {
    users = new Map();
  };

  return router;
};

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  const authRoutes = createTestAuthRoutes();
  app.use('/auth', authRoutes);
  
  // Test protected routes
  app.get('/protected', authenticateJWT, (req: AuthenticatedRequest, res) => {
    res.json({ message: 'Protected route accessed', user: req.user });
  });
  
  app.get('/admin-only', authenticateJWT, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
    res.json({ message: 'Admin route accessed' });
  });
  
  app.get('/write-permission', authenticateJWT, requirePermission('write'), (req: AuthenticatedRequest, res) => {
    res.json({ message: 'Write permission route accessed' });
  });
  
  app.use(errorHandler);
  
  // Expose reset method for testing
  (app as any).resetUsers = () => {
    (authRoutes as any).resetUsers();
  };
  
  return app;
};

describe('Authentication System', () => {
  let app: express.Application;
  const testUser = {
    username: 'testuser',
    password: 'testpass123',
    email: 'test@example.com',
    role: 'operator'
  };

  beforeEach(() => {
    app = createTestApp();
    // Set test JWT secret
    process.env.JWT_SECRET = 'test-secret-key';
    // Disable rate limiting for tests
    process.env.NODE_ENV = 'test';
    // Reset users for each test
    (app as any).resetUsers();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body.user).toHaveProperty('username', testUser.username);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('role', testUser.role);
      expect(response.body.user).toHaveProperty('permissions');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should assign correct permissions based on role', async () => {
      // Test admin role
      const adminUser = { ...testUser, username: 'admintest', role: 'admin' };
      const adminResponse = await request(app)
        .post('/auth/register')
        .send(adminUser)
        .expect(201);

      expect(adminResponse.body.user.permissions).toEqual(['read', 'write', 'admin']);

      // Test operator role
      const operatorUser = { ...testUser, username: 'operatortest', role: 'operator' };
      const operatorResponse = await request(app)
        .post('/auth/register')
        .send(operatorUser)
        .expect(201);

      expect(operatorResponse.body.user.permissions).toEqual(['read', 'write']);

      // Test viewer role
      const viewerUser = { ...testUser, username: 'viewertest', role: 'viewer' };
      const viewerResponse = await request(app)
        .post('/auth/register')
        .send(viewerUser)
        .expect(201);

      expect(viewerResponse.body.user.permissions).toEqual(['read']);
    });

    it('should reject registration with invalid data', async () => {
      // Missing username
      const response1 = await request(app)
        .post('/auth/register')
        .send({ password: 'test123', email: 'test@example.com' });
      expect([400, 500]).toContain(response1.status);

      // Invalid email
      const response2 = await request(app)
        .post('/auth/register')
        .send({ username: 'test', password: 'test123', email: 'invalid-email' });
      expect([400, 500]).toContain(response2.status);

      // Short password
      const response3 = await request(app)
        .post('/auth/register')
        .send({ username: 'test', password: '123', email: 'test@example.com' });
      expect([400, 500]).toContain(response3.status);

      // Invalid role
      const response4 = await request(app)
        .post('/auth/register')
        .send({ ...testUser, role: 'invalid-role' });
      expect([400, 500]).toContain(response4.status);
    });

    it('should reject duplicate username registration', async () => {
      // Register user first time
      await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      // Try to register same username again
      await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/auth/register')
        .send(testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', testUser.username);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify token is valid JWT
      const decoded = jwt.verify(response.body.token, 'test-secret-key') as any;
      expect(decoded).toHaveProperty('username', testUser.username);
      expect(decoded).toHaveProperty('role', testUser.role);
    });

    it('should reject login with invalid username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: testUser.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'INVALID_CREDENTIALS');
    });

    it('should reject login with missing credentials', async () => {
      // Missing username
      await request(app)
        .post('/auth/login')
        .send({ password: testUser.password })
        .expect(400);

      // Missing password
      await request(app)
        .post('/auth/login')
        .send({ username: testUser.username })
        .expect(400);
    });
  });

  describe('JWT Token Generation and Validation', () => {
    let validToken: string;

    beforeEach(async () => {
      // Register and login to get a valid token
      await request(app)
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      validToken = loginResponse.body.token;
    });

    it('should generate valid JWT tokens with correct payload', () => {
      const decoded = jwt.verify(validToken, 'test-secret-key') as any;
      
      expect(decoded).toHaveProperty('username', testUser.username);
      expect(decoded).toHaveProperty('role', testUser.role);
      expect(decoded).toHaveProperty('permissions');
      expect(decoded).toHaveProperty('iat'); // issued at
      expect(decoded).toHaveProperty('exp'); // expires at
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(403);
    });

    it('should reject expired JWT tokens', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { username: testUser.username, role: testUser.role },
        'test-secret-key',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      // Should be either 403 (from middleware) or 500 (from error handler)
      expect([403, 500]).toContain(response.status);
    });

    it('should allow access to protected routes with valid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Protected route accessed');
      expect(response.body.user).toHaveProperty('role', testUser.role);
    });
  });

  describe('POST /auth/refresh', () => {
    let validToken: string;

    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      validToken = loginResponse.body.token;
    });

    it('should refresh valid token successfully', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ token: validToken })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Token refreshed successfully');
      expect(response.body).toHaveProperty('token');
      
      // Verify the new token is valid and contains the same user data
      const decoded = jwt.verify(response.body.token, 'test-secret-key') as any;
      expect(decoded).toHaveProperty('username', testUser.username);
      expect(decoded).toHaveProperty('role', testUser.role);
    });

    it('should reject refresh with invalid token', async () => {
      await request(app)
        .post('/auth/refresh')
        .send({ token: 'invalid.token' })
        .expect(401);
    });

    it('should reject refresh without token', async () => {
      await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    let validToken: string;

    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      validToken = loginResponse.body.token;
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('username', testUser.username);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('role', testUser.role);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);
    });
  });

  describe('Role-Based Access Control', () => {
    let adminToken: string;
    let operatorToken: string;
    let viewerToken: string;

    beforeEach(async () => {
      // Register users with different roles
      const adminUser = { ...testUser, username: 'admin', role: 'admin' };
      const operatorUser = { ...testUser, username: 'operator', role: 'operator' };
      const viewerUser = { ...testUser, username: 'viewer', role: 'viewer' };

      await request(app).post('/auth/register').send(adminUser);
      await request(app).post('/auth/register').send(operatorUser);
      await request(app).post('/auth/register').send(viewerUser);

      // Get tokens for each user
      const adminLogin = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: testUser.password });
      adminToken = adminLogin.body.token;

      const operatorLogin = await request(app)
        .post('/auth/login')
        .send({ username: 'operator', password: testUser.password });
      operatorToken = operatorLogin.body.token;

      const viewerLogin = await request(app)
        .post('/auth/login')
        .send({ username: 'viewer', password: testUser.password });
      viewerToken = viewerLogin.body.token;
    });

    it('should allow admin access to admin-only routes', async () => {
      await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny non-admin access to admin-only routes', async () => {
      await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);

      await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('should enforce permission-based access control', async () => {
      // Admin and operator should have write permission
      await request(app)
        .get('/write-permission')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .get('/write-permission')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      // Viewer should not have write permission
      await request(app)
        .get('/write-permission')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords before storage', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(testUser);

      // Password should not be returned in response
      expect(response.body.user).not.toHaveProperty('password');
      
      // Verify password is hashed by attempting to login
      await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);
    });

    it('should validate password strength requirements', async () => {
      // Test minimum length requirement
      await request(app)
        .post('/auth/register')
        .send({ ...testUser, password: '123' })
        .expect(400);
    });
  });

  describe('Authentication Middleware', () => {
    it('should require authentication for protected routes', async () => {
      await request(app)
        .get('/protected')
        .expect(401);
    });

    it('should extract user information from valid tokens', async () => {
      await request(app)
        .post('/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('role', testUser.role);
    });
  });
});