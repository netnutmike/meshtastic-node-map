import { Router, Request, Response } from 'express';
import { StatisticsService } from '../services/statistics.service';
import { validate, schemas } from '../middleware/validation';
import { optionalAuth, requirePermission, optionalPermission } from '../middleware/auth';
import { applyRateLimit } from '../middleware/rateLimiting';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { getDatabase } from '../database/connection';

const db = getDatabase();

const router = Router();
const statisticsService = new StatisticsService(db);

// GET /statistics/network - Get comprehensive network statistics
router.get('/network',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { networkId, startDate, endDate } = req.query;

    logger.debug('Fetching network statistics', { networkId, startDate, endDate });

    const timeRange = startDate && endDate ? {
      start: new Date(startDate as string),
      end: new Date(endDate as string)
    } : undefined;

    const statistics = await statisticsService.getNetworkStatistics(
      networkId as string | undefined,
      timeRange
    );

    res.json({
      data: statistics,
      generatedAt: new Date()
    });
  })
);

// GET /statistics/nodes/distribution - Get node type distribution
router.get('/nodes/distribution',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { networkId } = req.query;

    logger.debug('Fetching node type distribution', { networkId });

    const distribution = await statisticsService.getNodeTypeDistribution(
      networkId as string | undefined
    );

    res.json({
      data: distribution,
      generatedAt: new Date()
    });
  })
);

// GET /statistics/messages - Get message analytics
router.get('/messages',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { networkId, startDate, endDate } = req.query;

    logger.debug('Fetching message analytics', { networkId, startDate, endDate });

    const timeRange = startDate && endDate ? {
      start: new Date(startDate as string),
      end: new Date(endDate as string)
    } : undefined;

    const analytics = await statisticsService.getMessageAnalytics(
      networkId as string | undefined,
      timeRange
    );

    res.json({
      data: analytics,
      generatedAt: new Date()
    });
  })
);

// GET /statistics/utilization - Get network utilization report
router.get('/utilization',
  applyRateLimit('read'),
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { networkId } = req.query;

    logger.debug('Fetching utilization report', { networkId });

    const report = await statisticsService.getUtilizationReport(
      networkId as string | undefined
    );

    res.json({
      data: report,
      generatedAt: new Date()
    });
  })
);

// GET /statistics/export - Export statistics in various formats
router.get('/export',
  applyRateLimit('read'),
  optionalAuth,
  optionalPermission('read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { format = 'json', type = 'network', networkId } = req.query;

    if (!['csv', 'json', 'pdf'].includes(format as string)) {
      return res.status(400).json({
        error: 'Invalid format. Supported formats: csv, json, pdf'
      });
    }

    if (!['network', 'messages', 'utilization'].includes(type as string)) {
      return res.status(400).json({
        error: 'Invalid type. Supported types: network, messages, utilization'
      });
    }

    logger.info('Exporting statistics', { format, type, networkId });

    const exportData = await statisticsService.exportStatistics(
      format as 'csv' | 'json' | 'pdf',
      type as 'network' | 'messages' | 'utilization',
      networkId as string | undefined
    );

    // Set appropriate headers based on format
    switch (format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
        return res.send(convertToCSV(exportData.data));
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
        // Note: PDF generation would require additional library like puppeteer
        return res.status(501).json({ error: 'PDF export not yet implemented' });
      case 'json':
      default:
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
        return res.json(exportData.data);
    }
  })
);

// Helper function to convert data to CSV format
function convertToCSV(data: any): string {
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  } else if (typeof data === 'object') {
    // Convert object to key-value CSV
    const entries = Object.entries(data);
    return entries.map(([key, value]) => `${key},${value}`).join('\n');
  }
  
  return String(data);
}

export { router as statisticsRoutes };