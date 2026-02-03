import { Router } from 'express';
import { validate, schemas } from '../middleware/validation';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';
import { securityAuditService } from '../services/security-audit.service';
import Joi from 'joi';

const router = Router();

// All security audit routes require authentication and admin role
router.use(authenticateJWT);
router.use(requireRole(['admin']));

// GET /audit-log - Get security audit log
router.get('/audit-log',
  applyRateLimit('read'),
  validate(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    level: Joi.string().valid('info', 'warn', 'error').optional(),
    category: Joi.string().valid('authentication', 'authorization', 'api_access', 'security_violation', 'system').optional(),
    source: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(50)
  }), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { startDate, endDate, level, category, source, page, limit } = req.query as any;
    
    const offset = (page - 1) * limit;
    
    const { events, total } = await securityAuditService.getAuditLog({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      level,
      category,
      source,
      limit,
      offset
    });
    
    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  })
);

// GET /security-stats - Get security statistics
router.get('/security-stats',
  applyRateLimit('read'),
  validate(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }), { property: 'query' }),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query as any;
    
    const timeRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate)
    } : undefined;
    
    const stats = await securityAuditService.getSecurityStats(timeRange);
    
    res.json({
      stats,
      timeRange: timeRange || { start: null, end: null }
    });
  })
);

// POST /test-security-event - Create test security event (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test-security-event',
    applyRateLimit('write'),
    validate(Joi.object({
      level: Joi.string().valid('info', 'warn', 'error').required(),
      category: Joi.string().valid('authentication', 'authorization', 'api_access', 'security_violation', 'system').required(),
      event: Joi.string().required(),
      description: Joi.string().required(),
      source: Joi.object({
        ipAddress: Joi.string().ip().optional(),
        userAgent: Joi.string().optional(),
        userId: Joi.string().optional(),
        apiKeyId: Joi.string().optional(),
        endpoint: Joi.string().optional(),
        method: Joi.string().optional()
      }).optional(),
      metadata: Joi.object().optional()
    })),
    asyncHandler(async (req, res) => {
      const { level, category, event, description, source, metadata } = req.body;
      
      await securityAuditService.logEvent({
        level,
        category,
        event,
        description,
        source: source || {},
        metadata
      });
      
      res.json({
        message: 'Test security event logged successfully'
      });
    })
  );
}

export { router as securityAuditRoutes };