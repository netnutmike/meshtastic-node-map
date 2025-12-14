import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  permissions: string[];
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  createdBy: string;
  description?: string;
  ipWhitelist?: string[];
}

export interface ApiKeyUsage {
  keyId: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
  responseStatus: number;
  responseTime: number;
}

export class ApiKeyService {
  private apiKeys = new Map<string, ApiKey>();
  private usageLog: ApiKeyUsage[] = [];
  private readonly maxUsageLogSize = 10000;

  constructor() {
    this.initializeDefaultKeys();
  }

  private initializeDefaultKeys(): void {
    // Initialize with environment-based API keys if provided
    const envApiKeys = process.env.API_KEYS?.split(',') || [];
    
    envApiKeys.forEach((key, index) => {
      if (key.trim()) {
        const apiKey: ApiKey = {
          id: `env-key-${index}`,
          name: `Environment Key ${index + 1}`,
          key: key.trim(),
          hashedKey: this.hashKey(key.trim()),
          permissions: ['read', 'write'],
          isActive: true,
          createdAt: new Date(),
          createdBy: 'system',
          description: 'API key loaded from environment variables'
        };
        this.apiKeys.set(apiKey.hashedKey, apiKey);
      }
    });

    logger.info(`Initialized ${this.apiKeys.size} API keys from environment`);
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private generateKey(): string {
    // Generate a secure random API key
    const prefix = 'mnm'; // Meshtastic Node Mapper
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${randomBytes}`;
  }

  async createApiKey(options: {
    name: string;
    permissions: string[];
    createdBy: string;
    description?: string;
    expiresAt?: Date;
    rateLimit?: { requests: number; windowMs: number };
    ipWhitelist?: string[];
  }): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const plainKey = this.generateKey();
    const hashedKey = this.hashKey(plainKey);

    const apiKey: ApiKey = {
      id: crypto.randomUUID(),
      name: options.name,
      key: plainKey.substring(0, 8) + '...', // Store only prefix for display
      hashedKey,
      permissions: options.permissions,
      rateLimit: options.rateLimit,
      isActive: true,
      createdAt: new Date(),
      createdBy: options.createdBy,
      description: options.description,
      expiresAt: options.expiresAt,
      ipWhitelist: options.ipWhitelist
    };

    this.apiKeys.set(hashedKey, apiKey);
    
    logger.info(`Created API key: ${apiKey.name} (${apiKey.id}) by ${options.createdBy}`);

    return { apiKey, plainKey };
  }

  async validateApiKey(key: string, ipAddress?: string): Promise<ApiKey | null> {
    const hashedKey = this.hashKey(key);
    const apiKey = this.apiKeys.get(hashedKey);

    if (!apiKey) {
      logger.warn(`Invalid API key attempt from IP: ${ipAddress}`);
      return null;
    }

    if (!apiKey.isActive) {
      logger.warn(`Inactive API key used: ${apiKey.name} from IP: ${ipAddress}`);
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      logger.warn(`Expired API key used: ${apiKey.name} from IP: ${ipAddress}`);
      return null;
    }

    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      if (!ipAddress || !apiKey.ipWhitelist.includes(ipAddress)) {
        logger.warn(`API key ${apiKey.name} used from non-whitelisted IP: ${ipAddress}`);
        return null;
      }
    }

    // Update last used timestamp
    apiKey.lastUsed = new Date();

    return apiKey;
  }

  async revokeApiKey(keyId: string, revokedBy: string): Promise<boolean> {
    for (const [hashedKey, apiKey] of this.apiKeys.entries()) {
      if (apiKey.id === keyId) {
        apiKey.isActive = false;
        logger.info(`API key revoked: ${apiKey.name} (${keyId}) by ${revokedBy}`);
        return true;
      }
    }
    return false;
  }

  async deleteApiKey(keyId: string, deletedBy: string): Promise<boolean> {
    for (const [hashedKey, apiKey] of this.apiKeys.entries()) {
      if (apiKey.id === keyId) {
        this.apiKeys.delete(hashedKey);
        logger.info(`API key deleted: ${apiKey.name} (${keyId}) by ${deletedBy}`);
        return true;
      }
    }
    return false;
  }

  async updateApiKey(keyId: string, updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'rateLimit' | 'ipWhitelist' | 'description'>>, updatedBy: string): Promise<ApiKey | null> {
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.id === keyId) {
        Object.assign(apiKey, updates);
        logger.info(`API key updated: ${apiKey.name} (${keyId}) by ${updatedBy}`);
        return apiKey;
      }
    }
    return null;
  }

  async listApiKeys(): Promise<Omit<ApiKey, 'hashedKey'>[]> {
    return Array.from(this.apiKeys.values()).map(({ hashedKey, ...apiKey }) => apiKey);
  }

  async getApiKeyById(keyId: string): Promise<Omit<ApiKey, 'hashedKey'> | null> {
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.id === keyId) {
        const { hashedKey, ...safeApiKey } = apiKey;
        return safeApiKey;
      }
    }
    return null;
  }

  async logUsage(usage: ApiKeyUsage): Promise<void> {
    this.usageLog.push(usage);
    
    // Trim log if it gets too large
    if (this.usageLog.length > this.maxUsageLogSize) {
      this.usageLog.splice(0, this.usageLog.length - this.maxUsageLogSize);
    }
  }

  async getUsageStats(keyId?: string, timeRange?: { start: Date; end: Date }): Promise<{
    totalRequests: number;
    requestsByEndpoint: Record<string, number>;
    requestsByStatus: Record<string, number>;
    averageResponseTime: number;
    requestsOverTime: Array<{ timestamp: Date; count: number }>;
  }> {
    let filteredUsage = this.usageLog;

    if (keyId) {
      filteredUsage = filteredUsage.filter(usage => usage.keyId === keyId);
    }

    if (timeRange) {
      filteredUsage = filteredUsage.filter(usage => 
        usage.timestamp >= timeRange.start && usage.timestamp <= timeRange.end
      );
    }

    const totalRequests = filteredUsage.length;
    const requestsByEndpoint: Record<string, number> = {};
    const requestsByStatus: Record<string, number> = {};
    let totalResponseTime = 0;

    filteredUsage.forEach(usage => {
      // Count by endpoint
      const endpoint = `${usage.method} ${usage.endpoint}`;
      requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1;

      // Count by status
      const statusGroup = Math.floor(usage.responseStatus / 100) * 100;
      const statusKey = `${statusGroup}xx`;
      requestsByStatus[statusKey] = (requestsByStatus[statusKey] || 0) + 1;

      totalResponseTime += usage.responseTime;
    });

    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    // Group requests by hour for time series
    const requestsOverTime: Array<{ timestamp: Date; count: number }> = [];
    const hourlyGroups = new Map<string, number>();

    filteredUsage.forEach(usage => {
      const hour = new Date(usage.timestamp);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();
      hourlyGroups.set(hourKey, (hourlyGroups.get(hourKey) || 0) + 1);
    });

    for (const [hourKey, count] of hourlyGroups.entries()) {
      requestsOverTime.push({ timestamp: new Date(hourKey), count });
    }

    requestsOverTime.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      totalRequests,
      requestsByEndpoint,
      requestsByStatus,
      averageResponseTime,
      requestsOverTime
    };
  }

  async getApiKeyUsage(keyId: string, limit = 100): Promise<ApiKeyUsage[]> {
    return this.usageLog
      .filter(usage => usage.keyId === keyId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Check if API key has specific permission
  hasPermission(apiKey: ApiKey, permission: string): boolean {
    return apiKey.permissions.includes(permission) || apiKey.permissions.includes('admin');
  }

  // Get rate limit configuration for API key
  getRateLimit(apiKey: ApiKey): { requests: number; windowMs: number } {
    return apiKey.rateLimit || { requests: 1000, windowMs: 60 * 60 * 1000 }; // Default: 1000/hour
  }
}

// Singleton instance
export const apiKeyService = new ApiKeyService();