/**
 * Property-based test for details panel content
 * **Feature: meshtastic-node-mapper, Property 6: Details panel comprehensive content**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import React from 'react';
import * as fc from 'fast-check';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mapReducer from '../store/slices/mapSlice';
import nodeReducer from '../store/slices/nodeSlice';
import settingsReducer from '../store/slices/settingsSlice';
import NodeDetailsPanel from '../components/NodeDetailsPanel/NodeDetailsPanel';
import { Node } from '../store/slices/nodeSlice';

// Generator for valid GPS coordinates
const validLatitudeArb = fc.double({ min: -90, max: 90 });
const validLongitudeArb = fc.double({ min: -180, max: 180 });
const validAltitudeArb = fc.double({ min: -1000, max: 10000 });
const validPrecisionArb = fc.double({ min: 0, max: 100 });

// Generator for nodes with comprehensive data for details panel
const nodeWithDetailsArb: fc.Arbitrary<Node> = fc.record({
  id: fc.string({ minLength: 8, maxLength: 16 }).map(s => `node_${s}`),
  hexId: fc.string({ minLength: 8, maxLength: 16 }).map(s => `0x${s}`),
  shortName: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
  longName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  hardwareModel: fc.constantFrom('TBEAM', 'HELTEC_V3', 'RAK4631', 'LORA32_V2', 'STATION_G1'),
  firmwareVersion: fc.string({ minLength: 5, maxLength: 15 }).filter(s => s.trim().length > 0),
  role: fc.constantFrom('ROUTER', 'CLIENT', 'REPEATER', 'TRACKER'),
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
const createTestStore = (selectedNodeId: string | null = null, detailsPanelOpen: boolean = false) => {
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
        nodes: [],
        selectedNodeId,
        detailsPanelOpen,
        loading: false,
        error: null,
      },
    },
  });
};

describe('Details Panel Content Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 6: Details panel comprehensive content - For any node, opening the details panel should display all hover information plus additional sections', () => {
    fc.assert(
      fc.property(
        nodeWithDetailsArb,
        (node) => {
          const store = createTestStore(node.id, true);
          const mockOnClose = jest.fn();

          const { unmount } = render(
            <Provider store={store}>
              <NodeDetailsPanel
                node={node}
                isOpen={true}
                onClose={mockOnClose}
              />
            </Provider>
          );

          try {
            // Verify panel is rendered
            expect(screen.getByText('Node Details')).toBeInTheDocument();

            // Verify tabbed interface exists (Requirements 3.1)
            expect(screen.getByText('Overview')).toBeInTheDocument();
            expect(screen.getByText('Messages')).toBeInTheDocument();
            expect(screen.getByText('Details')).toBeInTheDocument();
            expect(screen.getByText('LoRa Config')).toBeInTheDocument();
            expect(screen.getByText('Position')).toBeInTheDocument();

            // Verify Overview tab contains all hover information plus more
            const overviewContent = screen.getByText('Overview').closest('.node-details-panel')?.textContent || '';

            // Basic node information
            expect(overviewContent).toContain(node.longName || node.shortName);
            expect(overviewContent).toContain(node.shortName);
            expect(overviewContent).toContain(node.id);
            expect(overviewContent).toContain(node.hexId);
            expect(overviewContent).toContain(node.hardwareModel);
            expect(overviewContent).toContain(node.role);

            // Status information
            const expectedStatus = !node.isOnline ? 'OFFLINE' : 
                                 !node.mqttConnected ? 'DISCONNECTED' : 'ONLINE';
            expect(overviewContent).toContain(expectedStatus);

            // MQTT connection status
            expect(overviewContent).toContain(node.mqttConnected ? 'Connected' : 'Disconnected');

            // Timestamps
            expect(overviewContent).toContain('Last Seen');
            expect(overviewContent).toContain('Last Heard');

            // Optional telemetry data
            if (node.batteryLevel !== undefined && node.batteryLevel !== null) {
              expect(overviewContent).toContain(`${node.batteryLevel}%`);
            }

            if (node.voltage !== undefined && node.voltage !== null) {
              expect(overviewContent).toContain(`${node.voltage.toFixed(2)}V`);
            }

            if (node.channelUtilization !== undefined && node.channelUtilization !== null) {
              expect(overviewContent).toContain('Channel Utilization');
            }

            if (node.airUtilTx !== undefined && node.airUtilTx !== null) {
              expect(overviewContent).toContain('Air Utilization TX');
            }

            if (node.position?.altitude !== undefined && node.position?.altitude !== null) {
              expect(overviewContent).toContain(`${node.position.altitude}m`);
            }

            if (node.position?.precision !== undefined && node.position?.precision !== null) {
              expect(overviewContent).toContain(`±${node.position.precision}m`);
            }

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Messages tab should provide buttons for Sent Messages, Received Messages, and Gated Messages (Requirements 3.2)', () => {
    fc.assert(
      fc.property(
        nodeWithDetailsArb,
        (node) => {
          const store = createTestStore(node.id, true);
          const mockOnClose = jest.fn();

          const { unmount } = render(
            <Provider store={store}>
              <NodeDetailsPanel
                node={node}
                isOpen={true}
                onClose={mockOnClose}
              />
            </Provider>
          );

          try {
            // Click on Messages tab
            fireEvent.click(screen.getByText('Messages'));

            // Verify message buttons exist
            expect(screen.getByText('Sent Messages')).toBeInTheDocument();
            expect(screen.getByText('Received Messages')).toBeInTheDocument();
            expect(screen.getByText('Gated Messages')).toBeInTheDocument();

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Details tab should display device details with ID, hardware, and firmware information (Requirements 3.3)', () => {
    fc.assert(
      fc.property(
        nodeWithDetailsArb,
        (node) => {
          const store = createTestStore(node.id, true);
          const mockOnClose = jest.fn();

          const { unmount } = render(
            <Provider store={store}>
              <NodeDetailsPanel
                node={node}
                isOpen={true}
                onClose={mockOnClose}
              />
            </Provider>
          );

          try {
            // Click on Details tab
            fireEvent.click(screen.getByText('Details'));

            const detailsContent = screen.getByText('Device Details').closest('.tab-content')?.textContent || '';

            // Verify identification section
            expect(detailsContent).toContain('Identification');
            expect(detailsContent).toContain('Node ID');
            expect(detailsContent).toContain(node.id);
            expect(detailsContent).toContain('Hex ID');
            expect(detailsContent).toContain(node.hexId);

            // Verify hardware information section
            expect(detailsContent).toContain('Hardware Information');
            expect(detailsContent).toContain('Hardware Model');
            expect(detailsContent).toContain(node.hardwareModel);
            expect(detailsContent).toContain('Role');
            expect(detailsContent).toContain(node.role);

            // Verify firmware information section
            expect(detailsContent).toContain('Firmware Information');
            expect(detailsContent).toContain('Firmware Version');
            expect(detailsContent).toContain(node.firmwareVersion);

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('LoRa Config tab should show LoRa configuration with region and channel data (Requirements 3.4)', () => {
    fc.assert(
      fc.property(
        nodeWithDetailsArb,
        (node) => {
          const store = createTestStore(node.id, true);
          const mockOnClose = jest.fn();

          const { unmount } = render(
            <Provider store={store}>
              <NodeDetailsPanel
                node={node}
                isOpen={true}
                onClose={mockOnClose}
              />
            </Provider>
          );

          try {
            // Click on LoRa Config tab
            fireEvent.click(screen.getByText('LoRa Config'));

            const loraContent = screen.getByText('LoRa Configuration').closest('.tab-content')?.textContent || '';

            // Verify region settings section
            expect(loraContent).toContain('Region Settings');
            expect(loraContent).toContain('Region');
            expect(loraContent).toContain('Frequency Band');

            // Verify modem configuration section
            expect(loraContent).toContain('Modem Configuration');
            expect(loraContent).toContain('Modem Preset');
            expect(loraContent).toContain('Bandwidth');
            expect(loraContent).toContain('Spreading Factor');
            expect(loraContent).toContain('Coding Rate');

            // Verify channel status section
            expect(loraContent).toContain('Channel Status');
            expect(loraContent).toContain('Default Channel');
            expect(loraContent).toContain('Channel Index');
            expect(loraContent).toContain('Channel Name');

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Position tab should display latitude, longitude, and altitude coordinates (Requirements 3.5)', () => {
    fc.assert(
      fc.property(
        nodeWithDetailsArb,
        (node) => {
          const store = createTestStore(node.id, true);
          const mockOnClose = jest.fn();

          const { unmount } = render(
            <Provider store={store}>
              <NodeDetailsPanel
                node={node}
                isOpen={true}
                onClose={mockOnClose}
              />
            </Provider>
          );

          try {
            // Click on Position tab
            fireEvent.click(screen.getByText('Position'));

            if (node.position) {
              const positionContent = screen.getByText('Position Information').closest('.tab-content')?.textContent || '';

              // Verify coordinates section
              expect(positionContent).toContain('Coordinates');
              expect(positionContent).toContain('Latitude');
              expect(positionContent).toContain(node.position.latitude.toFixed(6));
              expect(positionContent).toContain('Longitude');
              expect(positionContent).toContain(node.position.longitude.toFixed(6));

              if (node.position.altitude !== undefined && node.position.altitude !== null) {
                expect(positionContent).toContain('Altitude');
                expect(positionContent).toContain(`${node.position.altitude} meters`);
              }

              // Verify position quality section
              expect(positionContent).toContain('Position Quality');
              if (node.position.precision !== undefined && node.position.precision !== null) {
                expect(positionContent).toContain('GPS Precision');
                expect(positionContent).toContain(`±${node.position.precision}m`);
              }

              // Verify formatted coordinates section
              expect(positionContent).toContain('Formatted Coordinates');
              expect(positionContent).toContain('Decimal Degrees');
              expect(positionContent).toContain('DMS');
            } else {
              // Should show no position message
              expect(screen.getByText('No position data available for this node.')).toBeInTheDocument();
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

  test('Details panel should handle nodes with minimal position data gracefully', () => {
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
          position: fc.oneof(
            fc.constant(null),
            fc.record({
              latitude: validLatitudeArb,
              longitude: validLongitudeArb,
              // altitude and precision are undefined
            })
          ),
          lastSeen: fc.date().map(d => d.toISOString()),
          lastHeard: fc.date().map(d => d.toISOString()),
          isOnline: fc.boolean(),
          mqttConnected: fc.boolean(),
          batteryLevel: fc.constant(undefined),
          voltage: fc.constant(undefined),
          channelUtilization: fc.constant(undefined),
          airUtilTx: fc.constant(undefined),
        }),
        (node) => {
          const store = createTestStore(node.id, true);
          const mockOnClose = jest.fn();

          const { unmount } = render(
            <Provider store={store}>
              <NodeDetailsPanel
                node={node}
                isOpen={true}
                onClose={mockOnClose}
              />
            </Provider>
          );

          try {
            // Should render without crashing
            expect(screen.getByText('Node Details')).toBeInTheDocument();

            // Check Position tab handles null/minimal position data
            fireEvent.click(screen.getByText('Position'));

            if (!node.position) {
              expect(screen.getByText('No position data available for this node.')).toBeInTheDocument();
            } else {
              // Should show coordinates even with minimal data
              const positionContent = screen.getByText('Position Information').closest('.tab-content')?.textContent || '';
              expect(positionContent).toContain(node.position.latitude.toFixed(6));
              expect(positionContent).toContain(node.position.longitude.toFixed(6));
            }

            // Should not show undefined/null values
            const panelContent = screen.getByText('Node Details').closest('.node-details-panel')?.textContent || '';
            expect(panelContent).not.toContain('undefined');
            expect(panelContent).not.toContain('null');

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Details panel should be closable and handle close events properly', () => {
    fc.assert(
      fc.property(
        nodeWithDetailsArb,
        (node) => {
          const store = createTestStore(node.id, true);
          const mockOnClose = jest.fn();

          const { unmount } = render(
            <Provider store={store}>
              <NodeDetailsPanel
                node={node}
                isOpen={true}
                onClose={mockOnClose}
              />
            </Provider>
          );

          try {
            // Find and click close button
            const closeButton = screen.getByText('×');
            expect(closeButton).toBeInTheDocument();
            
            fireEvent.click(closeButton);
            
            // Verify onClose was called
            expect(mockOnClose).toHaveBeenCalledTimes(1);

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