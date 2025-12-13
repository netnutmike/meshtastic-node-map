import { BaseRepository } from './base.repository';
import { TelemetryReading, CreateTelemetryInput, TelemetryType } from '../../types/database';

export class TelemetryRepository extends BaseRepository<TelemetryReading, CreateTelemetryInput, Partial<CreateTelemetryInput>> {
  
  protected async findByIdImpl(id: string, options?: any): Promise<TelemetryReading | null> {
    return this.db.telemetryReading.findUnique({
      where: { id },
      include: {
        node: true
      }
    }) as Promise<TelemetryReading | null>;
  }

  protected async findManyImpl(options: any = {}): Promise<TelemetryReading[]> {
    return this.db.telemetryReading.findMany({
      where: options.where,
      orderBy: options.orderBy || { timestamp: 'desc' },
      take: options.take,
      skip: options.skip,
      include: {
        node: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true
          }
        }
      }
    }) as Promise<TelemetryReading[]>;
  }

  protected async createImpl(data: CreateTelemetryInput): Promise<TelemetryReading> {
    return this.db.telemetryReading.create({
      data,
      include: {
        node: true
      }
    }) as Promise<TelemetryReading>;
  }

  protected async updateImpl(id: string, data: Partial<CreateTelemetryInput>): Promise<TelemetryReading> {
    return this.db.telemetryReading.update({
      where: { id },
      data,
      include: {
        node: true
      }
    }) as Promise<TelemetryReading>;
  }

  protected async deleteImpl(id: string): Promise<TelemetryReading> {
    return this.db.telemetryReading.delete({
      where: { id }
    }) as Promise<TelemetryReading>;
  }

  protected async countImpl(options: any = {}): Promise<number> {
    return this.db.telemetryReading.count({
      where: options.where
    });
  }

  async getTelemetryForNode(
    nodeId: string, 
    type?: TelemetryType, 
    startTime?: Date, 
    endTime?: Date,
    limit: number = 100
  ): Promise<TelemetryReading[]> {
    const where: any = { nodeId };
    
    if (type) {
      where.type = type;
    }
    
    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) where.timestamp.gte = startTime;
      if (endTime) where.timestamp.lte = endTime;
    }

    return this.findManyImpl({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  async getLatestTelemetryForNode(nodeId: string, type: TelemetryType): Promise<TelemetryReading | null> {
    return this.db.telemetryReading.findFirst({
      where: { nodeId, type },
      orderBy: { timestamp: 'desc' },
      include: {
        node: true
      }
    }) as Promise<TelemetryReading | null>;
  }
}