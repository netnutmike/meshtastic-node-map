/**
 * Property-based test for age-based node filtering
 * **Feature: meshtastic-node-mapper, Property 11: Age-based node filtering**
 * **Validates: Requirements 13.4**
 */

import * as fc from 'fast-check';
import { configureStore } from '@reduxjs/toolkit';
import mapReducer from '../store/slices/mapSlice';
import nodeReducer, { Node, setNodes, setSearchFilters } from '../store/slices/nodeSlice';
import settingsReducer from '../store/slices/settingsSlice';

// Age-based filtering function (extracted from NodeMarkers logic)
const applyAgeBasedFiltering = (nodes: Node[], showAll: boolean, nodesMaxAge: number): Node[] => {
  return nodes
    .filter(node => node.position) // Only show nodes with valid position data
    .filter(node => {
      // Age-based filtering logic (Requirements 13.4)
      if (showAll) {
        return true; // Show all nodes when showAll is enabled
      }
      
      // Apply age filtering when showAll is disabled
      if (!node.lastSeen) {
        return false; // Hide nodes without lastSeen timestamp
      }
      
      const nodeAgeSeconds = (Date.now() - new Date(node.lastSeen).getTime()) / 1000;
      return nodeAgeSeconds <= nodesMaxAge;
    });
};

// Generator for valid GPS coordinates
const validLatitudeArb = fc.double({ min: -90, max: 90 });
const validLongitudeArb = fc.double({ min: -180, max: 180 });
const validAltitudeArb = fc.double({ min: -1000, max: 10000 });
const validPrecisionArb = fc.double({ min: 0, max: 100 });

// Generator for nodes with configurable ages
const nodeWithAgeArb = (ageInSeconds: number): fc.Arbitrary<Node> => {
  return fc.record({
    id: fc.hexaString({ minLength: 8, maxLength: 8 }).map(s => `node_${s}`),
    hexId: fc.hexaString({ minLength: 8, maxLength: 8 }).map(s => `0x${s}`),
    shortName: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
    longName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    hardwareModel: fc.constantFrom('TBEAM', 'HELTEC_V3', 'RAK4631', 'LORA32_V2'),
    firmwareVersion: fc.string({ minLength: 5, maxLength: 10 }).filter(s => s.trim().length > 0),
    role: fc.constantFrom('ROUTER', 'CLIENT', 'REPEATER'),
    position: fc.record({
      latitude: validLatitudeArb,
      longitude: validLongitudeArb,
      altitude: fc.option(validAltitudeArb),
      precision: fc.option(validPrecisionArb),
    }),
    lastSeen: fc.integer().map(() => new Date(Date.now() - ageInSeconds * 1000).toISOString()),
    lastHeard: fc.date().map(d => d.toISOString()),
    isOnline: fc.boolean(),
    mqttConnected: fc.boolean(),
    batteryLevel: fc.option(fc.integer({ min: 0, max: 100 })),
    voltage: fc.option(fc.double({ min: 3.0, max: 5.0 })),
    channelUtilization: fc.option(fc.integer({ min: 0, max: 100 })),
    airUtilTx: fc.option(fc.integer({ min: 0, max: 100 })),
  });
};

// Create nodes that are within the age limit
const recentNodeArb = (maxAgeSeconds: number): fc.Arbitrary<Node> => {
  return fc.integer({ min: 0, max: maxAgeSeconds - 1 }).chain(age => nodeWithAgeArb(age));
};

// Create nodes that exceed the age limit
const oldNodeArb = (maxAgeSeconds: number): fc.Arbitrary<Node> => {
  return fc.integer({ min: maxAgeSeconds + 1, max: maxAgeSeconds * 3 }).chain(age => nodeWithAgeArb(age));
};

// Create a test store with configurable settings
const createTestStore = (nodes: Node[] = [], showAll: boolean = false, maxAgeSeconds: number = 86400) => {
  const store = configureStore({
    reducer: {
      map: mapReducer,
      nodes: nodeReducer,
      settings: settingsReducer,
    },
    preloadedState: {
      map: {
        center: [40.7128, -74.0060],
        zoom: 10,
        tileLayer: 'openstreetmap',
        showNodes: true,
        showNeighbors: false,
        showLegend: true,
        viewMode: 'nodes',
        clusteringEnabled: true,
        animationsEnabled: true,
      },
      nodes: {
        nodes: [],
        filteredNodes: [],
        selectedNodeId: null,
        detailsPanelOpen: false,
        neighborVisualizationActive: false,
        neighborVisualizationNodeId: null,
        neighborVisualizationDirection: null,
        searchFilters: {},
        loading: false,
        error: null,
      },
      settings: {
        nodesMaxAge: maxAgeSeconds,
        nodesDisconnectedAge: 3600,
        nodesOfflineAge: 300,
        defaultZoom: 10,
        temperatureFormat: 'celsius' as const,
        autoUpdatePositionInUrl: true,
        showAll,
      },
    },
  });

  // Set nodes and apply age-based filtering
  store.dispatch(setNodes(nodes));
  
  // Apply age-based filtering if showAll is false
  if (!showAll) {
    const maxAgeHours = maxAgeSeconds / 3600;
    store.dispatch(setSearchFilters({ maxAge: maxAgeHours }));
  }

  return store;
};

