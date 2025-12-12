import { BaseRepository } from './base.repository';
import { Message, CreateMessageInput, MessageType } from '../../types/database';

export class MessageRepository extends BaseRepository<Message, CreateMessageInput, Partial<CreateMessageInput>> {
  
  protected async findByIdImpl(id: string): Promise<Message | null> {
    return this.db.message.findUnique({
      where: { id },
      include: {
        fromNode: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true
          }
        },
        toNode: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true
          }
        }
      }
    }) as Promise<Message | null>;
  }

  protected async findManyImpl(options: any = {}): Promise<Message[]> {
    return this.db.message.findMany({
      where: options.where,
      orderBy: options.orderBy || { timestamp: 'desc' },
      take: options.take,
      skip: options.skip,
      include: {
        fromNode: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true
          }
        },
        toNode: {
          select: {
            id: true,
            nodeId: true,
            shortName: true,
            longName: true
          }
        }
      }
    }) as Promise<Message[]>;
  }

  protected async createImpl(data: CreateMessageInput): Promise<Message> {
    return this.db.message.create({
      data,
      include: {
        fromNode: true,
        toNode: true
      }
    }) as Promise<Message>;
  }

  protected async updateImpl(id: string, data: Partial<CreateMessageInput>): Promise<Message> {
    return this.db.message.update({
      where: { id },
      data,
      include: {
        fromNode: true,
        toNode: true
      }
    }) as Promise<Message>;
  }

  protected async deleteImpl(id: string): Promise<Message> {
    return this.db.message.delete({
      where: { id }
    }) as Promise<Message>;
  }

  protected async countImpl(options: any = {}): Promise<number> {
    return this.db.message.count({
      where: options.where
    });
  }

  async getMessagesForNode(
    nodeId: string,
    type?: MessageType,
    direction?: 'sent' | 'received' | 'both',
    limit: number = 50
  ): Promise<Message[]> {
    const where: any = {};
    
    if (direction === 'sent') {
      where.fromNodeId = nodeId;
    } else if (direction === 'received') {
      where.toNodeId = nodeId;
    } else {
      where.OR = [
        { fromNodeId: nodeId },
        { toNodeId: nodeId }
      ];
    }
    
    if (type) {
      where.type = type;
    }

    return this.findManyImpl({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  async getRecentMessages(hours: number = 24, limit: number = 100): Promise<Message[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.findManyImpl({
      where: {
        timestamp: {
          gte: since
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }
}