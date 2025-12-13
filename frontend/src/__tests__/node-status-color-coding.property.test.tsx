/**
 * Property-based test for node status color coding
 * **Feature: meshtastic-node-mapper, Property 2: Node status color coding**
 * **Validates: Requirements 1.3, 1.4, 1.5**
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

// Import the mocked leaflet module
import L from 'leaflet';

jest.mock('react-leaflet', () => ({
  Marker: ({ children, icon }: { children: React.ReactNode; icon: any }) => (
    <div data-testid="marker" data-icon={JSON.stringify(icon)}>
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

// Generator for nodes with different connection statuses
const nodeWithStatusArb: fc.Arbitrary<Node> = fc.record({
  id: fc.hexaString({ minLength: 8, maxLength: 8 }).map(s => `node_${s}`), // Ensure unique IDs
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

// Create specific nodes for each status type
const onlineNodeArb: fc.Arbitrary<Node> = nodeWithStatusArb.map(node => ({
  ...node,
  isOnline: true,
  mqttConnected: true,
}));

const disconnectedNodeArb: fc.Arbitrary<Node> = nodeWithStatusArb.map(node => ({
  ...node,
  isOnline: true,
  mqttConnected: false,
}));

const offlineNodeArb: fc.Arbitrary<Node> = nodeWithStatusArb.map(node => ({
  ...node,
  isOnline: false,
  mqttConnected: false, // Offline nodes are also not MQTT connected
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
const mockDivIcon = L.divIcon as jest.MockedFunction<typeof L.divIcon>;

describe('Node Status Color Coding Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 2: Node status color coding - For any node, the dot color should correspond to its connection status', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(onlineNodeArb, { minLength: 1, maxLength: 2 }),
          fc.array(disconnectedNodeArb, { minLength: 1, maxLength: 2 }),
          fc.array(offlineNodeArb, { minLength: 1, maxLength: 2 })
        ),
        ([onlineNodes, disconnectedNodes, offlineNodes]) => {
          // Ensure unique IDs across all nodes
          const allNodes = [
            ...onlineNodes.map((node, i) => ({ ...node, id: `online_${i}` })),
            ...disconnectedNodes.map((node, i) => ({ ...node, id: `disconnected_${i}` })),
            ...offlineNodes.map((node, i) => ({ ...node, id: `offline_${i}` }))
          ];
          
          // Reset mock before each test
          mockDivIcon.mockClear();
          
          const store = createTestStore(allNodes);

          const { container, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            // Verify that divIcon was called for each node
            expect(mockDivIcon).toHaveBeenCalledTimes(allNodes.length);

            // Check that each call to divIcon has the correct color based on node status
            const divIconCalls = mockDivIcon.mock.calls;

            // Verify each call has the correct color
            divIconCalls.forEach((call, index) => {
              const options = call[0];
              const html = options.html;
              
              // Extract the background color from the HTML
              const colorMatch = html.match(/background-color:\s*([^;]+)/);
              expect(colorMatch).toBeTruthy();
              
              const color = colorMatch[1].trim();
              const node = allNodes[index];

              // Determine expected color based on node status
              let expectedColor: string;
              if (!node.isOnline) {
                expectedColor = '#f44336'; // Red for offline
              } else if (!node.mqttConnected) {
                expectedColor = '#2196f3'; // Blue for disconnected
              } else {
                expectedColor = '#4caf50'; // Green for online
              }

              expect(color).toBe(expectedColor);
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

  test('Online nodes (MQTT connected and online) should have green dots', () => {
    fc.assert(
      fc.property(
        fc.array(onlineNodeArb, { minLength: 1, maxLength: 3 }),
        (nodes) => {
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `online_test_${i}` }));
          
          // Reset mock before each test
          mockDivIcon.mockClear();
          
          const store = createTestStore(uniqueNodes);

          const { unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            expect(mockDivIcon).toHaveBeenCalledTimes(uniqueNodes.length);

            // All calls should result in green color
            mockDivIcon.mock.calls.forEach((call) => {
              const options = call[0];
              const html = options.html;
              const colorMatch = html.match(/background-color:\s*([^;]+)/);
              expect(colorMatch[1].trim()).toBe('#4caf50'); // Green
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

  test('Disconnected nodes (online but not MQTT connected) should have blue dots', () => {
    fc.assert(
      fc.property(
        fc.array(disconnectedNodeArb, { minLength: 1, maxLength: 3 }),
        (nodes) => {
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `disconnected_test_${i}` }));
          
          // Reset mock before each test
          mockDivIcon.mockClear();
          
          const store = createTestStore(uniqueNodes);

          const { unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            expect(mockDivIcon).toHaveBeenCalledTimes(uniqueNodes.length);

            // All calls should result in blue color
            mockDivIcon.mock.calls.forEach((call) => {
              const options = call[0];
              const html = options.html;
              const colorMatch = html.match(/background-color:\s*([^;]+)/);
              expect(colorMatch[1].trim()).toBe('#2196f3'); // Blue
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

  test('Offline nodes should have red dots', () => {
    fc.assert(
      fc.property(
        fc.array(offlineNodeArb, { minLength: 1, maxLength: 3 }),
        (nodes) => {
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `offline_test_${i}` }));
          
          // Reset mock before each test
          mockDivIcon.mockClear();
          
          const store = createTestStore(uniqueNodes);

          const { unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            expect(mockDivIcon).toHaveBeenCalledTimes(uniqueNodes.length);

            // All calls should result in red color
            mockDivIcon.mock.calls.forEach((call) => {
              const options = call[0];
              const html = options.html;
              const colorMatch = html.match(/background-color:\s*([^;]+)/);
              expect(colorMatch[1].trim()).toBe('#f44336'); // Red
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
});