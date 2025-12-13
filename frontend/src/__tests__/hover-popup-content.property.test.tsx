/**
 * Property-based test for hover popup content
 * **Feature: meshtastic-node-mapper, Property 3: Hover popup content completeness**
 * **Validates: Requirements 2.1**
 */

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
  Marker: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marker">
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

jest.mock('leaflet', () => ({
  ...jest.requireActual('leaflet'),
  divIcon: jest.fn((options: any) => ({
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

// Generator for nodes with all required popup fields
const nodeWithPopupDataArb: fc.Arbitrary<Node> = fc.record({
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
        clusteringEnabled: true,
        animationsEnabled: true,
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

describe('Hover Popup Content Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 3: Hover popup content completeness - For any node, hovering should display a popup containing all required fields', () => {
    fc.assert(
      fc.property(
        fc.array(nodeWithPopupDataArb, { minLength: 1, maxLength: 3 }),
        (nodes) => {
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `popup_test_${i}` }));
          
          const store = createTestStore(uniqueNodes);

          const { getAllByTestId, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            // Verify that popups are rendered for each node
            const popups = getAllByTestId('popup');
            expect(popups).toHaveLength(uniqueNodes.length);

            // Verify each popup contains all required fields
            popups.forEach((popup, index) => {
              const node = uniqueNodes[index];
              const popupContent = popup.textContent || '';

              // Required fields according to Requirements 2.1:
              // node image, name, short name, MQTT status, position precision, role, 
              // hardware, battery level, air utilization, altitude, ID, hex ID, 
              // last updated timestamp, and last position updated timestamp

              // Check for node names
              expect(popupContent).toContain(node.longName || node.shortName);
              expect(popupContent).toContain(node.shortName);

              // Check for ID fields
              expect(popupContent).toContain(node.id);
              expect(popupContent).toContain(node.hexId);

              // Check for hardware and role
              expect(popupContent).toContain(node.hardwareModel);
              expect(popupContent).toContain(node.role);

              // Check for MQTT status (should show connection status)
              const mqttStatus = node.isOnline && node.mqttConnected ? 'ONLINE' : 
                               node.isOnline && !node.mqttConnected ? 'DISCONNECTED' : 'OFFLINE';
              expect(popupContent).toContain(mqttStatus);

              // Check for timestamps
              expect(popupContent).toContain('Last Seen');
              expect(popupContent).toContain('Last Heard');

              // Check for position coordinates
              if (node.position) {
                expect(popupContent).toContain(node.position.latitude.toFixed(6));
                expect(popupContent).toContain(node.position.longitude.toFixed(6));
              }

              // Check for optional fields if they exist
              if (node.batteryLevel !== undefined && node.batteryLevel !== null) {
                expect(popupContent).toContain(`${node.batteryLevel}%`);
              }

              if (node.voltage !== undefined && node.voltage !== null) {
                expect(popupContent).toContain(`${node.voltage.toFixed(2)}V`);
              }

              if (node.channelUtilization !== undefined && node.channelUtilization !== null) {
                expect(popupContent).toContain('Channel Util');
              }

              if (node.position?.altitude !== undefined && node.position?.altitude !== null) {
                expect(popupContent).toContain(`${node.position.altitude}m`);
              }

              if (node.position?.precision !== undefined && node.position?.precision !== null) {
                expect(popupContent).toContain('GPS Precision');
              }
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

  test('Popup should display node image placeholder or status indicator', () => {
    fc.assert(
      fc.property(
        nodeWithPopupDataArb,
        (node) => {
          const uniqueNode = { ...node, id: 'image_test_node' };
          const store = createTestStore([uniqueNode]);

          const { getByTestId, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            const popup = getByTestId('popup');
            
            // Should contain a visual status indicator (colored dot)
            // This is represented by the status color in the current implementation
            const popupHTML = popup.innerHTML;
            
            // Check for status color styling (accepts both hex and rgb formats)
            expect(popupHTML).toMatch(/background-color:\s*(#[0-9a-fA-F]{6}|rgb\(\d+,\s*\d+,\s*\d+\))/);
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Popup should handle nodes with minimal data gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          hexId: fc.string({ minLength: 1, maxLength: 10 }),
          shortName: fc.string({ minLength: 1, maxLength: 5 }),
          longName: fc.string({ minLength: 1, maxLength: 10 }),
          hardwareModel: fc.constantFrom('UNKNOWN', 'TBEAM'),
          firmwareVersion: fc.string({ minLength: 1, maxLength: 5 }),
          role: fc.constantFrom('CLIENT', 'ROUTER'),
          position: fc.record({
            latitude: validLatitudeArb,
            longitude: validLongitudeArb,
          }),
          lastSeen: fc.date().map(d => d.toISOString()),
          lastHeard: fc.date().map(d => d.toISOString()),
          isOnline: fc.boolean(),
          mqttConnected: fc.boolean(),
          // Optional fields are undefined
          batteryLevel: fc.constant(undefined),
          voltage: fc.constant(undefined),
          channelUtilization: fc.constant(undefined),
          airUtilTx: fc.constant(undefined),
        }),
        (node) => {
          const store = createTestStore([node]);

          const { getByTestId, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            const popup = getByTestId('popup');
            const popupContent = popup.textContent || '';

            // Should still contain required fields even with minimal data
            expect(popupContent).toContain(node.shortName);
            expect(popupContent).toContain(node.id);
            expect(popupContent).toContain(node.hardwareModel);
            expect(popupContent).toContain(node.role);

            // Should not crash or show undefined/null values
            expect(popupContent).not.toContain('undefined');
            expect(popupContent).not.toContain('null');

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });
});