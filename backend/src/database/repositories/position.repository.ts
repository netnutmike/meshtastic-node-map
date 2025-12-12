import { BaseRepository } from './base.repository';
import { Position, CreatePositionInput } from '../../types/database';

export class PositionRepository extends BaseRepository<Position, CreatePositionInput, Partial<CreatePositionInput>> {
  
  protected async findByIdImpl(id: string): Promise<Position | null> {
    return this.db.position.findUnique({
      where: { id },
      include: {
        node: true
      }
    }) as Promise<Position | null>;
  }

  protected async findManyImpl(options: any = {}): Promise<Position[]> {
    return this.db.position.findMany({
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
    }) as Promise<Position[]>;
  }

  protected async createImpl(data: CreatePositionInput): Promise<Position> {
    return this.db.position.create({
      data,
      include: {
        node: true
      }
    }) as Promise<Position>;
  }

  protected async updateImpl(id: string, data: Partial<CreatePositionInput>): Promise<Position> {
    return this.db.position.update({
      where: { id },
      data,
      include: {
        node: true
      }
    }) as Promise<Position>;
  }

  protected async deleteImpl(id: string): Promise<Position> {
    return this.db.position.delete({
      where: { id }
    }) as Promise<Position>;
  }

  protected async countImpl(options: any = {}): Promise<number> {
    return this.db.position.count({
      where: options.where
    });
  }

  async getLatestPositionForNode(nodeId: string): Promise<Position | null> {
    return this.db.position.findFirst({
      where: { nodeId },
      orderBy: { timestamp: 'desc' },
      include: {
        node: true
      }
    }) as Promise<Position | null>;
  }

  async getPositionHistory(nodeId: string, limit: number = 100): Promise<Position[]> {
    return this.findManyImpl({
      where: { nodeId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }
}