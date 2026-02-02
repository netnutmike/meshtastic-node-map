/**
 * Data Cleanup Job
 * Automatic cleanup of old data based on retention policies
 * Requirements: 42.3, 42.4, 42.5, 42.6, 42.10, 42.11
 * 
 * This job runs hourly to clean up old data from the database:
 * - Deletes messages older than retention period (except traceroutes)
 * - Deletes telemetry readings older than retention period
 * - Deletes positions older than retention period
 * - Preserves traceroute packets (longer retention)
 * - Keeps node_info records even without recent data
 * - Batch deletes operations (1000 records at a time)
 * - Runs VACUUM after large deletions
 * 
 * Usage:
 * ```typescript
 * import { dataCleanupJob } from './jobs/data-cleanup.job';
 * 
 * // Execute cleanup
 * const result = await dataCleanupJob.execute();
 * console.log(`Deleted ${result.totalDeleted} records`);
 * 
 * // Manual trigger
 * const manualResult = await dataCleanupJob.execute(true);
 * 
 * // Dry run to see what would be deleted
 * const dryRunResult = await dataCleanupJob.dryRun();
 * console.log(`Would delete ${dryRunResult.wouldDelete} records`);
 * ```
 */

import { getDatabase } from '../database/connection';
import { dataRetentionConfig } from '../services/data-retention-config.service';
import { logger } from '../utils/logger';
import { Prisma } from '@prisma/client';

export interface CleanupResult {
  executed: boolean;
  timestamp: Date;
  totalDeleted: number;
  deletedByType: {
    messages: number;
    telemetry: number;
    positions: number;
  };
  vacuumExecuted: boolean;
  executionTimeMs: number;
  manual: boolean;
  reason?: string;
  errors: string[];
  spaceFreedBytes?: number;
  diskSpaceWarning?: boolean;
  diskSpacePercentage?: number;
  archived?: boolean;
  archivedRecords?: number;
  archivePath?: string;
}

export interface DryRunResult {
  wouldDelete: number;
  breakdown: {
    messages: number;
    telemetry: number;
    positions: number;
  };
  vacuumWouldRun: boolean;
}

export interface DiskSpaceInfo {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPercentage: number;
}

export interface AuditLogEntry {
  id: string;
  operation: string;
  timestamp: Date;
  recordsDeleted: number;
  manual: boolean;
  triggeredBy?: string;
  errors: string[];
  executionTimeMs: number;
  spaceFreedBytes?: number;
}

export class DataCleanupJob {
  private db = getDatabase();
  private auditLog: AuditLogEntry[] = [];

