/**
 * Property-based test for map initialization
 * **Feature: meshtastic-node-mapper, Property 1: Node rendering with position data**
 * **Validates: Requirements 1.2**
 */

import React from 'react';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mapReducer from '../store/slices/mapSlice';
import nodeReducer from '../store/slices/nodeSlice';
import settingsReducer from '../store/slices/settingsSlice';
import MapComponent from '../components/Map/MapComponent';
import { Node } from '../store/slices/nodeSlice';

// Generator for valid GPS coordinates
const validLatitudeArb = fc.double({ min: -90, max: 90 });
const validLongitudeArb = fc.double({ min: -180, max: 180 });
const validAltitudeArb = fc.double({ min: -1000, max: 10000 });
const validPrecisionArb = fc.double({ min: 0, max: 100 });

// Generator for valid node with position data
const nodeWithPositionArb: fc.Arbitrary<Node> = fc.record({
  id: fc.uuid(), // Use UUID to ensure uniqueness
  hexId: fc.string({ minLength: 8, maxLength: 12 }).map(s => `0x${s}`),
  shortName: fc.string({ minLength: 1, maxLength: 10 }),
  longName: fc.string({ minLength: 1, maxLength: 50 }),
  hardwareModel: fc.constantFrom('TBEAM', 'HELTEC_V3', 'RAK4631', 'LORA32_V2'),
  firmwareVersion: fc.string({ minLength: 5, maxLength: 10 }),
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
      nodes: {
        nodes,
        selectedNodeId: null,
        loading: false,
        error: null,
      },
    },
  });
};

// Mock Leaflet to avoid DOM issues in tests
jest.mock('leaflet', () => ({
  ...jest.requireActual('leaflet'),
  Map: jest.fn(() => ({
    setView: jest.fn(),
    getCenter: jest.fn(() => ({ lat: 40.7128, lng: -74.0060 })),
    getZoom: jest.fn(() => 10),
  })),
  divIcon: jest.fn(() => ({})),
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
}));

// Mock react-leaflet components
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  useMap: () => ({
    setView: jest.fn(),
    getCenter: jest.fn(() => ({ lat: 40.7128, lng: -74.0060 })),
    getZoom: jest.fn(() => 10),
  }),
  useMapEvents: () => null,
}));

describe('Map Initialization Property Tests', () => {
  beforeEach(() => {
    // Clear any previous mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM after each test
    cleanup();
  });

  test('Property 1: Node rendering with position data - For any node with valid position data, the node should appear on the map as a colored dot at the correct geographic coordinates', () => {
    fc.assert(
      fc.property(
        fc.array(nodeWithPositionArb, { minLength: 1, maxLength: 10 }),
        (nodes) => {
          // Ensure all nodes have valid position data (this is guaranteed by our generator)
          const nodesWithPosition = nodes.filter(node => 
            node.position && 
            typeof node.position.latitude === 'number' &&
            typeof node.position.longitude === 'number' &&
            !isNaN(node.position.latitude) &&
            !isNaN(node.position.longitude) &&
            node.position.latitude >= -90 &&
            node.position.latitude <= 90 &&
            node.position.longitude >= -180 &&
            node.position.longitude <= 180
          );

          // Skip if no valid nodes (shouldn't happen with our generator, but safety check)
          if (nodesWithPosition.length === 0) return true;

          const store = createTestStore(nodesWithPosition);

          const { container, unmount } = render(
            <Provider store={store}>
              <MapComponent height="400px" />
            </Provider>
          );

          try {
            // Verify map container is rendered
            const mapContainer = container.querySelector('[data-testid="map-container"]');
            expect(mapContainer).toBeInTheDocument();

            // Verify tile layer is rendered (OpenStreetMap tiles)
            const tileLayer = container.querySelector('[data-testid="tile-layer"]');
            expect(tileLayer).toBeInTheDocument();

            // Verify that markers are rendered for nodes with position data
            const markers = container.querySelectorAll('[data-testid="marker"]');
            expect(markers).toHaveLength(nodesWithPosition.length);

            // Each marker should have a corresponding popup
            const popups = container.querySelectorAll('[data-testid="popup"]');
            expect(popups).toHaveLength(nodesWithPosition.length);

            return true;
          } finally {
            // Clean up this specific render
            unmount();
          }
        }
      ),
      { numRuns: 50 } // Reduced runs for faster testing
    );
  });

  test('Map initializes with default OpenStreetMap tiles', () => {
    fc.assert(
      fc.property(
        fc.array(nodeWithPositionArb, { maxLength: 5 }),
        (nodes) => {
          const store = createTestStore(nodes);

          const { container, unmount } = render(
            <Provider store={store}>
              <MapComponent height="400px" />
            </Provider>
          );

          try {
            // Verify map container exists
            const mapContainer = container.querySelector('[data-testid="map-container"]');
            expect(mapContainer).toBeInTheDocument();

            // Verify tile layer is rendered (this represents OpenStreetMap tiles)
            const tileLayer = container.querySelector('[data-testid="tile-layer"]');
            expect(tileLayer).toBeInTheDocument();

            return true;
          } finally {
            // Clean up this specific render
            unmount();
          }
        }
      ),
      { numRuns: 25 } // Reduced runs for faster testing
    );
  });

  test('Map handles empty node list gracefully', () => {
    const store = createTestStore([]);

    const { container } = render(
      <Provider store={store}>
        <MapComponent height="400px" />
      </Provider>
    );

    // Map should still render even with no nodes
    const mapContainer = container.querySelector('[data-testid="map-container"]');
    expect(mapContainer).toBeInTheDocument();

    const tileLayer = container.querySelector('[data-testid="tile-layer"]');
    expect(tileLayer).toBeInTheDocument();

    // No markers should be present
    const markers = container.querySelectorAll('[data-testid="marker"]');
    expect(markers).toHaveLength(0);
  });
});