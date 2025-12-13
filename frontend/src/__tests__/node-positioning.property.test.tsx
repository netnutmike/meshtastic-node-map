/**
 * Property-based test for node positioning
 * **Feature: meshtastic-node-mapper, Property 1: Node rendering with position data**
 * **Validates: Requirements 1.2**
 */

// Mock react-leaflet components
import React from 'react';
import * as fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mapReducer from '../store/slices/mapSlice';
import nodeReducer from '../store/slices/nodeSlice';
import settingsReducer from '../store/slices/settingsSlice';
import NodeMarkers from '../components/Map/NodeMarkers';
import { Node } from '../store/slices/nodeSlice';

jest.mock('react-leaflet', () => ({
  Marker: ({ position, children }: { position: [number, number]; children: React.ReactNode }) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  useMap: () => ({
    distance: () => 0,
  }),
}));



// Mock Leaflet
jest.mock('leaflet', () => ({
  ...jest.requireActual('leaflet'),
  divIcon: jest.fn((options) => ({
    options,
    _getIconUrl: jest.fn(),
  })),
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
}));

// Generator for valid GPS coordinates
const validLatitudeArb = fc.double({ min: -90, max: 90 });
const validLongitudeArb = fc.double({ min: -180, max: 180 });
const validAltitudeArb = fc.double({ min: -1000, max: 10000 });
const validPrecisionArb = fc.double({ min: 0, max: 100 });

// Generator for nodes with valid position data
const nodeWithValidPositionArb: fc.Arbitrary<Node> = fc.record({
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
  lastSeen: fc.date().map(d => d.toISOString()),
  lastHeard: fc.date().map(d => d.toISOString()),
  isOnline: fc.boolean(),
  mqttConnected: fc.boolean(),
  batteryLevel: fc.option(fc.integer({ min: 0, max: 100 })),
  voltage: fc.option(fc.double({ min: 3.0, max: 5.0 })),
  channelUtilization: fc.option(fc.integer({ min: 0, max: 100 })),
  airUtilTx: fc.option(fc.integer({ min: 0, max: 100 })),
});

// Generator for nodes without position data
const nodeWithoutPositionArb: fc.Arbitrary<Node> = nodeWithValidPositionArb.map(node => ({
  ...node,
  position: null,
}));

// Create a test store with initial state
const createTestStore = (nodes: Node[] = []) => {
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
        showNeighbors: false,
        showLegend: true,
        viewMode: 'nodes',
      },
      nodes: {
        nodes,
        selectedNodeId: null,
        loading: false,
        error: null,
      },
    },
  });
};

describe('Node Positioning Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 1: Node rendering with position data - For any node with valid position data, the node should appear on the map as a colored dot at the correct geographic coordinates', () => {
    fc.assert(
      fc.property(
        fc.array(nodeWithValidPositionArb, { minLength: 1, maxLength: 5 }),
        (nodes) => {
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `positioned_node_${i}` }));
          
          const store = createTestStore(uniqueNodes);

          const { container, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            // Verify that markers are rendered for nodes with position data
            const markers = container.querySelectorAll('[data-testid="marker"]');
            expect(markers).toHaveLength(uniqueNodes.length);

            // Verify each marker has the correct position
            markers.forEach((marker, index) => {
              const positionData = marker.getAttribute('data-position');
              expect(positionData).toBeTruthy();
              
              const position = JSON.parse(positionData!);
              const expectedNode = uniqueNodes[index];
              
              // Verify the position matches the node's position data
              expect(position).toHaveLength(2);
              expect(position[0]).toBeCloseTo(expectedNode.position!.latitude, 10);
              expect(position[1]).toBeCloseTo(expectedNode.position!.longitude, 10);
              
              // Verify coordinates are within valid GPS ranges
              expect(position[0]).toBeGreaterThanOrEqual(-90);
              expect(position[0]).toBeLessThanOrEqual(90);
              expect(position[1]).toBeGreaterThanOrEqual(-180);
              expect(position[1]).toBeLessThanOrEqual(180);
            });

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Nodes without position data should not be rendered on the map', () => {
    fc.assert(
      fc.property(
        fc.array(nodeWithoutPositionArb, { minLength: 1, maxLength: 5 }),
        (nodes) => {
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `no_position_node_${i}` }));
          
          const store = createTestStore(uniqueNodes);

          const { container, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            // Verify that no markers are rendered for nodes without position data
            const markers = container.querySelectorAll('[data-testid="marker"]');
            expect(markers).toHaveLength(0);

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Mixed nodes (with and without position) should only render positioned nodes', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(nodeWithValidPositionArb, { minLength: 1, maxLength: 3 }),
          fc.array(nodeWithoutPositionArb, { minLength: 1, maxLength: 3 })
        ),
        ([nodesWithPosition, nodesWithoutPosition]) => {
          // Ensure unique IDs
          const positionedNodes = nodesWithPosition.map((node, i) => ({ 
            ...node, 
            id: `positioned_${i}` 
          }));
          const unpositionedNodes = nodesWithoutPosition.map((node, i) => ({ 
            ...node, 
            id: `unpositioned_${i}` 
          }));
          
          const allNodes = [...positionedNodes, ...unpositionedNodes];
          const store = createTestStore(allNodes);

          const { container, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            // Verify that only nodes with position data are rendered
            const markers = container.querySelectorAll('[data-testid="marker"]');
            expect(markers).toHaveLength(positionedNodes.length);

            // Verify each rendered marker corresponds to a positioned node
            markers.forEach((marker, index) => {
              const positionData = marker.getAttribute('data-position');
              expect(positionData).toBeTruthy();
              
              const position = JSON.parse(positionData!);
              const expectedNode = positionedNodes[index];
              
              expect(position[0]).toBeCloseTo(expectedNode.position!.latitude, 10);
              expect(position[1]).toBeCloseTo(expectedNode.position!.longitude, 10);
            });

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Position coordinates should be accurately passed to Leaflet markers', () => {
    fc.assert(
      fc.property(
        fc.record({
          latitude: fc.double({ min: -89.9, max: 89.9, noNaN: true }), // Exclude NaN values
          longitude: fc.double({ min: -179.9, max: 179.9, noNaN: true }), // Exclude NaN values
        }).filter(coords => 
          !isNaN(coords.latitude) && 
          !isNaN(coords.longitude) && 
          isFinite(coords.latitude) && 
          isFinite(coords.longitude)
        ),
        (coordinates) => {
          const node: Node = {
            id: 'test_node',
            hexId: '0x12345678',
            shortName: 'TEST',
            longName: 'Test Node',
            hardwareModel: 'TBEAM',
            firmwareVersion: '1.0.0',
            role: 'ROUTER',
            position: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            },
            lastSeen: new Date().toISOString(),
            lastHeard: new Date().toISOString(),
            isOnline: true,
            mqttConnected: true,
          };
          
          const store = createTestStore([node]);

          const { container, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            const marker = container.querySelector('[data-testid="marker"]');
            expect(marker).toBeInTheDocument();
            
            const positionData = marker!.getAttribute('data-position');
            const position = JSON.parse(positionData!);
            
            // Verify exact coordinate matching (handle -0 vs 0 edge case)
            expect(position[0]).toBeCloseTo(coordinates.latitude, 10);
            expect(position[1]).toBeCloseTo(coordinates.longitude, 10);

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});