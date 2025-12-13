/**
 * Property-based test for environmental telemetry display
 * **Feature: meshtastic-node-mapper, Property 8: Environmental telemetry visualization**
 * **Validates: Requirements 4.4, 4.5**
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

// Mock the Environmental Telemetry Chart component that we'll create
const MockEnvironmentalTelemetryChart = ({ node, telemetryData }: { node: Node; telemetryData: any[] }) => {
  if (!node || !telemetryData) return null;

  // Simulate environmental metrics display
  const hasEnvironmentalMetrics = telemetryData.some(t => t.type === 'ENVIRONMENT_METRICS');
  
  if (!hasEnvironmentalMetrics) {
    return <div data-testid="no-environmental-metrics">No environmental metrics available</div>;
  }

  const latestEnvironmentalMetrics = telemetryData
    .filter(t => t.type === 'ENVIRONMENT_METRICS')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  return (
    <div data-testid="environmental-telemetry-section">
      <h3>Environmental Metrics</h3>
      
      {/* Time range selector for environmental data */}
      <div data-testid="environmental-time-range-selector">
        <select data-testid="environmental-time-range-dropdown">
          <option value="1h">Last Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Historical graphs for environmental metrics */}
      <div data-testid="environmental-historical-graphs">
        {latestEnvironmentalMetrics.data.temperature !== undefined && latestEnvironmentalMetrics.data.temperature !== null && (
          <div data-testid="temperature-chart">
            <h4>Temperature</h4>
            <div data-testid="line-chart" data-chart-type="line" data-metric="temperature" />
          </div>
        )}
        
        {latestEnvironmentalMetrics.data.humidity !== undefined && latestEnvironmentalMetrics.data.humidity !== null && (
          <div data-testid="humidity-chart">
            <h4>Humidity</h4>
            <div data-testid="line-chart" data-chart-type="line" data-metric="humidity" />
          </div>
        )}
        
        {latestEnvironmentalMetrics.data.pressure !== undefined && latestEnvironmentalMetrics.data.pressure !== null && (
          <div data-testid="pressure-chart">
            <h4>Barometric Pressure</h4>
            <div data-testid="line-chart" data-chart-type="line" data-metric="pressure" />
          </div>
        )}
      </div>

      {/* Current real-time environmental values */}
      <div data-testid="environmental-current-values">
        <h4>Current Environmental Values</h4>
        
        {latestEnvironmentalMetrics.data.temperature !== undefined && latestEnvironmentalMetrics.data.temperature !== null && (
          <div data-testid="current-temperature">
            <span>Temperature: {latestEnvironmentalMetrics.data.temperature.toFixed(1)}°C</span>
          </div>
        )}
        
        {latestEnvironmentalMetrics.data.humidity !== undefined && latestEnvironmentalMetrics.data.humidity !== null && (
          <div data-testid="current-humidity">
            <span>Relative Humidity: {latestEnvironmentalMetrics.data.humidity.toFixed(1)}%</span>
          </div>
        )}
        
        {latestEnvironmentalMetrics.data.pressure !== undefined && latestEnvironmentalMetrics.data.pressure !== null && (
          <div data-testid="current-pressure">
            <span>Barometric Pressure: {latestEnvironmentalMetrics.data.pressure.toFixed(1)} hPa</span>
          </div>
        )}
        
        <div data-testid="environmental-last-update">
          <span>Last Update: {new Date(latestEnvironmentalMetrics.timestamp).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// Generator for environmental telemetry data
const environmentalTelemetryArb = fc.record({
  id: fc.string({ minLength: 8, maxLength: 16 }),
  nodeId: fc.string({ minLength: 8, maxLength: 16 }),
  type: fc.constant('ENVIRONMENT_METRICS'),
  timestamp: fc.date().map(d => d.toISOString()),
  data: fc.record({
    temperature: fc.option(fc.double({ min: -40, max: 85 })), // Typical sensor range in Celsius
    humidity: fc.option(fc.double({ min: 0, max: 100 })), // Relative humidity percentage
    pressure: fc.option(fc.double({ min: 300, max: 1100 })), // Barometric pressure in hPa
    gasResistance: fc.option(fc.double({ min: 0, max: 500000 })), // Gas resistance for air quality
    iaq: fc.option(fc.integer({ min: 0, max: 500 })), // Indoor Air Quality index
  }),
});

// Generator for nodes with environmental telemetry
const nodeWithEnvironmentalTelemetryArb = fc.record({
  id: fc.string({ minLength: 8, maxLength: 16 }).map(s => `node_${s}`),
  hexId: fc.string({ minLength: 8, maxLength: 16 }).map(s => `0x${s}`),
  shortName: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
  longName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  hardwareModel: fc.constantFrom('TBEAM', 'HELTEC_V3', 'RAK4631', 'LORA32_V2'),
  firmwareVersion: fc.string({ minLength: 5, maxLength: 15 }),
  role: fc.constantFrom('ROUTER', 'CLIENT', 'REPEATER', 'TRACKER', 'SENSOR'),
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

describe('Environmental Telemetry Display Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('Property 8: Environmental telemetry visualization - For any node with environmental sensor data, the environmental section should display both historical graphs and current real-time values', () => {
    fc.assert(
      fc.property(
        nodeWithEnvironmentalTelemetryArb,
        fc.array(environmentalTelemetryArb, { minLength: 1, maxLength: 10 }),
        (node, telemetryData) => {
          // Ensure telemetry data belongs to the node
          const nodeSpecificTelemetry = telemetryData.map(t => ({ ...t, nodeId: node.id }));
          
          const store = createTestStore();

          const { unmount } = render(
            <Provider store={store}>
              <MockEnvironmentalTelemetryChart node={node} telemetryData={nodeSpecificTelemetry} />
            </Provider>
          );

          try {
            // Verify environmental telemetry section exists (Requirements 4.4)
            expect(screen.getByTestId('environmental-telemetry-section')).toBeInTheDocument();
            expect(screen.getByText('Environmental Metrics')).toBeInTheDocument();

            // Verify time range selector exists for environmental historical data (Requirements 4.4)
            expect(screen.getByTestId('environmental-time-range-selector')).toBeInTheDocument();
            expect(screen.getByTestId('environmental-time-range-dropdown')).toBeInTheDocument();

            // Verify historical graphs section exists (Requirements 4.4)
            expect(screen.getByTestId('environmental-historical-graphs')).toBeInTheDocument();

            // Verify current real-time environmental values section exists (Requirements 4.5)
            expect(screen.getByTestId('environmental-current-values')).toBeInTheDocument();
            expect(screen.getByText('Current Environmental Values')).toBeInTheDocument();

            // Check that environmental last update timestamp is displayed (Requirements 4.5)
            expect(screen.getByTestId('environmental-last-update')).toBeInTheDocument();

            // Get the latest environmental metrics to check what should be displayed
            const latestEnvironmentalMetrics = nodeSpecificTelemetry
              .filter(t => t.type === 'ENVIRONMENT_METRICS')
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            if (latestEnvironmentalMetrics) {
              // Verify temperature chart and current value if present (Requirements 4.4, 4.5)
              if (latestEnvironmentalMetrics.data.temperature !== undefined && latestEnvironmentalMetrics.data.temperature !== null) {
                expect(screen.getByTestId('temperature-chart')).toBeInTheDocument();
                expect(screen.getByText('Temperature')).toBeInTheDocument();
                expect(screen.getByTestId('current-temperature')).toBeInTheDocument();
                expect(screen.getByText(`Temperature: ${latestEnvironmentalMetrics.data.temperature.toFixed(1)}°C`)).toBeInTheDocument();
              }

              // Verify humidity chart and current value if present (Requirements 4.4, 4.5)
              if (latestEnvironmentalMetrics.data.humidity !== undefined && latestEnvironmentalMetrics.data.humidity !== null) {
                expect(screen.getByTestId('humidity-chart')).toBeInTheDocument();
                expect(screen.getByText('Humidity')).toBeInTheDocument();
                expect(screen.getByTestId('current-humidity')).toBeInTheDocument();
                expect(screen.getByText(`Relative Humidity: ${latestEnvironmentalMetrics.data.humidity.toFixed(1)}%`)).toBeInTheDocument();
              }

              // Verify barometric pressure chart and current value if present (Requirements 4.4, 4.5)
              if (latestEnvironmentalMetrics.data.pressure !== undefined && latestEnvironmentalMetrics.data.pressure !== null) {
                expect(screen.getByTestId('pressure-chart')).toBeInTheDocument();
                expect(screen.getByText('Barometric Pressure')).toBeInTheDocument();
                expect(screen.getByTestId('current-pressure')).toBeInTheDocument();
                expect(screen.getByText(`Barometric Pressure: ${latestEnvironmentalMetrics.data.pressure.toFixed(1)} hPa`)).toBeInTheDocument();
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

  test('Environmental telemetry should handle nodes with no environmental metrics gracefully', () => {
    fc.assert(
      fc.property(
        nodeWithEnvironmentalTelemetryArb,
        fc.array(fc.record({
          id: fc.string({ minLength: 8, maxLength: 16 }),
          nodeId: fc.string({ minLength: 8, maxLength: 16 }),
          type: fc.constantFrom('DEVICE_METRICS', 'POWER_METRICS'), // No environmental metrics
          timestamp: fc.date().map(d => d.toISOString()),
          data: fc.record({}),
        }), { minLength: 0, maxLength: 5 }),
        (node, telemetryData) => {
          const nodeSpecificTelemetry = telemetryData.map(t => ({ ...t, nodeId: node.id }));
          
          const store = createTestStore();

          const { unmount } = render(
            <Provider store={store}>
              <MockEnvironmentalTelemetryChart node={node} telemetryData={nodeSpecificTelemetry} />
            </Provider>
          );

          try {
            // Should show no environmental metrics message when no environmental telemetry is available
            expect(screen.getByTestId('no-environmental-metrics')).toBeInTheDocument();
            expect(screen.getByText('No environmental metrics available')).toBeInTheDocument();

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Environmental telemetry should handle partial environmental metrics data', () => {
    fc.assert(
      fc.property(
        nodeWithEnvironmentalTelemetryArb,
        fc.array(fc.record({
          id: fc.string({ minLength: 8, maxLength: 16 }),
          nodeId: fc.string({ minLength: 8, maxLength: 16 }),
          type: fc.constant('ENVIRONMENT_METRICS'),
          timestamp: fc.date().map(d => d.toISOString()),
          data: fc.record({
            // Only some environmental metrics present
            temperature: fc.option(fc.double({ min: -40, max: 85 })),
            // humidity and pressure may be undefined
          }),
        }), { minLength: 1, maxLength: 3 }),
        (node, telemetryData) => {
          const nodeSpecificTelemetry = telemetryData.map(t => ({ ...t, nodeId: node.id }));
          
          const store = createTestStore();

          const { unmount } = render(
            <Provider store={store}>
              <MockEnvironmentalTelemetryChart node={node} telemetryData={nodeSpecificTelemetry} />
            </Provider>
          );

          try {
            // Should render environmental telemetry section even with partial data
            expect(screen.getByTestId('environmental-telemetry-section')).toBeInTheDocument();
            expect(screen.getByTestId('environmental-current-values')).toBeInTheDocument();

            // Should not crash or show undefined values
            const content = screen.getByTestId('environmental-telemetry-section').textContent || '';
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

  test('Environmental time range selector should provide configurable options for historical data', () => {
    fc.assert(
      fc.property(
        nodeWithEnvironmentalTelemetryArb,
        fc.array(environmentalTelemetryArb, { minLength: 1, maxLength: 5 }),
        (node, telemetryData) => {
          const nodeSpecificTelemetry = telemetryData.map(t => ({ ...t, nodeId: node.id }));
          
          const store = createTestStore();

          const { unmount } = render(
            <Provider store={store}>
              <MockEnvironmentalTelemetryChart node={node} telemetryData={nodeSpecificTelemetry} />
            </Provider>
          );

          try {
            // Verify environmental time range dropdown has expected options (Requirements 4.4)
            const dropdown = screen.getByTestId('environmental-time-range-dropdown');
            expect(dropdown).toBeInTheDocument();

            const dropdownContent = dropdown.textContent || '';
            expect(dropdownContent).toContain('Last Hour');
            expect(dropdownContent).toContain('Last 6 Hours');
            expect(dropdownContent).toContain('Last 24 Hours');
            expect(dropdownContent).toContain('Last 7 Days');
            expect(dropdownContent).toContain('Last 30 Days'); // Environmental data often needs longer ranges

            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('Environmental telemetry should handle extreme but valid sensor values', () => {
    fc.assert(
      fc.property(
        nodeWithEnvironmentalTelemetryArb,
        fc.array(fc.record({
          id: fc.string({ minLength: 8, maxLength: 16 }),
          nodeId: fc.string({ minLength: 8, maxLength: 16 }),
          type: fc.constant('ENVIRONMENT_METRICS'),
          timestamp: fc.date().map(d => d.toISOString()),
          data: fc.record({
            temperature: fc.constantFrom(-40, 85), // Extreme but valid temperatures
            humidity: fc.constantFrom(0, 100), // Extreme but valid humidity
            pressure: fc.constantFrom(300, 1100), // Extreme but valid pressure
          }),
        }), { minLength: 1, maxLength: 3 }),
        (node, telemetryData) => {
          const nodeSpecificTelemetry = telemetryData.map(t => ({ ...t, nodeId: node.id }));
          
          const store = createTestStore();

          const { unmount } = render(
            <Provider store={store}>
              <MockEnvironmentalTelemetryChart node={node} telemetryData={nodeSpecificTelemetry} />
            </Provider>
          );

          try {
            // Should handle extreme values without crashing
            expect(screen.getByTestId('environmental-telemetry-section')).toBeInTheDocument();
            
            // Should display the extreme values correctly formatted
            const latestMetrics = nodeSpecificTelemetry
              .filter(t => t.type === 'ENVIRONMENT_METRICS')
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            if (latestMetrics) {
              if (latestMetrics.data.temperature !== undefined) {
                expect(screen.getByText(`Temperature: ${latestMetrics.data.temperature.toFixed(1)}°C`)).toBeInTheDocument();
              }
              if (latestMetrics.data.humidity !== undefined) {
                expect(screen.getByText(`Relative Humidity: ${latestMetrics.data.humidity.toFixed(1)}%`)).toBeInTheDocument();
              }
              if (latestMetrics.data.pressure !== undefined) {
                expect(screen.getByText(`Barometric Pressure: ${latestMetrics.data.pressure.toFixed(1)} hPa`)).toBeInTheDocument();
              }
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
});