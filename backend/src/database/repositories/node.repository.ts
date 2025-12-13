import { Prisma } from '@prisma/client';
import { BaseRepository, PaginationOptions, applyPagination, createPaginatedResult, PaginatedResult } from './base.repository';
import { Node, CreateNodeInput, UpdateNodeInput } from '../../types/database';

export class NodeRepository extends BaseRepository<Node, CreateNodeInput, UpdateNodeInput> {
  
  protected async findByIdImpl(id: string, options?: any): Promise<Node | null> {
    const defaultInclude = {
      network: true,
      positions: {
        orderBy: { timestamp: 'desc' },
        take: 1
      },
      telemetryReadings: {
        orderBy: { timestamp: 'desc' },
        take: 10
      },
      neighborsFrom: {
        include: {
          neighbor: {
            select: {
              id: true,
              nodeId: true,
              shortName: true,
              longName: true
            }
          }
        }
      },
      neighborsTo: {
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
      }
    };

    return this.db.node.findUnique({
      where: { id },
      include: options?.include || defaultInclude
    }) as Promise<Node | null>;
  }

  protected async findManyImpl(options: any = {}): Promise<Node[]> {
    const pagination = applyPagination(options);
    
    return this.db.node.findMany({
      ...pagination,
      where: options.where,
      include: {
        network: true,
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    }) as Promise<Node[]>;
  }

  protected async createImpl(data: CreateNodeInput): Promise<Node> {
    return this.db.node.create({
      data,
      include: {
        network: true
      }
    }) as Promise<Node>;
  }

  protected async updateImpl(id: string, data: UpdateNodeInput): Promise<Node> {
    return this.db.node.update({
      where: { id },
      data,
      include: {
        network: true,
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    }) as Promise<Node>;
  }

  protected async deleteImpl(id: string): Promise<Node> {
    return this.db.node.delete({
      where: { id }
    }) as Promise<Node>;
  }

  protected async countImpl(options: any = {}): Promise<number> {
    return this.db.node.count({
      where: options.where
    });
  }

  /**
   * Find node by Meshtastic node ID
   */
  async findByNodeId(nodeId: string): Promise<Node | null> {
    return this.db.node.findUnique({
      where: { nodeId },
      include: {
        network: true,
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    }) as Promise<Node | null>;
  }

  /**
   * Find node by hex ID
   */
  async findByHexId(hexId: string): Promise<Node | null> {
    return this.db.node.findUnique({
      where: { hexId },
      include: {
        network: true,
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    }) as Promise<Node | null>;
  }

  /**
   * Find nodes by network ID
   */
  async findByNetworkId(networkId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Node>> {
    const pagination = applyPagination(options);
    
    const [nodes, total] = await Promise.all([
      this.db.node.findMany({
        ...pagination,
        where: { networkId },
        include: {
          network: true,
          positions: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      }),
      this.db.node.count({
        where: { networkId }
      })
    ]);

    return createPaginatedResult(nodes as Node[], total, options);
  }

  /**
   * Find online nodes
   */
  async findOnlineNodes(networkId?: string): Promise<Node[]> {
    return this.db.node.findMany({
      where: {
        isOnline: true,
        ...(networkId && { networkId })
      },
      include: {
        network: true,
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    }) as Promise<Node[]>;
  }

  /**
   * Find nodes with recent activity
   */
  async findRecentlyActive(hours: number = 24, networkId?: string): Promise<Node[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.db.node.findMany({
      where: {
        lastSeen: {
          gte: since
        },
        ...(networkId && { networkId })
      },
      include: {
        network: true,
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      orderBy: {
        lastSeen: 'desc'
      }
    }) as Promise<Node[]>;
  }

  /**
   * Search nodes by name or ID
   */
  async searchNodes(query: string, networkId?: string, options: PaginationOptions = {}): Promise<PaginatedResult<Node>> {
    const pagination = applyPagination(options);
    
    const searchConditions = {
      OR: [
        { shortName: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { longName: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { nodeId: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { hexId: { contains: query, mode: Prisma.QueryMode.insensitive } }
      ],
      ...(networkId && { networkId })
    };

    const [nodes, total] = await Promise.all([
      this.db.node.findMany({
        ...pagination,
        where: searchConditions,
        include: {
          network: true,
          positions: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      }),
      this.db.node.count({
        where: searchConditions
      })
    ]);

    return createPaginatedResult(nodes as Node[], total, options);
  }

  /**
   * Update node status (online/offline)
   */
  async updateNodeStatus(nodeId: string, isOnline: boolean, mqttConnected: boolean): Promise<Node> {
    return this.db.node.update({
      where: { nodeId },
      data: {
        isOnline,
        mqttConnected,
        lastSeen: isOnline ? new Date() : undefined,
        updatedAt: new Date()
      },
      include: {
        network: true
      }
    }) as Promise<Node>;
  }

  /**
   * Update node telemetry data
   */
  async updateNodeTelemetry(
    nodeId: string, 
    telemetryData: {
      batteryLevel?: number;
      voltage?: number;
      channelUtilization?: number;
      airUtilTx?: number;
    }
  ): Promise<Node> {
    return this.db.node.update({
      where: { nodeId },
      data: {
        ...telemetryData,
        updatedAt: new Date()
      },
      include: {
        network: true
      }
    }) as Promise<Node>;
  }

  /**
   * Get node statistics for a network
   */
  async getNetworkNodeStats(networkId: string): Promise<{
    total: number;
    online: number;
    offline: number;
    byRole: Record<string, number>;
    byHardware: Record<string, number>;
  }> {
    const [total, online, roleStats, hardwareStats] = await Promise.all([
      this.db.node.count({ where: { networkId } }),
      this.db.node.count({ where: { networkId, isOnline: true } }),
      this.db.node.groupBy({
        by: ['role'],
        where: { networkId },
        _count: { role: true }
      }),
      this.db.node.groupBy({
        by: ['hardwareModel'],
        where: { networkId, hardwareModel: { not: null } },
        _count: { hardwareModel: true }
      })
    ]);

    const byRole: Record<string, number> = {};
    roleStats.forEach((stat: any) => {
      byRole[stat.role] = stat._count.role;
    });

    const byHardware: Record<string, number> = {};
    hardwareStats.forEach((stat: any) => {
      if (stat.hardwareModel) {
        byHardware[stat.hardwareModel] = stat._count.hardwareModel;
      }
    });

    return {
      total,
      online,
      offline: total - online,
      byRole,
      byHardware
    };
  }

  /**
   * Find nodes within geographic bounds
   */
  async findNodesInBounds(
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    networkId?: string
  ): Promise<Node[]> {
    // This requires a subquery to get nodes with positions within bounds
    const nodesWithPositions = await this.db.node.findMany({
      where: {
        ...(networkId && { networkId }),
        positions: {
          some: {
            latitude: {
              gte: bounds.south,
              lte: bounds.north
            },
            longitude: {
              gte: bounds.west,
              lte: bounds.east
            }
          }
        }
      },
      include: {
        network: true,
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          where: {
            latitude: {
              gte: bounds.south,
              lte: bounds.north
            },
            longitude: {
              gte: bounds.west,
              lte: bounds.east
            }
          }
        }
      }
    });

    return nodesWithPositions as Node[];
  }
}