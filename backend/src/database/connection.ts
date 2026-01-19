import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('Database');

// Singleton Prisma client instance
let prisma: PrismaClient | null = null;

/**
 * Database connection configuration
 */
interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
  logLevel?: 'info' | 'query' | 'warn' | 'error';
}

/**
 * Database connection error types
 */
export class DatabaseConnectionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseQueryError extends Error {
  constructor(message: string, public query?: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseQueryError';
  }
}

export class DatabaseValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'DatabaseValidationError';
  }
}

/**
 * Initialize database connection with configuration
 */
export function initializeDatabase(config?: Partial<DatabaseConfig>): PrismaClient {
  if (prisma) {
    return prisma;
  }

  const dbConfig: DatabaseConfig = {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/meshtastic_mapper',
    maxConnections: config?.maxConnections || 50,
    connectionTimeout: config?.connectionTimeout || 30000,
    queryTimeout: config?.queryTimeout || 60000,
    logLevel: config?.logLevel || (process.env.NODE_ENV === 'development' ? 'query' : 'error')
  };

  try {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbConfig.url
        }
      },
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' }
      ],
      // Connection pool configuration
      // @ts-ignore - Prisma types don't expose these options but they work
      __internal: {
        engine: {
          connection_limit: dbConfig.maxConnections,
          pool_timeout: Math.floor((dbConfig.connectionTimeout || 30000) / 1000)
        }
      }
    });

    // Set up logging
    // Note: Prisma event listeners temporarily disabled due to type issues
    // prisma.$on('query', (e: any) => {
    //   if (dbConfig.logLevel === 'query') {
    //     logger.debug(`Query: ${e.query}`, {
    //       params: e.params,
    //       duration: e.duration
    //     });
    //   }
    // });

    // prisma.$on('error', (e: any) => {
    //   logger.error('Database error:', e);
    // });

    // prisma.$on('info', (e: any) => {
    //   logger.info('Database info:', e);
    // });

    // prisma.$on('warn', (e: any) => {
    //   logger.warn('Database warning:', e);
    // });

    logger.info('Database connection initialized successfully');
    return prisma;
  } catch (error) {
    logger.error('Failed to initialize database connection:', error);
    throw new DatabaseConnectionError('Failed to initialize database connection', error as Error);
  }
}

/**
 * Get the current Prisma client instance
 */
export function getDatabase(): PrismaClient {
  if (!prisma) {
    return initializeDatabase();
  }
  return prisma;
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.$queryRaw`SELECT 1`;
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    throw new DatabaseConnectionError('Database connection test failed', error as Error);
  }
}

/**
 * Close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (prisma) {
    try {
      await prisma.$disconnect();
      prisma = null;
      logger.info('Database connection closed successfully');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw new DatabaseConnectionError('Error closing database connection', error as Error);
    }
  }
}

/**
 * Execute database operation with error handling
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    logger.error(`Database operation '${operationName}' failed:`, error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      throw new DatabaseValidationError(
        `Unique constraint violation in ${operationName}`,
        error.meta?.target
      );
    }
    
    if (error.code === 'P2025') {
      throw new DatabaseValidationError(
        `Record not found in ${operationName}`,
        error.meta?.cause
      );
    }
    
    if (error.code === 'P2003') {
      throw new DatabaseValidationError(
        `Foreign key constraint violation in ${operationName}`,
        error.meta?.field_name
      );
    }
    
    if (error.code === 'P1001') {
      throw new DatabaseConnectionError(
        `Cannot reach database server in ${operationName}`,
        error
      );
    }
    
    if (error.code === 'P1008') {
      throw new DatabaseConnectionError(
        `Database operation timeout in ${operationName}`,
        error
      );
    }
    
    // Generic database error
    throw new DatabaseQueryError(
      `Database operation '${operationName}' failed: ${error.message}`,
      error.query,
      error
    );
  }
}

/**
 * Health check for database
 */
export async function getDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    await testDatabaseConnection();
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Initialize TimescaleDB extensions and optimizations
 */
export async function initializeTimescaleDB(): Promise<void> {
  try {
    const db = getDatabase();
    
    // Check if TimescaleDB extension is available
    const extensionCheck = await db.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
      ) as timescaledb_available;
    `;
    
    logger.info('TimescaleDB extension check:', extensionCheck);
    
    // Create hypertables for time-series data if TimescaleDB is available
    // This will be handled in migration files for proper setup
    
  } catch (error) {
    logger.warn('TimescaleDB initialization failed, continuing with regular PostgreSQL:', error);
    // Continue without TimescaleDB - it's optional
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connection...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connection...');
  await closeDatabaseConnection();
  process.exit(0);
});

export default {
  initializeDatabase,
  getDatabase,
  testDatabaseConnection,
  closeDatabaseConnection,
  executeWithErrorHandling,
  getDatabaseHealth,
  initializeTimescaleDB,
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseValidationError
};