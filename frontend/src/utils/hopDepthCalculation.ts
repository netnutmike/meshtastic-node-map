/**
 * Hop Depth Calculation Utility
 * Implements BFS algorithm to compute nodes within N hops
 * Requirements: 34.8, 34.9
 */

export interface RFLink {
  from_node_id: string;
  to_node_id: string;
  link_type: 'traceroute' | 'packet';
  packet_count: number;
  avg_rssi: number;
  avg_snr: number;
  last_seen: Date;
  success_rate: number;
  is_bidirectional: boolean;
}

/**
 * Compute all nodes within N hops of a starting node using BFS
 * @param startNodeId The starting node ID
 * @param maxHops Maximum number of hops (1, 2, 3, or Infinity for all)
 * @param allLinks Array of all RF links in the network
 * @returns Set of node IDs within maxHops of the starting node
 */
export function computeNodesWithinHops(
  startNodeId: string,
  maxHops: number,
  allLinks: RFLink[]
): Set<string> {
  const visited = new Set([startNodeId]);
  let frontier = [startNodeId];
  let hops = 0;

  while (frontier.length > 0 && hops < maxHops) {
    const nextFrontier: string[] = [];

    frontier.forEach(nodeId => {
      allLinks.forEach(link => {
        // Check both directions (links are bidirectional)
        if (link.from_node_id === nodeId && !visited.has(link.to_node_id)) {
          visited.add(link.to_node_id);
          nextFrontier.push(link.to_node_id);
        } else if (link.to_node_id === nodeId && !visited.has(link.from_node_id)) {
          visited.add(link.from_node_id);
          nextFrontier.push(link.from_node_id);
        }
      });
    });

    frontier = nextFrontier;
    hops += 1;
  }

  return visited;
}

/**
 * Filter RF links to only include links between nodes in the visible set
 * @param allLinks Array of all RF links
 * @param visibleNodes Set of visible node IDs
 * @returns Filtered array of RF links
 */
export function filterLinksByVisibleNodes(
  allLinks: RFLink[],
  visibleNodes: Set<string>
): RFLink[] {
  return allLinks.filter(
    link =>
      visibleNodes.has(link.from_node_id) && visibleNodes.has(link.to_node_id)
  );
}

/**
 * Build an adjacency map for quick neighbor lookup
 * @param allLinks Array of all RF links
 * @returns Map of node ID to array of neighbor node IDs
 */
export function buildAdjacencyMap(allLinks: RFLink[]): Map<string, string[]> {
  const adjacencyMap = new Map<string, string[]>();

  allLinks.forEach(link => {
    // Add forward direction
    if (!adjacencyMap.has(link.from_node_id)) {
      adjacencyMap.set(link.from_node_id, []);
    }
    adjacencyMap.get(link.from_node_id)!.push(link.to_node_id);

    // Add reverse direction (bidirectional)
    if (!adjacencyMap.has(link.to_node_id)) {
      adjacencyMap.set(link.to_node_id, []);
    }
    adjacencyMap.get(link.to_node_id)!.push(link.from_node_id);
  });

  return adjacencyMap;
}

/**
 * Get the hop distance from start node to target node
 * Returns -1 if target is not reachable
 * @param startNodeId Starting node ID
 * @param targetNodeId Target node ID
 * @param allLinks Array of all RF links
 * @returns Hop distance or -1 if not reachable
 */
export function getHopDistance(
  startNodeId: string,
  targetNodeId: string,
  allLinks: RFLink[]
): number {
  if (startNodeId === targetNodeId) {
    return 0;
  }

  const visited = new Set([startNodeId]);
  let frontier = [startNodeId];
  let hops = 0;

  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    hops += 1;

    for (const nodeId of frontier) {
      for (const link of allLinks) {
        let neighbor: string | null = null;

        if (link.from_node_id === nodeId && !visited.has(link.to_node_id)) {
          neighbor = link.to_node_id;
        } else if (link.to_node_id === nodeId && !visited.has(link.from_node_id)) {
          neighbor = link.from_node_id;
        }

        if (neighbor) {
          if (neighbor === targetNodeId) {
            return hops;
          }
          visited.add(neighbor);
          nextFrontier.push(neighbor);
        }
      }
    }

    frontier = nextFrontier;
  }

  return -1; // Not reachable
}
