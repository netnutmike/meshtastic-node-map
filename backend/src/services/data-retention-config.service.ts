/**
 * Data Retention Configuration Service
 * Loads and manages data retention policies from configuration
 * Requirements: 42.1, 42.2, 42.9
 * 
 * Usage:
 * ```typescript
 * import { dataRetentionConfig } from './services/data-retention-config.service';
 * 
 * // Check if retention is enabled
 * if (dataRetentionConfig.isEnabled()) {
 *   // Get retention hours for messages
 *   const messageRetention = dataRetentionConfig.getRetentionHours('messages');
 *   
 *   // Get batch size for delete operations
 *   const batchSize = dataRetentionConfig.getBatchSize();
 *   
 *   // Get vacuum threshold
 *   const vacuumThreshold = dataRetentionConfig.getVacuumThreshold();
 * }
 * 
 * // Reload configuration after changes
 * dataRetentionConfig.reload();
 * ```
 * 
 * Configuration in config/app.yml:
 * ```yaml
 * retention:
 *   enabled: true
 *   policies:
 *     messages:
 *       hours: 168  # 7 days
 *     telemetry:
 *       hours: 168  # 7 days
 *     positions:
 *       hours: 720  # 30 days
 *     traceroutes:
 *       hours: 720  # 30 days
 *   batchSize: 1000
 *   vacuumThreshold: 10000
 * ```
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface RetentionPolicy {
  hours: number;
}

export interface RetentionPolicies {
  messages: RetentionPolicy;
  telemetry: RetentionPolicy;
  positions: RetentionPolicy;
  traceroutes: RetentionPolicy;
}

export interface RetentionConfig {
  enabled: boolean;
  policies: RetentionPolicies;
  batchSize: number;
  vacuumThreshold: number;
}

export class DataRetentionConfigService {
  private config: RetentionConfig | null = null;
  private static instance: DataRetentionConfigService;

  private constructor() {
    this.loadConfiguration();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DataRetentionConfigService {
    if (!DataRetentionConfigService.instance) {
      DataRetentionConfigService.instance = new DataRetentionConfigService();
    }
    return DataRetentionConfigService.instance;
  }

  /**
   * Load retention configuration from app.yml
   */
  private loadConfiguration(): void {
    try {
      // Try multiple possible config paths
      const possiblePaths = [
        path.join(process.cwd(), 'config/app.yml'),
        path.join(process.cwd(), '../config/app.yml'),
        path.join(__dirname, '../../config/app.yml'),
        path.join(__dirname, '../../../config/app.yml')
      ];

      let configPath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          configPath = testPath;
          break;
        }
      }

      if (!configPath) {
        logger.warn('Could not find app.yml configuration file, using default retention settings');
        this.config = this.getDefaultConfig();
        return;
      }

      logger.info(`Loading retention config from: ${configPath}`);
      const configContent = fs.readFileSync(configPath, 'utf8');
      const appConfig = yaml.load(configContent) as any;

      if (appConfig.retention) {
        this.config = this.parseRetentionConfig(appConfig.retention);
        logger.info('Data retention configuration loaded successfully', {
          enabled: this.config.enabled,
          policies: this.config.policies,
          batchSize: this.config.batchSize,
          vacuumThreshold: this.config.vacuumThreshold
        });
      } else {
        logger.warn('No retention configuration found in app.yml, using defaults');
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      logger.error('Error loading retention configuration', { error });
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Parse retention configuration with validation
   */
  private parseRetentionConfig(retentionData: any): RetentionConfig {
    const config: RetentionConfig = {
      enabled: retentionData.enabled !== undefined ? retentionData.enabled : true,
      policies: {
        messages: { hours: 168 },
        telemetry: { hours: 168 },
        positions: { hours: 720 },
        traceroutes: { hours: 720 }
      },
      batchSize: 1000,
      vacuumThreshold: 10000
    };

    // Parse policies
    if (retentionData.policies) {
      if (retentionData.policies.messages?.hours !== undefined) {
        config.policies.messages.hours = retentionData.policies.messages.hours;
      }
      if (retentionData.policies.telemetry?.hours !== undefined) {
        config.policies.telemetry.hours = retentionData.policies.telemetry.hours;
      }
      if (retentionData.policies.positions?.hours !== undefined) {
        config.policies.positions.hours = retentionData.policies.positions.hours;
      }
      if (retentionData.policies.traceroutes?.hours !== undefined) {
        config.policies.traceroutes.hours = retentionData.policies.traceroutes.hours;
      }
    }

    // Parse batch size
    if (retentionData.batchSize !== undefined) {
      config.batchSize = retentionData.batchSize;
    }

    // Parse vacuum threshold
    if (retentionData.vacuumThreshold !== undefined) {
      config.vacuumThreshold = retentionData.vacuumThreshold;
    }

    return config;
  }

  /**
   * Get default retention configuration
   */
  private getDefaultConfig(): RetentionConfig {
    return {
      enabled: true,
      policies: {
        messages: { hours: 168 },      // 7 days
        telemetry: { hours: 168 },     // 7 days
        positions: { hours: 720 },     // 30 days
        traceroutes: { hours: 720 }    // 30 days
      },
      batchSize: 1000,
      vacuumThreshold: 10000
    };
  }

  /**
   * Get current retention configuration
   */
  public getConfig(): RetentionConfig {
    if (!this.config) {
      this.loadConfiguration();
    }
    return this.config || this.getDefaultConfig();
  }

  /**
   * Check if retention is enabled
   */
  public isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  /**
   * Get retention hours for a specific data type
   */
  public getRetentionHours(dataType: keyof RetentionPolicies): number {
    return this.getConfig().policies[dataType].hours;
  }

  /**
   * Get batch size for delete operations
   */
  public getBatchSize(): number {
    return this.getConfig().batchSize;
  }

  /**
   * Get vacuum threshold
   */
  public getVacuumThreshold(): number {
    return this.getConfig().vacuumThreshold;
  }

  /**
   * Reload configuration from file
   */
  public reload(): void {
    this.loadConfiguration();
  }
}

// Export singleton instance
export const dataRetentionConfig = DataRetentionConfigService.getInstance();
