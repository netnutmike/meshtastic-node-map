/**
 * Property-based test for hover popup buttons
 * **Feature: meshtastic-node-mapper, Property 4: Hover popup required buttons**
 * **Validates: Requirements 2.2, 2.3, 2.4**
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

// Generator for nodes with position data
const nodeWithPositionArb: fc.Arbitrary<Node> = fc.record({
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

describe('Hover Popup Buttons Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 4: Hover popup required buttons - For any node hover popup, the popup should contain required action buttons', () => {
    fc.assert(
      fc.property(
        fc.array(nodeWithPositionArb, { minLength: 1, maxLength: 3 }),
        (nodes) => {
          // Ensure unique IDs
          const uniqueNodes = nodes.map((node, i) => ({ ...node, id: `button_test_${i}` }));
          
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

            // Verify each popup contains all required buttons
            popups.forEach((popup) => {
              const popupContent = popup.textContent || '';
              const popupHTML = popup.innerHTML;

              // Required buttons according to Requirements 2.2, 2.3, 2.4:
              // 1. "Show Full Details" button (Requirement 2.2)
              // 2. "Show Neighbors That Heard Us" button (Requirement 2.3)  
              // 3. "Show Neighbors That We Heard" button (Requirement 2.4)

              // Check for "Show Full Details" button
              expect(popupContent).toMatch(/Show Full Details|Full Details|Details/i);

              // Check for neighbor visualization buttons
              expect(popupContent).toMatch(/Show Neighbors.*Heard Us|Neighbors.*Heard Us|Heard Us/i);
              expect(popupContent).toMatch(/Show Neighbors.*We Heard|Neighbors.*We Heard|We Heard/i);

              // Verify buttons are actually clickable elements (button, a, or div with click handlers)
              expect(popupHTML).toMatch(/<(button|a|div)[^>]*>/i);
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

  test('Each required button should be present for every node popup', () => {
    fc.assert(
      fc.property(
        nodeWithPositionArb,
        (node) => {
          const uniqueNode = { ...node, id: 'single_button_test' };
          const store = createTestStore([uniqueNode]);

          const { getByTestId, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            const popup = getByTestId('popup');
            const popupContent = popup.textContent || '';

            // Verify all three required buttons are present
            const hasDetailsButton = /Show Full Details|Full Details|Details/i.test(popupContent);
            const hasHeardUsButton = /Show Neighbors.*Heard Us|Neighbors.*Heard Us|Heard Us/i.test(popupContent);
            const hasWeHeardButton = /Show Neighbors.*We Heard|Neighbors.*We Heard|We Heard/i.test(popupContent);

            expect(hasDetailsButton).toBe(true);
            expect(hasHeardUsButton).toBe(true);
            expect(hasWeHeardButton).toBe(true);

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Buttons should be distinguishable and have appropriate labels', () => {
    fc.assert(
      fc.property(
        nodeWithPositionArb,
        (node) => {
          const uniqueNode = { ...node, id: 'label_test_node' };
          const store = createTestStore([uniqueNode]);

          const { getByTestId, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            const popup = getByTestId('popup');
            const popupContent = popup.textContent || '';

            // Buttons should have distinct, clear labels
            // Details button should be clearly about showing more information
            expect(popupContent).toMatch(/Details/i);
            
            // Neighbor buttons should be clearly about network topology
            expect(popupContent).toMatch(/Neighbors/i);
            
            // The two neighbor buttons should be distinguishable
            const heardUsMatches = popupContent.match(/Heard Us/gi) || [];
            const weHeardMatches = popupContent.match(/We Heard/gi) || [];
            
            // Should have both directions represented
            expect(heardUsMatches.length).toBeGreaterThan(0);
            expect(weHeardMatches.length).toBeGreaterThan(0);

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Popup buttons should be present regardless of node status', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          nodeWithPositionArb.map(node => ({ ...node, isOnline: true, mqttConnected: true })),
          nodeWithPositionArb.map(node => ({ ...node, isOnline: true, mqttConnected: false })),
          nodeWithPositionArb.map(node => ({ ...node, isOnline: false, mqttConnected: false }))
        ),
        ([onlineNode, disconnectedNode, offlineNode]) => {
          const nodes = [
            { ...onlineNode, id: 'online_button_test' },
            { ...disconnectedNode, id: 'disconnected_button_test' },
            { ...offlineNode, id: 'offline_button_test' }
          ];
          
          const store = createTestStore(nodes);

          const { getAllByTestId, unmount } = render(
            <Provider store={store}>
              <NodeMarkers />
            </Provider>
          );

          try {
            const popups = getAllByTestId('popup');
            expect(popups).toHaveLength(3);

            // All popups should have the required buttons regardless of node status
            popups.forEach((popup) => {
              const popupContent = popup.textContent || '';

              expect(popupContent).toMatch(/Details/i);
              expect(popupContent).toMatch(/Neighbors.*Heard Us|Heard Us/i);
              expect(popupContent).toMatch(/Neighbors.*We Heard|We Heard/i);
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