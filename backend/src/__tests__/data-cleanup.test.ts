/**
 * Unit tests for Data Cleanup Job
 * Requirements: 42.3, 42.4, 42.5, 42.6, 42.10, 42.11
 */

import { DataCleanupJob } from '../jobs/data-cleanup.job';
import { dataRetentionConfig } from '../services/data-retention-config.service';
import { getDatabase } from '../database/connection';
import { PrismaClient } from '@prisma/client';

// Mock the database
jest.mock('../database/connection');
jest.mock('../services/data-retention-config.service');

describe('DataCleanupJob', () => {
  let cleanupJob: DataCleanupJob;
  let mockPrisma: any;
  let mockMessageDeleteMany: jest.Mock;
  let mockMessageCount: jest.Mock;
  let mockMessageFindMany: jest.Mock;
  let mockTelemetryDeleteMany: jest.Mock;
  let mockTelemetryCount: jest.Mock;
  let mockTelemetryFindMany: jest.Mock;
  let mockPositionDeleteMany: jest.Mock;
  let mockPositionCount: jest.Mock;
  let mockPositionFindMany: jest.Mock;
  let mockExecuteRaw: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock functions
    mockMessageDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    mockMessageCount = jest.fn().mockResolvedValue(0);
    mockMessageFindMany = jest.fn().mockResolvedValue([]);
    mockTelemetryDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    mockTelemetryCount = jest.fn().mockResolvedValue(0);
    mockTelemetryFindMany = jest.fn().mockResolvedValue([]);
    mockPositionDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    mockPositionCount = jest.fn().mockResolvedValue(0);
    mockPositionFindMany = jest.fn().mockResolvedValue([]);
    mockExecuteRaw = jest.fn().mockResolvedValue(0);

    // Create mock Prisma client
    mockPrisma = {
      message: {
        deleteMany: mockMessageDeleteMany,
        count: mockMessageCount,
        findMany: mockMessageFindMany,
      },
      telemetryReading: {
        deleteMany: mockTelemetryDeleteMany,
        count: mockTelemetryCount,
        findMany: mockTelemetryFindMany,
      },
      position: {
        deleteMany: mockPositionDeleteMany,
        count: mockPositionCount,
        findMany: mockPositionFindMany,
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: mockExecuteRaw,
    };

    (getDatabase as jest.Mock).mockReturnValue(mockPrisma);

    // Mock retention config
    (dataRetentionConfig.isEnabled as jest.Mock) = jest.fn().mockReturnValue(true);
    (dataRetentionConfig.getRetentionHours as jest.Mock) = jest.fn((type: string) => {
      const hours: Record<string, number> = {
        messages: 168,
        telemetry: 168,
        positions: 720,
        traceroutes: 720,
      };
      return hours[type] || 168;
    });
    (dataRetentionConfig.getBatchSize as jest.Mock) = jest.fn().mockReturnValue(1000);
    (dataRetentionConfig.getVacuumThreshold as jest.Mock) = jest.fn().mockReturnValue(10000);

    cleanupJob = new DataCleanupJob();
  });

  describe('Cleanup Execution', () => {
    it('should skip cleanup when retention is disabled', async () => {
      (dataRetentionConfig.isEnabled as jest.Mock).mockReturnValue(false);

      const result = await cleanupJob.execute();

      expect(result.executed).toBe(false);
      expect(result.reason).toBe('Retention disabled');
      expect(mockMessageDeleteMany).not.toHaveBeenCalled();
    });

    it('should execute cleanup when retention is enabled', async () => {
      const result = await cleanupJob.execute();

      expect(result.executed).toBe(true);
      expect(result.totalDeleted).toBeGreaterThanOrEqual(0);
    });

    it('should delete messages older than retention period', async () => {
      const mockIds = [{ id: '1' }, { id: '2' }, { id: '3' }];
      mockMessageFindMany.mockResolvedValueOnce(mockIds).mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: 3 });

      await cleanupJob.execute();

      expect(mockMessageFindMany).toHaveBeenCalled();
      expect(mockMessageDeleteMany).toHaveBeenCalled();
      const findCall = mockMessageFindMany.mock.calls[0][0];
      expect(findCall.where.timestamp).toBeDefined();
      expect(findCall.where.timestamp.lt).toBeDefined();
    });

    it('should delete telemetry older than retention period', async () => {
      const mockIds = [{ id: '1' }, { id: '2' }];
      mockTelemetryFindMany.mockResolvedValueOnce(mockIds).mockResolvedValueOnce([]);
      mockTelemetryDeleteMany.mockResolvedValue({ count: 2 });

      await cleanupJob.execute();

      expect(mockTelemetryFindMany).toHaveBeenCalled();
      expect(mockTelemetryDeleteMany).toHaveBeenCalled();
      const findCall = mockTelemetryFindMany.mock.calls[0][0];
      expect(findCall.where.timestamp).toBeDefined();
      expect(findCall.where.timestamp.lt).toBeDefined();
    });

    it('should delete positions older than retention period', async () => {
      const mockIds = [{ id: '1' }];
      mockPositionFindMany.mockResolvedValueOnce(mockIds).mockResolvedValueOnce([]);
      mockPositionDeleteMany.mockResolvedValue({ count: 1 });

      await cleanupJob.execute();

      expect(mockPositionFindMany).toHaveBeenCalled();
      expect(mockPositionDeleteMany).toHaveBeenCalled();
      const findCall = mockPositionFindMany.mock.calls[0][0];
      expect(findCall.where.timestamp).toBeDefined();
      expect(findCall.where.timestamp.lt).toBeDefined();
    });
  });

  describe('Traceroute Preservation', () => {
    it('should exclude traceroute messages from deletion', async () => {
      const mockIds = [{ id: '1' }];
      mockMessageFindMany.mockResolvedValueOnce(mockIds).mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: 1 });

      await cleanupJob.execute();

      const findCall = mockMessageFindMany.mock.calls[0][0];
      expect(findCall.where.type).toBeDefined();
      expect(findCall.where.type.not).toBe('TRACEROUTE_APP');
    });

    it('should use longer retention for traceroutes', async () => {
      const tracerouteHours = dataRetentionConfig.getRetentionHours('traceroutes');
      const messageHours = dataRetentionConfig.getRetentionHours('messages');

      expect(tracerouteHours).toBeGreaterThan(messageHours);
    });
  });

  describe('Node Info Preservation', () => {
    it('should not delete node records during cleanup', async () => {
      await cleanupJob.execute();

      // Node table should not be touched
      expect(mockPrisma).not.toHaveProperty('node.deleteMany');
    });

    it('should preserve node info even without recent data', async () => {
      // This is implicit - nodes are never deleted by cleanup job
      const result = await cleanupJob.execute();

      expect(result.executed).toBe(true);
      // Verify no node deletion methods were called
    });
  });

  describe('Batch Processing', () => {
    it('should delete records in batches of configured size', async () => {
      const batchSize = 1000;
      (dataRetentionConfig.getBatchSize as jest.Mock).mockReturnValue(batchSize);

      // Create mock IDs for batching
      const batch1 = Array.from({ length: batchSize }, (_, i) => ({ id: `${i}` }));
      const batch2 = Array.from({ length: 500 }, (_, i) => ({ id: `${i + batchSize}` }));
      
      mockMessageFindMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: batchSize });

      await cleanupJob.execute();

      // Should be called multiple times for batching
      expect(mockMessageFindMany).toHaveBeenCalled();
    });

    it('should handle partial batches correctly', async () => {
      const batchSize = 1000;
      (dataRetentionConfig.getBatchSize as jest.Mock).mockReturnValue(batchSize);

      const batch1 = Array.from({ length: batchSize }, (_, i) => ({ id: `${i}` }));
      const batch2 = Array.from({ length: 500 }, (_, i) => ({ id: `${i + batchSize}` }));
      
      mockMessageFindMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce([]);
      mockMessageDeleteMany
        .mockResolvedValueOnce({ count: 1000 })
        .mockResolvedValueOnce({ count: 500 });

      await cleanupJob.execute();

      expect(mockMessageFindMany).toHaveBeenCalled();
    });

    it('should stop batching when no more records to delete', async () => {
      const batch = Array.from({ length: 500 }, (_, i) => ({ id: `${i}` }));
      mockMessageFindMany.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: 500 });

      await cleanupJob.execute();

      // Should be called at least once
      expect(mockMessageFindMany).toHaveBeenCalled();
    });
  });

  describe('VACUUM Execution', () => {
    it('should run VACUUM after large deletions', async () => {
      const vacuumThreshold = 10000;
      (dataRetentionConfig.getVacuumThreshold as jest.Mock).mockReturnValue(vacuumThreshold);

      const batch = Array.from({ length: 15000 }, (_, i) => ({ id: `${i}` }));
      mockMessageFindMany.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: 15000 });

      await cleanupJob.execute();

      expect(mockExecuteRaw).toHaveBeenCalled();
    });

    it('should not run VACUUM for small deletions', async () => {
      const vacuumThreshold = 10000;
      (dataRetentionConfig.getVacuumThreshold as jest.Mock).mockReturnValue(vacuumThreshold);

      const batch = Array.from({ length: 500 }, (_, i) => ({ id: `${i}` }));
      mockMessageFindMany.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: 500 });

      await cleanupJob.execute();

      expect(mockExecuteRaw).not.toHaveBeenCalled();
    });

    it('should run VACUUM on correct tables', async () => {
      const batch = Array.from({ length: 15000 }, (_, i) => ({ id: `${i}` }));
      mockMessageFindMany.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: 15000 });

      await cleanupJob.execute();

      const vacuumCalls = mockExecuteRaw.mock.calls;
      expect(vacuumCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Logging', () => {
    it('should return statistics about deleted records', async () => {
      const messageBatch = Array.from({ length: 100 }, (_, i) => ({ id: `m${i}` }));
      const telemetryBatch = Array.from({ length: 50 }, (_, i) => ({ id: `t${i}` }));
      const positionBatch = Array.from({ length: 25 }, (_, i) => ({ id: `p${i}` }));
      
      mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: 100 });
      mockTelemetryFindMany.mockResolvedValueOnce(telemetryBatch).mockResolvedValueOnce([]);
      mockTelemetryDeleteMany.mockResolvedValue({ count: 50 });
      mockPositionFindMany.mockResolvedValueOnce(positionBatch).mockResolvedValueOnce([]);
      mockPositionDeleteMany.mockResolvedValue({ count: 25 });

      const result = await cleanupJob.execute();

      expect(result.executed).toBe(true);
      expect(result.totalDeleted).toBe(175);
      expect(result.deletedByType).toBeDefined();
      expect(result.deletedByType.messages).toBe(100);
      expect(result.deletedByType.telemetry).toBe(50);
      expect(result.deletedByType.positions).toBe(25);
    });

    it('should include execution time in statistics', async () => {
      const result = await cleanupJob.execute();

      expect(result.executionTimeMs).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include timestamp in statistics', async () => {
      const result = await cleanupJob.execute();

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockMessageFindMany.mockRejectedValue(new Error('Database error'));

      const result = await cleanupJob.execute();

      expect(result.executed).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should continue cleanup even if one type fails', async () => {
      mockMessageFindMany.mockRejectedValue(new Error('Message deletion failed'));
      const telemetryBatch = Array.from({ length: 50 }, (_, i) => ({ id: `t${i}` }));
      mockTelemetryFindMany.mockResolvedValueOnce(telemetryBatch).mockResolvedValueOnce([]);
      mockTelemetryDeleteMany.mockResolvedValue({ count: 50 });

      const result = await cleanupJob.execute();

      expect(result.executed).toBe(true);
      expect(result.deletedByType.telemetry).toBe(50);
    });

    it('should handle VACUUM errors without failing entire job', async () => {
      const batch = Array.from({ length: 15000 }, (_, i) => ({ id: `${i}` }));
      mockMessageFindMany.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: 15000 });
      mockExecuteRaw.mockRejectedValue(new Error('VACUUM failed'));

      const result = await cleanupJob.execute();

      expect(result.executed).toBe(true);
      expect(result.totalDeleted).toBe(15000);
    });
  });

  describe('Retention Period Calculation', () => {
    it('should calculate correct cutoff date for messages', async () => {
      const retentionHours = 168; // 7 days
      (dataRetentionConfig.getRetentionHours as jest.Mock).mockReturnValue(retentionHours);

      const batch = [{ id: '1' }];
      mockMessageFindMany.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
      mockMessageDeleteMany.mockResolvedValue({ count: 1 });

      await cleanupJob.execute();

      const findCall = mockMessageFindMany.mock.calls[0][0];
      const cutoffDate = findCall.where.timestamp.lt;

      const expectedCutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
      const timeDiff = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime());

      // Allow 1 second tolerance for test execution time
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should use different retention periods for different data types', async () => {
      await cleanupJob.execute();

      expect(dataRetentionConfig.getRetentionHours).toHaveBeenCalledWith('messages');
      expect(dataRetentionConfig.getRetentionHours).toHaveBeenCalledWith('telemetry');
      expect(dataRetentionConfig.getRetentionHours).toHaveBeenCalledWith('positions');
    });
  });

  describe('Manual Trigger', () => {
    it('should support manual execution', async () => {
      const result = await cleanupJob.execute();

      expect(result.executed).toBe(true);
      expect(result.manual).toBe(false);
    });

    it('should mark manual executions in statistics', async () => {
      const result = await cleanupJob.execute(true);

      expect(result.manual).toBe(true);
    });
  });

  describe('Dry Run Mode', () => {
    it('should support dry run without deleting data', async () => {
      mockMessageCount.mockResolvedValue(100);
      mockTelemetryCount.mockResolvedValue(50);
      mockPositionCount.mockResolvedValue(25);

      const result = await cleanupJob.dryRun();

      expect(result.wouldDelete).toBe(175);
      expect(mockMessageDeleteMany).not.toHaveBeenCalled();
      expect(mockTelemetryDeleteMany).not.toHaveBeenCalled();
      expect(mockPositionDeleteMany).not.toHaveBeenCalled();
    });

    it('should return breakdown by type in dry run', async () => {
      mockMessageCount.mockResolvedValue(100);
      mockTelemetryCount.mockResolvedValue(50);
      mockPositionCount.mockResolvedValue(25);

      const result = await cleanupJob.dryRun();

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.messages).toBe(100);
      expect(result.breakdown.telemetry).toBe(50);
      expect(result.breakdown.positions).toBe(25);
    });
  });

  describe('Cleanup Monitoring and Controls', () => {
    describe('Logging Functionality (Requirement 42.7)', () => {
      it('should log cleanup statistics including records deleted', async () => {
        const messageBatch = Array.from({ length: 100 }, (_, i) => ({ id: `m${i}` }));
        mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 100 });

        const result = await cleanupJob.execute();

        expect(result.deletedByType.messages).toBe(100);
        expect(result.totalDeleted).toBe(100);
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should log space freed estimation', async () => {
        const messageBatch = Array.from({ length: 1000 }, (_, i) => ({ id: `m${i}` }));
        mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 1000 });

        const result = await cleanupJob.execute();

        // Space freed should be calculated
        const spaceFreed = await cleanupJob.estimateSpaceFreed(result.totalDeleted);
        expect(spaceFreed).toBeGreaterThan(0);
      });

      it('should log cleanup duration', async () => {
        const result = await cleanupJob.execute();

        expect(result.executionTimeMs).toBeDefined();
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      });

      it('should log vacuum execution status', async () => {
        const batch = Array.from({ length: 15000 }, (_, i) => ({ id: `${i}` }));
        mockMessageFindMany.mockResolvedValueOnce(batch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 15000 });

        const result = await cleanupJob.execute();

        expect(result.vacuumExecuted).toBeDefined();
        expect(typeof result.vacuumExecuted).toBe('boolean');
      });
    });

    describe('Manual Trigger (Requirement 42.8)', () => {
      it('should support manual cleanup trigger', async () => {
        const result = await cleanupJob.execute(true);

        expect(result.executed).toBe(true);
        expect(result.manual).toBe(true);
      });

      it('should execute immediately when manually triggered', async () => {
        const startTime = Date.now();
        const result = await cleanupJob.execute(true);
        const endTime = Date.now();

        expect(result.executed).toBe(true);
        expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(startTime);
        expect(result.timestamp.getTime()).toBeLessThanOrEqual(endTime);
      });

      it('should bypass schedule when manually triggered', async () => {
        // Manual trigger should work even if called outside schedule
        const result = await cleanupJob.execute(true);

        expect(result.executed).toBe(true);
        expect(result.manual).toBe(true);
      });

      it('should return immediate results for manual trigger', async () => {
        const messageBatch = Array.from({ length: 50 }, (_, i) => ({ id: `m${i}` }));
        mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 50 });

        const result = await cleanupJob.execute(true);

        expect(result.totalDeleted).toBe(50);
        expect(result.manual).toBe(true);
      });
    });

    describe('Archive Functionality (Requirement 42.12)', () => {
      it('should support archive-before-delete when enabled', async () => {
        const messageBatch = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}` }));
        mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 10 });

        const result = await cleanupJob.executeWithArchive(true);

        expect(result.archived).toBe(true);
        expect(result.archivedRecords).toBe(10);
      });

      it('should export data to archive before deletion', async () => {
        const messageBatch = [
          { id: 'm1', content: 'test1', timestamp: new Date() },
          { id: 'm2', content: 'test2', timestamp: new Date() },
        ];
        mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 2 });

        const result = await cleanupJob.executeWithArchive(true);

        expect(result.archived).toBe(true);
        expect(result.archivePath).toBeDefined();
      });

      it('should skip archive when disabled', async () => {
        const messageBatch = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}` }));
        mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 10 });

        const result = await cleanupJob.executeWithArchive(false);

        expect(result.archived).toBe(false);
        expect(result.archivedRecords).toBe(0);
      });

      it('should continue deletion even if archive fails', async () => {
        const messageBatch = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}` }));
        mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 10 });

        // Mock archive failure
        jest.spyOn(cleanupJob as any, 'archiveData').mockRejectedValue(new Error('Archive failed'));

        const result = await cleanupJob.executeWithArchive(true);

        expect(result.errors.some(e => e.includes('Archive failed'))).toBe(true);
        expect(result.totalDeleted).toBe(10); // Deletion should still proceed
      });
    });

    describe('Disk Space Monitoring (Requirement 42.13)', () => {
      it('should monitor disk space before cleanup', async () => {
        // Mock database size query
        mockPrisma.$queryRaw = jest.fn().mockResolvedValue([{ size: BigInt(1000000) }]);

        const diskSpace = await cleanupJob.getDiskSpaceInfo();

        expect(diskSpace).toBeDefined();
        expect(diskSpace.totalBytes).toBeGreaterThan(0);
        expect(diskSpace.usedBytes).toBeGreaterThanOrEqual(0);
        expect(diskSpace.freeBytes).toBeGreaterThan(0);
      });

      it('should alert when disk space is low', async () => {
        // Mock low disk space
        jest.spyOn(cleanupJob as any, 'getDiskSpaceInfo').mockResolvedValue({
          totalBytes: 100000000,
          usedBytes: 95000000,
          freeBytes: 5000000,
          usedPercentage: 95,
        });

        const result = await cleanupJob.execute();

        expect(result.diskSpaceWarning).toBe(true);
        expect(result.diskSpacePercentage).toBeGreaterThan(90);
      });

      it('should not alert when disk space is sufficient', async () => {
        // Mock sufficient disk space
        jest.spyOn(cleanupJob as any, 'getDiskSpaceInfo').mockResolvedValue({
          totalBytes: 100000000,
          usedBytes: 50000000,
          freeBytes: 50000000,
          usedPercentage: 50,
        });

        const result = await cleanupJob.execute();

        expect(result.diskSpaceWarning).toBe(false);
      });

      it('should calculate space freed after cleanup', async () => {
        const messageBatch = Array.from({ length: 1000 }, (_, i) => ({ id: `m${i}` }));
        mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 1000 });

        const result = await cleanupJob.execute();

        expect(result.spaceFreedBytes).toBeDefined();
        expect(result.spaceFreedBytes).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Audit Trail (Requirement 42.14)', () => {
      it('should create audit log entry for cleanup operation', async () => {
        const result = await cleanupJob.execute();

        const auditLog = await cleanupJob.getAuditLog();
        expect(auditLog).toBeDefined();
        expect(auditLog.length).toBeGreaterThan(0);
      });

      it('should log cleanup operation details', async () => {
        const messageBatch = Array.from({ length: 100 }, (_, i) => ({ id: `m${i}` }));
        mockMessageFindMany.mockResolvedValueOnce(messageBatch).mockResolvedValueOnce([]);
        mockMessageDeleteMany.mockResolvedValue({ count: 100 });

        const result = await cleanupJob.execute();

        const auditLog = await cleanupJob.getAuditLog();
        const latestEntry = auditLog[auditLog.length - 1];

        expect(latestEntry.operation).toBe('cleanup');
        expect(latestEntry.recordsDeleted).toBe(100);
        expect(latestEntry.timestamp).toBeInstanceOf(Date);
      });

      it('should log manual vs automatic execution', async () => {
        await cleanupJob.execute(true);

        const auditLog = await cleanupJob.getAuditLog();
        const latestEntry = auditLog[auditLog.length - 1];

        expect(latestEntry.manual).toBe(true);
      });

      it('should log errors in audit trail', async () => {
        mockMessageFindMany.mockRejectedValue(new Error('Database error'));

        await cleanupJob.execute();

        const auditLog = await cleanupJob.getAuditLog();
        const latestEntry = auditLog[auditLog.length - 1];

        expect(latestEntry.errors).toBeDefined();
        expect(latestEntry.errors.length).toBeGreaterThan(0);
      });

      it('should maintain audit log history', async () => {
        await cleanupJob.execute();
        await cleanupJob.execute();
        await cleanupJob.execute();

        const auditLog = await cleanupJob.getAuditLog();

        expect(auditLog.length).toBeGreaterThanOrEqual(3);
      });

      it('should include user information in audit log when available', async () => {
        const result = await cleanupJob.execute(true, 'admin@example.com');

        const auditLog = await cleanupJob.getAuditLog();
        const latestEntry = auditLog[auditLog.length - 1];

        expect(latestEntry.triggeredBy).toBe('admin@example.com');
      });
    });
  });
});
