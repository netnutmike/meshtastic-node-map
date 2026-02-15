/**
 * Malla Features Integration Tests
 * 
 * Tests complete user workflows for Malla-inspired features:
 * - RF link visualization workflow
 * - Theme switching across all components
 * - Mobile responsiveness
 * - Dashboard statistics
 * - Packet filtering and grouping
 * - Distance calculations and longest links
 * - Line-of-sight analysis
 * - Gateway comparison
 * - Data retention and cleanup
 * - URL state management
 * 
 * Task: 69.1 Write integration tests for user workflows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

// Import pages and components
import MapPage from '../../pages/MapPage';
import PacketsPage from '../../pages/PacketsPage';
import LineOfSightPage from '../../pages/LineOfSightPage';
import GatewayComparisonPage from '../../pages/GatewayComparisonPage';
import NetworkInsightsPage from '../../pages/NetworkInsightsPage';
import { DarkModeToggle } from '../../utils/DarkModeToggle';

// Mock API service
jest.mock('../../services/api', () => ({
  fetchNodes: jest.fn(),
  fetchRFLinks: jest.fn(),
  fetchPackets: jest.fn(),
  fetchDashboardStats: jest.fn(),
  fetchLongestLinks: jest.fn(),
  fetchLineOfSight: jest.fn(),
  fetchGatewayComparison: jest.fn(),
  triggerCleanup: jest.fn()
}));

const mockApi = require('../../services/api');

// Mock Leaflet
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
    addTo: jest.fn(),
    remove: jest.fn()
  })),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    bindPopup: jest.fn(),
    on: jest.fn(),
    setLatLng: jest.fn(),
    remove: jest.fn()
  })),
  polyline: jest.fn(() => ({
    addTo: jest.fn(),
    remove: jest.fn(),
    bindPopup: jest.fn()
  })),
  popup: jest.fn(() => ({
    setContent: jest.fn(),
    openOn: jest.fn()
  })),
  divIcon: jest.fn(),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  latLngBounds: jest.fn()
}));

// Mock Chart.js
jest.mock('chart.js/auto', () => ({
  Chart: jest.fn(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    data: { datasets: [] }
  }))
}));

// Test data
const mockNodes = [
  {
    id: '1',
    nodeId: '123456789',
    hexId: '75bcd15',
    shortName: 'NODE1',
    longName: 'Test Node 1',
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
    lastSeen: new Date().toISOString()
  },
  {
    id: '2',
    nodeId: '987654321',
    hexId: '3ade68b1',
    shortName: 'NODE2',
    longName: 'Test Node 2',
    hardwareModel: 'HELTEC_V3',
    role: 'CLIENT',
    isOnline: true,
    mqttConnected: true,
    batteryLevel: 65,
    position: {
      latitude: 40.7589,
      longitude: -73.9851,
      altitude: 25
    },
    lastSeen: new Date().toISOString()
  }
];

const mockRFLinks = [
  {
    from_node_id: '123456789',
    to_node_id: '987654321',
    link_type: 'traceroute',
    packet_count: 15,
    avg_rssi: -85,
    avg_snr: 8.5,
    last_seen: new Date().toISOString(),
    success_rate: 95,
    is_bidirectional: true
  }
];

const mockPackets = [
  {
    id: '1',
    mesh_packet_id: 'pkt_001',
    from_node_id: '123456789',
    to_node_id: '987654321',
    portnum: 1,
    portnum_name: 'TEXT_MESSAGE_APP',
    gateway_id: 'gateway_1',
    rssi: -85,
    snr: 8.5,
    hop_limit: 3,
    hop_start: 3,
    rx_time: new Date().toISOString()
  }
];

const mockDashboardStats = {
  totalNodes: 150,
  activeNodes: 120,
  gatewayDiversity: 8,
  protocolDiversity: 3,
  totalMessages: 5420,
  successRate: 94.5,
  charts: {
    networkActivity: [],
    nodeActivity: [],
    gatewayActivity: [],
    signalQuality: [],
    messageRouting: [],
    protocolUsage: [],
    mostActiveNodes: []
  }
};

// Helper to create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      nodes: (state = { nodes: mockNodes }) => state,
      map: (state = { rfLinks: mockRFLinks }) => state,
      settings: (state = { theme: 'auto' }) => state
    }
  });
};

// Helper to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('Malla Features Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API responses
    mockApi.fetchNodes.mockResolvedValue(mockNodes);
    mockApi.fetchRFLinks.mockResolvedValue({ traceroute_links: mockRFLinks, packet_links: [] });
    mockApi.fetchPackets.mockResolvedValue(mockPackets);
    mockApi.fetchDashboardStats.mockResolvedValue(mockDashboardStats);
    mockApi.fetchLongestLinks.mockResolvedValue([]);
    mockApi.fetchLineOfSight.mockResolvedValue({});
    mockApi.fetchGatewayComparison.mockResolvedValue({});

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  describe('RF Link Visualization Workflow', () => {
    it('should complete RF link visualization workflow', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MapPage />);

      // Wait for initial data load
      await waitFor(() => {
        expect(mockApi.fetchNodes).toHaveBeenCalled();
        expect(mockApi.fetchRFLinks).toHaveBeenCalled();
      });

      // Verify nodes are displayed
      await waitFor(() => {
        expect(screen.getByText(/NODE1/i)).toBeInTheDocument();
        expect(screen.getByText(/NODE2/i)).toBeInTheDocument();
      });

      // Toggle RF links visibility
      const rfLinksToggle = screen.getByLabelText(/show rf links/i);
      await user.click(rfLinksToggle);

      // Verify RF links are displayed
      await waitFor(() => {
        expect(screen.getByText(/traceroute link/i)).toBeInTheDocument();
      });

      // Test hop depth filtering
      const hopDepthSelector = screen.getByLabelText(/hop depth/i);
      await user.selectOptions(hopDepthSelector, '2');

      // Verify filtering applied
      await waitFor(() => {
        expect(screen.getByText(/showing nodes within 2 hops/i)).toBeInTheDocument();
      });

      // Click on RF link to see details
      const rfLink = screen.getByText(/traceroute link/i);
      await user.click(rfLink);

      // Verify link details popup
      await waitFor(() => {
        expect(screen.getByText(/success rate: 95%/i)).toBeInTheDocument();
        expect(screen.getByText(/rssi: -85/i)).toBeInTheDocument();
        expect(screen.getByText(/snr: 8.5/i)).toBeInTheDocument();
      });
    });

    it('should handle RF link type filtering', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MapPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/show traceroute links/i)).toBeInTheDocument();
      });

      // Toggle traceroute links off
      const tracerouteToggle = screen.getByLabelText(/show traceroute links/i);
      await user.click(tracerouteToggle);

      // Verify traceroute links are hidden
      await waitFor(() => {
        expect(screen.queryByText(/traceroute link/i)).not.toBeInTheDocument();
      });

      // Toggle packet links on
      const packetToggle = screen.getByLabelText(/show packet links/i);
      await user.click(packetToggle);

      // Verify packet links are displayed
      await waitFor(() => {
        expect(screen.getByText(/packet link/i)).toBeInTheDocument();
      });
    });
  });

  describe('Theme Switching Workflow', () => {
    it('should switch themes across all components', async () => {
      const user = userEvent.setup();
      const darkModeToggle = new DarkModeToggle();
      
      renderWithProviders(<MapPage />);

      // Initial theme should be auto
      expect(darkModeToggle.getThemePreference()).toBe('auto');

      // Find theme toggle button
      const themeButton = screen.getByLabelText(/toggle theme/i);
      
      // Cycle to dark theme
      await user.click(themeButton);
      
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
      });

      // Verify map tiles switched to dark
      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toHaveClass('dark-theme');
      });

      // Cycle to light theme
      await user.click(themeButton);
      await user.click(themeButton);
      
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
      });

      // Verify map tiles switched to light
      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toHaveClass('light-theme');
      });
    });

    it('should persist theme preference', async () => {
      const user = userEvent.setup();
      const darkModeToggle = new DarkModeToggle();
      
      renderWithProviders(<MapPage />);

      const themeButton = screen.getByLabelText(/toggle theme/i);
      await user.click(themeButton);

      // Verify localStorage was called
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'malla-theme-preference',
        'dark'
      );

      // Reload and verify theme is restored
      (localStorage.getItem as jest.Mock).mockReturnValue('dark');
      
      const newToggle = new DarkModeToggle();
      expect(newToggle.getThemePreference()).toBe('dark');
    });

    it('should update charts when theme changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NetworkInsightsPage />);

      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Get initial chart colors
      const charts = screen.getAllByTestId('chart-canvas');
      expect(charts.length).toBeGreaterThan(0);

      // Switch theme
      const themeButton = screen.getByLabelText(/toggle theme/i);
      await user.click(themeButton);

      // Verify charts updated
      await waitFor(() => {
        charts.forEach(chart => {
          expect(chart).toHaveAttribute('data-theme', 'dark');
        });
      });
    });
  });

  describe('Mobile Responsiveness Workflow', () => {
    beforeEach(() => {
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
    });

    it('should adapt layout for mobile devices', async () => {
      renderWithProviders(<MapPage />);

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Verify mobile layout
      await waitFor(() => {
        expect(screen.getByTestId('mobile-controls')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
      });

      // Verify sidebar is bottom sheet on mobile
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveClass('bottom-sheet');
    });

    it('should use icon buttons on mobile', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MapPage />);

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Verify action buttons are icon-only
      const actionButtons = screen.getAllByRole('button', { name: /action/i });
      actionButtons.forEach(button => {
        expect(button).toHaveClass('icon-button');
        expect(button.querySelector('svg')).toBeInTheDocument();
      });

      // Hover to see tooltip
      await user.hover(actionButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should optimize tables for mobile', async () => {
      renderWithProviders(<PacketsPage />);

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });

      // Verify less important columns are hidden
      const hiddenColumns = screen.queryAllByTestId('hide-mobile');
      expect(hiddenColumns.length).toBeGreaterThan(0);
      hiddenColumns.forEach(col => {
        expect(col).toHaveClass('hide-mobile');
      });

      // Verify actions column is sticky
      const actionsColumn = screen.getByTestId('actions-column');
      expect(actionsColumn).toHaveClass('sticky-column');
    });
  });

  describe('Dashboard Statistics Workflow', () => {
    it('should load and display dashboard statistics', async () => {
      renderWithProviders(<NetworkInsightsPage />);

      // Wait for data load
      await waitFor(() => {
        expect(mockApi.fetchDashboardStats).toHaveBeenCalled();
      });

      // Verify metric cards
      await waitFor(() => {
        expect(screen.getByText(/total nodes/i)).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        
        expect(screen.getByText(/active nodes/i)).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
        
        expect(screen.getByText(/gateway diversity/i)).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
      });

      // Verify charts are rendered
      const charts = screen.getAllByTestId('chart-canvas');
      expect(charts.length).toBeGreaterThanOrEqual(7);
    });

    it('should update dashboard in real-time', async () => {
      renderWithProviders(<NetworkInsightsPage />);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      // Simulate real-time update
      const updatedStats = { ...mockDashboardStats, totalNodes: 155 };
      mockApi.fetchDashboardStats.mockResolvedValueOnce(updatedStats);

      // Trigger refresh
      const refreshButton = screen.getByLabelText(/refresh/i);
      fireEvent.click(refreshButton);

      // Verify updated data
      await waitFor(() => {
        expect(screen.getByText('155')).toBeInTheDocument();
      });
    });
  });

  describe('Packet Filtering and Grouping Workflow', () => {
    it('should filter packets by multiple criteria', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PacketsPage />);

      await waitFor(() => {
        expect(screen.getByText(/packets/i)).toBeInTheDocument();
      });

      // Apply time range filter
      const startTimeInput = screen.getByLabelText(/start time/i);
      await user.type(startTimeInput, '2024-01-01T00:00');

      // Apply node filter
      const fromNodePicker = screen.getByLabelText(/from node/i);
      await user.click(fromNodePicker);
      await user.type(fromNodePicker, 'NODE1');
      
      await waitFor(() => {
        expect(screen.getByText('NODE1')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('NODE1'));

      // Apply port filter
      const portSelect = screen.getByLabelText(/port/i);
      await user.selectOptions(portSelect, 'TEXT_MESSAGE_APP');

      // Verify filters applied
      await waitFor(() => {
        expect(mockApi.fetchPackets).toHaveBeenCalledWith(
          expect.objectContaining({
            from_node_id: '123456789',
            portnum: 'TEXT_MESSAGE_APP'
          })
        );
      });
    });

    it('should group packets by packet ID', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PacketsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/group by packet id/i)).toBeInTheDocument();
      });

      // Enable grouping
      const groupToggle = screen.getByLabelText(/group by packet id/i);
      await user.click(groupToggle);

      // Verify grouped view
      await waitFor(() => {
        expect(screen.getByText(/gateway count/i)).toBeInTheDocument();
        expect(screen.getByText(/reception count/i)).toBeInTheDocument();
      });

      // Verify aggregated statistics
      expect(screen.getByText(/avg rssi/i)).toBeInTheDocument();
      expect(screen.getByText(/avg snr/i)).toBeInTheDocument();
    });
  });

  describe('Distance Calculations and Longest Links Workflow', () => {
    it('should calculate and display distances', async () => {
      renderWithProviders(<MapPage />);

      await waitFor(() => {
        expect(screen.getByText(/NODE1/i)).toBeInTheDocument();
      });

      // Enable distance display
      const distanceToggle = screen.getByLabelText(/show distances/i);
      fireEvent.click(distanceToggle);

      // Verify distance labels on links
      await waitFor(() => {
        expect(screen.getByText(/8.5 km/i)).toBeInTheDocument();
      });
    });

    it('should display longest links analysis', async () => {
      const mockLongestLinks = [
        {
          from_node: mockNodes[0],
          to_node: mockNodes[1],
          distance_km: 8.5,
          avg_snr: 8.5,
          avg_rssi: -85,
          hop_count: 1
        }
      ];

      mockApi.fetchLongestLinks.mockResolvedValueOnce(mockLongestLinks);

      renderWithProviders(<NetworkInsightsPage />);

      // Navigate to longest links tab
      const longestLinksTab = screen.getByText(/longest links/i);
      fireEvent.click(longestLinksTab);

      // Verify longest links table
      await waitFor(() => {
        expect(screen.getByText('8.5 km')).toBeInTheDocument();
        expect(screen.getByText('NODE1')).toBeInTheDocument();
        expect(screen.getByText('NODE2')).toBeInTheDocument();
      });
    });
  });

  describe('Line-of-Sight Analysis Workflow', () => {
    it('should complete line-of-sight analysis', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LineOfSightPage />);

      // Select first node
      const fromNodePicker = screen.getByLabelText(/from node/i);
      await user.click(fromNodePicker);
      await user.type(fromNodePicker, 'NODE1');
      await user.click(screen.getByText('NODE1'));

      // Select second node
      const toNodePicker = screen.getByLabelText(/to node/i);
      await user.click(toNodePicker);
      await user.type(toNodePicker, 'NODE2');
      await user.click(screen.getByText('NODE2'));

      // Verify analysis results
      await waitFor(() => {
        expect(screen.getByText(/distance/i)).toBeInTheDocument();
        expect(screen.getByText(/8.5 km/i)).toBeInTheDocument();
        expect(screen.getByText(/bearing/i)).toBeInTheDocument();
      });

      // Verify line drawn on map
      expect(screen.getByTestId('los-line')).toBeInTheDocument();
    });

    it('should load from URL parameters', async () => {
      // Mock URL with parameters
      delete (window as any).location;
      (window as any).location = new URL('http://localhost/line-of-sight?from=123456789&to=987654321');

      renderWithProviders(<LineOfSightPage />);

      // Verify nodes are pre-selected
      await waitFor(() => {
        expect(screen.getByText('NODE1')).toBeInTheDocument();
        expect(screen.getByText('NODE2')).toBeInTheDocument();
        expect(screen.getByText(/8.5 km/i)).toBeInTheDocument();
      });
    });
  });

  describe('Gateway Comparison Workflow', () => {
    it('should compare two gateways', async () => {
      const user = userEvent.setup();
      const mockComparison = {
        gateway1: mockNodes[0],
        gateway2: mockNodes[1],
        commonPackets: 50,
        statistics: {
          rssi_diff_avg: 5.2,
          snr_diff_avg: 1.8
        }
      };

      mockApi.fetchGatewayComparison.mockResolvedValueOnce(mockComparison);

      renderWithProviders(<GatewayComparisonPage />);

      // Select first gateway
      const gateway1Picker = screen.getByLabelText(/gateway 1/i);
      await user.click(gateway1Picker);
      await user.type(gateway1Picker, 'NODE1');
      await user.click(screen.getByText('NODE1'));

      // Select second gateway
      const gateway2Picker = screen.getByLabelText(/gateway 2/i);
      await user.click(gateway2Picker);
      await user.type(gateway2Picker, 'NODE2');
      await user.click(screen.getByText('NODE2'));

      // Verify comparison results
      await waitFor(() => {
        expect(screen.getByText(/common packets: 50/i)).toBeInTheDocument();
        expect(screen.getByText(/avg rssi difference/i)).toBeInTheDocument();
        expect(screen.getByText(/5.2/i)).toBeInTheDocument();
      });

      // Verify charts are displayed
      expect(screen.getByTestId('rssi-scatter-plot')).toBeInTheDocument();
      expect(screen.getByTestId('snr-scatter-plot')).toBeInTheDocument();
    });
  });

  describe('Data Retention and Cleanup Workflow', () => {
    it('should trigger manual cleanup', async () => {
      const user = userEvent.setup();
      mockApi.triggerCleanup.mockResolvedValueOnce({
        deleted: {
          messages: 1500,
          telemetry: 800
        },
        spaceFreed: '25 MB'
      });

      renderWithProviders(<NetworkInsightsPage />);

      // Navigate to admin section
      const adminTab = screen.getByText(/admin/i);
      await user.click(adminTab);

      // Trigger cleanup
      const cleanupButton = screen.getByText(/run cleanup now/i);
      await user.click(cleanupButton);

      // Verify cleanup results
      await waitFor(() => {
        expect(screen.getByText(/deleted 1500 messages/i)).toBeInTheDocument();
        expect(screen.getByText(/freed 25 MB/i)).toBeInTheDocument();
      });
    });
  });

  describe('URL State Management Workflow', () => {
    it('should sync filters to URL', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PacketsPage />);

      // Apply filters
      const portSelect = screen.getByLabelText(/port/i);
      await user.selectOptions(portSelect, 'TEXT_MESSAGE_APP');

      // Verify URL updated
      await waitFor(() => {
        expect(window.location.search).toContain('portnum=TEXT_MESSAGE_APP');
      }, { timeout: 500 });
    });

    it('should restore filters from URL', async () => {
      // Mock URL with filters
      delete (window as any).location;
      (window as any).location = new URL('http://localhost/packets?portnum=TEXT_MESSAGE_APP&from_node_id=123456789');

      renderWithProviders(<PacketsPage />);

      // Verify filters are restored
      await waitFor(() => {
        const portSelect = screen.getByLabelText(/port/i) as HTMLSelectElement;
        expect(portSelect.value).toBe('TEXT_MESSAGE_APP');
      });
    });

    it('should generate shareable links', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PacketsPage />);

      // Apply filters
      const portSelect = screen.getByLabelText(/port/i);
      await user.selectOptions(portSelect, 'TEXT_MESSAGE_APP');

      // Click copy link button
      const copyLinkButton = screen.getByLabelText(/copy link/i);
      await user.click(copyLinkButton);

      // Verify clipboard was called
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('portnum=TEXT_MESSAGE_APP')
        );
      });

      // Verify success message
      expect(screen.getByText(/link copied/i)).toBeInTheDocument();
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should navigate from map to line-of-sight analysis', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MapPage />);

      await waitFor(() => {
        expect(screen.getByText(/traceroute link/i)).toBeInTheDocument();
      });

      // Click on RF link
      const rfLink = screen.getByText(/traceroute link/i);
      await user.click(rfLink);

      // Click "Analyze Line of Sight" button
      const losButton = screen.getByText(/analyze line of sight/i);
      await user.click(losButton);

      // Verify navigation to LOS page with pre-filled nodes
      await waitFor(() => {
        expect(window.location.pathname).toBe('/line-of-sight');
        expect(window.location.search).toContain('from=123456789');
        expect(window.location.search).toContain('to=987654321');
      });
    });

    it('should maintain theme across page navigation', async () => {
      const user = userEvent.setup();
      const darkModeToggle = new DarkModeToggle();
      
      renderWithProviders(<MapPage />);

      // Set dark theme
      const themeButton = screen.getByLabelText(/toggle theme/i);
      await user.click(themeButton);

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
      });

      // Navigate to packets page
      const packetsLink = screen.getByText(/packets/i);
      await user.click(packetsLink);

      // Verify theme persists
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeNodeSet = Array.from({ length: 500 }, (_, i) => ({
        id: `${i}`,
        nodeId: `node_${i}`,
        hexId: `hex_${i}`,
        shortName: `N${i}`,
        longName: `Node ${i}`,
        hardwareModel: 'TBEAM',
        role: 'ROUTER',
        isOnline: true,
        mqttConnected: true,
        position: {
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
          altitude: 10
        },
        lastSeen: new Date().toISOString()
      }));

      mockApi.fetchNodes.mockResolvedValueOnce(largeNodeSet);

      const startTime = performance.now();
      renderWithProviders(<MapPage />);

      await waitFor(() => {
        expect(screen.getByText('N0')).toBeInTheDocument();
      }, { timeout: 10000 });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 500 nodes in under 3 seconds
      expect(renderTime).toBeLessThan(3000);
      console.log(`Rendered 500 nodes in ${renderTime}ms`);
    });
  });
});
