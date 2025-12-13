import { BaseRepository } from './base.repository';
import { Network, CreateNetworkInput, UpdateNetworkInput } from '../../types/database';

export class NetworkRepository extends BaseRepository<Network, CreateNetworkInput, UpdateNetworkInput> {
  
  protected async findByIdImpl(id: string, options?: any): Promise<Network | null> {
    return this.db.network.findUnique({
      where: { id },
      include: {
        nodes: {
          take: 10,
          orderBy: { lastSeen: 'desc' }
        },
        channels: true
      }
    }) as Promise<Network | null>;
  }

  protected async findManyImpl(options: any = {}): Promise<Network[]> {
    return this.db.network.findMany({
      where: options.where,
      include: {
        _count: {
          select: {
            nodes: true,
            channels: true
          }
        }
      }
    }) as Promise<Network[]>;
  }

  protected async createImpl(data: CreateNetworkInput): Promise<Network> {
    return this.db.network.create({
      data
    }) as Promise<Network>;
  }

  protected async updateImpl(id: string, data: UpdateNetworkInput): Promise<Network> {
    return this.db.network.update({
      where: { id },
      data
    }) as Promise<Network>;
  }

  protected async deleteImpl(id: string): Promise<Network> {
    return this.db.network.delete({
      where: { id }
    }) as Promise<Network>;
  }

  protected async countImpl(options: any = {}): Promise<number> {
    return this.db.network.count({
      where: options.where
    });
  }

  async findActiveNetworks(): Promise<Network[]> {
    return this.findManyImpl({ where: { isActive: true } });
  }

  async getNetworkStats(networkId: string, dateFilter: any): Promise<any> {
    // Get comprehensive network statistics
    const [nodeCount, messageCount, positionCount, telemetryCount] = await Promise.all([
      this.db.node.count({ where: { networkId } }),
      this.db.message.count({ 
        where: { 
          fromNode: { networkId },
          timestamp: dateFilter
        } 
      }),
      this.db.position.count({ 
        where: { 
          node: { networkId },
          timestamp: dateFilter
        } 
      }),
      this.db.telemetryReading.count({ 
        where: { 
          node: { networkId },
          timestamp: dateFilter
        } 
      })
    ]);

    return {
      nodes: nodeCount,
      messages: messageCount,
      positions: positionCount,
      telemetryReadings: telemetryCount
    };
  }
}