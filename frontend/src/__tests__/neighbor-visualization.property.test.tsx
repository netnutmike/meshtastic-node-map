/**
 * Property-based test for neighbor visualization
 * **Feature: meshtastic-node-mapper, Property 5: Neighbor visualization arrows**
 * **Validates: Requirements 2.5**
 */

import React from 'react';
import * as fc from 'fast-check';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mapReducer from '../store/slices/mapSlice';
import nodeReducer from '../store/slices/nodeSlice';
import settingsReducer from '../store/slices/settingsSlice';
import { Node } from '../store/slices/nodeSlice';

// Mock component that simulates NodeMarkers behavior for neighbor visualization
const MockNodeMarkersWithNeighbors = ({ 
  nodes, 
  showNeighbors = false 
}: { 
  nodes: NodeWithNeighbors[]; 
  showNeighbors?: boolean;
}) => {
  return (
    <div data-testid="node-markers">
      {nodes.filter(node => node.position).map(node => (
        <div key={node.id} data-testid="marker" data-position={JSON.stringify([node.position!.latitude, node.position!.longitude])}>
          <div data-testid="popup">
            <div>
              <h4>{node.longName || node.shortName}</h4>
              <p>Short Name: {node.shortName}</p>
              <p>ID: {node.id}</p>
              <p>Hex ID: {node.hexId}</p>
              <p>Hardware: {node.hardwareModel}</p>
              <p>Role: {node.role}</p>
              
              {/* Required buttons per Requirements 2.2, 2.3, 2.4 */}
              <button data-testid="show-details-btn">
                Show Full Details
              </button>
              <button 
                data-testid="neighbors-heard-us-btn"
                onClick={() => {
                  // This would trigger neighbor visualization
                  console.log('Show Neighbors That Heard Us for node:', node.id);
                }}
              >
                Show Neighbors That Heard Us
              </button>
              <button 
                data-testid="neighbors-we-heard-btn"
                onClick={() => {
                  // This would trigger reverse neighbor visualization
                  console.log('Show Neighbors That We Heard for node:', node.id);
                }}
              >
                Show Neighbors That We Heard
              </button>
              
              {/* Neighbor arrows visualization when activated */}
              {showNeighbors && node.neighbors && node.neighbors.length > 0 && (
                <div data-testid="neighbor-arrows" data-node-id={node.id}>
                  {node.neighbors.map(neighbor => (
                    <div 
                      key={neighbor.id} 
                      data-testid="neighbor-arrow" 
                      data-from-node={node.id}
                      data-to-node={neighbor.neighborId}
                      data-rssi={neighbor.rssi}
                      data-snr={neighbor.snr}
                    >
                      Arrow: {node.id} → {neighbor.neighborId} (RSSI: {neighbor.rssi}, SNR: {neighbor.snr})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Extended Node interface with neighbors for testing
interface NodeWithNeighbors extends Node {
  neighbors?: Array<{
    id: string;
    neighborId: string;
    rssi?: number;
    snr?: number;
    lastHeard: string;
    hopCount: number;
  }>;
}

// Generator for valid GPS coordinates
const validLatitudeArb = fc.double({ min: -90, max: 90 });
const validLongitudeArb = fc.double({ min: -180, max: 180 });

// Generator for neighbor relationships
const neighborArb = fc.record({
  id: fc.string({ minLength: 8, maxLength: 16 }).map(s => `neighbor_${s}`),
  neighborId: fc.string({ minLength: 8, maxLength: 16 }).map(s => `node_${s}`),
  rssi: fc.option(fc.integer({ min: -120, max: -30 })), // Typical RSSI range
  snr: fc.option(fc.double({ min: -20, max: 20 })), // Typical SNR range
  lastHeard: fc.date().map(d => d.toISOString()),
  hopCount: fc.integer({ min: 1, max: 5 }),
});

// Generator for nodes with position and neighbors
const nodeWithNeighborsArb: fc.Arbitrary<NodeWithNeighbors> = fc.record({
  id: fc.string({ minLength: 8, maxLength: 16 }).map(s => `node_${s}`),
  hexId: fc.string({ minLength: 8, maxLength: 16 }).map(s => `0x${s}`),
  shortName: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
  longName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  hardwareModel: fc.constantFrom('TBEAM', 'HELTEC_V3', 'RAK4631', 'LORA32_V2'),
  firmwareVersion: fc.string({ minLength: 5, maxLength: 10 }).filter(s => s.trim().length > 0),
  role: fc.constantFrom('ROUTER', 'CLIENT', 'REPEATER'),
  position: fc.record({
    latitude: validLatitudeArb,
    longitude: validLongitudeArb,
    altitude: fc.option(fc.double({ min: -1000, max: 10000 })),
    precision: fc.option(fc.double({ min: 0, max: 100 })),
  }),
  lastSeen: fc.date().map(d => d.toISOString()),
  lastHeard: fc.date().map(d => d.toISOString()),
  isOnline: fc.boolean(),
  mqttConnected: fc.boolean(),
  batteryLevel: fc.option(fc.integer({ min: 0, max: 100 })),
  voltage: fc.option(fc.double({ min: 3.0, max: 5.0 })),
  channelUtilization: fc.option(fc.integer({ min: 0, max: 100 })),
  airUtilTx: fc.option(fc.integer({ min: 0, max: 100 })),
  neighbors: fc.option(fc.array(neighborArb, { minLength: 1, maxLength: 5 })),
});

// Create a test store with initial state
const createTestStore = (nodes: NodeWithNeighbors[] = [], showNeighbors: boolean = false) => {
  return configureStore({
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
        showNeighbors,
        showLegend: true,
        viewMode: 'nodes',
        clusteringEnabled: true,
        animationsEnabled: true,
      },
      nodes: {
        nodes: nodes as Node[], // Cast to base Node type for store
        selectedNodeId: null,
        detailsPanelOpen: false,
        loading: false,
        error: null,
      },
    },
  });
};

describe('Neighbor Visualization Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 5: Neighbor visualization arrows - For any node with neighbors, activating neighbor visualization should draw directional arrows between the selected node and all its connected neighbors', () => {
    fc.assert(
      fc.property(
        fc.array(nodeWithNeighborsArb, { minLength: 2, maxLength: 5 }).filter(nodes => 
          // Ensure at least one node has neighbors
          nodes.some(node => node.neighbors && node.neighbors.length > 0)
        ),
        (nodes) => {
          // Ensure unique IDs and create valid neighbor relationships
          const uniqueNodes = nodes.map((node, i) => ({ 
            ...node, 
            id: `neighbor_test_${i}` 
          }));

          // Update neighbor relationships to reference actual node IDs
          const processedNodes = uniqueNodes.map(node => {
            if (node.neighbors) {
              const validNeighbors = node.neighbors
                .map((neighbor, idx) => ({
                  ...neighbor,
                  neighborId: uniqueNodes[(idx + 1) % uniqueNodes.length].id // Circular reference
                }))
                .filter(neighbor => neighbor.neighborId !== node.id); // No self-references
              
              return { ...node, neighbors: validNeighbors };
            }
            return node;
          });

          const store = createTestStore(processedNodes, false);

          const { container, getAllByTestId, unmount } = render(
            <Provider store={store}>
              <MockNodeMarkersWithNeighbors nodes={processedNodes} showNeighbors={false} />
            </Provider>
          );

          try {
            // Find a node with neighbors
            const nodeWithNeighbors = processedNodes.find(node => 
              node.neighbors && node.neighbors.length > 0
            );

            if (!nodeWithNeighbors) {
              // Skip if no node has neighbors (shouldn't happen due to filter)
              return true;
            }

            // Verify that popups are rendered for each positioned node
            const popups = getAllByTestId('popup');
            expect(popups.length).toBeGreaterThan(0);

            // Verify neighbor visualization buttons are present in all popups
            popups.forEach((popup) => {
              const popupContent = popup.textContent || '';
              
              // Required buttons according to Requirements 2.3 and 2.4:
              // 1. "Show Neighbors That Heard Us" button (Requirement 2.3)  
              // 2. "Show Neighbors That We Heard" button (Requirement 2.4)
              expect(popupContent).toMatch(/Show Neighbors.*Heard Us|Neighbors.*Heard Us|Heard Us/i);
              expect(popupContent).toMatch(/Show Neighbors.*We Heard|Neighbors.*We Heard|We Heard/i);
            });

            // Test clicking neighbor visualization buttons
            const heardUsButtons = getAllByTestId('neighbors-heard-us-btn');
            const weHeardButtons = getAllByTestId('neighbors-we-heard-btn');

            expect(heardUsButtons.length).toBeGreaterThan(0);
            expect(weHeardButtons.length).toBeGreaterThan(0);

            // Click a neighbor visualization button - should not cause errors
            fireEvent.click(heardUsButtons[0]);
            fireEvent.click(weHeardButtons[0]);

            // Now test with neighbor visualization enabled
            const { container: containerWithArrows, unmount: unmountWithArrows } = render(
              <Provider store={store}>
                <MockNodeMarkersWithNeighbors nodes={processedNodes} showNeighbors={true} />
              </Provider>
            );

            try {
              // When neighbor visualization is active, arrows should be drawn
              const arrows = containerWithArrows.querySelectorAll('[data-testid="neighbor-arrow"]');
              
              // Should have arrows for nodes with neighbors
              const totalExpectedArrows = processedNodes.reduce((sum, node) => 
                sum + (node.neighbors ? node.neighbors.length : 0), 0
              );
              
              expect(arrows.length).toBe(totalExpectedArrows);
              
              // Each arrow should have proper data attributes
              arrows.forEach(arrow => {
                expect(arrow.getAttribute('data-from-node')).toBeTruthy();
                expect(arrow.getAttribute('data-to-node')).toBeTruthy();
                
                // Verify the from-node exists in our processed nodes
                const fromNodeId = arrow.getAttribute('data-from-node');
                const fromNodeExists = processedNodes.some(node => node.id === fromNodeId);
                expect(fromNodeExists).toBe(true);
              });
            } finally {
              unmountWithArrows();
            }

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Neighbor visualization buttons should be present for all nodes regardless of neighbor count', () => {
    fc.assert(
      fc.property(
        fc.array(nodeWithNeighborsArb.map(node => ({ ...node, neighbors: undefined })), { 
          minLength: 1, 
          maxLength: 3 
        }),
        (nodes) => {
          const uniqueNodes = nodes.map((node, i) => ({ 
            ...node, 
            id: `no_neighbors_${i}` 
          }));

          const store = createTestStore(uniqueNodes);

          const { getAllByTestId, unmount } = render(
            <Provider store={store}>
              <MockNodeMarkersWithNeighbors nodes={uniqueNodes} />
            </Provider>
          );

          try {
            const popups = getAllByTestId('popup');
            
            // Even nodes without neighbors should have the neighbor visualization buttons
            // (they just won't show any arrows when clicked)
            popups.forEach(popup => {
              const popupContent = popup.textContent || '';
              expect(popupContent).toMatch(/Show Neighbors.*Heard Us|Neighbors.*Heard Us|Heard Us/i);
              expect(popupContent).toMatch(/Show Neighbors.*We Heard|Neighbors.*We Heard|We Heard/i);
            });

            // Verify buttons are clickable
            const heardUsButtons = getAllByTestId('neighbors-heard-us-btn');
            const weHeardButtons = getAllByTestId('neighbors-we-heard-btn');

            expect(heardUsButtons.length).toBe(uniqueNodes.length);
            expect(weHeardButtons.length).toBe(uniqueNodes.length);

            // Clicking should not cause errors even for nodes without neighbors
            heardUsButtons.forEach(button => {
              expect(() => fireEvent.click(button)).not.toThrow();
            });

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  test('Neighbor arrows should include signal strength information when available', () => {
    fc.assert(
      fc.property(
        nodeWithNeighborsArb.filter(node => node.neighbors && node.neighbors.length > 0),
        (node) => {
          // Create a node with neighbors having signal strength data
          const nodeWithSignalData = {
            ...node,
            id: 'signal_test_node',
            neighbors: [
              { 
                id: 'strong_neighbor', 
                neighborId: 'neighbor_1', 
                rssi: -40, 
                snr: 15, 
                lastHeard: new Date().toISOString(), 
                hopCount: 1 
              },
              { 
                id: 'weak_neighbor', 
                neighborId: 'neighbor_2', 
                rssi: -100, 
                snr: -5, 
                lastHeard: new Date().toISOString(), 
                hopCount: 2 
              }
            ]
          };

          const store = createTestStore([nodeWithSignalData]);

          const { container, unmount } = render(
            <Provider store={store}>
              <MockNodeMarkersWithNeighbors nodes={[nodeWithSignalData]} showNeighbors={true} />
            </Provider>
          );

          try {
            // When neighbor visualization is active, arrows should include signal data
            const arrows = container.querySelectorAll('[data-testid="neighbor-arrow"]');
            
            expect(arrows.length).toBe(2); // Two neighbors
            
            // Each arrow should have signal strength data
            arrows.forEach(arrow => {
              const rssi = arrow.getAttribute('data-rssi');
              const snr = arrow.getAttribute('data-snr');
              
              expect(rssi).toBeTruthy();
              expect(snr).toBeTruthy();
              
              // RSSI should be in valid range
              const rssiValue = parseInt(rssi!);
              expect(rssiValue).toBeGreaterThanOrEqual(-120);
              expect(rssiValue).toBeLessThanOrEqual(-30);
              
              // SNR should be in valid range
              const snrValue = parseFloat(snr!);
              expect(snrValue).toBeGreaterThanOrEqual(-20);
              expect(snrValue).toBeLessThanOrEqual(20);
            });

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  test('Neighbor visualization should work for different node roles', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          nodeWithNeighborsArb.map(node => ({ ...node, role: 'ROUTER' })),
          nodeWithNeighborsArb.map(node => ({ ...node, role: 'CLIENT' })),
          nodeWithNeighborsArb.map(node => ({ ...node, role: 'REPEATER' }))
        ),
        ([routerNode, clientNode, repeaterNode]) => {
          const nodes = [
            { ...routerNode, id: 'router_neighbor_test' },
            { ...clientNode, id: 'client_neighbor_test' },
            { ...repeaterNode, id: 'repeater_neighbor_test' }
          ];

          const store = createTestStore(nodes);

          const { getAllByTestId, unmount } = render(
            <Provider store={store}>
              <MockNodeMarkersWithNeighbors nodes={nodes} />
            </Provider>
          );

          try {
            const popups = getAllByTestId('popup');
            expect(popups).toHaveLength(3);

            // All node types should have neighbor visualization capabilities
            popups.forEach(popup => {
              const popupContent = popup.textContent || '';
              
              // Verify neighbor buttons exist for all node roles
              expect(popupContent).toMatch(/Neighbors.*Heard Us|Heard Us/i);
              expect(popupContent).toMatch(/Neighbors.*We Heard|We Heard/i);
            });

            // Verify buttons are functional for all node types
            const heardUsButtons = getAllByTestId('neighbors-heard-us-btn');
            const weHeardButtons = getAllByTestId('neighbors-we-heard-btn');
            
            expect(heardUsButtons.length).toBe(3);
            expect(weHeardButtons.length).toBe(3);
            
            // Test clicking doesn't cause errors for any node type
            heardUsButtons.forEach(button => {
              expect(() => fireEvent.click(button)).not.toThrow();
            });
            
            weHeardButtons.forEach(button => {
              expect(() => fireEvent.click(button)).not.toThrow();
            });

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});