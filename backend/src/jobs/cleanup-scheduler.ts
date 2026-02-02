/**
 * Data Cleanup Job Scheduler
 * Schedules the data cleanup job to run hourly
 * Requirement 42.3
 * 
 * Usage:
 * ```typescript
 * import { startCleanupScheduler, stopCleanupScheduler } from './jobs/cleanup-scheduler';
 * 
 * // Start the scheduler
 * startCleanupScheduler();
 * 
 * // Stop the scheduler
 * stopCleanupScheduler();
 * ```
 */

import { dataCleanupJob } from './data-cleanup.job';
import { dataRetentionConfig } from '../services/data-retention-config.service';
import { logger } from '../utils/logger';

let cleanupInterval: NodeJS.Timeout | null = null;
const HOURLY_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Start the cleanup scheduler
 * Runs cleanup job every hour
 */
export function startCleanupScheduler(): void {
  // Check if retention is enabled
  if (!dataRetentionConfig.isEnabled()) {
    logger.info('Data cleanup scheduler not started - retention disabled');
    return;
  }

  // Stop existing scheduler if running
  if (cleanupInterval) {
    stopCleanupScheduler();
  }

  logger.info('Starting data cleanup scheduler (runs hourly)');

  // Run immediately on startup
  runCleanup();

  // Schedule to run every hour
  cleanupInterval = setInterval(() => {
    runCleanup();
  }, HOURLY_MS);

  logger.info('Data cleanup scheduler started successfully');
}

/**
 * Stop the cleanup scheduler
 */
export function stopCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Data cleanup scheduler stopped');
  }
}

/**
 * Run the cleanup job
 */
async function runCleanup(): Promise<void> {
  try {
    logger.info('Running scheduled data cleanup job');
    const result = await dataCleanupJob.execute();

    if (result.executed) {
      logger.info('Scheduled cleanup completed', {
        totalDeleted: result.totalDeleted,
        deletedByType: result.deletedByType,
        vacuumExecuted: result.vacuumExecuted,
        executionTimeMs: result.executionTimeMs,
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } else {
      logger.info('Scheduled cleanup skipped', {
        reason: result.reason,
      });
    }
  } catch (error) {
    logger.error('Scheduled cleanup job failed', { error });
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  enabled: boolean;
} {
  return {
    running: cleanupInterval !== null,
    enabled: dataRetentionConfig.isEnabled(),
  };
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  logger.info('Received SIGINT, stopping cleanup scheduler...');
  stopCleanupScheduler();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, stopping cleanup scheduler...');
  stopCleanupScheduler();
});
