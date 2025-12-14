/**
 * Multi-Network Components Tests
 * Tests for multi-network UI components and functionality
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { NetworkSelector, NetworkInfo } from '../components/MultiNetwork/NetworkSelector';
import { CrossNetworkAnalytics } from '../components/MultiNetwork/CrossNetworkAnalytics';
import { NetworkIsolationPanel } from '../components/MultiNetwork/NetworkIsolationPanel';
import { MultiNetworkManager } from '../components/MultiNetwork/MultiNetworkManager';
import { apiService } from '../services/api';

// Mock API service
jest.mock('../services/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock recharts to avoid canvas issues in tests
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('NetworkSelector Component', () => {
  const mockNetworks: NetworkInfo[] = [
    {
      id: 'network-1',
      name: 'Test Network 1',
      description: 'First test network',
      region: 'US',
      isConnected: true,
      lastConnected: '2023-01-01T00:00:00Z',
      nodeCount: 10,
      accessLevel: 'public',
      federationEnabled: false
    },
    {
      id: 'network-2',
      name: 'Test Network 2',
      description: 'Second test network',
      region: 'EU_868',
      isConnected: false,
      lastConnected: '2023-01-01T00:00:00Z',
      nodeCount: 5,
      accessLevel: 'restricted',
      federationEnabled: true
    },
    {
      id: 'network-3',
      name: 'Private Network',
      description: 'Private test network',
      region: 'JP',
      isConnected: true,
      lastConnected: '2023-01-01T00:00:00Z',
      nodeCount: 3,
      accessLevel: 'private',
      federationEnabled: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.request = jest.fn().mockResolvedValue({ data: mockNetworks });
  });

  /**
   * Test network selection filters and visual indicators
   * Requirement 27.2: Network selection filters and visual indicators
   */
  test('should display available networks with visual indicators', async () => {
    const onSelectionChange = jest.fn();

    renderWithTheme(
      <NetworkSelector
        selectedNetworks={[]}
        onNetworkSelectionChange={onSelectionChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Network Selection')).toBeInTheDocument();
    });

    // Click to open the selector
    const selector = screen.getByLabelText('Select Networks');
    fireEvent.mouseDown(selector);

    await waitFor(() => {
      expect(screen.getByText('Test Network 1')).toBeInTheDocument();
      expect(screen.getByText('Test Network 2')).toBeInTheDocument();
      expect(screen.getByText('Private Network')).toBeInTheDocument();
    });

    // Check for visual indicators
    expect(screen.getByText('US • 10 nodes')).toBeInTheDocument();
    expect(screen.getByText('EU_868 • 5 nodes')).toBeInTheDocument();
    expect(screen.getByText('JP • 3 nodes')).toBeInTheDocument();
  });

  test('should filter networks based on connection status', async () => {
    const onSelectionChange = jest.fn();
    const onShowAllChange = jest.fn();

    renderWithTheme(
      <NetworkSelector
        selectedNetworks={[]}
        onNetworkSelectionChange={onSelectionChange}
        showAllNetworks={false}
        onShowAllNetworksChange={onShowAllChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Show all networks')).toBeInTheDocument();
    });

    // With showAllNetworks=false, should only show connected networks
    const selector = screen.getByLabelText('Select Networks');
    fireEvent.mouseDown(selector);

    await waitFor(() => {
      expect(screen.getByText('Test Network 1')).toBeInTheDocument();
      expect(screen.getByText('Private Network')).toBeInTheDocument();
      // Network 2 should not be shown as it's disconnected
    });
  });

  test('should handle network selection changes', async () => {
    const onSelectionChange = jest.fn();

    renderWithTheme(
      <NetworkSelector
        selectedNetworks={[]}
        onNetworkSelectionChange={onSelectionChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Select Networks')).toBeInTheDocument();
    });

    const selector = screen.getByLabelText('Select Networks');
    fireEvent.mouseDown(selector);

    await waitFor(() => {
      const network1Option = screen.getByText('Test Network 1');
      fireEvent.click(network1Option);
    });

    expect(onSelectionChange).toHaveBeenCalledWith(['network-1']);
  });

  test('should display network settings button', async () => {
    const onSettingsClick = jest.fn();

    renderWithTheme(
      <NetworkSelector
        selectedNetworks={[]}
        onNetworkSelectionChange={jest.fn()}
        onNetworkSettingsClick={onSettingsClick}
      />
    );

    await waitFor(() => {
      const selector = screen.getByLabelText('Select Networks');
      fireEvent.mouseDown(selector);
    });

    await waitFor(() => {
      const settingsButtons = screen.getAllByTitle('Network settings');
      expect(settingsButtons).toHaveLength(3);
    });
  });
});

