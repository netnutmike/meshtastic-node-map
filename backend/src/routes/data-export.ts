import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { DataExportService, ExportOptions, BackupOptions } from '../services/data-export.service';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import Joi from 'joi';

const router = Router();
const exportService = new DataExportService();

// Validation schemas
const exportSchema = Joi.object({
  format: Joi.string().valid('csv', 'json', 'kml').required(),
  filters: Joi.object({
    networkId: Joi.string().uuid().optional(),
    nodeIds: Joi.array().items(Joi.string().uuid()).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    messageTypes: Joi.array().items(Joi.string()).optional(),
    telemetryTypes: Joi.array().items(Joi.string()).optional(),
    includePositions: Joi.boolean().optional(),
    includeTelemetry: Joi.boolean().optional(),
    includeMessages: Joi.boolean().optional(),
    includeNodes: Joi.boolean().optional()
  }).required(),
  filename: Joi.string().optional()
});

const backupSchema = Joi.object({
  includeNodes: Joi.boolean().optional(),
  includePositions: Joi.boolean().optional(),
  includeTelemetry: Joi.boolean().optional(),
  includeMessages: Joi.boolean().optional(),
  includeNetworks: Joi.boolean().optional(),
  compress: Joi.boolean().optional()
});

const publicUrlSchema = Joi.object({
  filters: Joi.object({
    networkId: Joi.string().uuid().optional(),
    nodeIds: Joi.array().items(Joi.string().uuid()).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    messageTypes: Joi.array().items(Joi.string()).optional(),
    telemetryTypes: Joi.array().items(Joi.string()).optional(),
    includePositions: Joi.boolean().optional(),
    includeTelemetry: Joi.boolean().optional(),
    includeMessages: Joi.boolean().optional(),
    includeNodes: Joi.boolean().optional()
  }).required(),
  expiresIn: Joi.number().min(1).max(168).optional() // 1 hour to 1 week
});

// POST /export - Export data in specified format
router.post('/',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('read'),
  validate(exportSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const exportOptions: ExportOptions = req.body;

    logger.info('Data export requested:', {
      format: exportOptions.format,
      filters: exportOptions.filters,
      user: req.user?.id
    });

    try {
      const filePath = await exportService.exportData(exportOptions);
      const filename = path.basename(filePath);
      
      // Set appropriate headers for file download
      const mimeTypes = {
        csv: 'text/csv',
        json: 'application/json',
        kml: 'application/vnd.google-earth.kml+xml'
      };

      res.setHeader('Content-Type', mimeTypes[exportOptions.format]);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream the file to the response
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);

      // Clean up the temporary file after sending
      setTimeout(async () => {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          logger.warn(`Failed to cleanup export file: ${error}`);
        }
      }, 5000);

    } catch (error) {
      logger.error('Export failed:', error);
      throw new ValidationError('Export failed: ' + (error as Error).message);
    }
  })
);

// GET /export/formats - Get available export formats and their descriptions
router.get('/formats',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      data: {
        csv: {
          name: 'CSV',
          description: 'Comma-separated values format for spreadsheet applications',
          mimeType: 'text/csv',
          extension: '.csv',
          features: ['Tabular data', 'Excel compatible', 'Lightweight']
        },
        json: {
          name: 'JSON',
          description: 'JavaScript Object Notation for programmatic access',
          mimeType: 'application/json',
          extension: '.json',
          features: ['Structured data', 'API friendly', 'Preserves data types']
        },
        kml: {
          name: 'KML',
          description: 'Keyhole Markup Language for geographic visualization',
          mimeType: 'application/vnd.google-earth.kml+xml',
          extension: '.kml',
          features: ['Geographic data', 'Google Earth compatible', 'Position tracking']
        }
      }
    });
  })
);

// POST /backup - Create a complete database backup
router.post('/backup',
  applyRateLimit('export'),
  optionalAuth,
  requirePermission('admin'),
  validate(backupSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const backupOptions: BackupOptions = req.body;

    logger.info('Database backup requested:', {
      options: backupOptions,
      user: req.user?.id
    });

    try {
      const backupPath = await exportService.createBackup(backupOptions);
      const filename = path.basename(backupPath);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream the backup file to the response
      const fileBuffer = await fs.readFile(backupPath);
      res.send(fileBuffer);

      // Keep backup file for a while before cleanup
      setTimeout(async () => {
        try {
          await fs.unlink(backupPath);
        } catch (error) {
          logger.warn(`Failed to cleanup backup file: ${error}`);
        }
      }, 60000); // 1 minute

    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw new ValidationError('Backup failed: ' + (error as Error).message);
    }
  })
);

