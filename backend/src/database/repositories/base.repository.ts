import { PrismaClient } from '@prisma/client';
import { getDatabase, executeWithErrorHandling } from '../connection';

/**
 * Base repository class with common CRUD operations
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected db: PrismaClient;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, options?: any): Promise<T | null> {
    return executeWithErrorHandling(
      () => this.findByIdImpl(id, options),
      `findById(${id})`
    );
  }

  /**
   * Find all entities with optional filtering
   */
  async findMany(options?: any): Promise<T[]> {
    return executeWithErrorHandling(
      () => this.findManyImpl(options),
      'findMany'
    );
  }

  /**
   * Create new entity
   */
  async create(data: CreateInput): Promise<T> {
    return executeWithErrorHandling(
      () => this.createImpl(data),
      'create'
    );
  }

  /**
   * Update entity by ID
   */
  async update(id: string, data: UpdateInput): Promise<T> {
    return executeWithErrorHandling(
      () => this.updateImpl(id, data),
      `update(${id})`
    );
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<T> {
    return executeWithErrorHandling(
      () => this.deleteImpl(id),
      `delete(${id})`
    );
  }

  /**
   * Count entities with optional filtering
   */
  async count(options?: any): Promise<number> {
    return executeWithErrorHandling(
      () => this.countImpl(options),
      'count'
    );
  }

  /**
   * Check if entity exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  // Abstract methods to be implemented by concrete repositories
  protected abstract findByIdImpl(id: string, options?: any): Promise<T | null>;
  protected abstract findManyImpl(options?: any): Promise<T[]>;
  protected abstract createImpl(data: CreateInput): Promise<T>;
  protected abstract updateImpl(id: string, data: UpdateInput): Promise<T>;
  protected abstract deleteImpl(id: string): Promise<T>;
  protected abstract countImpl(options?: any): Promise<number>;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Apply pagination to query options
 */
export function applyPagination(options: PaginationOptions = {}): {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const result: any = {
    skip,
    take: limit
  };

  if (options.sortBy) {
    result.orderBy = {
      [options.sortBy]: options.sortOrder || 'asc'
    };
  }

  return result;
}

/**
 * Create paginated result
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  options: PaginationOptions = {}
): PaginatedResult<T> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}