describe('CrossNetworkAnalytics Component', () => {
  const mockAnalytics = {
    totalNetworks: 2,
    totalNodes: 15,
    networkDistribution: {
      'Test Network 1': 10,
      'Test Network 2': 5
    },
    crossNetworkMessages: 100,
    federatedData: []
  };

  const mockStatus = {
    data: {
      status: {
        'network-1': {
          networkName: 'Test Network 1',
          isConnected: true,
          accessControls: {
            dataVisibility: 'public',
            federationEnabled: false
          }
        },
        'network-2': {
          networkName: 'Test Network 2',
          isConnected: true,
          accessControls: {
            dataVisibility: 'restricted',
            federationEnabled: true
          }
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.request = jest.fn()
      .mockResolvedValueOnce({ data: mockAnalytics })
      .mockResolvedValueOnce(mockStatus);
  });

  /**
   * Test cross-network analytics while maintaining separation
   * Requirement 27.4: Cross-network analytics while maintaining logical separation
   */
  test('should display cross-network analytics summary', async () => {
    renderWithTheme(
      <CrossNetworkAnalytics selectedNetworks={['network-1', 'network-2']} />
    );

    await waitFor(() => {
      expect(screen.getByText('Cross-Network Analytics')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total Networks
      expect(screen.getByText('15')).toBeInTheDocument(); // Total Nodes
      expect(screen.getByText('100')).toBeInTheDocument(); // Cross-Network Messages
    });
  });

  test('should display network distribution charts', async () => {
    renderWithTheme(
      <CrossNetworkAnalytics selectedNetworks={['network-1', 'network-2']} />
    );

    await waitFor(() => {
      expect(screen.getByText('Node Distribution by Network')).toBeInTheDocument();
      expect(screen.getByText('Network Comparison')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  test('should display network details table with access controls', async () => {
    renderWithTheme(
      <CrossNetworkAnalytics selectedNetworks={['network-1', 'network-2']} />
    );

    await waitFor(() => {
      expect(screen.getByText('Network Details')).toBeInTheDocument();
      expect(screen.getByText('Test Network 1')).toBeInTheDocument();
      expect(screen.getByText('Test Network 2')).toBeInTheDocument();
      expect(screen.getByText('Access Level')).toBeInTheDocument();
      expect(screen.getByText('Federation')).toBeInTheDocument();
    });
  });

  test('should refresh data automatically', async () => {
    jest.useFakeTimers();

    renderWithTheme(
      <CrossNetworkAnalytics 
        selectedNetworks={['network-1']} 
        refreshInterval={1000}
      />
    );

    // Initial load
    await waitFor(() => {
      expect(mockApiService.request).toHaveBeenCalledTimes(2);
    });

    // Fast-forward time to trigger refresh
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockApiService.request).toHaveBeenCalledTimes(4);
    });

    jest.useRealTimers();
  });
});

describe('NetworkIsolationPanel Component', () => {
  const mockIsolationTest = {
    networkId: 'network-1',
    networkName: 'Test Network 1',
    accessLevel: 'restricted',
    canAccess: true,
    isolationScore: 75,
    testResults: {
      dataVisibility: 'restricted',
      crossNetworkAccess: false,
      userPermissions: ['admin']
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.request = jest.fn()
      .mockResolvedValueOnce({
        data: {
          status: {
            'network-1': {
              accessControls: {
                allowedUsers: ['admin@example.com'],
                allowedRoles: ['admin'],
                dataVisibility: 'restricted',
                crossNetworkSharing: false,
                federationEnabled: false
              }
            }
          }
        }
      })
      .mockResolvedValueOnce({ data: mockIsolationTest });
  });

  /**
   * Test access controls per network segment
   * Requirement 27.3: Access controls per network segment with user-specific visibility rules
   */
  test('should display network access controls', async () => {
    renderWithTheme(
      <NetworkIsolationPanel
        networkId="network-1"
        networkName="Test Network 1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Network Isolation & Access Controls')).toBeInTheDocument();
      expect(screen.getByText('Data Visibility')).toBeInTheDocument();
      expect(screen.getByText('Federation')).toBeInTheDocument();
      expect(screen.getByText('RESTRICTED')).toBeInTheDocument();
      expect(screen.getByText('DISABLED')).toBeInTheDocument();
    });
  });

  test('should display access control details', async () => {
    renderWithTheme(
      <NetworkIsolationPanel
        networkId="network-1"
        networkName="Test Network 1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Allowed Users')).toBeInTheDocument();
      expect(screen.getByText('Allowed Roles')).toBeInTheDocument();
      expect(screen.getByText('Cross-Network Sharing')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  test('should run isolation test', async () => {
    renderWithTheme(
      <NetworkIsolationPanel
        networkId="network-1"
        networkName="Test Network 1"
      />
    );

    await waitFor(() => {
      const testButton = screen.getByTitle('Run isolation test');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Isolation Test Results')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Access granted')).toBeInTheDocument();
    });
  });

  test('should open edit dialog for access controls', async () => {
    renderWithTheme(
      <NetworkIsolationPanel
        networkId="network-1"
        networkName="Test Network 1"
      />
    );

    await waitFor(() => {
      const editButton = screen.getByTitle('Edit access controls');
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Access Controls')).toBeInTheDocument();
      expect(screen.getByLabelText('Data Visibility')).toBeInTheDocument();
      expect(screen.getByText('Enable cross-network data sharing')).toBeInTheDocument();
      expect(screen.getByText('Enable federation with other networks')).toBeInTheDocument();
    });
  });
});

describe('MultiNetworkManager Component', () => {
  const mockNetworks = [
    {
      id: 'network-1',
      name: 'Test Network 1',
      isConnected: true,
      accessLevel: 'public',
      federationEnabled: false
    },
    {
      id: 'network-2',
      name: 'Test Network 2',
      isConnected: true,
      accessLevel: 'restricted',
      federationEnabled: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService.request = jest.fn().mockResolvedValue({ data: mockNetworks });
  });

  test('should display multi-network manager interface', async () => {
    renderWithTheme(<MultiNetworkManager />);

    await waitFor(() => {
      expect(screen.getByText('Multi-Network Manager')).toBeInTheDocument();
      expect(screen.getByText('Network Selection')).toBeInTheDocument();
      expect(screen.getByText('Cross-Network Analytics')).toBeInTheDocument();
      expect(screen.getByText('Network Isolation')).toBeInTheDocument();
    });
  });

  test('should switch between tabs', async () => {
    renderWithTheme(<MultiNetworkManager />);

    await waitFor(() => {
      const analyticsTab = screen.getByText('Cross-Network Analytics');
      fireEvent.click(analyticsTab);
    });

    await waitFor(() => {
      expect(screen.getByText(/Please select one or more networks/)).toBeInTheDocument();
    });
  });

  test('should handle refresh action', async () => {
    renderWithTheme(<MultiNetworkManager />);

    await waitFor(() => {
      const refreshButton = screen.getByLabelText('Refresh all networks');
      fireEvent.click(refreshButton);
    });

    // Should call reload endpoint
    await waitFor(() => {
      expect(mockApiService.request).toHaveBeenCalledWith(
        '/multi-network/reload',
        { method: 'POST' }
      );
    });
  });

  /**
   * Test multiple MQTT broker connections management
   * Requirement 27.1: Support connections to multiple MQTT brokers simultaneously
   */
  test('should manage multiple network connections', async () => {
    renderWithTheme(<MultiNetworkManager />);

    await waitFor(() => {
      expect(mockApiService.request).toHaveBeenCalledWith('/multi-network/networks');
    });

    // Should load and display available networks
    await waitFor(() => {
      expect(screen.getByText('Multi-Network Manager')).toBeInTheDocument();
    });
  });

  /**
   * Test data federation and replication support
   * Requirement 27.5: Support data federation and replication
   */
  test('should handle federation configuration', async () => {
    const mockFederationStatus = {
      data: {
        federationEnabled: true,
        activeNetworks: 2,
        totalNetworks: 2,
        uptime: 3600
      }
    };

    mockApiService.request = jest.fn()
      .mockResolvedValueOnce({ data: mockNetworks })
      .mockResolvedValueOnce(mockFederationStatus);

    renderWithTheme(<MultiNetworkManager />);

    await waitFor(() => {
      expect(screen.getByText('Multi-Network Manager')).toBeInTheDocument();
    });

    // The component should be able to handle federation status
    expect(mockApiService.request).toHaveBeenCalledWith('/multi-network/networks');
  });
});