// POST /restore - Restore data from backup
router.post('/restore',
  applyRateLimit('export'),
  optionalAuth,
  requirePermission('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would typically handle file upload
    // For now, we'll expect the backup file path in the request body
    const { backupPath } = req.body;

    if (!backupPath) {
      throw new ValidationError('Backup file path is required');
    }

    logger.info('Database restore requested:', {
      backupPath,
      user: req.user?.id
    });

    try {
      // Verify file exists
      await fs.access(backupPath);
      
      await exportService.restoreBackup(backupPath);

      res.json({
        message: 'Database restored successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Restore failed:', error);
      if ((error as any).code === 'ENOENT') {
        throw new NotFoundError('Backup file not found');
      }
      throw new ValidationError('Restore failed: ' + (error as Error).message);
    }
  })
);

// POST /public-url - Generate a public sharing URL for filtered data
router.post('/public-url',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('read'),
  validate(publicUrlSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { filters, expiresIn = 24 } = req.body;

    logger.info('Public URL generation requested:', {
      filters,
      expiresIn,
      user: req.user?.id
    });

    try {
      const publicUrl = await exportService.generatePublicUrl(filters, expiresIn);

      res.json({
        data: {
          url: publicUrl,
          expiresAt: new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString(),
          filters
        }
      });

    } catch (error) {
      logger.error('Public URL generation failed:', error);
      throw new ValidationError('URL generation failed: ' + (error as Error).message);
    }
  })
);

// GET /reports - Get available report templates
router.get('/reports',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      data: {
        networkSummary: {
          name: 'Network Summary Report',
          description: 'Overview of network status, node counts, and activity',
          format: 'json',
          filters: ['networkId', 'startDate', 'endDate']
        },
        nodeInventory: {
          name: 'Node Inventory Report',
          description: 'Detailed list of all nodes with hardware and status information',
          format: 'csv',
          filters: ['networkId', 'hardwareModel', 'role']
        },
        messageAnalysis: {
          name: 'Message Analysis Report',
          description: 'Message traffic patterns and routing analysis',
          format: 'json',
          filters: ['networkId', 'startDate', 'endDate', 'messageTypes']
        },
        telemetryTrends: {
          name: 'Telemetry Trends Report',
          description: 'Historical telemetry data and trend analysis',
          format: 'csv',
          filters: ['nodeIds', 'startDate', 'endDate', 'telemetryTypes']
        },
        geographicCoverage: {
          name: 'Geographic Coverage Report',
          description: 'KML file showing node positions and coverage areas',
          format: 'kml',
          filters: ['networkId', 'startDate', 'endDate']
        }
      }
    });
  })
);

// POST /reports/:reportType - Generate a specific report
router.post('/reports/:reportType',
  applyRateLimit('write'),
  optionalAuth,
  requirePermission('read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { reportType } = req.params;
    const { filters = {}, filename } = req.body;

    logger.info('Report generation requested:', {
      reportType,
      filters,
      user: req.user?.id
    });

    // Define report configurations
    const reportConfigs: Record<string, ExportOptions> = {
      networkSummary: {
        format: 'json',
        filters: { ...filters, includeNodes: true, includePositions: false, includeTelemetry: false, includeMessages: false }
      },
      nodeInventory: {
        format: 'csv',
        filters: { ...filters, includeNodes: true, includePositions: true, includeTelemetry: false, includeMessages: false }
      },
      messageAnalysis: {
        format: 'json',
        filters: { ...filters, includeNodes: false, includePositions: false, includeTelemetry: false, includeMessages: true }
      },
      telemetryTrends: {
        format: 'csv',
        filters: { ...filters, includeNodes: false, includePositions: false, includeTelemetry: true, includeMessages: false }
      },
      geographicCoverage: {
        format: 'kml',
        filters: { ...filters, includeNodes: true, includePositions: true, includeTelemetry: false, includeMessages: false }
      }
    };

    const reportConfig = reportConfigs[reportType];
    if (!reportConfig) {
      throw new ValidationError(`Unknown report type: ${reportType}`);
    }

    if (filename) {
      reportConfig.filename = filename;
    }

    try {
      const filePath = await exportService.exportData(reportConfig);
      const reportFilename = path.basename(filePath);
      
      // Set appropriate headers for file download
      const mimeTypes = {
        csv: 'text/csv',
        json: 'application/json',
        kml: 'application/vnd.google-earth.kml+xml'
      };

      res.setHeader('Content-Type', mimeTypes[reportConfig.format]);
      res.setHeader('Content-Disposition', `attachment; filename="${reportFilename}"`);

      // Stream the file to the response
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);

      // Clean up the temporary file after sending
      setTimeout(async () => {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          logger.warn(`Failed to cleanup report file: ${error}`);
        }
      }, 5000);

    } catch (error) {
      logger.error('Report generation failed:', error);
      throw new ValidationError('Report generation failed: ' + (error as Error).message);
    }
  })
);

export { router as dataExportRoutes };