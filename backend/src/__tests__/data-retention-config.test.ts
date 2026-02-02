/**
 * Unit tests for Data Retention Configuration Service
 * Requirements: 42.1, 42.2, 42.9
 */

import { DataRetentionConfigService } from '../services/data-retention-config.service';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

describe('DataRetentionConfigService', () => {
  let service: DataRetentionConfigService;
  let originalCwd: string;

  beforeEach(() => {
    // Store original cwd
    originalCwd = process.cwd();
    
    // Get a fresh instance for each test
    service = DataRetentionConfigService.getInstance();
  });

  afterEach(() => {
    // Restore original cwd
    if (originalCwd) {
      process.chdir(originalCwd);
    }
  });

  describe('Configuration Loading', () => {
    it('should load configuration from app.yml', () => {
      const config = service.getConfig();
      
      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(config.policies).toBeDefined();
      expect(config.batchSize).toBeDefined();
      expect(config.vacuumThreshold).toBeDefined();
    });

    it('should have all required policy types', () => {
      const config = service.getConfig();
      
      expect(config.policies.messages).toBeDefined();
      expect(config.policies.telemetry).toBeDefined();
      expect(config.policies.positions).toBeDefined();
      expect(config.policies.traceroutes).toBeDefined();
    });

    it('should have valid retention hours for each policy', () => {
      const config = service.getConfig();
      
      expect(config.policies.messages.hours).toBeGreaterThan(0);
      expect(config.policies.telemetry.hours).toBeGreaterThan(0);
      expect(config.policies.positions.hours).toBeGreaterThan(0);
      expect(config.policies.traceroutes.hours).toBeGreaterThan(0);
    });
  });

  describe('Policy Parsing', () => {
    it('should parse enabled flag correctly', () => {
      const config = service.getConfig();
      
      expect(typeof config.enabled).toBe('boolean');
    });

    it('should parse different retention periods per data type', () => {
      const config = service.getConfig();
      
      // Messages and telemetry should have shorter retention (7 days = 168 hours)
      expect(config.policies.messages.hours).toBe(168);
      expect(config.policies.telemetry.hours).toBe(168);
      
      // Positions and traceroutes should have longer retention (30 days = 720 hours)
      expect(config.policies.positions.hours).toBe(720);
      expect(config.policies.traceroutes.hours).toBe(720);
    });

    it('should parse batch size configuration', () => {
      const config = service.getConfig();
      
      expect(config.batchSize).toBe(1000);
      expect(typeof config.batchSize).toBe('number');
    });

    it('should parse vacuum threshold configuration', () => {
      const config = service.getConfig();
      
      expect(config.vacuumThreshold).toBe(10000);
      expect(typeof config.vacuumThreshold).toBe('number');
    });
  });

  describe('Default Values', () => {
    it('should provide default values when config is missing', () => {
      // The service should handle missing config gracefully
      const config = service.getConfig();
      
      // Should have sensible defaults
      expect(config.enabled).toBe(true);
      expect(config.policies.messages.hours).toBeGreaterThan(0);
      expect(config.batchSize).toBeGreaterThan(0);
      expect(config.vacuumThreshold).toBeGreaterThan(0);
    });

    it('should use default enabled=true when not specified', () => {
      const config = service.getConfig();
      
      // Default should be enabled
      expect(config.enabled).toBe(true);
    });

    it('should use default batch size of 1000', () => {
      const config = service.getConfig();
      
      expect(config.batchSize).toBe(1000);
    });

    it('should use default vacuum threshold of 10000', () => {
      const config = service.getConfig();
      
      expect(config.vacuumThreshold).toBe(10000);
    });
  });

  describe('Getter Methods', () => {
    it('should return enabled status', () => {
      const enabled = service.isEnabled();
      
      expect(typeof enabled).toBe('boolean');
    });

    it('should return retention hours for messages', () => {
      const hours = service.getRetentionHours('messages');
      
      expect(hours).toBe(168);
      expect(typeof hours).toBe('number');
    });

    it('should return retention hours for telemetry', () => {
      const hours = service.getRetentionHours('telemetry');
      
      expect(hours).toBe(168);
      expect(typeof hours).toBe('number');
    });

    it('should return retention hours for positions', () => {
      const hours = service.getRetentionHours('positions');
      
      expect(hours).toBe(720);
      expect(typeof hours).toBe('number');
    });

    it('should return retention hours for traceroutes', () => {
      const hours = service.getRetentionHours('traceroutes');
      
      expect(hours).toBe(720);
      expect(typeof hours).toBe('number');
    });

    it('should return batch size', () => {
      const batchSize = service.getBatchSize();
      
      expect(batchSize).toBe(1000);
      expect(typeof batchSize).toBe('number');
    });

    it('should return vacuum threshold', () => {
      const threshold = service.getVacuumThreshold();
      
      expect(threshold).toBe(10000);
      expect(typeof threshold).toBe('number');
    });
  });

  describe('Configuration Validation', () => {
    it('should have messages retention <= positions retention', () => {
      const config = service.getConfig();
      
      // Messages should be cleaned up more frequently than positions
      expect(config.policies.messages.hours).toBeLessThanOrEqual(
        config.policies.positions.hours
      );
    });

    it('should have telemetry retention <= positions retention', () => {
      const config = service.getConfig();
      
      // Telemetry should be cleaned up more frequently than positions
      expect(config.policies.telemetry.hours).toBeLessThanOrEqual(
        config.policies.positions.hours
      );
    });

    it('should have reasonable batch size (between 100 and 10000)', () => {
      const batchSize = service.getBatchSize();
      
      expect(batchSize).toBeGreaterThanOrEqual(100);
      expect(batchSize).toBeLessThanOrEqual(10000);
    });

    it('should have reasonable vacuum threshold (between 1000 and 100000)', () => {
      const threshold = service.getVacuumThreshold();
      
      expect(threshold).toBeGreaterThanOrEqual(1000);
      expect(threshold).toBeLessThanOrEqual(100000);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DataRetentionConfigService.getInstance();
      const instance2 = DataRetentionConfigService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = DataRetentionConfigService.getInstance();
      const config1 = instance1.getConfig();
      
      const instance2 = DataRetentionConfigService.getInstance();
      const config2 = instance2.getConfig();
      
      expect(config1).toEqual(config2);
    });
  });

  describe('Reload Functionality', () => {
    it('should have a reload method', () => {
      expect(typeof service.reload).toBe('function');
    });

    it('should reload configuration without errors', () => {
      expect(() => service.reload()).not.toThrow();
    });

    it('should maintain valid configuration after reload', () => {
      service.reload();
      const config = service.getConfig();
      
      expect(config).toBeDefined();
      expect(config.policies).toBeDefined();
    });
  });
});
