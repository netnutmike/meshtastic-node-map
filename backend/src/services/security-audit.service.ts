import { logger } from '../utils/logger';

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  category: 'authentication' | 'authorization' | 'api_access' | 'security_violation' | 'system';
  event: string;
  description: string;
  source: {
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
    apiKeyId?: string;
    endpoint?: string;
    method?: string;
  };
  metadata?: Record<string, any>;
}

export class SecurityAuditService {
  private auditLog: SecurityEvent[] = [];
  private readonly maxLogSize = 50000; // Keep last 50k events in memory

  constructor() {
    // Initialize with system startup event
    this.logEvent({
      level: 'info',
      category: 'system',
      event: 'SYSTEM_STARTUP',
      description: 'Security audit service initialized',
      source: {}
    });
  }

  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    // Add to in-memory log
    this.auditLog.push(auditEvent);

    // Trim log if it gets too large
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog.splice(0, this.auditLog.length - this.maxLogSize);
    }

    // Log to application logger based on level
    const logMessage = `[SECURITY] ${event.category.toUpperCase()}: ${event.event} - ${event.description}`;
    const logContext = {
      category: event.category,
      event: event.event,
      source: event.source,
      metadata: event.metadata
    };

    switch (event.level) {
      case 'error':
        logger.error(logMessage, logContext);
        break;
      case 'warn':
        logger.warn(logMessage, logContext);
        break;
      case 'info':
      default:
        logger.info(logMessage, logContext);
        break;
    }

    // In production, you might want to send critical events to external monitoring
    if (event.level === 'error' && event.category === 'security_violation') {
      await this.handleCriticalSecurityEvent(auditEvent);
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async handleCriticalSecurityEvent(event: SecurityEvent): Promise<void> {
    // In production, implement:
    // - Send alerts to security team
    // - Integrate with SIEM systems
    // - Trigger automated responses (IP blocking, etc.)
    logger.error('CRITICAL SECURITY EVENT DETECTED', event);
  }

  async getAuditLog(filters: {
    startDate?: Date;
    endDate?: Date;
    level?: 'info' | 'warn' | 'error';
    category?: string;
    source?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ events: SecurityEvent[]; total: number }> {
    let filteredEvents = [...this.auditLog];

    // Apply filters
    if (filters.startDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= filters.endDate!);
    }

    if (filters.level) {
      filteredEvents = filteredEvents.filter(event => event.level === filters.level);
    }

    if (filters.category) {
      filteredEvents = filteredEvents.filter(event => event.category === filters.category);
    }

    if (filters.source) {
      filteredEvents = filteredEvents.filter(event => 
        event.source.ipAddress === filters.source ||
        event.source.userId === filters.source ||
        event.source.apiKeyId === filters.source
      );
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredEvents.length;

    // Apply pagination
    if (filters.offset !== undefined || filters.limit !== undefined) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 100;
      filteredEvents = filteredEvents.slice(offset, offset + limit);
    }

    return { events: filteredEvents, total };
  }

  async getSecurityStats(timeRange?: { start: Date; end: Date }): Promise<{
    totalEvents: number;
    eventsByLevel: Record<string, number>;
    eventsByCategory: Record<string, number>;
    topSourceIPs: Array<{ ip: string; count: number }>;
    recentCriticalEvents: SecurityEvent[];
  }> {
    let events = this.auditLog;

    if (timeRange) {
      events = events.filter(event => 
        event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
      );
    }

    const eventsByLevel: Record<string, number> = {};
    const eventsByCategory: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};

    events.forEach(event => {
      // Count by level
      eventsByLevel[event.level] = (eventsByLevel[event.level] || 0) + 1;

      // Count by category
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;

      // Count by IP
      if (event.source.ipAddress) {
        ipCounts[event.source.ipAddress] = (ipCounts[event.source.ipAddress] || 0) + 1;
      }
    });

    // Get top source IPs
    const topSourceIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get recent critical events
    const recentCriticalEvents = events
      .filter(event => event.level === 'error')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalEvents: events.length,
      eventsByLevel,
      eventsByCategory,
      topSourceIPs,
      recentCriticalEvents
    };
  }

  // Convenience methods for common security events
  async logAuthentication(success: boolean, source: SecurityEvent['source'], details?: any): Promise<void> {
    await this.logEvent({
      level: success ? 'info' : 'warn',
      category: 'authentication',
      event: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      description: success ? 'User successfully authenticated' : 'Authentication failed',
      source,
      metadata: details
    });
  }

  async logAuthorization(success: boolean, source: SecurityEvent['source'], resource: string, action: string): Promise<void> {
    await this.logEvent({
      level: success ? 'info' : 'warn',
      category: 'authorization',
      event: success ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
      description: `${success ? 'Granted' : 'Denied'} ${action} access to ${resource}`,
      source,
      metadata: { resource, action }
    });
  }

  async logApiAccess(source: SecurityEvent['source'], endpoint: string, method: string, statusCode: number): Promise<void> {
    const success = statusCode < 400;
    await this.logEvent({
      level: success ? 'info' : (statusCode < 500 ? 'warn' : 'error'),
      category: 'api_access',
      event: 'API_REQUEST',
      description: `API request: ${method} ${endpoint} - ${statusCode}`,
      source: { ...source, endpoint, method },
      metadata: { statusCode }
    });
  }

  async logSecurityViolation(violation: string, source: SecurityEvent['source'], details?: any): Promise<void> {
    await this.logEvent({
      level: 'error',
      category: 'security_violation',
      event: 'SECURITY_VIOLATION',
      description: violation,
      source,
      metadata: details
    });
  }

  async logRateLimitExceeded(source: SecurityEvent['source'], endpoint: string, limit: number): Promise<void> {
    await this.logEvent({
      level: 'warn',
      category: 'security_violation',
      event: 'RATE_LIMIT_EXCEEDED',
      description: `Rate limit exceeded for ${endpoint} (limit: ${limit})`,
      source: { ...source, endpoint },
      metadata: { limit, endpoint }
    });
  }

  async logApiKeyUsage(apiKeyId: string, source: SecurityEvent['source'], endpoint: string, success: boolean): Promise<void> {
    await this.logEvent({
      level: success ? 'info' : 'warn',
      category: 'api_access',
      event: success ? 'API_KEY_SUCCESS' : 'API_KEY_FAILURE',
      description: `API key ${success ? 'successfully used' : 'failed'} for ${endpoint}`,
      source: { ...source, apiKeyId, endpoint },
      metadata: { apiKeyId, endpoint }
    });
  }
}

// Singleton instance
export const securityAuditService = new SecurityAuditService();