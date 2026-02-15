/**
 * Property-Based Tests for Hop Depth Calculation
 * **Feature: meshtastic-node-mapper, Property: BFS hop depth calculation correctness**
 * **Validates: Requirements 34.8, 34.9**
 * 
 * Property: For any graph of RF links and a starting node, the BFS algorithm
 * should correctly compute all nodes within N hops, where the hop distance
 * represents the shortest path from the starting node.
 */

import * as fc from 'fast-check';

// Type definitions for RF links
interface RFLink {
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
 * BFS algorithm to compute nodes within N hops
 * This is the implementation we're testing
 */
function computeNodesWithinHops(
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
 * Helper function to create a mock RF link
 */
function createMockLink(fromNode: string, toNode: string): RFLink {
  return {
    from_node_id: fromNode,
    to_node_id: toNode,
    link_type: 'traceroute',
    packet_count: 10,
    avg_rssi: -70,
    avg_snr: 10,
    last_seen: new Date(),
    success_rate: 100,
    is_bidirectional: true
  };
}

describe('Hop Depth Calculation Property Tests', () => {
  describe('Property: BFS hop depth calculation correctness', () => {
    test('should always include the starting node', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.integer({ min: 0, max: 10 }),
          fc.array(
            fc.record({
              from: fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
              to: fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`)
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (startNode, maxHops, linkPairs) => {
            // Create RF links from pairs
            const links = linkPairs
              .filter(pair => pair.from !== pair.to) // No self-loops
              .map(pair => createMockLink(pair.from, pair.to));

            // Compute nodes within hops
            const result = computeNodesWithinHops(startNode, maxHops, links);

            // Property: Starting node should always be in the result
            expect(result.has(startNode)).toBe(true);
            expect(result.size).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return only starting node when maxHops is 0', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.array(
            fc.record({
              from: fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
              to: fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`)
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (startNode, linkPairs) => {
            // Create RF links from pairs
            const links = linkPairs
              .filter(pair => pair.from !== pair.to)
              .map(pair => createMockLink(pair.from, pair.to));

            // Compute nodes within 0 hops
            const result = computeNodesWithinHops(startNode, 0, links);

            // Property: With 0 hops, only the starting node should be returned
            expect(result.size).toBe(1);
            expect(result.has(startNode)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should respect bidirectional links', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          (nodeA, nodeB) => {
            // Ensure nodes are different
            fc.pre(nodeA !== nodeB);

            // Create a single link from A to B
            const links = [createMockLink(nodeA, nodeB)];

            // Compute nodes within 1 hop from A
            const resultFromA = computeNodesWithinHops(nodeA, 1, links);

            // Compute nodes within 1 hop from B
            const resultFromB = computeNodesWithinHops(nodeB, 1, links);

            // Property: Bidirectional links should work in both directions
            expect(resultFromA.has(nodeB)).toBe(true);
            expect(resultFromB.has(nodeA)).toBe(true);
            expect(resultFromA.size).toBe(2); // A and B
            expect(resultFromB.size).toBe(2); // B and A
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should find nodes in a linear chain correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
            { minLength: 2, maxLength: 10 }
          ),
          fc.integer({ min: 1, max: 5 }),
          (nodes, maxHops) => {
            // Ensure all nodes are unique
            const uniqueNodes = Array.from(new Set(nodes));
            fc.pre(uniqueNodes.length >= 2);

            // Create a linear chain: node[0] -> node[1] -> node[2] -> ...
            const links: RFLink[] = [];
            for (let i = 0; i < uniqueNodes.length - 1; i++) {
              links.push(createMockLink(uniqueNodes[i], uniqueNodes[i + 1]));
            }

            // Start from the first node
            const startNode = uniqueNodes[0];
            const result = computeNodesWithinHops(startNode, maxHops, links);

            // Property: In a linear chain, we should find min(maxHops + 1, chain length) nodes
            const expectedCount = Math.min(maxHops + 1, uniqueNodes.length);
            expect(result.size).toBe(expectedCount);

            // Property: All nodes within maxHops should be in the result
            for (let i = 0; i < expectedCount; i++) {
              expect(result.has(uniqueNodes[i])).toBe(true);
            }

            // Property: Nodes beyond maxHops should not be in the result
            for (let i = expectedCount; i < uniqueNodes.length; i++) {
              expect(result.has(uniqueNodes[i])).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle disconnected graphs correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.integer({ min: 1, max: 10 }),
          (nodeA, nodeB, nodeC, nodeD, maxHops) => {
            // Ensure all nodes are unique
            const allNodes = [nodeA, nodeB, nodeC, nodeD];
            const uniqueNodes = Array.from(new Set(allNodes));
            fc.pre(uniqueNodes.length === 4);

            // Create two disconnected components: A-B and C-D
            const links = [
              createMockLink(nodeA, nodeB),
              createMockLink(nodeC, nodeD)
            ];

            // Start from nodeA
            const result = computeNodesWithinHops(nodeA, maxHops, links);

            // Property: Should only find nodes in the connected component
            expect(result.has(nodeA)).toBe(true);
            expect(result.has(nodeB)).toBe(true);
            expect(result.has(nodeC)).toBe(false);
            expect(result.has(nodeD)).toBe(false);
            expect(result.size).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle star topology correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.array(
            fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
            { minLength: 2, maxLength: 10 }
          ),
          (centerNode, leafNodes) => {
            // Ensure all nodes are unique and don't include center
            const uniqueLeaves = Array.from(new Set(leafNodes)).filter(leaf => leaf !== centerNode);
            fc.pre(uniqueLeaves.length >= 2);

            // Create star topology: center connected to all unique leaves
            const links = uniqueLeaves.map(leaf => createMockLink(centerNode, leaf));

            // Test from center with 1 hop
            const resultFromCenter = computeNodesWithinHops(centerNode, 1, links);

            // Property: From center with 1 hop, should reach all leaves
            expect(resultFromCenter.has(centerNode)).toBe(true);
            uniqueLeaves.forEach(leaf => {
              expect(resultFromCenter.has(leaf)).toBe(true);
            });
            expect(resultFromCenter.size).toBe(uniqueLeaves.length + 1);

            // Test from a leaf with 1 hop
            const leafNode = uniqueLeaves[0];
            const resultFromLeaf = computeNodesWithinHops(leafNode, 1, links);

            // Property: From leaf with 1 hop, should reach center only
            expect(resultFromLeaf.has(leafNode)).toBe(true);
            expect(resultFromLeaf.has(centerNode)).toBe(true);
            expect(resultFromLeaf.size).toBe(2);

            // Test from leaf with 2 hops
            const resultFromLeaf2Hops = computeNodesWithinHops(leafNode, 2, links);

            // Property: From leaf with 2 hops, should reach all nodes (leaf + center + all other leaves)
            expect(resultFromLeaf2Hops.size).toBe(uniqueLeaves.length + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should not revisit nodes (no cycles)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.integer({ min: 1, max: 10 }),
          (nodeA, nodeB, nodeC, maxHops) => {
            // Ensure all nodes are unique
            fc.pre(nodeA !== nodeB && nodeB !== nodeC && nodeA !== nodeC);

            // Create a triangle: A-B-C-A
            const links = [
              createMockLink(nodeA, nodeB),
              createMockLink(nodeB, nodeC),
              createMockLink(nodeC, nodeA)
            ];

            // Compute nodes within hops
            const result = computeNodesWithinHops(nodeA, maxHops, links);

            // Property: Should find all 3 nodes (triangle is fully connected)
            expect(result.size).toBe(3);
            expect(result.has(nodeA)).toBe(true);
            expect(result.has(nodeB)).toBe(true);
            expect(result.has(nodeC)).toBe(true);

            // Property: Each node should appear exactly once (no duplicates)
            const resultArray = Array.from(result);
            const uniqueCount = new Set(resultArray).size;
            expect(uniqueCount).toBe(resultArray.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle empty link list', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.integer({ min: 0, max: 10 }),
          (startNode, maxHops) => {
            // Empty link list
            const links: RFLink[] = [];

            // Compute nodes within hops
            const result = computeNodesWithinHops(startNode, maxHops, links);

            // Property: With no links, only the starting node should be returned
            expect(result.size).toBe(1);
            expect(result.has(startNode)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should be monotonic with respect to hop count', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.array(
            fc.record({
              from: fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
              to: fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`)
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.integer({ min: 1, max: 5 }),
          (startNode, linkPairs, maxHops) => {
            // Create RF links from pairs
            const links = linkPairs
              .filter(pair => pair.from !== pair.to)
              .map(pair => createMockLink(pair.from, pair.to));

            // Compute nodes within N hops
            const resultN = computeNodesWithinHops(startNode, maxHops, links);

            // Compute nodes within N+1 hops
            const resultNPlus1 = computeNodesWithinHops(startNode, maxHops + 1, links);

            // Property: Nodes within N hops should be a subset of nodes within N+1 hops
            resultN.forEach(node => {
              expect(resultNPlus1.has(node)).toBe(true);
            });

            // Property: Result size should be non-decreasing
            expect(resultNPlus1.size).toBeGreaterThanOrEqual(resultN.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle large hop counts gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
          fc.array(
            fc.record({
              from: fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`),
              to: fc.string({ minLength: 9, maxLength: 9 }).map(s => `!${s.substring(0, 8).toUpperCase()}`)
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (startNode, linkPairs) => {
            // Create RF links from pairs
            const links = linkPairs
              .filter(pair => pair.from !== pair.to)
              .map(pair => createMockLink(pair.from, pair.to));

            // Use a very large hop count (larger than any possible path)
            const result = computeNodesWithinHops(startNode, 1000, links);

            // Property: Should find all reachable nodes in the connected component
            // Result size should be finite and reasonable
            expect(result.size).toBeGreaterThanOrEqual(1);
            expect(result.size).toBeLessThanOrEqual(links.length * 2 + 1); // Max possible nodes

            // Property: Starting node should always be included
            expect(result.has(startNode)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
