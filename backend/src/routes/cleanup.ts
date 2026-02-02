/**
 * Data Cleanup API Routes
 * Provides endpoints for manual cleanup trigger and status
 * Requirements: 42.7, 42.8
 */

import express, { Request, Response } from 'express';
import { dataCleanupJob } from '../jobs/data-cleanup.job';
import { getSchedulerStatus } from '../jobs/cleanup-scheduler';
import { dataRetentionConfig } from '../services/data-retention-config.service';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/cleanup/status
 * Get cleanup job status and configuration
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const schedulerStatus = getSchedulerStatus();
    const config = dataRetentionConfig.getConfig();
    const dataAgeStats = await dataCleanupJob.getDataAgeStats();

    res.json({
      scheduler: schedulerStatus,
      config: {
        enabled: config.enabled,
        policies: config.policies,
        batchSize: config.batchSize,
        vacuumThreshold: config.vacuumThreshold,
      },
      dataAge: dataAgeStats,
    });
  } catch (error) {
    logger.error('Error getting cleanup status', { error });
    res.status(500).json({
      error: 'Failed to get cleanup status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/cleanup/execute
 * Manually trigger cleanup job
 * Requirement 42.8
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { archive, triggeredBy } = req.body;
    logger.info('Manual cleanup triggered via API', { archive, triggeredBy });

    let result;
    if (archive) {
      result = await dataCleanupJob.executeWithArchive(true, triggeredBy);
    } else {
      result = await dataCleanupJob.execute(true, triggeredBy);
    }

    res.json({
      success: result.executed,
      result: {
        timestamp: result.timestamp,
        totalDeleted: result.totalDeleted,
        deletedByType: result.deletedByType,
        vacuumExecuted: result.vacuumExecuted,
        executionTimeMs: result.executionTimeMs,
        spaceFreedBytes: result.spaceFreedBytes,
        diskSpaceWarning: result.diskSpaceWarning,
        diskSpacePercentage: result.diskSpacePercentage,
        archived: result.archived,
        archivedRecords: result.archivedRecords,
        archivePath: result.archivePath,
        errors: result.errors,
        reason: result.reason,
      },
    });
  } catch (error) {
    logger.error('Manual cleanup execution failed', { error });
    res.status(500).json({
      error: 'Cleanup execution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/cleanup/dry-run
 * Preview what would be deleted without actually deleting
 */
router.get('/dry-run', async (req: Request, res: Response) => {
  try {
    logger.info('Dry run cleanup requested via API');

    const result = await dataCleanupJob.dryRun();

    res.json({
      wouldDelete: result.wouldDelete,
      breakdown: result.breakdown,
      vacuumWouldRun: result.vacuumWouldRun,
    });
  } catch (error) {
    logger.error('Dry run cleanup failed', { error });
    res.status(500).json({
      error: 'Dry run failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/cleanup/disk-space
 * Get disk space information
 * Requirement 42.13
 */
router.get('/disk-space', async (req: Request, res: Response) => {
  try {
    const diskSpace = await dataCleanupJob.getDiskSpaceInfo();

    res.json({
      totalBytes: diskSpace.totalBytes,
      usedBytes: diskSpace.usedBytes,
      freeBytes: diskSpace.freeBytes,
      usedPercentage: diskSpace.usedPercentage,
      warning: diskSpace.usedPercentage > 90,
    });
  } catch (error) {
    logger.error('Failed to get disk space info', { error });
    res.status(500).json({
      error: 'Failed to get disk space info',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/cleanup/audit-log
 * Get cleanup audit log
 * Requirement 42.14
 */
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const auditLog = await dataCleanupJob.getAuditLog();

    res.json({
      entries: auditLog,
      count: auditLog.length,
    });
  } catch (error) {
    logger.error('Failed to get audit log', { error });
    res.status(500).json({
      error: 'Failed to get audit log',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