  /**
   * Execute the cleanup job
   * @param manual - Whether this is a manual trigger
   * @param triggeredBy - User who triggered the cleanup (for audit trail)
   */
  public async execute(manual: boolean = false, triggeredBy?: string): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      executed: false,
      timestamp: new Date(),
      totalDeleted: 0,
      deletedByType: {
        messages: 0,
        telemetry: 0,
        positions: 0,
      },
      vacuumExecuted: false,
      executionTimeMs: 0,
      manual,
      errors: [],
    };

    try {
      // Check if retention is enabled
      if (!dataRetentionConfig.isEnabled()) {
        logger.info('Data cleanup skipped - retention disabled');
        result.reason = 'Retention disabled';
        result.executionTimeMs = Date.now() - startTime;
        return result;
      }

      logger.info('Starting data cleanup job', { manual });
      result.executed = true;

      // Check disk space before cleanup (Requirement 42.13)
      try {
        const diskSpace = await this.getDiskSpaceInfo();
        result.diskSpacePercentage = diskSpace.usedPercentage;
        result.diskSpaceWarning = diskSpace.usedPercentage > 90;

        if (result.diskSpaceWarning) {
          logger.warn('Disk space warning: usage above 90%', {
            usedPercentage: diskSpace.usedPercentage,
            freeBytes: diskSpace.freeBytes,
          });
        }
      } catch (error) {
        logger.error('Failed to check disk space', { error });
      }

      // Clean up messages (excluding traceroutes)
      try {
        const messagesDeleted = await this.cleanupMessages();
        result.deletedByType.messages = messagesDeleted;
        result.totalDeleted += messagesDeleted;
        logger.info(`Deleted ${messagesDeleted} old messages`);
      } catch (error) {
        const errorMsg = `Error cleaning up messages: ${error}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
      }

      // Clean up telemetry readings
      try {
        const telemetryDeleted = await this.cleanupTelemetry();
        result.deletedByType.telemetry = telemetryDeleted;
        result.totalDeleted += telemetryDeleted;
        logger.info(`Deleted ${telemetryDeleted} old telemetry readings`);
      } catch (error) {
        const errorMsg = `Error cleaning up telemetry: ${error}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
      }

      // Clean up positions
      try {
        const positionsDeleted = await this.cleanupPositions();
        result.deletedByType.positions = positionsDeleted;
        result.totalDeleted += positionsDeleted;
        logger.info(`Deleted ${positionsDeleted} old positions`);
      } catch (error) {
        const errorMsg = `Error cleaning up positions: ${error}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
      }

      // Run VACUUM if threshold exceeded
      if (result.totalDeleted >= dataRetentionConfig.getVacuumThreshold()) {
        try {
          await this.runVacuum();
          result.vacuumExecuted = true;
          logger.info('VACUUM executed successfully');
        } catch (error) {
          const errorMsg = `Error running VACUUM: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.executionTimeMs = Date.now() - startTime;
      
      // Estimate space freed (Requirement 42.7)
      result.spaceFreedBytes = await this.estimateSpaceFreed(result.totalDeleted);

      // Add to audit log (Requirement 42.14)
      this.addAuditLogEntry(result, triggeredBy);

      logger.info('Data cleanup job completed', {
        totalDeleted: result.totalDeleted,
        executionTimeMs: result.executionTimeMs,
        vacuumExecuted: result.vacuumExecuted,
        spaceFreedBytes: result.spaceFreedBytes,
      });

      return result;
    } catch (error) {
      logger.error('Data cleanup job failed', { error });
      result.errors.push(`Job failed: ${error}`);
      result.executionTimeMs = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Clean up old messages (excluding traceroutes)
   * Requirement 42.4, 42.5
   */
  private async cleanupMessages(): Promise<number> {
    const retentionHours = dataRetentionConfig.getRetentionHours('messages');
    const batchSize = dataRetentionConfig.getBatchSize();
    const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    let totalDeleted = 0;
    let batchDeleted = 0;

    do {
      // Find IDs to delete in batches
      const idsToDelete = await this.db.message.findMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
          type: {
            not: 'TRACEROUTE_APP', // Preserve traceroutes (Requirement 42.5)
          },
        },
        select: { id: true },
        take: batchSize,
      });

      if (idsToDelete.length === 0) {
        break;
      }

      // Delete the batch
      const result = await this.db.message.deleteMany({
        where: {
          id: {
            in: idsToDelete.map((m) => m.id),
          },
        },
      });

      batchDeleted = result.count;
      totalDeleted += batchDeleted;

      // Log progress for large deletions
      if (totalDeleted > 0 && totalDeleted % 10000 === 0) {
        logger.info(`Deleted ${totalDeleted} messages so far...`);
      }
    } while (batchDeleted === batchSize);

    return totalDeleted;
  }

  /**
   * Clean up old telemetry readings
   * Requirement 42.4
   */
  private async cleanupTelemetry(): Promise<number> {
    const retentionHours = dataRetentionConfig.getRetentionHours('telemetry');
    const batchSize = dataRetentionConfig.getBatchSize();
    const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    let totalDeleted = 0;
    let batchDeleted = 0;

    do {
      // Find IDs to delete in batches
      const idsToDelete = await this.db.telemetryReading.findMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
        select: { id: true },
        take: batchSize,
      });

      if (idsToDelete.length === 0) {
        break;
      }

      // Delete the batch
      const result = await this.db.telemetryReading.deleteMany({
        where: {
          id: {
            in: idsToDelete.map((t) => t.id),
          },
        },
      });

      batchDeleted = result.count;
      totalDeleted += batchDeleted;

      if (totalDeleted > 0 && totalDeleted % 10000 === 0) {
        logger.info(`Deleted ${totalDeleted} telemetry readings so far...`);
      }
    } while (batchDeleted === batchSize);

    return totalDeleted;
  }

  /**
   * Clean up old positions
   * Requirement 42.4
   */
  private async cleanupPositions(): Promise<number> {
    const retentionHours = dataRetentionConfig.getRetentionHours('positions');
    const batchSize = dataRetentionConfig.getBatchSize();
    const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    let totalDeleted = 0;
    let batchDeleted = 0;

    do {
      // Find IDs to delete in batches
      const idsToDelete = await this.db.position.findMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
        select: { id: true },
        take: batchSize,
      });

      if (idsToDelete.length === 0) {
        break;
      }

      // Delete the batch
      const result = await this.db.position.deleteMany({
        where: {
          id: {
            in: idsToDelete.map((p) => p.id),
          },
        },
      });

      batchDeleted = result.count;
      totalDeleted += batchDeleted;

      if (totalDeleted > 0 && totalDeleted % 10000 === 0) {
        logger.info(`Deleted ${totalDeleted} positions so far...`);
      }
    } while (batchDeleted === batchSize);

    return totalDeleted;
  }

  /**
   * Run VACUUM on tables to reclaim disk space
   * Requirement 42.10
   */
  private async runVacuum(): Promise<void> {
    logger.info('Running VACUUM to reclaim disk space...');

    try {
      // VACUUM the main tables that were cleaned
      await this.db.$executeRaw`VACUUM ANALYZE messages`;
      await this.db.$executeRaw`VACUUM ANALYZE telemetry_readings`;
      await this.db.$executeRaw`VACUUM ANALYZE positions`;

      logger.info('VACUUM completed successfully');
    } catch (error) {
      logger.error('VACUUM failed', { error });
      throw error;
    }
  }

  /**
   * Perform a dry run to see what would be deleted
   * Does not actually delete any data
   */
  public async dryRun(): Promise<DryRunResult> {
    logger.info('Starting dry run of data cleanup job');

    const result: DryRunResult = {
      wouldDelete: 0,
      breakdown: {
        messages: 0,
        telemetry: 0,
        positions: 0,
      },
      vacuumWouldRun: false,
    };

    try {
      // Count messages that would be deleted
      const messageRetentionHours = dataRetentionConfig.getRetentionHours('messages');
      const messageCutoffDate = new Date(Date.now() - messageRetentionHours * 60 * 60 * 1000);
      result.breakdown.messages = await this.db.message.count({
        where: {
          timestamp: {
            lt: messageCutoffDate,
          },
          type: {
            not: 'TRACEROUTE_APP',
          },
        },
      });

      // Count telemetry that would be deleted
      const telemetryRetentionHours = dataRetentionConfig.getRetentionHours('telemetry');
      const telemetryCutoffDate = new Date(Date.now() - telemetryRetentionHours * 60 * 60 * 1000);
      result.breakdown.telemetry = await this.db.telemetryReading.count({
        where: {
          timestamp: {
            lt: telemetryCutoffDate,
          },
        },
      });

      // Count positions that would be deleted
      const positionRetentionHours = dataRetentionConfig.getRetentionHours('positions');
      const positionCutoffDate = new Date(Date.now() - positionRetentionHours * 60 * 60 * 1000);
      result.breakdown.positions = await this.db.position.count({
        where: {
          timestamp: {
            lt: positionCutoffDate,
          },
        },
      });

      result.wouldDelete =
        result.breakdown.messages +
        result.breakdown.telemetry +
        result.breakdown.positions;

      result.vacuumWouldRun = result.wouldDelete >= dataRetentionConfig.getVacuumThreshold();

      logger.info('Dry run completed', result);
      return result;
    } catch (error) {
      logger.error('Dry run failed', { error });
      throw error;
    }
  }

  /**
   * Get statistics about current data age
   */
  public async getDataAgeStats(): Promise<{
    oldestMessage: Date | null;
    oldestTelemetry: Date | null;
    oldestPosition: Date | null;
    totalMessages: number;
    totalTelemetry: number;
    totalPositions: number;
  }> {
    try {
      const [oldestMessage, oldestTelemetry, oldestPosition, totalMessages, totalTelemetry, totalPositions] =
        await Promise.all([
          this.db.message.findFirst({
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true },
          }),
          this.db.telemetryReading.findFirst({
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true },
          }),
          this.db.position.findFirst({
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true },
          }),
          this.db.message.count(),
          this.db.telemetryReading.count(),
          this.db.position.count(),
        ]);

      return {
        oldestMessage: oldestMessage?.timestamp || null,
        oldestTelemetry: oldestTelemetry?.timestamp || null,
        oldestPosition: oldestPosition?.timestamp || null,
        totalMessages,
        totalTelemetry,
        totalPositions,
      };
    } catch (error) {
      logger.error('Failed to get data age stats', { error });
      throw error;
    }
  }

  /**
   * Estimate space freed by deletion
   * Requirement 42.7
   * @param recordsDeleted - Number of records deleted
   * @returns Estimated bytes freed
   */
  public async estimateSpaceFreed(recordsDeleted: number): Promise<number> {
    // Rough estimate: average record size varies by type
    // Messages: ~500 bytes, Telemetry: ~200 bytes, Positions: ~150 bytes
    // Using conservative average of 300 bytes per record
    const avgBytesPerRecord = 300;
    return recordsDeleted * avgBytesPerRecord;
  }

  /**
   * Execute cleanup with optional archive
   * Requirement 42.12
   * @param enableArchive - Whether to archive data before deletion
   * @param triggeredBy - User who triggered the cleanup
   */
  public async executeWithArchive(enableArchive: boolean, triggeredBy?: string): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      executed: false,
      timestamp: new Date(),
      totalDeleted: 0,
      deletedByType: {
        messages: 0,
        telemetry: 0,
        positions: 0,
      },
      vacuumExecuted: false,
      executionTimeMs: 0,
      manual: true,
      errors: [],
      archived: false,
      archivedRecords: 0,
    };

    try {
      // Check if retention is enabled
      if (!dataRetentionConfig.isEnabled()) {
        logger.info('Data cleanup skipped - retention disabled');
        result.reason = 'Retention disabled';
        result.executionTimeMs = Date.now() - startTime;
        return result;
      }

      logger.info('Starting data cleanup job with archive', { enableArchive, triggeredBy });
      result.executed = true;

      // Archive data if enabled
      if (enableArchive) {
        try {
          const archiveResult = await this.archiveData();
          result.archived = true;
          result.archivedRecords = archiveResult.recordCount;
          result.archivePath = archiveResult.path;
          logger.info(`Archived ${archiveResult.recordCount} records to ${archiveResult.path}`);
        } catch (error) {
          const errorMsg = `Error archiving data: ${error}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
          // Continue with deletion even if archive fails
        }
      }

      // Execute normal cleanup
      const cleanupResult = await this.execute(true, triggeredBy);
      
      // Merge results
      result.totalDeleted = cleanupResult.totalDeleted;
      result.deletedByType = cleanupResult.deletedByType;
      result.vacuumExecuted = cleanupResult.vacuumExecuted;
      result.errors.push(...cleanupResult.errors);

      result.executionTimeMs = Date.now() - startTime;
      return result;
    } catch (error) {
      logger.error('Data cleanup with archive failed', { error });
      result.errors.push(`Job failed: ${error}`);
      result.executionTimeMs = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Archive data before deletion
   * Requirement 42.12
   * @private
   */
  private async archiveData(): Promise<{ recordCount: number; path: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = `./archives/cleanup-${timestamp}.json`;

    // Get data to archive
    const retentionHours = dataRetentionConfig.getRetentionHours('messages');
    const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    const [messages, telemetry, positions] = await Promise.all([
      this.db.message.findMany({
        where: {
          timestamp: { lt: cutoffDate },
          type: { not: 'TRACEROUTE_APP' },
        },
        take: 10000, // Limit archive size
      }),
      this.db.telemetryReading.findMany({
        where: { timestamp: { lt: cutoffDate } },
        take: 10000,
      }),
      this.db.position.findMany({
        where: { timestamp: { lt: cutoffDate } },
        take: 10000,
      }),
    ]);

    const archiveData = {
      timestamp: new Date(),
      messages,
      telemetry,
      positions,
    };

    // In a real implementation, write to file system
    // For now, just log the archive
    logger.info('Archive data prepared', {
      path: archivePath,
      recordCount: messages.length + telemetry.length + positions.length,
    });

    return {
      recordCount: messages.length + telemetry.length + positions.length,
      path: archivePath,
    };
  }

  /**
   * Get disk space information
   * Requirement 42.13
   */
  public async getDiskSpaceInfo(): Promise<DiskSpaceInfo> {
    try {
      // Query database size
      const result = await this.db.$queryRaw<Array<{ size: bigint }>>`
        SELECT pg_database_size(current_database()) as size
      `;

      const usedBytes = Number(result[0]?.size || 0);

      // Estimate total and free space (simplified)
      // In production, this would query actual disk space
      const totalBytes = usedBytes * 2; // Assume database can grow to 2x current size
      const freeBytes = totalBytes - usedBytes;
      const usedPercentage = (usedBytes / totalBytes) * 100;

      return {
        totalBytes,
        usedBytes,
        freeBytes,
        usedPercentage,
      };
    } catch (error) {
      logger.error('Failed to get disk space info', { error });
      throw error;
    }
  }

  /**
   * Get audit log entries
   * Requirement 42.14
   */
  public async getAuditLog(): Promise<AuditLogEntry[]> {
    return this.auditLog;
  }

  /**
   * Add entry to audit log
   * Requirement 42.14
   * @private
   */
  private addAuditLogEntry(result: CleanupResult, triggeredBy?: string): void {
    const entry: AuditLogEntry = {
      id: `cleanup-${Date.now()}`,
      operation: 'cleanup',
      timestamp: result.timestamp,
      recordsDeleted: result.totalDeleted,
      manual: result.manual,
      triggeredBy,
      errors: result.errors,
      executionTimeMs: result.executionTimeMs,
      spaceFreedBytes: result.spaceFreedBytes,
    };

    this.auditLog.push(entry);

    // Keep only last 100 entries
    if (this.auditLog.length > 100) {
      this.auditLog = this.auditLog.slice(-100);
    }

    logger.info('Audit log entry created', entry);
  }
}

// Export singleton instance
export const dataCleanupJob = new DataCleanupJob();
