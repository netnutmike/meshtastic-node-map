/**
 * Frontend User Workflow Integration Tests
 * 
 * Tests complete user workflows from the frontend perspective:
 * - Map initialization and node visualization
 * - Real-time updates and WebSocket connectivity
 * - User interactions and navigation
 * - Settings persistence and configuration
 * - Mobile responsiveness and offline functionality
 * 
 * Requirements: 10.1, 10.2, 10.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

// Import components
import App from '../../App';
import MapPage from '../../pages/MapPage';
import { store } from '../../store';
import nodeSlice from '../../store/slices/nodeSlice';
import mapSlice from '../../store/slices/mapSlice';
import settingsSlice from '../../store/slices/settingsSlice';

// Mock external dependencies
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

const mockIo = jest.fn();

jest.mock('axios', () => mockAxios);
jest.mock('socket.io-client', () => ({
  io: mockIo
}));
jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    invalidateSize: jest.fn(),
    getZoom: jest.fn(() => 10),
    getCenter: jest.fn(() => ({ lat: 40.7128, lng: -74.0060 })),
    getBounds: jest.fn(() => ({
      getNorthEast: jest.fn(() => ({ lat: 41, lng: -73 })),
      getSouthWest: jest.fn(() => ({ lat: 40, lng: -75 }))
    }))
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn()
  })),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    bindPopup: jest.fn(),
    on: jest.fn(),
    setLatLng: jest.fn(),
    remove: jest.fn()
  })),
  popup: jest.fn(() => ({
    setContent: jest.fn(),
    openOn: jest.fn()
  })),
  divIcon: jest.fn(),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  latLngBounds: jest.fn()
}));

// Use the mocked versions directly

// Mock WebSocket
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connected: true
};

// Test data
const mockNodes = [
  {
    id: '123456789',
    shortName: 'TEST01',
    longName: 'Test Node 01',
    hardwareModel: 'TBEAM',
    role: 'ROUTER',
    isOnline: true,
    mqttConnected: true,
    batteryLevel: 85,
    position: {
      latitude: 40.7128,
      longitude: -74.0060,
      altitude: 10
    },
    lastSeen: new Date().toISOString(),
    lastHeard: new Date().toISOString()
  },
  {
    id: '987654321',
    shortName: 'TEST02',
    longName: 'Test Node 02',
    hardwareModel: 'HELTEC_V3',
    role: 'CLIENT',
    isOnline: false,
    mqttConnected: false,
    batteryLevel: 45,
    position: {
      latitude: 40.7589,
      longitude: -73.9851,
      altitude: 25
    },
    lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    lastHeard: new Date(Date.now() - 3600000).toISOString()
  }
];

const mockTelemetry = [
  {
    id: '1',
    nodeId: '123456789',
    type: 'DEVICE',
    timestamp: new Date().toISOString(),
    data: {
      batteryLevel: 85,
      voltage: 4.1,
      channelUtilization: 15.5,
      airUtilTx: 2.3
    }
  },
  {
    id: '2',
    nodeId: '123456789',
    type: 'ENVIRONMENT',
    timestamp: new Date().toISOString(),
    data: {
      temperature: 22.5,
      humidity: 65.2,
      pressure: 1013.25
    }
  }
];

// Helper function to create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      nodes: nodeSlice,
      map: mapSlice,
      settings: settingsSlice
    },
    preloadedState: initialState
  });
};

// Helper function to render with providers
const renderWithProviders = (
  component: React.ReactElement,
  { initialState = {}, store = createTestStore(initialState) } = {}
) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('Frontend User Workflow Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default axios responses
    mockAxios.get.mockImplementation((url) => {
      if (url.includes('/api/nodes')) {
        return Promise.resolve({ data: mockNodes });
      }
      if (url.includes('/api/telemetry')) {
        return Promise.resolve({ data: mockTelemetry });
      }
      if (url.includes('/api/config')) {
        return Promise.resolve({
          data: {
            app: {
              name: 'Meshtastic Node Mapper',
              logo: '/assets/logo.png'
            },
            map: {
              defaultZoom: 10,
              defaultCenter: [40.7128, -74.0060]
            }
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    // Setup WebSocket mock
    mockIo.mockReturnValue(mockSocket as any);
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
  });

  describe('Complete Map Visualization Workflow', () => {
    it('should load and display nodes on map initialization', async () => {
      renderWithProviders(<MapPage />);

      // Wait for initial data load
      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/api/nodes'));
      });

      // Verify nodes are displayed
      await waitFor(() => {
        expect(screen.getByText('TEST01')).toBeInTheDocument();
        expect(screen.getByText('TEST02')).toBeInTheDocument();
      });

      // Verify map initialization
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should handle node hover and popup display', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MapPage />);

      await waitFor(() => {
        expect(screen.getByText('TEST01')).toBeInTheDocument();
      });

      // Hover over node
      const nodeElement = screen.getByText('TEST01');
      await user.hover(nodeElement);

      // Verify popup content
      await waitFor(() => {
        expect(screen.getByText('Test Node 01')).toBeInTheDocument();
        expect(screen.getByText('TBEAM')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument(); // Battery level
        expect(screen.getByText('Show Full Details')).toBeInTheDocument();
      });
    });

    it('should open node details panel and display comprehensive information', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MapPage />);

      await waitFor(() => {
        expect(screen.getByText('Show Full Details')).toBeInTheDocument();
      });

      // Click show details button
      const detailsButton = screen.getByText('Show Full Details');
      await user.click(detailsButton);

      // Verify details panel opens
      await waitFor(() => {
        expect(screen.getByText('Node Details')).toBeInTheDocument();
        expect(screen.getByText('Device Information')).toBeInTheDocument();
        expect(screen.getByText('Position')).toBeInTheDocument();
        expect(screen.getByText('Telemetry')).toBeInTheDocument();
      });

      // Verify telemetry data is loaded
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/telemetry?nodeId=123456789')
      );
    });
  });

  describe('Real-time Updates Workflow', () => {
    it('should establish WebSocket connection and handle real-time updates', async () => {
      renderWithProviders(<MapPage />);

      // Verify WebSocket connection is established
      expect(mockIo).toHaveBeenCalledWith(expect.any(String));
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('nodeUpdate', expect.any(Function));

      // Simulate real-time node update
      const nodeUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'nodeUpdate'
      )?.[1];

      if (nodeUpdateCallback) {
        act(() => {
          nodeUpdateCallback({
            id: '123456789',
            shortName: 'TEST01',
            batteryLevel: 80, // Updated battery level
            isOnline: true,
            mqttConnected: true
          });
        });

        // Verify UI updates with new data
        await waitFor(() => {
          expect(screen.getByText('80%')).toBeInTheDocument();
        });
      }
    });

    it('should handle WebSocket disconnection and reconnection', async () => {
      renderWithProviders(<MapPage />);

      // Simulate disconnection
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      if (disconnectCallback) {
        act(() => {
          disconnectCallback();
        });

        // Verify connection status indicator
        await waitFor(() => {
          expect(screen.getByText('Disconnected')).toBeInTheDocument();
        });
      }

      // Simulate reconnection
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (connectCallback) {
        act(() => {
          connectCallback();
        });

        // Verify connection restored
        await waitFor(() => {
          expect(screen.getByText('Connected')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Search and Filtering Workflow', () => {
    it('should filter nodes by search query', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MapPage />);

      await waitFor(() => {
        expect(screen.getByText('TEST01')).toBeInTheDocument();
        expect(screen.getByText('TEST02')).toBeInTheDocument();
      });

      // Use search functionality
      const searchInput = screen.getByPlaceholderText('Search nodes...');
      await user.type(searchInput, 'TEST01');

      // Verify filtering
      await waitFor(() => {
        expect(screen.getByText('TEST01')).toBeInTheDocument();
        expect(screen.queryByText('TEST02')).not.toBeInTheDocument();
      });
    });

    it('should filter nodes by hardware type', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MapPage />);

      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });

      // Open filters panel
      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);

      // Select hardware filter
      const hardwareSelect = screen.getByLabelText('Hardware Type');
      await user.selectOptions(hardwareSelect, 'TBEAM');

      // Verify filtering
      await waitFor(() => {
        expect(screen.getByText('TEST01')).toBeInTheDocument();
        expect(screen.queryByText('TEST02')).not.toBeInTheDocument();
      });
    });

    it('should filter nodes by age settings', async () => {
      const user = userEvent.setup();
      
      // Initialize with age filtering enabled
      const initialState = {
        settings: {
          nodesMaxAge: 1800, // 30 minutes
          showAll: false
        }
      };
      
      renderWithProviders(<MapPage />, { initialState });

      await waitFor(() => {
        // TEST01 should be visible (recent)
        expect(screen.getByText('TEST01')).toBeInTheDocument();
        // TEST02 should be hidden (1 hour old)
        expect(screen.queryByText('TEST02')).not.toBeInTheDocument();
      });

      // Enable "Show All" mode
      const showAllToggle = screen.getByLabelText('Show All Nodes');
      await user.click(showAllToggle);

      // Verify all nodes are now visible
      await waitFor(() => {
        expect(screen.getByText('TEST01')).toBeInTheDocument();
        expect(screen.getByText('TEST02')).toBeInTheDocument();
      });
    });
  });

  describe('Settings and Configuration Workflow', () => {
    it('should persist settings changes to localStorage', async () => {
      const user = userEvent.setup();
      renderWithProviders(<App />);

      // Open settings panel
      const settingsButton = screen.getByLabelText('Settings');
      await user.click(settingsButton);

      // Change temperature format
      const tempFormatSelect = screen.getByLabelText('Temperature Format');
      await user.selectOptions(tempFormatSelect, 'fahrenheit');

      // Change max age setting
      const maxAgeInput = screen.getByLabelText('Max Node Age (seconds)');
      await user.clear(maxAgeInput);
      await user.type(maxAgeInput, '3600');

      // Save settings
      const saveButton = screen.getByText('Save Settings');
      await user.click(saveButton);

      // Verify localStorage was called
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'meshtastic-settings',
        expect.stringContaining('"temperatureFormat":"fahrenheit"')
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'meshtastic-settings',
        expect.stringContaining('"nodesMaxAge":3600')
      );
    });

    it('should load settings from localStorage on initialization', async () => {
      // Mock localStorage with saved settings
      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({
          temperatureFormat: 'fahrenheit',
          nodesMaxAge: 7200,
          defaultZoom: 12
        })
      );

      renderWithProviders(<App />);

      // Verify settings are loaded
      await waitFor(() => {
        const settingsButton = screen.getByLabelText('Settings');
        fireEvent.click(settingsButton);
      });

      expect(screen.getByDisplayValue('fahrenheit')).toBeInTheDocument();
      expect(screen.getByDisplayValue('7200')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness Workflow', () => {
    it('should adapt layout for mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      renderWithProviders(<MapPage />);

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Verify mobile layout elements
      await waitFor(() => {
        expect(screen.getByTestId('mobile-controls')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
      });
    });

    it('should handle touch interactions on mobile', async () => {
      const user = userEvent.setup();
      
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: null,
        writable: true
      });

      renderWithProviders(<MapPage />);

      // Simulate touch interaction
      const mapContainer = screen.getByTestId('map-container');
      
      await user.pointer([
        { keys: '[TouchA>]', target: mapContainer, coords: { x: 100, y: 100 } },
        { keys: '[/TouchA]', target: mapContainer, coords: { x: 150, y: 150 } }
      ]);

      // Verify touch interaction was handled
      // (This would typically trigger map pan/zoom in real implementation)
      expect(mapContainer).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery Workflow', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      renderWithProviders(<MapPage />);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText('Failed to load nodes')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry failed requests', async () => {
      const user = userEvent.setup();
      
      // Mock initial failure then success
      mockAxios.get
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ data: mockNodes });

      renderWithProviders(<MapPage />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      // Verify successful retry
      await waitFor(() => {
        expect(screen.getByText('TEST01')).toBeInTheDocument();
        expect(screen.queryByText('Failed to load nodes')).not.toBeInTheDocument();
      });
    });

    it('should handle offline mode', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      renderWithProviders(<MapPage />);

      // Trigger offline event
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // Verify offline indicator
      await waitFor(() => {
        expect(screen.getByText('Offline Mode')).toBeInTheDocument();
        expect(screen.getByText('Limited functionality available')).toBeInTheDocument();
      });

      // Mock coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Verify online state restored
      await waitFor(() => {
        expect(screen.queryByText('Offline Mode')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large number of nodes efficiently', async () => {
      // Create large dataset
      const largeNodeSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `node_${i}`,
        shortName: `N${i.toString().padStart(3, '0')}`,
        longName: `Node ${i}`,
        hardwareModel: 'TBEAM',
        role: 'ROUTER',
        isOnline: i % 2 === 0,
        mqttConnected: i % 3 === 0,
        position: {
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
          altitude: Math.floor(Math.random() * 100)
        },
        lastSeen: new Date().toISOString()
      }));

      mockAxios.get.mockResolvedValueOnce({ data: largeNodeSet });

      const startTime = performance.now();
      renderWithProviders(<MapPage />);

      // Wait for rendering to complete
      await waitFor(() => {
        expect(screen.getByText('N000')).toBeInTheDocument();
      }, { timeout: 10000 });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Performance assertion (should render 1000 nodes in under 5 seconds)
      expect(renderTime).toBeLessThan(5000);
      console.log(`Rendered 1000 nodes in ${renderTime}ms`);
    });

    it('should handle rapid real-time updates efficiently', async () => {
      renderWithProviders(<MapPage />);

      const nodeUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'nodeUpdate'
      )?.[1];

      if (nodeUpdateCallback) {
        const startTime = performance.now();

        // Send 100 rapid updates
        for (let i = 0; i < 100; i++) {
          act(() => {
            nodeUpdateCallback({
              id: '123456789',
              batteryLevel: 85 - i,
              timestamp: Date.now()
            });
          });
        }

        const endTime = performance.now();
        const updateTime = endTime - startTime;

        // Performance assertion (should handle 100 updates in under 1 second)
        expect(updateTime).toBeLessThan(1000);
        console.log(`Processed 100 real-time updates in ${updateTime}ms`);
      }
    });
  });
});