describe('Age-based Node Filtering Property Tests', () => {
  test('Property 11: Age-based node filtering - For any node exceeding the configured maximum age, the node should be hidden from the map unless "Show All" mode is enabled', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 3600, max: 86400 }), // maxAge in seconds (1 hour to 24 hours)
          fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 1, maxLength: 3 }), // number of recent nodes
          fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 1, maxLength: 3 }), // number of old nodes
          fc.boolean() // showAll setting
        ),
        ([maxAgeSeconds, recentNodeCounts, oldNodeCounts, showAll]) => {
          // Generate recent nodes (within age limit)
          const recentNodes = recentNodeCounts.flatMap((count, i) => 
            fc.sample(recentNodeArb(maxAgeSeconds), count).map((node, j) => ({ 
              ...node, 
              id: `recent_${i}_${j}` 
            }))
          );
          
          // Generate old nodes (exceeding age limit)
          const oldNodes = oldNodeCounts.flatMap((count, i) => 
            fc.sample(oldNodeArb(maxAgeSeconds), count).map((node, j) => ({ 
              ...node, 
              id: `old_${i}_${j}` 
            }))
          );

          const allNodes = [...recentNodes, ...oldNodes];

          const filteredNodes = applyAgeBasedFiltering(allNodes, showAll, maxAgeSeconds);
          
          if (showAll) {
            // When "Show All" is enabled, all nodes should be visible
            expect(filteredNodes.length).toBe(allNodes.length);
          } else {
            // When "Show All" is disabled, only recent nodes should be visible
            expect(filteredNodes.length).toBe(recentNodes.length);
            
            // Verify that all filtered nodes are recent (within age limit)
            filteredNodes.forEach(node => {
              const nodeAgeSeconds = (Date.now() - new Date(node.lastSeen!).getTime()) / 1000;
              expect(nodeAgeSeconds).toBeLessThanOrEqual(maxAgeSeconds);
            });
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Recent nodes should always be visible regardless of showAll setting', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 3600, max: 86400 }), // maxAge in seconds
          fc.array(recentNodeArb(3600), { minLength: 1, maxLength: 5 }), // recent nodes
          fc.boolean() // showAll setting
        ),
        ([maxAgeSeconds, nodes, showAll]) => {
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `recent_${i}` }));
          
          const filteredNodes = applyAgeBasedFiltering(uniqueNodes, showAll, maxAgeSeconds);
          
          // All recent nodes should be visible regardless of showAll setting
          expect(filteredNodes.length).toBe(uniqueNodes.length);

          return true;
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Old nodes should be hidden when showAll is false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3600, max: 86400 }), // maxAge in seconds
        (maxAgeSeconds) => {
          // Generate old nodes that exceed this specific maxAge
          const nodes = fc.sample(oldNodeArb(maxAgeSeconds), fc.sample(fc.integer({ min: 1, max: 5 }), 1)[0]);
          
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `old_${i}` }));
          
          const filteredNodes = applyAgeBasedFiltering(uniqueNodes, false, maxAgeSeconds); // showAll = false
          
          // No old nodes should be visible when showAll is false
          expect(filteredNodes.length).toBe(0);

          return true;
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Old nodes should be visible when showAll is true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3600, max: 86400 }), // maxAge in seconds
        (maxAgeSeconds) => {
          // Generate old nodes that exceed this specific maxAge
          const nodes = fc.sample(oldNodeArb(maxAgeSeconds), fc.sample(fc.integer({ min: 1, max: 5 }), 1)[0]);
          
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `old_${i}` }));
          
          const filteredNodes = applyAgeBasedFiltering(uniqueNodes, true, maxAgeSeconds); // showAll = true
          
          // All old nodes should be visible when showAll is true
          expect(filteredNodes.length).toBe(uniqueNodes.length);

          return true;
        }
      ),
      { numRuns: 25 }
    );
  });
});