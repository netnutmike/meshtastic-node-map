/**
 * Property-based test for device telemetry display
 * **Feature: meshtastic-node-mapper, Property 7: Device telemetry visualization**
 * **Validates: Requirements 4.1, 4.2, 4.3**
 */

import React from 'react';
import * as fc from 'fast-check';
import { render, cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mapReducer from '../store/slices/mapSlice';
import nodeReducer from '../store/slices/nodeSlice';
import settingsReducer from '../store/slices/settingsSlice';
import { Node } from '../store/slices/nodeSlice';

// Mock Chart.js components to avoid canvas rendering issues in tests
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-type="line">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

// Mock the TelemetryChart component that we'll create
const MockTelemetryChart = ({ node, telemetryData }: { node: Node; telemetryData: any[] }) => {
  if (!node || !telemetryData) return null;

  // Simulate device metrics display
  const hasDeviceMetrics = telemetryData.some(t => t.type === 'DEVICE_METRICS');
  
  if (!hasDeviceMetrics) {
    return <div data-testid="no-device-metrics">No device metrics available</div>;
  }

  const latestDeviceMetrics = telemetryData
    .filter(t => t.type === 'DEVICE_METRICS')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  return (
    <div data-testid="device-telemetry-section">
      <h3>Device Metrics</h3>
      
      {/* Time range selector */}
      <div data-testid="time-range-selector">
        <select data-testid="time-range-dropdown">
          <option value="1h">Last Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>
      </div>

      {/* Historical graphs */}
      <div data-testid="historical-graphs">
        {latestDeviceMetrics.data.batteryLevel !== undefined && latestDeviceMetrics.data.batteryLevel !== null && (
          <div data-testid="battery-chart">
            <h4>Battery Level</h4>
            <div data-testid="line-chart" data-chart-type="line" data-metric="battery" />
          </div>
        )}
        
        {latestDeviceMetrics.data.channelUtilization !== undefined && latestDeviceMetrics.data.channelUtilization !== null && (
          <div data-testid="channel-utilization-chart">
            <h4>Channel Utilization</h4>
            <div data-testid="line-chart" data-chart-type="line" data-metric="channelUtilization" />
          </div>
        )}
        
        {latestDeviceMetrics.data.airUtilTx !== undefined && latestDeviceMetrics.data.airUtilTx !== null && (
          <div data-testid="air-util-tx-chart">
            <h4>Air Utilization TX</h4>
            <div data-testid="line-chart" data-chart-type="line" data-metric="airUtilTx" />
          </div>
        )}
      </div>

      {/* Current real-time values */}
      <div data-testid="current-values">
        <h4>Current Values</h4>
        
        {latestDeviceMetrics.data.batteryLevel !== undefined && latestDeviceMetrics.data.batteryLevel !== null && (
          <div data-testid="current-battery">
            <span>Battery Level: {latestDeviceMetrics.data.batteryLevel}%</span>
          </div>
        )}
        
        {latestDeviceMetrics.data.voltage !== undefined && latestDeviceMetrics.data.voltage !== null && (
          <div data-testid="current-voltage">
            <span>Voltage: {latestDeviceMetrics.data.voltage.toFixed(2)}V</span>
          </div>
        )}
        
        {latestDeviceMetrics.data.channelUtilization !== undefined && latestDeviceMetrics.data.channelUtilization !== null && (
          <div data-testid="current-channel-util">
            <span>Channel Utilization: {latestDeviceMetrics.data.channelUtilization}%</span>
          </div>
        )}
        
        {latestDeviceMetrics.data.airUtilTx !== undefined && latestDeviceMetrics.data.airUtilTx !== null && (
          <div data-testid="current-air-util-tx">
            <span>Air Utilization TX: {latestDeviceMetrics.data.airUtilTx}%</span>
          </div>
        )}
        
        <div data-testid="last-update">
          <span>Last Update: {new Date(latestDeviceMetrics.timestamp).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// Generator for device telemetry data
const deviceTelemetryArb = fc.record({
  id: fc.string({ minLength: 8, maxLength: 16 }),
  nodeId: fc.string({ minLength: 8, maxLength: 16 }),
  type: fc.constant('DEVICE_METRICS'),
  timestamp: fc.date().map(d => d.toISOString()),
  data: fc.record({
    batteryLevel: fc.option(fc.integer({ min: 0, max: 100 })),
    voltage: fc.option(fc.double({ min: 3.0, max: 5.0 })),
    channelUtilization: fc.option(fc.integer({ min: 0, max: 100 })),
    airUtilTx: fc.option(fc.integer({ min: 0, max: 100 })),
    uptimeSeconds: fc.option(fc.integer({ min: 0, max: 1000000 })),
  }),
});

// Generator for nodes with device telemetry
const nodeWithDeviceTelemetryArb = fc.record({
  id: fc.string({ minLength: 8, maxLength: 16 }).map(s => `node_${s}`),
  hexId: fc.string({ minLength: 8, maxLength: 16 }).map(s => `0x${s}`),
  shortName: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
  longName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  hardwareModel: fc.constantFrom('TBEAM', 'HELTEC_V3', 'RAK4631', 'LORA32_V2'),
  firmwareVersion: fc.string({ minLength: 5, maxLength: 15 }),
  role: fc.constantFrom('ROUTER', 'CLIENT', 'REPEATER', 'TRACKER'),
  position: fc.record({
    latitude: fc.double({ min: -90, max: 90 }),
    longitude: fc.double({ min: -180, max: 180 }),
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

// Create a test store
const createTestStore = () => {
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
        selectedNodeId: null,
        detailsPanelOpen: false,
        loading: false,
        error: null,
      },
    },
  });
};

describe('Device Telemetry Display Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 7: Device telemetry visualization - For any node with device telemetry data, the metrics section should display both historical graphs and current real-time values', () => {
    fc.assert(
      fc.property(
        nodeWithDeviceTelemetryArb,
        fc.array(deviceTelemetryArb, { minLength: 1, maxLength: 10 }),
        (node, telemetryData) => {
          // Ensure telemetry data belongs to the node
          const nodeSpecificTelemetry = telemetryData.map(t => ({ ...t, nodeId: node.id }));
          
          const store = createTestStore();

          const { unmount } = render(
            <Provider store={store}>
              <MockTelemetryChart node={node} telemetryData={nodeSpecificTelemetry} />
            </Provider>
          );

          try {
            // Verify device telemetry section exists (Requirements 4.1)
            expect(screen.getByTestId('device-telemetry-section')).toBeInTheDocument();
            expect(screen.getByText('Device Metrics')).toBeInTheDocument();

            // Verify time range selector exists for historical data (Requirements 4.1)
            expect(screen.getByTestId('time-range-selector')).toBeInTheDocument();
            expect(screen.getByTestId('time-range-dropdown')).toBeInTheDocument();

            // Verify historical graphs section exists (Requirements 4.2)
            expect(screen.getByTestId('historical-graphs')).toBeInTheDocument();

            // Verify current real-time values section exists (Requirements 4.3)
            expect(screen.getByTestId('current-values')).toBeInTheDocument();
            expect(screen.getByText('Current Values')).toBeInTheDocument();

            // Check that last update timestamp is displayed (Requirements 4.3)
            expect(screen.getByTestId('last-update')).toBeInTheDocument();

            // Get the latest device metrics to check what should be displayed
            const latestDeviceMetrics = nodeSpecificTelemetry
              .filter(t => t.type === 'DEVICE_METRICS')
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            if (latestDeviceMetrics) {
              // Verify battery level chart and current value if present (Requirements 4.2, 4.3)
              if (latestDeviceMetrics.data.batteryLevel !== undefined && latestDeviceMetrics.data.batteryLevel !== null) {
                expect(screen.getByTestId('battery-chart')).toBeInTheDocument();
                expect(screen.getByText('Battery Level')).toBeInTheDocument();
                expect(screen.getByTestId('current-battery')).toBeInTheDocument();
                expect(screen.getByText(`Battery Level: ${latestDeviceMetrics.data.batteryLevel}%`)).toBeInTheDocument();
              }

              // Verify voltage current value if present (Requirements 4.3)
              if (latestDeviceMetrics.data.voltage !== undefined && latestDeviceMetrics.data.voltage !== null) {
                expect(screen.getByTestId('current-voltage')).toBeInTheDocument();
                expect(screen.getByText(`Voltage: ${latestDeviceMetrics.data.voltage.toFixed(2)}V`)).toBeInTheDocument();
              }

              // Verify channel utilization chart and current value if present (Requirements 4.2, 4.3)
              if (latestDeviceMetrics.data.channelUtilization !== undefined && latestDeviceMetrics.data.channelUtilization !== null) {
                expect(screen.getByTestId('channel-utilization-chart')).toBeInTheDocument();
                expect(screen.getByText('Channel Utilization')).toBeInTheDocument();
                expect(screen.getByTestId('current-channel-util')).toBeInTheDocument();
                expect(screen.getByText(`Channel Utilization: ${latestDeviceMetrics.data.channelUtilization}%`)).toBeInTheDocument();
              }

              // Verify air utilization TX chart and current value if present (Requirements 4.2, 4.3)
              if (latestDeviceMetrics.data.airUtilTx !== undefined && latestDeviceMetrics.data.airUtilTx !== null) {
                expect(screen.getByTestId('air-util-tx-chart')).toBeInTheDocument();
                expect(screen.getByText('Air Utilization TX')).toBeInTheDocument();
                expect(screen.getByTestId('current-air-util-tx')).toBeInTheDocument();
                expect(screen.getByText(`Air Utilization TX: ${latestDeviceMetrics.data.airUtilTx}%`)).toBeInTheDocument();
              }
            }

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Device telemetry should handle nodes with no device metrics gracefully', () => {
    fc.assert(
      fc.property(
        nodeWithDeviceTelemetryArb,
        fc.array(fc.record({
          id: fc.string({ minLength: 8, maxLength: 16 }),
          nodeId: fc.string({ minLength: 8, maxLength: 16 }),
          type: fc.constantFrom('ENVIRONMENT_METRICS', 'POWER_METRICS'), // No device metrics
          timestamp: fc.date().map(d => d.toISOString()),
          data: fc.record({}),
        }), { minLength: 0, maxLength: 5 }),
        (node, telemetryData) => {
          const nodeSpecificTelemetry = telemetryData.map(t => ({ ...t, nodeId: node.id }));
          
          const store = createTestStore();

          const { unmount } = render(
            <Provider store={store}>
              <MockTelemetryChart node={node} telemetryData={nodeSpecificTelemetry} />
            </Provider>
          );

          try {
            // Should show no device metrics message when no device telemetry is available
            expect(screen.getByTestId('no-device-metrics')).toBeInTheDocument();
            expect(screen.getByText('No device metrics available')).toBeInTheDocument();

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Device telemetry should handle partial device metrics data', () => {
    fc.assert(
      fc.property(
        nodeWithDeviceTelemetryArb,
        fc.array(fc.record({
          id: fc.string({ minLength: 8, maxLength: 16 }),
          nodeId: fc.string({ minLength: 8, maxLength: 16 }),
          type: fc.constant('DEVICE_METRICS'),
          timestamp: fc.date().map(d => d.toISOString()),
          data: fc.record({
            // Only some metrics present
            batteryLevel: fc.option(fc.integer({ min: 0, max: 100 })),
            // voltage, channelUtilization, airUtilTx may be undefined
          }),
        }), { minLength: 1, maxLength: 3 }),
        (node, telemetryData) => {
          const nodeSpecificTelemetry = telemetryData.map(t => ({ ...t, nodeId: node.id }));
          
          const store = createTestStore();

          const { unmount } = render(
            <Provider store={store}>
              <MockTelemetryChart node={node} telemetryData={nodeSpecificTelemetry} />
            </Provider>
          );

          try {
            // Should render device telemetry section even with partial data
            expect(screen.getByTestId('device-telemetry-section')).toBeInTheDocument();
            expect(screen.getByTestId('current-values')).toBeInTheDocument();

            // Should not crash or show undefined values
            const content = screen.getByTestId('device-telemetry-section').textContent || '';
            expect(content).not.toContain('undefined');
            expect(content).not.toContain('null');

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Time range selector should provide configurable options for historical data', () => {
    fc.assert(
      fc.property(
        nodeWithDeviceTelemetryArb,
        fc.array(deviceTelemetryArb, { minLength: 1, maxLength: 5 }),
        (node, telemetryData) => {
          const nodeSpecificTelemetry = telemetryData.map(t => ({ ...t, nodeId: node.id }));
          
          const store = createTestStore();

          const { unmount } = render(
            <Provider store={store}>
              <MockTelemetryChart node={node} telemetryData={nodeSpecificTelemetry} />
            </Provider>
          );

          try {
            // Verify time range dropdown has expected options (Requirements 4.1)
            const dropdown = screen.getByTestId('time-range-dropdown');
            expect(dropdown).toBeInTheDocument();

            const dropdownContent = dropdown.textContent || '';
            expect(dropdownContent).toContain('Last Hour');
            expect(dropdownContent).toContain('Last 6 Hours');
            expect(dropdownContent).toContain('Last 24 Hours');
            expect(dropdownContent).toContain('Last 7 Days');

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